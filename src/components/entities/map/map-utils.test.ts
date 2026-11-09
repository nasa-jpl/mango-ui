import { expect, test } from "vitest";
import type { DataResponse, ProductResolution } from "../../../types/api";
import {
  computeCameraZoomLimits,
  CameraZoomLimitsInput,
  computeDownsamplingFactor,
  extractMapPoints,
  getDurationSeconds,
  ZOOM_IN_SLACK,
  ZOOM_OUT_SLACK,
} from "./map-utils";

function res(
  downsampling_factor: number,
  nominal_data_interval_seconds: number,
): ProductResolution {
  return { downsampling_factor, nominal_data_interval_seconds };
}

function pt(latitude: number, longitude: number) {
  return { location: { latitude, longitude } };
}

function layerResult(
  downsampling_factor: number,
  data: unknown[],
): { result: DataResponse } {
  return { result: { downsampling_factor, data } as unknown as DataResponse };
}

// --- getDurationSeconds -----------------------------------------------------

test("getDurationSeconds returns the end-minus-start span in seconds", () => {
  expect(
    getDurationSeconds("2020-01-01T00:00:00Z", "2020-01-01T00:01:30Z"),
  ).toBe(90);
  expect(
    getDurationSeconds("2020-01-01T00:00:00Z", "2020-01-01T02:00:00Z"),
  ).toBe(7200);
});

test("getDurationSeconds is negative when the range is reversed", () => {
  expect(
    getDurationSeconds("2020-01-01T00:01:30Z", "2020-01-01T00:00:00Z"),
  ).toBe(-90);
});

// --- computeDownsamplingFactor ----------------------------------------------

// Fine -> coarse resolutions: interval grows (fewer points), factor grows.
const A = res(1, 5);
const B = res(4, 20);
const C = res(16, 100);

test("computeDownsamplingFactor returns 1 when there are no resolutions", () => {
  expect(computeDownsamplingFactor([], 1000, 100)).toBe(1);
});

test("computeDownsamplingFactor picks the finest resolution already under the point cap", () => {
  // duration 200 => A yields 40 points (< 100), so A is chosen immediately.
  expect(computeDownsamplingFactor([A, B, C], 200, 100)).toBe(1);
});

test("computeDownsamplingFactor skips too-dense resolutions until one fits the cap", () => {
  // duration 1000 => A=200 pts (>=100) skip; B=50 pts (<100) chosen.
  expect(computeDownsamplingFactor([A, B, C], 1000, 100)).toBe(4);
});

test("computeDownsamplingFactor falls back to the coarsest resolution when none fit", () => {
  // duration 100000 => every resolution exceeds the cap; last (C) chosen via null-next fallback.
  expect(computeDownsamplingFactor([A, B, C], 100000, 100)).toBe(16);
});

test("computeDownsamplingFactor selects a lone resolution even when it exceeds the cap", () => {
  const solo = res(7, 5);
  expect(computeDownsamplingFactor([solo], 100000, 100)).toBe(7);
});

test("computeDownsamplingFactor treats a point count equal to the cap as over the cap", () => {
  // duration 1000 => first resolution yields exactly 100 points (== cap), so it is skipped
  // in favour of the next; a strict '<' comparison is required here.
  const exact = res(1, 10); // 1000 / 10 = 100 points
  const coarser = res(4, 20); // 1000 / 20 = 50 points
  expect(computeDownsamplingFactor([exact, coarser], 1000, 100)).toBe(4);
});

// --- extractMapPoints -------------------------------------------------------

test("extractMapPoints returns downsampling 1 and no points for empty results", () => {
  expect(extractMapPoints([])).toEqual({ downsampling: 1, points: [] });
});

test("extractMapPoints collects lat/lng points and the result's downsampling factor", () => {
  expect(extractMapPoints([layerResult(4, [pt(10, 20), pt(30, 40)])])).toEqual({
    downsampling: 4,
    points: [
      { latitude: 10, longitude: 20 },
      { latitude: 30, longitude: 40 },
    ],
  });
});

