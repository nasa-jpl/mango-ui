import { expect, test } from "vitest";
import {
  DataResponseDataEntry,
  ProductAggregationType,
  ProductField,
} from "../../../types/api";
import { ChartLayer } from "../../../types/view";
import { HttpError } from "../../../utilities/api";
import type { CustomChartData } from "./Chart";
import {
  computeDownsamplingFactor,
  computeFetchWindow,
  countUniqueSubsetVersions,
  createNotIngestedDataResponse,
  deriveFieldPoints,
  expandLayerBySubsetVersion,
  isNotIngestedError,
  ProcessedLayerData,
  resolveFetchFields,
} from "./chart-data";

function lineLayer(overrides: Partial<ChartLayer> = {}): ChartLayer {
  return {
    type: "line",
    id: "layer-1",
    dataset: "DS",
    version: "1",
    instrument: "INSTR",
    mission: "M",
    fields: ["temp"],
    startTime: "2020-01-01T00:00:00.000Z",
    endTime: "2020-01-02T00:00:00.000Z",
    ...overrides,
  } as ChartLayer;
}

function eventLayer(overrides: Partial<ChartLayer> = {}): ChartLayer {
  return {
    type: "event",
    style: "bar",
    dataFieldStart: "start",
    dataFieldEnd: "end",
    id: "layer-e",
    dataset: "DS",
    version: "1",
    instrument: "INSTR",
    mission: "M",
    fields: ["evt"],
    startTime: "2020-01-01T00:00:00.000Z",
    endTime: "2020-01-02T00:00:00.000Z",
    ...overrides,
  } as ChartLayer;
}

// --- computeFetchWindow -----------------------------------------------------

test("computeFetchWindow uses explicit times over the layer's own times", () => {
  const w = computeFetchWindow(
    "2020-03-01T00:00:00.000Z",
    "2020-03-02T00:00:00.000Z",
    { startTime: "ignored-start", endTime: "ignored-end" },
  );
  expect(w.startTime).toBe("2020-03-01T00:00:00.000Z");
  expect(w.endTime).toBe("2020-03-02T00:00:00.000Z");
  expect(w.durationSeconds).toBe(86400);
});

test("computeFetchWindow falls back to layer times when args are missing or empty", () => {
  const layer = {
    startTime: "2020-01-01T00:00:00.000Z",
    endTime: "2020-01-01T01:00:00.000Z",
  };
  // undefined args
  expect(computeFetchWindow(undefined, undefined, layer)).toEqual({
    startTime: "2020-01-01T00:00:00.000Z",
    endTime: "2020-01-01T01:00:00.000Z",
    durationSeconds: 3600,
  });
  // empty-string args also fall back (|| semantics, not &&)
  expect(computeFetchWindow("", "", layer)).toEqual({
    startTime: "2020-01-01T00:00:00.000Z",
    endTime: "2020-01-01T01:00:00.000Z",
    durationSeconds: 3600,
  });
});

test("computeFetchWindow pads the window by one day per side when windowBuffer is numeric", () => {
  const layer = {
    startTime: "2020-01-10T00:00:00.000Z",
    endTime: "2020-01-10T00:00:00.000Z",
    windowBuffer: 5,
  };
  const w = computeFetchWindow(undefined, undefined, layer);
  expect(w.startTime).toBe("2020-01-09T00:00:00.000Z");
  expect(w.endTime).toBe("2020-01-11T00:00:00.000Z");
  expect(w.durationSeconds).toBe(172800); // two days
});

test("computeFetchWindow pads even when windowBuffer is 0 (presence, not truthiness)", () => {
  const w = computeFetchWindow(undefined, undefined, {
    startTime: "2020-01-10T00:00:00.000Z",
    endTime: "2020-01-10T00:00:00.000Z",
    windowBuffer: 0,
  });
  expect(w.startTime).toBe("2020-01-09T00:00:00.000Z");
  expect(w.endTime).toBe("2020-01-11T00:00:00.000Z");
});

