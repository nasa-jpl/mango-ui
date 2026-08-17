// Pure, React-/Chart.js-free decision logic extracted verbatim from `Chart.tsx`.
// Keeping it here lets the fetch-orchestration decisions (time window, downsampling
// factor, fields to request, error classification) and the per-entry point-derivation
// pipeline be unit- and mutation-tested in isolation. Behavior must match the original
// component.

import {
  DataResponse,
  DataResponseDataEntry,
  ProductField,
  ProductResolution,
} from "../../../types/api";
import { ChartLayer, DataLayer } from "../../../types/view";
import { HttpError } from "../../../utilities/api";
import { isChartLayerLine } from "../../../utilities/view";
import type { CustomChartData } from "./Chart";

/** Inputs needed to compute the fetch time window (subset of a layer). */
export type FetchWindowInput = Pick<
  DataLayer,
  "startTime" | "endTime" | "windowBuffer"
>;

export type FetchWindow = {
  durationSeconds: number;
  endTime: string;
  startTime: string;
};

/**
 * Resolve the effective start/end times for a layer fetch and the duration between
 * them in seconds. An explicit `startTime`/`endTime` overrides the layer's own times.
 * When the layer specifies a numeric `windowBuffer`, the window is padded by one day
 * on each side (matching the original component behavior, which keys off the presence
 * of the number rather than its value).
 */
export function computeFetchWindow(
  startTime: string | undefined,
  endTime: string | undefined,
  layer: FetchWindowInput,
): FetchWindow {
  let computedStartTime = startTime || layer.startTime;
  let computedEndTime = endTime || layer.endTime;

  if (typeof layer.windowBuffer === "number") {
    const newStartTimeDate = new Date(computedStartTime);
    newStartTimeDate.setDate(newStartTimeDate.getDate() - 1);
    computedStartTime = newStartTimeDate.toISOString();

    const newEndTimeDate = new Date(computedEndTime);
    newEndTimeDate.setDate(newEndTimeDate.getDate() + 1);
    computedEndTime = newEndTimeDate.toISOString();
  }

  const durationSeconds =
    (new Date(computedEndTime).getTime() -
      new Date(computedStartTime).getTime()) /
    1000;

  return {
    startTime: computedStartTime,
    endTime: computedEndTime,
    durationSeconds,
  };
}

/** The subset of `Product` needed to choose a downsampling factor. */
export type DownsamplingProduct = {
  available_resolutions: ProductResolution[];
};

/**
 * Choose the coarsest resolution whose point count still exceeds the chart's pixel
 * width while the next (finer) resolution would fall below it — i.e. the smallest
 * downsampling that keeps at least ~one point per pixel. Returns 1 (no downsampling)
 * when there is no product or no resolution qualifies.
 */
export function computeDownsamplingFactor(
  product: DownsamplingProduct | null | undefined,
  durationSeconds: number,
  chartSize: number,
): number {
  let downsamplingFactor = 1;
  if (product) {
    for (let i = 0; i < product.available_resolutions.length; i++) {
      const resolution = product.available_resolutions[i];
      const nextResolution = product.available_resolutions[i + 1];
      const pointsForDuration =
        durationSeconds / resolution.nominal_data_interval_seconds;
      const nextPointsForDuration = nextResolution
        ? durationSeconds / nextResolution.nominal_data_interval_seconds
        : null;
      if (
        pointsForDuration > chartSize &&
        (nextPointsForDuration == null || nextPointsForDuration < chartSize)
      ) {
        downsamplingFactor = resolution.downsampling_factor;
        break;
      }
    }
  }
  return downsamplingFactor;
}

export type ResolvedFetchFields = {
  fieldsToFetch: string[];
  shouldSkipDownsampling: boolean;
};

/**
 * Determine which fields to request and whether downsampling must be skipped. Line
 * layers backed by a product that carries `subset_version` request that extra field,
 * and downsampling is disabled for those requests (the raw subset versions are needed).
 */
