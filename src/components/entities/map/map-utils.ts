import type { DataResponse, ProductResolution } from "../../../types/api";

export declare type Location = {
  latitude: number;
  longitude: number;
};

/** Duration between two ISO timestamps, in seconds (`end - start`). */
export function getDurationSeconds(startTime: string, endTime: string): number {
  return (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;
}

/**
 * Pick the downsampling factor for a time range: the first (finest) resolution whose estimated
 * point count stays under `maxPointNumber`, falling back to the coarsest resolution when none do.
 * Returns `1` when there are no resolutions to choose from.
 */
export function computeDownsamplingFactor(
  resolutions: ProductResolution[],
  durationSeconds: number,
  maxPointNumber: number,
): number {
  let downsamplingFactor = 1;
  for (let i = 0; i < resolutions.length; i++) {
    const resolution = resolutions[i];
    const nextResolution = resolutions[i + 1];
    const pointsForDuration =
      durationSeconds / resolution.nominal_data_interval_seconds;

    if (pointsForDuration < maxPointNumber || nextResolution == null) {
      downsamplingFactor = resolution.downsampling_factor;
      break;
    }
  }
  return downsamplingFactor;
}

/**
 * Flatten fetched layer results into plottable lat/lng points, skipping entries with no location.
 * `downsampling` reflects the last result's downsampling factor (drives point vs. polyline rendering).
 */
export function extractMapPoints(results: { result: DataResponse }[]): {
  downsampling: number;
  points: Location[];
} {
  let downsampling = 1;
  const points: Location[] = [];

  results.forEach(({ result }) => {
    downsampling = result.downsampling_factor;
    result.data.forEach((d) => {
      const location = d.location as unknown as Location | undefined;
      if (!location) {
        return;
      }
      points.push({
        latitude: location.latitude,
        longitude: location.longitude,
      });
    });
  });

  return { downsampling, points };
}