test("computeFetchWindow does not pad when windowBuffer is undefined", () => {
  const w = computeFetchWindow(undefined, undefined, {
    startTime: "2020-01-10T00:00:00.000Z",
    endTime: "2020-01-10T12:00:00.000Z",
  });
  expect(w.startTime).toBe("2020-01-10T00:00:00.000Z");
  expect(w.endTime).toBe("2020-01-10T12:00:00.000Z");
  expect(w.durationSeconds).toBe(43200);
});

// --- computeDownsamplingFactor ----------------------------------------------

const RESOLUTIONS = [
  { nominal_data_interval_seconds: 1, downsampling_factor: 1 },
  { nominal_data_interval_seconds: 10, downsampling_factor: 10 },
  { nominal_data_interval_seconds: 100, downsampling_factor: 100 },
];

test("computeDownsamplingFactor returns 1 with no product", () => {
  expect(computeDownsamplingFactor(null, 5000, 100)).toBe(1);
  expect(computeDownsamplingFactor(undefined, 5000, 100)).toBe(1);
  expect(
    computeDownsamplingFactor({ available_resolutions: [] }, 5000, 100),
  ).toBe(1);
});

test("computeDownsamplingFactor selects the resolution whose next step drops below the chart width", () => {
  // duration 5000, width 100: res[1] gives 500 pts (>100) and res[2] gives 50 (<100).
  expect(
    computeDownsamplingFactor(
      { available_resolutions: RESOLUTIONS },
      5000,
      100,
    ),
  ).toBe(10);
});

test("computeDownsamplingFactor selects the last resolution when there is no finer next step", () => {
  // duration 20000, width 100: only the final resolution has no next step to compare.
  expect(
    computeDownsamplingFactor(
      { available_resolutions: RESOLUTIONS },
      20000,
      100,
    ),
  ).toBe(100);
});

test("computeDownsamplingFactor picks the coarsest resolution for a zero-width chart", () => {
  // With width 0, every step has "too many" points, but only the final resolution's
  // missing next step (nextPoints == null) lets it be selected — the coarsest factor.
  expect(
    computeDownsamplingFactor({ available_resolutions: RESOLUTIONS }, 20000, 0),
  ).toBe(100);
});

test("computeDownsamplingFactor returns 1 when no resolution exceeds the chart width", () => {
  expect(
    computeDownsamplingFactor({ available_resolutions: RESOLUTIONS }, 50, 100),
  ).toBe(1);
});

test("computeDownsamplingFactor uses a strict > against the chart width", () => {
  // points exactly equal to width must NOT trigger selection at res[0] (100/1 === 100).
  expect(
    computeDownsamplingFactor(
      {
        available_resolutions: [
          { nominal_data_interval_seconds: 1, downsampling_factor: 7 },
        ],
      },
      100,
      100,
    ),
  ).toBe(1);
});

test("computeDownsamplingFactor uses a strict < for the next step (boundary)", () => {
  // res[0]: 200 pts (>100). res[1]: exactly 100 pts, which is NOT < 100, so res[0] is
  // rejected; res[1] then has 100 pts (not > 100) so it is rejected too → factor 1.
  const resolutions = [
    { nominal_data_interval_seconds: 1, downsampling_factor: 5 },
    { nominal_data_interval_seconds: 2, downsampling_factor: 50 },
  ];
  expect(
    computeDownsamplingFactor({ available_resolutions: resolutions }, 200, 100),
  ).toBe(1);
});

// --- resolveFetchFields -----------------------------------------------------

test("resolveFetchFields returns the layer fields unchanged for a plain line layer", () => {
  expect(resolveFetchFields(lineLayer({ fields: ["a", "b"] }))).toEqual({
    fieldsToFetch: ["a", "b"],
    shouldSkipDownsampling: false,
  });
});

