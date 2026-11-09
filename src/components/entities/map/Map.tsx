import {
  Cartesian3,
  Viewer as CesiumViewer,
  Color,
  ImageryLayer,
  Math as CesiumMath,
  PerspectiveFrustum,
  ProviderViewModel,
  SceneMode,
  WebMapTileServiceImageryProvider,
} from "cesium";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { DataResponse, Product } from "../../../types/api";
import { DateRange } from "../../../types/time";
import { MapEntity, MapLayer } from "../../../types/view";
import { getData } from "../../../utilities/api";
import { getDataLayerId, isAbortError } from "../../../utilities/generic";
import { getProductForLayer } from "../../../utilities/product";
import EntityHeader from "../../page/EntityHeader";
import "./Map.css";
import { gibsTilingScheme } from "./lib/gibs";
import {
  CameraSceneMode,
  computeCameraZoomLimits,
  computeDownsamplingFactor,
  extractMapPoints,
  getDurationSeconds,
} from "./map-utils";

export declare type MapProps = {
  dateRange: DateRange;
  mapEntity: MapEntity;
  products: Product[];
};

export const Map = ({ mapEntity, products, dateRange }: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);

  // Maximum number of points the api can performantly return (TODO: should be a config option)
  const MAX_POINT_NUMBER = 55000;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>();
  const [hasData, setHasData] = useState(false);

  const cancelHandles = useMemo(() => {
    return {} as Record<string, () => void>;
  }, []);

  const fetchLayerData = (
    layer: MapLayer,
    products: Product[],
    startTime: string | undefined,
    endTime: string | undefined,
  ): Promise<{ layer: MapLayer; result: DataResponse }> => {
    const layerFullId = getDataLayerId(layer);
    if (cancelHandles[layerFullId]) {
      cancelHandles[layerFullId]();
    }
    return new Promise((resolve, reject) => {
      const computedStartTime = startTime || layer.startTime;
      const computedEndTime = endTime || layer.endTime;

      // Compute aggregation factor
      const durationSeconds = getDurationSeconds(
        computedStartTime,
        computedEndTime,
      );

      const product = getProductForLayer(layer, products);
      const downsamplingFactor = computeDownsamplingFactor(
        product?.available_resolutions ?? [],
        durationSeconds,
        MAX_POINT_NUMBER,
      );

      const { json, cancel } = getData(
        layer.mission,
        layer.dataset,
        layer.instrument,
        layer.version,
        layer.fields,
        layer.channels ?? [],
        // TODO: check whether or not to sync with page date range
        computedStartTime,
        computedEndTime,
        downsamplingFactor,
      );
      cancelHandles[layerFullId] = cancel;
      json()
        .then((result) => {
          delete cancelHandles[layerFullId];
          resolve({
            layer,
            result,
          });
        })
        .catch((error) => {
          if (!isAbortError(error)) {
            delete cancelHandles[layerFullId];
            reject(error);
          }
        });
    });
  };

  const fetchAllLayerData = async (
    layers: MapLayer[],
    products: Product[],
    startTime?: string,
    endTime?: string,
  ) => {
    setLoading(true);
    setError(null);
    let results: {
      layer: MapLayer;
      result: DataResponse;
    }[] = [];
    let aborted = false;
    let error = false;
    try {
      results = await Promise.all(
        layers.map((layer) =>
          fetchLayerData(layer, products, startTime, endTime),
        ),
      );
      setLoading(false);
    } catch (err) {
      if (!isAbortError(err)) {
        setError(err as Error);
        error = true;
        setLoading(false);
      } else {
        aborted = true;
      }
    }
    return { results, aborted, error };
  };

  const visualizeMapLayers = async (
    layers: MapLayer[],
    products: Product[],
    startTime?: string,
    endTime?: string,
  ) => {
    const { results, error, aborted } = await fetchAllLayerData(
      layers,
      products,
      startTime,
      endTime,
    );
    if (error || aborted || !mapRef.current) {
      return;
    }

    // TODO: does it make sense to support multiple layers for the map view?
    const { downsampling, points } = extractMapPoints(results);

    setHasData(points.length > 0);

    if (viewerRef.current) {
      // Clear existing points/lines
      viewerRef.current.entities.removeAll();

      const coordinates = points.map((point) => {
        return Cartesian3.fromDegrees(point.longitude, point.latitude);
      });

      // For full-res data, render individual points; for decimated data, render polylines
      if (downsampling === 1) {
        coordinates.forEach((coordinate) => {
          viewerRef.current?.entities.add({
            position: coordinate,
            point: {
              pixelSize: 1,
              color: Color.RED,
            },
          });
        });
      } else {
        viewerRef.current?.entities.add({
          polyline: {
            positions: coordinates,
            width: 1,
            material: Color.RED,
          },
        });
      }

      // Trigger Cesium map update
      viewerRef.current.scene.requestRender();
    }
  };

  useEffect(() => {
    if (mapRef.current && !viewerRef.current) {
      const models: ProviderViewModel[] = [];
      const model = new ProviderViewModel({
        name: "BlueMarble_ShadedRelief_Bathymetry",
        iconUrl:
          "https://gibs-b.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-08/500m/2/0/2.jpeg",
        tooltip: "BlueMarble_ShadedRelief_Bathymetry",
        creationFunction: function () {
          return new WebMapTileServiceImageryProvider({
            url: "https://gibs-{s}.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-08/500m/{TileMatrix}/{TileRow}/{TileCol}.jpeg",
            layer: "BlueMarble_ShadedRelief_Bathymetry",
            style: "default",
            format: "image/jpeg",
            tileMatrixSetID: "500m",
            // The 500m tile matrix set has levels 0–7 of 512px tiles
            maximumLevel: 7,
            tileWidth: 512,
            tileHeight: 512,
            tilingScheme: gibsTilingScheme(),
          });
        },
      });

      models.push(model);

      viewerRef.current = new CesiumViewer(mapRef.current as HTMLDivElement, {
        animation: false,
        baseLayerPicker: true,
        geocoder: false,
        timeline: false,
        homeButton: false,
        navigationHelpButton: false,
        imageryProviderViewModels: models,
        terrainProviderViewModels: [],
        // Must be provided or cesium will attempt to load Bing maps
        selectedImageryProviderViewModel: models[0],
        fullscreenButton: false,
        msaaSamples: 4,
      });
    }

    const viewer = viewerRef.current;
    if (!viewer || !mapRef.current) {
      return;
    }

    // Keep zoom between "the basemap is about to pixelate" and "the whole map fills the view".
    // Both depend on the map's size, the scene mode and the basemap, so recompute when any changes.
    const updateZoomLimits = () => {
      const { scene } = viewer;
      const { clientWidth: widthPx, clientHeight: heightPx } = scene.canvas;
      const baseLayer = viewer.imageryLayers.get(0);
      // The basemap's provider loads asynchronously; updateWhenReady covers it
      if (!widthPx || !heightPx || !baseLayer?.ready) {
        return;
      }
      const provider = baseLayer.imageryProvider;
      const globeRadius = scene.globe.ellipsoid.maximumRadius;
      const finestTile = provider.tilingScheme.tileXYToRectangle(
        0,
        0,
        provider.maximumLevel ?? 0,
      );
      const modes: Partial<Record<SceneMode, CameraSceneMode>> = {
        [SceneMode.SCENE2D]: "2D",
        [SceneMode.COLUMBUS_VIEW]: "columbus",
      };
      const frustum = scene.camera.frustum;
      const limits = computeCameraZoomLimits({
        globeRadius,
        metersPerPixel: (finestTile.width / provider.tileWidth) * globeRadius,
        mode: modes[scene.mode] ?? "3D",
        fov:
          frustum instanceof PerspectiveFrustum && frustum.fov
            ? frustum.fov
            : CesiumMath.toRadians(60),
        widthPx,
        heightPx,
      });
      scene.screenSpaceCameraController.minimumZoomDistance =
        limits.minimumZoomDistance;
      scene.screenSpaceCameraController.maximumZoomDistance =
        limits.maximumZoomDistance;
    };

    const removeListeners: (() => void)[] = [];
    const updateWhenReady = (layer?: ImageryLayer) => {
      if (layer && !layer.ready) {
        removeListeners.push(
          layer.readyEvent.addEventListener(updateZoomLimits),
        );
      } else {
        updateZoomLimits();
      }
    };

    updateWhenReady(viewer.imageryLayers.get(0));
    const resizeObserver = new ResizeObserver(() => updateZoomLimits());
    resizeObserver.observe(mapRef.current);
    removeListeners.push(
      viewer.scene.morphComplete.addEventListener(updateZoomLimits),
      viewer.imageryLayers.layerAdded.addEventListener(updateWhenReady),
    );
    return () => {
      resizeObserver.disconnect();
      removeListeners.forEach((remove) => remove());
    };
  }, []);

  const renderMapOverlays = () => {
    if (!viewerRef.current) {
      return;
    }
    return (
      <>
        {loading && (
          <div
            className="map-loading-indicator  font-medium bg-gray-50 border rounded-sm text-[10px] py-0.5 px-2 pointer-events-none absolute translate-x-[-50%] translate-y-[-50%] text-secondary-foreground mt-0"
            style={{
              top: `${viewerRef.current.container.clientHeight / 2}px`,
              left: `${viewerRef.current.container.clientWidth / 2}px`,
            }}
          >
            Loading
          </div>
        )}
        {!loading && error && (
          <div
            className="border rounded-sm text-[10px] py-0.5 px-2 pointer-events-none absolute translate-x-[-50%] translate-y-[-50%] bg-red-100 text-red-600 border-red-500 max-w-[310px] mt-0"
            style={{
              top: `${viewerRef.current.container.clientHeight / 2}px`,
              left: `${viewerRef.current.container.clientWidth / 2}px`,
            }}
          >
            Error: {error.message}
          </div>
        )}
        {!loading && !error && !hasData && (
          <div
            className="font-medium bg-gray-50 border rounded-sm text-sm py-1 px-3 pointer-events-none absolute translate-x-[-50%] translate-y-[-50%] text-secondary-foreground mt-0"
            style={{
              top: `${viewerRef.current.container.clientHeight / 2}px`,
              left: `${viewerRef.current.container.clientWidth / 2}px`,
            }}
          >
            No data available
          </div>
        )}
      </>
    );
  };

  useEffect(() => {
    visualizeMapLayers(
      mapEntity.layers || [],
      products,
      dateRange.start,
      dateRange.end,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, products, mapEntity.layers]);

  return (
    <React.Fragment>
      <EntityHeader title={mapEntity.title} />
      <div className="cesium-container">
        <div className="viewer-container" ref={mapRef} />
        {renderMapOverlays()}
      </div>
    </React.Fragment>
  );
};

export default Map;
