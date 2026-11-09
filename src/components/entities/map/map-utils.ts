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

/* How far past the basemap's native resolution the camera may zoom in (2 = each image pixel can
 * cover up to 2 screen pixels before zooming stops). */
export const ZOOM_IN_SLACK = 2;
/* How far past "the whole map fills the view" the camera may zoom out (1.5 = the map can shrink to
 * about two thirds of the view). */
export const ZOOM_OUT_SLACK = 1.5;

export declare type CameraSceneMode = "3D" | "2D" | "columbus";

export declare type CameraZoomLimitsInput = {
  /* Camera field of view in radians, applied to the larger of width and height (as Cesium does) */
  fov: number;
  /* Radius of the globe, in meters */
  globeRadius: number;
  heightPx: number;
  /* Finest basemap resolution, in meters per image pixel */
  metersPerPixel: number;
  mode: CameraSceneMode;
  widthPx: number;
};

export declare type CameraZoomLimits = {
  maximumZoomDistance: number;
  minimumZoomDistance: number;
};

/**
 * Camera zoom limits that keep a map between "the basemap is about to pixelate" and "the whole map
 * fills the view", each loosened by its slack factor. Cesium compares these limits to the height
 * above the surface in 3D and Columbus view, and to the larger visible span in 2D, so the result
 * depends on the scene mode as well as the map's size in pixels.
 */
export function computeCameraZoomLimits({
  fov,
  globeRadius,
  heightPx,
  metersPerPixel,
  mode,
  widthPx,
}: CameraZoomLimitsInput): CameraZoomLimits {
  const aspect = widthPx / heightPx;
  const largerPx = Math.max(widthPx, heightPx);
  const tanHalfFov = Math.tan(fov / 2);
  // Cesium applies fov to the larger dimension; derive the half-angle tangent of the other one.
  const tanHalfFovX = tanHalfFov * Math.min(1, aspect);
  const tanHalfFovY = tanHalfFov / Math.max(1, aspect);
  // A flat map of the whole globe spans 2πR by πR.
  const mapWidth = 2 * Math.PI * globeRadius;
  const mapHeight = Math.PI * globeRadius;

  if (mode === "2D") {
    // Limits are compared to the larger visible span, in meters. The view's width must cover the
    // map's width, and its height (width / aspect) the map's height.
    const visibleWidthForWholeMap = Math.max(mapWidth, mapHeight * aspect);
    const visibleSpanForWholeMap =
      visibleWidthForWholeMap * Math.max(1, 1 / aspect);
    return {
      minimumZoomDistance: (metersPerPixel * largerPx) / ZOOM_IN_SLACK,
      maximumZoomDistance: visibleSpanForWholeMap * ZOOM_OUT_SLACK,
    };
  }

  // Looking straight down from height h, the larger dimension spans 2·h·tan(fov/2) meters.
  const minimumZoomDistance =
    (metersPerPixel * largerPx) / (2 * tanHalfFov * ZOOM_IN_SLACK);

  if (mode === "columbus") {
    const heightForWholeMap = Math.max(
      mapWidth / 2 / tanHalfFovX,
      mapHeight / 2 / tanHalfFovY,
    );
    return {
      minimumZoomDistance,
      maximumZoomDistance: heightForWholeMap * ZOOM_OUT_SLACK,
    };
  }

  // The globe just fills the narrower field of view when the camera is R / sin(halfAngle) from
  // its center.
  const halfNarrowFov = Math.atan(Math.min(tanHalfFovX, tanHalfFovY));
  const distanceForWholeGlobe = globeRadius / Math.sin(halfNarrowFov);
  return {
    minimumZoomDistance,
    maximumZoomDistance: distanceForWholeGlobe * ZOOM_OUT_SLACK - globeRadius,
  };
}