test("resolveFetchFields appends subset_version and skips downsampling for subset-version line layers", () => {
  const layer = lineLayer({ fields: ["a"] });
  (
    layer as ChartLayer & { hasSubsetVersionField?: boolean }
  ).hasSubsetVersionField = true;
  expect(resolveFetchFields(layer)).toEqual({
    fieldsToFetch: ["a", "subset_version"],
    shouldSkipDownsampling: true,
  });
});

test("resolveFetchFields does not duplicate subset_version when already requested", () => {
  const layer = lineLayer({ fields: ["a", "subset_version"] });
  (
    layer as ChartLayer & { hasSubsetVersionField?: boolean }
  ).hasSubsetVersionField = true;
  expect(resolveFetchFields(layer)).toEqual({
    fieldsToFetch: ["a", "subset_version"],
    shouldSkipDownsampling: false,
  });
});

test("resolveFetchFields ignores subset_version handling for non-line (event) layers", () => {
  const layer = eventLayer({ fields: ["a"] });
  (
    layer as ChartLayer & { hasSubsetVersionField?: boolean }
  ).hasSubsetVersionField = true;
  expect(resolveFetchFields(layer)).toEqual({
    fieldsToFetch: ["a"],
    shouldSkipDownsampling: false,
  });
});

// --- isNotIngestedError -----------------------------------------------------

test("isNotIngestedError is true only for 4xx HttpErrors", () => {
  expect(isNotIngestedError(new HttpError("nope", 404))).toBe(true);
  expect(isNotIngestedError(new HttpError("bad", 400))).toBe(true); // lower boundary
  expect(isNotIngestedError(new HttpError("teapot", 499))).toBe(true);
});

test("isNotIngestedError is false for non-4xx statuses and non-HttpErrors", () => {
  expect(isNotIngestedError(new HttpError("server", 500))).toBe(false); // upper boundary
  expect(isNotIngestedError(new HttpError("redirect", 399))).toBe(false);
  expect(isNotIngestedError(new Error("plain"))).toBe(false);
  expect(isNotIngestedError("not-an-error")).toBe(false);
  expect(isNotIngestedError(null)).toBe(false);
});

// --- deriveFieldPoints ------------------------------------------------------

const TS = "2020-01-01T00:00:00.000Z";

function meta(types: ProductAggregationType[]): ProductField {
  return {
    name: "temp",
    type: "float",
    unit: "K",
    is_channel_id: false,
    supported_aggregations: types.map((type) => ({ field_name: "temp", type })),
  };
}

function entry(
  fieldValue: Partial<
    Record<"value" | "min" | "max" | "avg" | "centroid", number>
  >,
  field = "temp",
  timestamp: unknown = TS,
): DataResponseDataEntry {
  return { timestamp, [field]: fieldValue } as unknown as DataResponseDataEntry;
}

test("deriveFieldPoints returns a single raw point when downsampling is off", () => {
  const d = entry({ value: 42 });
  expect(deriveFieldPoints(d, "temp", null, 1, null)).toEqual([
    { x: TS, y: 42, raw: d, selected: false },
  ]);
});

test("deriveFieldPoints returns [] when the field value or timestamp is invalid", () => {
  // Missing field value
  expect(
    deriveFieldPoints(entry({ value: 1 }), "other", null, 1, null),
  ).toEqual([]);
  // Non-string timestamp
  expect(
    deriveFieldPoints(entry({ value: 1 }, "temp", 123), "temp", null, 1, null),
  ).toEqual([]);
});

test("deriveFieldPoints returns [] when downsampled without field metadata", () => {
  expect(deriveFieldPoints(entry({ value: 1 }), "temp", null, 2, 60)).toEqual(
    [],
  );
});

test("deriveFieldPoints emits min and max points at the window midpoint when they differ", () => {
  const d = entry({ min: 1, max: 9 });
  // nominal 60s → midpoint is +30s from the timestamp.
  expect(deriveFieldPoints(d, "temp", meta(["min", "max"]), 2, 60)).toEqual([
    { x: "2020-01-01T00:00:30.000Z", y: 1, raw: d, selected: false },
    { x: "2020-01-01T00:00:30.000Z", y: 9, raw: d, selected: false },
  ]);
});