test("extractMapPoints skips entries whose location is missing or null", () => {
  expect(
    extractMapPoints([
      layerResult(1, [pt(1, 1), {}, { location: null }, pt(2, 2)]),
    ]),
  ).toEqual({
    downsampling: 1,
    points: [
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 2 },
    ],
  });
});

test("extractMapPoints accumulates points across results and keeps the last downsampling factor", () => {
  expect(
    extractMapPoints([layerResult(2, [pt(1, 2)]), layerResult(8, [pt(3, 4)])]),
  ).toEqual({
    downsampling: 8,
    points: [
      { latitude: 1, longitude: 2 },
      { latitude: 3, longitude: 4 },
    ],
  });
});

// Round numbers so expected limits are easy to derive by hand: a 90° field of view makes
// tan(fov / 2) = 1, so a camera at height h sees 2h meters across the larger dimension.
function limitsInput(
  overrides: Partial<CameraZoomLimitsInput> = {},
): CameraZoomLimitsInput {
  return {
    globeRadius: 1000,
    metersPerPixel: 10,
    mode: "3D",
    fov: Math.PI / 2,
    widthPx: 400,
    heightPx: 200,
    ...overrides,
  };
}

test("the slack factors loosen both limits", () => {
  expect(ZOOM_IN_SLACK).toBe(2);
  expect(ZOOM_OUT_SLACK).toBe(1.5);
});

test("3D zoom-in limit stops where image pixels cover ZOOM_IN_SLACK screen pixels", () => {
  // 400px across at 10 m/px is 4000 m natively; 2× over-zoom allows 2000 m, i.e. h = 1000.
  expect(
    computeCameraZoomLimits(limitsInput()).minimumZoomDistance,
  ).toBeCloseTo(1000);
});

test("the zoom-in limit scales with the field of view", () => {
  // 60°: tan(30°) = 1/√3, so 4000 m natively over-zoomed 2× needs h = 1000·√3.
  expect(
    computeCameraZoomLimits(limitsInput({ fov: Math.PI / 3 }))
      .minimumZoomDistance,
  ).toBeCloseTo(1000 * Math.sqrt(3));
});

test("the zoom-in limit follows the larger dimension for tall maps too", () => {
  const wide = computeCameraZoomLimits(limitsInput());
  const tall = computeCameraZoomLimits(
    limitsInput({ widthPx: 200, heightPx: 400 }),
  );
  expect(tall.minimumZoomDistance).toBeCloseTo(wide.minimumZoomDistance);
});

test("a bigger map or a coarser basemap allows less zooming in", () => {
  const base = computeCameraZoomLimits(limitsInput()).minimumZoomDistance;
  expect(
    computeCameraZoomLimits(limitsInput({ widthPx: 800, heightPx: 400 }))
      .minimumZoomDistance,
  ).toBeCloseTo(base * 2);
  expect(
    computeCameraZoomLimits(limitsInput({ metersPerPixel: 20 }))
      .minimumZoomDistance,
  ).toBeCloseTo(base * 2);
});

test("3D zoom-out limit fits the globe in the narrower field of view, with slack", () => {
  // Square map: 90° both ways, so the globe fills the view at R / sin(45°) from its center.
  const { maximumZoomDistance } = computeCameraZoomLimits(
    limitsInput({ widthPx: 300, heightPx: 300 }),
  );
  expect(maximumZoomDistance).toBeCloseTo((1000 / Math.SQRT1_2) * 1.5 - 1000);
});

test("3D zoom-out limit uses the vertical field of view on a wide map", () => {
  // 2:1 wide: tan(fovY / 2) = 0.5.
  const halfFovY = Math.atan(0.5);
  expect(
    computeCameraZoomLimits(limitsInput()).maximumZoomDistance,
  ).toBeCloseTo((1000 / Math.sin(halfFovY)) * 1.5 - 1000);
});

