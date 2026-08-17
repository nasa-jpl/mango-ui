import { expect, test } from "vitest";
import type { DataResponse, ProductResolution } from "../../../types/api";
import {
  computeDownsamplingFactor,
  extractMapPoints,
  getDurationSeconds,
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