export function resolveFetchFields(layer: ChartLayer): ResolvedFetchFields {
  let fieldsToFetch = layer.fields;
  let shouldSkipDownsampling = false;

  if (isChartLayerLine(layer)) {
    if (
      (layer as ChartLayer & { hasSubsetVersionField?: boolean })
        .hasSubsetVersionField &&
      !fieldsToFetch.includes("subset_version")
    ) {
      fieldsToFetch = [...fieldsToFetch, "subset_version"];
      shouldSkipDownsampling = true;
    }
  }

  return { fieldsToFetch, shouldSkipDownsampling };
}

/**
 * A 4xx `HttpError` means the layer's data has not been ingested (as opposed to a
 * genuine failure), so the chart renders it as an empty, "not ingested" series
 * rather than surfacing an error.
 */
export function isNotIngestedError(error: unknown): boolean {
  return (
    error instanceof HttpError && error.status >= 400 && error.status < 500
  );
}

/** The empty response substituted for a not-ingested (4xx) layer. */
export function createNotIngestedDataResponse(): DataResponse {
  return {
    data: [],
    data_begin: "",
    data_count: 0,
    data_end: "",
    downsampling_factor: 1,
    from_isotimestamp: "",
    nominal_data_interval_seconds: null,
    query_elapsed_ms: 0,
    to_isotimestamp: "",
  };
}

/** One processed layer ready for Chart.js dataset construction. */
export type ProcessedLayerData = {
  data_count: number;
  downsampling_factor: number;
  layer: ChartLayer;
  pointsByField: Record<string, CustomChartData[]>;
  unit: string;
};

/**
 * Expand a processed line layer that carries `subset_version` data into one virtual layer
 * per subset_version, each with an alternating blue/red color and a subset_version-labeled
 * name. Non-line layers, layers missing primary-field data, and layers without any
 * subset_version values are returned unchanged (as a single-item array).
 */
export function expandLayerBySubsetVersion(
  item: ProcessedLayerData,
): ProcessedLayerData[] {
  const { layer, pointsByField } = item;

  // Only process ChartLayerLine
  if (!isChartLayerLine(layer)) {
    return [item];
  }

  const primaryField = layer.fields[0];

  // Skip if the primary field data doesn't exist
  if (!pointsByField[primaryField]) {
    return [item];
  }

  // Check if any point has subset_version data
  const hasSubsetVersion = pointsByField[primaryField].some(
    (point) => point.raw.subset_version?.value !== undefined,
  );

  if (!hasSubsetVersion) {
    return [item];
  }

  // Group points by subset_version
  const groups: Record<string, CustomChartData[]> = {};

  pointsByField[primaryField].forEach((point) => {
    const subsetVersionValue =
      point.raw.subset_version?.value?.toString() || "unknown";
    if (!groups[subsetVersionValue]) {
      groups[subsetVersionValue] = [];
    }
    groups[subsetVersionValue].push(point);
  });

  // Create a virtual layer for each subset_version with alternating colors
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
    .map(([subsetVersionValue, groupPoints], index) => {
      // Alternate between blue and red for subset_versions
      const color = index % 2 === 0 ? "#0000FF" : "#FF0000";

      const virtualLayer = {
        ...layer,
        color: color,
        // Update label to include subset_version
        label: layer.label
          ? `${layer.label} (subset_version=${subsetVersionValue})`
          : `subset_version=${subsetVersionValue}`,
      };

      return {
        ...item,
        layer: virtualLayer,
        pointsByField: {
          ...pointsByField,
          [primaryField]: groupPoints,
        },
      };
    });
}

/**
 * Count the number of distinct `subset_version` values across a field's points, coercing
 * each value to a string and ignoring `null`/`undefined`. Returns 0 when there are no points.
 */