test("deriveFieldPoints emits a single midpoint point when min equals max", () => {
  const d = entry({ min: 5, max: 5 });
  expect(deriveFieldPoints(d, "temp", meta(["min", "max"]), 2, 60)).toEqual([
    { x: "2020-01-01T00:00:30.000Z", y: 5, raw: d, selected: false },
  ]);
});

test("deriveFieldPoints places the midpoint at the timestamp when the interval is null", () => {
  const d = entry({ min: 1, max: 9 });
  const points = deriveFieldPoints(d, "temp", meta(["min", "max"]), 2, null);
  expect(points[0].x).toBe(TS);
});

test("deriveFieldPoints uses avg at the raw timestamp when only avg is supported", () => {
  const d = entry({ avg: 7 });
  expect(deriveFieldPoints(d, "temp", meta(["avg"]), 2, 60)).toEqual([
    { x: TS, y: 7, raw: d, selected: false },
  ]);
});

test("deriveFieldPoints returns [] when downsampled aggregations are unusable", () => {
  // Only min (no max, no avg): neither aggregation branch applies (guards the max predicate).
  expect(
    deriveFieldPoints(entry({ min: 1 }), "temp", meta(["min"]), 2, 60),
  ).toEqual([]);
  // Only max (no min, no avg): the min/max branch requires BOTH, so still [] (guards the
  // min predicate — a broken predicate would wrongly enter the branch).
  expect(
    deriveFieldPoints(entry({ min: 1, max: 9 }), "temp", meta(["max"]), 2, 60),
  ).toEqual([]);
});

// --- expandLayerBySubsetVersion ---------------------------------------------

function point(subsetVersion?: number | string | null): CustomChartData {
  const raw: Record<string, unknown> = { timestamp: TS };
  if (subsetVersion !== undefined) {
    raw.subset_version = { value: subsetVersion };
  }
  return {
    x: TS,
    y: 1,
    selected: false,
    raw: raw as unknown as CustomChartData["raw"],
  };
}

function processed(
  overrides: Partial<ProcessedLayerData> = {},
): ProcessedLayerData {
  return {
    data_count: 3,
    downsampling_factor: 1,
    layer: lineLayer({ fields: ["temp"] }),
    pointsByField: { temp: [] },
    unit: "K",
    ...overrides,
  };
}

test("expandLayerBySubsetVersion returns non-line layers unchanged even with expandable data", () => {
  // Event primary field has subset_version points, so only the line-layer guard keeps it as-is.
  const item = processed({
    layer: eventLayer({ fields: ["evt"] }),
    pointsByField: { evt: [point(1), point(2)] },
  });
  expect(expandLayerBySubsetVersion(item)).toEqual([item]);
});

test("expandLayerBySubsetVersion returns the item unchanged when primary-field data is missing", () => {
  const item = processed({ pointsByField: {} });
  expect(expandLayerBySubsetVersion(item)).toEqual([item]);
});

test("expandLayerBySubsetVersion returns the item unchanged when no point has a subset_version", () => {
  const item = processed({ pointsByField: { temp: [point(), point()] } });
  expect(expandLayerBySubsetVersion(item)).toEqual([item]);
});

