// Pure, React-/Chart.js-free decision logic extracted verbatim from `Chart.tsx`'s
// `fetchLayerData`. Keeping it here lets the fetch-orchestration decisions
// (time window, downsampling factor, fields to request, and error classification)
// be unit- and mutation-tested in isolation. Behavior must match the original component.

import { DataResponse, ProductResolution } from "../../../types/api";
import { ChartLayer, DataLayer } from "../../../types/view";
import { HttpError } from "../../../utilities/api";
import { isChartLayerLine } from "../../../utilities/view";

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