export function countUniqueSubsetVersions(
  points: CustomChartData[] | undefined,
): number {
  const subsetVersionSet = new Set<string>();
  if (points) {
    points.forEach((point) => {
      const subsetVersionValue = point.raw.subset_version?.value;
      if (subsetVersionValue !== undefined && subsetVersionValue !== null) {
        subsetVersionSet.add(String(subsetVersionValue));
      }
    });
  }
  return subsetVersionSet.size;
}

/**
 * Derive the chart points for a single field of one data entry. Callers are expected to
 * have already skipped entries with a missing field value or non-string timestamp (the
 * same guard is repeated here defensively so the function is self-contained):
 *  - No downsampling (`downsamplingFactor === 1`): a single point at the raw value.
 *  - Downsampled with min AND max aggregations: one point at `min` positioned at the
 *    middle of the aggregation window, plus a second point at `max` when they differ.
 *  - Downsampled with an avg aggregation (but not min+max): a single point at `avg`.
 *  - Downsampled without usable aggregations (or no field metadata): no points.
 */
export function deriveFieldPoints(
  d: DataResponseDataEntry,
  field: string,
  fieldMetadata: ProductField | null | undefined,
  downsamplingFactor: number,
  nominalDataIntervalSeconds: number | null,
): CustomChartData[] {
  const points: CustomChartData[] = [];
  const fieldValue = d[field];
  const timestamp = d.timestamp;
  if (!fieldValue || typeof timestamp !== "string") return points;

  // Case where downsampling is not applied
  if (downsamplingFactor === 1) {
    points.push({
      x: timestamp,
      y: fieldValue.value as number,
      raw: d,
      selected: false,
    });
  } else {
    if (!fieldMetadata) return points;
    if (
      fieldMetadata.supported_aggregations.find(({ type }) => type === "min") &&
      fieldMetadata.supported_aggregations.find(({ type }) => type === "max")
    ) {
      // Compute middle time of aggregation window
      const pointTimestampMS = new Date(timestamp).getTime();
      const halfFieldDataIntervalMS =
        ((nominalDataIntervalSeconds || 0) / 2) * 1000;
      const middleTime = new Date(
        pointTimestampMS + halfFieldDataIntervalMS,
      ).toISOString();

      // Use the min and max set to the middle of the window
      points.push({
        x: middleTime,
        y: fieldValue.min as number,
        raw: d,
        selected: false,
      });
      if (fieldValue.min !== fieldValue.max) {
        points.push({
          x: middleTime,
          y: fieldValue.max as number,
          raw: d,
          selected: false,
        });
      }
    } else if (
      fieldMetadata.supported_aggregations.find(({ type }) => type === "avg")
    ) {
      points.push({
        x: timestamp,
        y: fieldValue.avg as number,
        raw: d,
        selected: false,
      });
    }
  }
  return points;
}

/**
 * Resolve a dimension value that may be an absolute number or a percentage string
 * (e.g. `"25%"`) into an absolute value relative to `dimension`.
 */
export function toDimension(value: number | string, dimension: number): number {
  return typeof value === "string" && value.endsWith("%")
    ? (parseFloat(value) / 100) * dimension
    : +value;
}

/**
 * Horizontal position (px) for the chart tooltip: centered on the caret but clamped so it
 * stays within the viewport's right edge (with a 20px margin).
 */
export function computeTooltipLeft(
  triggerLeft: number,
  caretX: number,
  tooltipWidth: number,
  innerWidth: number,
  scrollX: number,
): number {
  return Math.min(
    innerWidth - tooltipWidth - 20,
    triggerLeft + scrollX - tooltipWidth / 2 + caretX,
  );
}

/** Vertical position (px) for the chart tooltip: above the caret by the tooltip height plus a gap. */
export function computeTooltipTop(
  triggerTop: number,
  caretY: number,
  tooltipHeight: number,
  scrollY: number,
): number {
  return triggerTop + scrollY - tooltipHeight + caretY - 12;
}