test("expandLayerBySubsetVersion splits into numerically-sorted, alternating-colored virtual layers", () => {
  // Non-integer keys ('v2'/'v10') so Object.entries preserves insertion order and the
  // explicit numeric .sort is what produces the final ordering.
  const p2a = point("v2");
  const p10 = point("v10");
  const p2b = point("v2");
  const otherFieldPoint = point();
  const item = processed({
    layer: lineLayer({ fields: ["temp"], label: "L" }),
    // Insertion order (v10, v2) differs from the numeric sort (v2, v10).
    pointsByField: { temp: [p10, p2a, p2b], humidity: [otherFieldPoint] },
    data_count: 7,
    unit: "C",
  });

  const result = expandLayerBySubsetVersion(item);

  expect(result).toHaveLength(2);
  // Numeric sort places v2 before v10 (lexicographic would put v10 first).
  expect(result[0].layer.label).toBe("L (subset_version=v2)");
  expect((result[0].layer as { color?: string }).color).toBe("#0000FF");
  expect(result[0].pointsByField.temp).toEqual([p2a, p2b]);
  expect(result[1].layer.label).toBe("L (subset_version=v10)");
  expect((result[1].layer as { color?: string }).color).toBe("#FF0000");
  expect(result[1].pointsByField.temp).toEqual([p10]);
  // Other fields and item metadata are preserved (object spreads).
  expect(result[0].pointsByField.humidity).toEqual([otherFieldPoint]);
  expect(result[0].data_count).toBe(7);
  expect(result[0].unit).toBe("C");
});

test("expandLayerBySubsetVersion expands when only some points carry a subset_version", () => {
  // 'some' (not 'every') semantics: one point with, one without → still expands, and the
  // missing subset_version groups under 'unknown' (via optional chaining).
  const item = processed({
    pointsByField: { temp: [point(5), point()] },
  });
  const result = expandLayerBySubsetVersion(item);
  expect(result.map((r) => r.layer.label)).toEqual([
    "subset_version=5",
    "subset_version=unknown",
  ]);
});

test("expandLayerBySubsetVersion alternates colors across three or more groups", () => {
  const item = processed({
    pointsByField: { temp: [point(1), point(2), point(3)] },
  });
  const result = expandLayerBySubsetVersion(item);
  expect(result.map((r) => (r.layer as { color?: string }).color)).toEqual([
    "#0000FF",
    "#FF0000",
    "#0000FF",
  ]);
});

test("expandLayerBySubsetVersion labels without a base label and falls back to 'unknown'", () => {
  const item = processed({
    layer: lineLayer({ fields: ["temp"], label: undefined }),
    pointsByField: { temp: [point(null)] },
  });
  const result = expandLayerBySubsetVersion(item);
  expect(result).toHaveLength(1);
  expect(result[0].layer.label).toBe("subset_version=unknown");
});

// --- countUniqueSubsetVersions ----------------------------------------------

test("countUniqueSubsetVersions returns 0 for undefined or empty points", () => {
  expect(countUniqueSubsetVersions(undefined)).toBe(0);
  expect(countUniqueSubsetVersions([])).toBe(0);
});

test("countUniqueSubsetVersions returns 0 when no point carries a subset_version", () => {
  expect(countUniqueSubsetVersions([point(), point()])).toBe(0);
});

test("countUniqueSubsetVersions counts distinct values and ignores duplicates", () => {
  expect(countUniqueSubsetVersions([point(2), point(2), point(10)])).toBe(2);
});

test("countUniqueSubsetVersions ignores null and undefined but counts falsy values like 0", () => {
  expect(countUniqueSubsetVersions([point(null), point(), point(0)])).toBe(1);
});

test("countUniqueSubsetVersions returns 0 when every value is null", () => {
  expect(countUniqueSubsetVersions([point(null), point(null)])).toBe(0);
});

test("countUniqueSubsetVersions coerces to string so 2 and '2' are the same version", () => {
  expect(countUniqueSubsetVersions([point(2), point("2")])).toBe(1);
});

// --- createNotIngestedDataResponse ------------------------------------------

test("createNotIngestedDataResponse returns a fresh empty response", () => {
  expect(createNotIngestedDataResponse()).toEqual({
    data: [],
    data_begin: "",
    data_count: 0,
    data_end: "",
    downsampling_factor: 1,
    from_isotimestamp: "",
    nominal_data_interval_seconds: null,
    query_elapsed_ms: 0,
    to_isotimestamp: "",
  });
  // Distinct object per call so callers can't accidentally share state.
  expect(createNotIngestedDataResponse()).not.toBe(
    createNotIngestedDataResponse(),
  );
});