test("3D zoom-out limit uses the horizontal field of view on a tall map", () => {
  const halfFovX = Math.atan(0.5);
  expect(
    computeCameraZoomLimits(limitsInput({ widthPx: 200, heightPx: 400 }))
      .maximumZoomDistance,
  ).toBeCloseTo((1000 / Math.sin(halfFovX)) * 1.5 - 1000);
});

test("Columbus view zooms in like 3D", () => {
  expect(
    computeCameraZoomLimits(limitsInput({ mode: "columbus" }))
      .minimumZoomDistance,
  ).toBeCloseTo(1000);
});

test("Columbus view zooms out until the flat map fits, with slack", () => {
  // 2:1 wide view (tan halves 1 and 0.5) over a 2πR × πR map: both dimensions need h = πR.
  expect(
    computeCameraZoomLimits(limitsInput({ mode: "columbus" }))
      .maximumZoomDistance,
  ).toBeCloseTo(Math.PI * 1000 * 1.5);
  // Square view (tan halves 1 and 1): width needs πR, height only πR / 2.
  expect(
    computeCameraZoomLimits(
      limitsInput({ mode: "columbus", widthPx: 300, heightPx: 300 }),
    ).maximumZoomDistance,
  ).toBeCloseTo(Math.PI * 1000 * 1.5);
  // Tall 1:2 view (tan halves 0.5 and 1): width needs 2πR.
  expect(
    computeCameraZoomLimits(
      limitsInput({ mode: "columbus", widthPx: 200, heightPx: 400 }),
    ).maximumZoomDistance,
  ).toBeCloseTo(2 * Math.PI * 1000 * 1.5);
  // 3:2 view (tan halves 1 and 2/3): width needs πR, height only 0.75πR.
  expect(
    computeCameraZoomLimits(
      limitsInput({ mode: "columbus", widthPx: 300, heightPx: 200 }),
    ).maximumZoomDistance,
  ).toBeCloseTo(Math.PI * 1000 * 1.5);
  // Very wide 4:1 view (tan halves 1 and 0.25): height needs 2πR.
  expect(
    computeCameraZoomLimits(
      limitsInput({ mode: "columbus", widthPx: 800, heightPx: 200 }),
    ).maximumZoomDistance,
  ).toBeCloseTo(2 * Math.PI * 1000 * 1.5);
});

test("2D limits are visible spans: native resolution in, whole map out", () => {
  const { minimumZoomDistance, maximumZoomDistance } = computeCameraZoomLimits(
    limitsInput({ mode: "2D" }),
  );
  // 400px at 10 m/px over-zoomed 2× spans 2000 m.
  expect(minimumZoomDistance).toBeCloseTo(2000);
  // A 2:1 view fits the 2πR × πR map exactly across its width.
  expect(maximumZoomDistance).toBeCloseTo(2 * Math.PI * 1000 * 1.5);
});

test("2D zoom-out span grows to fit the map's height in very wide views", () => {
  // 4:1 view: showing all πR of height needs a 4πR span.
  expect(
    computeCameraZoomLimits(
      limitsInput({ mode: "2D", widthPx: 800, heightPx: 200 }),
    ).maximumZoomDistance,
  ).toBeCloseTo(4 * Math.PI * 1000 * 1.5);
});

test("2D zoom-out span in tall views is the larger of map height and scaled width", () => {
  // 1:2 view: fitting 2πR across the width needs a 4πR vertical span.
  expect(
    computeCameraZoomLimits(
      limitsInput({ mode: "2D", widthPx: 200, heightPx: 400 }),
    ).maximumZoomDistance,
  ).toBeCloseTo(4 * Math.PI * 1000 * 1.5);
  // 1:1.1 view barely taller than wide: 2πR / (1/1.1) beats πR.
  expect(
    computeCameraZoomLimits(
      limitsInput({ mode: "2D", widthPx: 1000, heightPx: 1100 }),
    ).maximumZoomDistance,
  ).toBeCloseTo(2 * Math.PI * 1000 * 1.1 * 1.5);
});
