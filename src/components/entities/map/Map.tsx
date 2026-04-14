import {
  Cartesian2,
  Cartesian3,
  Viewer as CesiumViewer,
  Color,
  defined,
  Entity as CesiumEntity,
  ProviderViewModel,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
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
import {
  MAX_ZOOM_DISTANCE,
  MIN_ZOOM_DISTANCE,
  gibsTilingScheme,
} from "./lib/gibs";

export declare type MapProps = {
  dateRange: DateRange;
  mapEntity: MapEntity;
  products: Product[];
};

export declare type Location = {
  latitude: number;
  longitude: number;
};

export const Map = ({ mapEntity, products, dateRange }: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);

  // Maximum number of points the api can performantly return (TODO: should be a config option)
  const MAX_POINT_NUMBER = 55000;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>();
  const [hasData, setHasData] = useState(false);
  const [tooltip, setTooltip] = useState<{
    fields: { label: string; value: string }[];
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0, fields: [] });
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);

  const cancelHandles = useMemo(() => {
    return {} as Record<string, () => void>;
  }, []);

  const fetchLayerData = (
    layer: MapLayer,
    products: Product[],
    startTime: string | undefined,
    endTime: string | undefined
  ): Promise<{ layer: MapLayer; result: DataResponse }> => {
    const layerFullId = getDataLayerId(layer);
    if (cancelHandles[layerFullId]) {
      cancelHandles[layerFullId]();
    }
    return new Promise((resolve, reject) => {
      const computedStartTime = startTime || layer.startTime;
      const computedEndTime = endTime || layer.endTime;

      // Compute aggregation factor
      const durationSeconds =
        (new Date(computedEndTime).getTime() -
          new Date(computedStartTime).getTime()) /
        1000;

      const product = getProductForLayer(layer, products);
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
            pointsForDuration < MAX_POINT_NUMBER ||
            nextPointsForDuration == null
          ) {
            downsamplingFactor = resolution.downsampling_factor;
            break;
          }
        }
      }

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
        downsamplingFactor
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
    endTime?: string
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
          fetchLayerData(layer, products, startTime, endTime)
        )
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

  const setupTooltipHandler = () => {
    if (!viewerRef.current) return;

    // Remove existing handler
    if (handlerRef.current) {
      handlerRef.current.destroy();
      handlerRef.current = null;
    }

    const handler = new ScreenSpaceEventHandler(
      viewerRef.current.scene.canvas
    );

    handler.setInputAction(
      (movement: { endPosition: Cartesian2 }) => {
        if (!viewerRef.current) return;
        const picked = viewerRef.current.scene.pick(movement.endPosition);
        if (defined(picked) && picked.id?.properties) {
          const props = picked.id.properties;
          const propertyNames = props.propertyNames as string[];
          const fields = propertyNames.map((name: string) => ({
            label: name,
            value: String(props[name]?.getValue?.(viewerRef.current!.clock.currentTime) ?? props[name]),
          }));
          setTooltip({
            visible: true,
            x: movement.endPosition.x,
            y: movement.endPosition.y,
            fields,
          });
        } else {
          setTooltip((prev) =>
            prev.visible
              ? { visible: false, x: 0, y: 0, fields: [] }
              : prev
          );
        }
      },
      ScreenSpaceEventType.MOUSE_MOVE
    );

    handlerRef.current = handler;
  };

  const visualizeMapLayers = async (
    layers: MapLayer[],
    products: Product[],
    startTime?: string,
    endTime?: string
  ) => {
    const { results, error, aborted } = await fetchAllLayerData(
      layers,
      products,
      startTime,
      endTime
    );
    if (error || aborted || !mapRef.current) {
      return;
    }

    let downsampling = 1;
    const points: {
      color: Color;
      latitude: number;
      longitude: number;
      pixelSize: number;
      tooltipData?: Record<string, unknown>;
    }[] = [];

    // Collect tooltip fields from all layers
    const tooltipFields = layers.flatMap((l) => l.tooltipFields ?? []);

    // TODO: does it make sense to support multiple layers for the map view?
    results.map(({ layer, result }) => {
      downsampling = result.downsampling_factor;
      const layerColor = layer.color
        ? Color.fromCssColorString(layer.color)
        : Color.RED;
      const layerPointSize = layer.pointRadius ?? 5;

      result.data.forEach((d) => {
        const location: Location = d.location as unknown as Location;
        if (!location) return;
        const tooltipData: Record<string, unknown> = {};
        const fields = layer.tooltipFields ?? [];
        for (const field of fields) {
          const entry = d[field];
          if (entry !== undefined) {
            tooltipData[field] =
              typeof entry === "object" && entry !== null && "value" in entry
                ? entry.value
                : entry;
          }
        }
        points.push({
          latitude: location["latitude"],
          longitude: location["longitude"],
          color: layerColor,
          pixelSize: layerPointSize,
          tooltipData:
            Object.keys(tooltipData).length > 0 ? tooltipData : undefined,
        });
      });
    });

    setHasData(points.length > 0);

    if (viewerRef.current) {
      // Clear existing points/lines
      viewerRef.current.entities.removeAll();

      // For full-res data, render individual points; for decimated data, render polylines
      if (downsampling === 1) {
        points.forEach((point) => {
          const entity: CesiumEntity.ConstructorOptions = {
            position: Cartesian3.fromDegrees(point.longitude, point.latitude),
            point: {
              pixelSize: point.pixelSize,
              color: point.color,
            },
          };
          if (point.tooltipData) {
            entity.properties = point.tooltipData as unknown as CesiumEntity.ConstructorOptions["properties"];
          }
          viewerRef.current?.entities.add(entity);
        });
      } else {
        const layerColor = layers[0]?.color
          ? Color.fromCssColorString(layers[0].color)
          : Color.RED;
        const coordinates = points.map((point) =>
          Cartesian3.fromDegrees(point.longitude, point.latitude)
        );
        viewerRef.current?.entities.add({
          polyline: {
            positions: coordinates,
            width: 1,
            material: layerColor,
          },
        });
      }

      // Set up tooltip hover handler if tooltip fields are configured
      if (tooltipFields.length > 0) {
        setupTooltipHandler();
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
            maximumLevel: 8,
            tileWidth: 256,
            tileHeight: 256,
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

      // Set max/min zoom to limits of basemap imagery available (camera height in meters)
      viewerRef.current.scene.screenSpaceCameraController.minimumZoomDistance =
        MIN_ZOOM_DISTANCE;
      viewerRef.current.scene.screenSpaceCameraController.maximumZoomDistance =
        MAX_ZOOM_DISTANCE;
    }

    return () => {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
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
      dateRange.end
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, products, mapEntity.layers]);

  return (
    <React.Fragment>
      <EntityHeader title={mapEntity.title} />
      <div className="cesium-container">
        <div className="viewer-container" ref={mapRef} />
        {renderMapOverlays()}
        {tooltip.visible && tooltip.fields.length > 0 && (
          <div
            className="map-tooltip pointer-events-none absolute z-50 rounded bg-foreground px-3 py-2 text-xs text-white shadow-lg"
            style={{
              left: `${tooltip.x + 12}px`,
              top: `${tooltip.y - 12}px`,
            }}
          >
            {tooltip.fields.map((field) => (
              <div key={field.label} className="flex gap-2 py-0.5">
                <span className="font-medium text-gray-300">
                  {field.label}:
                </span>
                <span>{field.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

export default Map;
