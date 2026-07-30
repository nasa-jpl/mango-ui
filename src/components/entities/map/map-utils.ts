import type { ProductResolution } from "../../../types/api";

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
