import { expect, test } from "vitest";
import { ChartLayer } from "../../../types/view";
import { HttpError } from "../../../utilities/api";
import {
  computeDownsamplingFactor,
  computeFetchWindow,
  createNotIngestedDataResponse,
  isNotIngestedError,
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
