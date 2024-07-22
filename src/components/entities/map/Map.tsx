import {
  Cartesian3,
  Viewer as CesiumViewer,
  Color,
  ProviderViewModel,
  WebMapTileServiceImageryProvider,
} from "cesium";
import React, { useEffect, useRef, useState } from "react";
import { DataResponse, Product } from "../../../types/api";
import { DateRange } from "../../../types/time";
import { MapEntity, MapLayer } from "../../../types/view";
import { getData } from "../../../utilities/api";
import { isAbortError } from "../../../utilities/generic";
import { getProductForLayer } from "../../../utilities/product";
import EntityHeader from "../../page/EntityHeader";
import "./Map.css";
import { gibsTilingScheme } from "./lib/gibs";

export declare type MapProps = {
  dateRange: DateRange;
  mapEntity: MapEntity;
  products: Product[];
};

export declare type Geolocation = {
  latitude: number;
  longitude: number;
};

export const Map = ({ mapEntity, products, dateRange }: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<Error | null>();

  const cancelHandles: Record<string, () => void> = {};

  // Maximum number of points the api can performantly return (TODO: should be a config option)
  const MAX_POINT_NUMBER = 20000;

  const fetchLayerData = (
    layer: MapLayer,
    products: Product[],
    startTime: string | undefined,
    endTime: string | undefined
  ): Promise<{ layer: MapLayer; result: DataResponse }> => {
    const layerFullId = `${layer.mission}_${layer.dataset}_${layer.field}_${layer.instrument}`;
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
        layer.field,
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
    const points: { latitude: number; longitude: number }[] = [];

    // TODO: does it make sense to support multiple layers for the map view?
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    results.map(({ result, layer }) => {
      downsampling = result.downsampling_factor;
      result.data.forEach((d) => {
        console.log(result);
        const geolocation: Geolocation = d.location as unknown as Geolocation;
        if (!geolocation) return;
        points.push({
          latitude: geolocation["latitude"],
          longitude: geolocation["longitude"],
        });
      });
    });

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
      });

      // Set max/min zoom to limits of basemap imagery available (camera height in meters)
      viewerRef.current.scene.screenSpaceCameraController.minimumZoomDistance = 200000;
      viewerRef.current.scene.screenSpaceCameraController.maximumZoomDistance = 40000000;
    }
  }, []);

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
      </div>
    </React.Fragment>
  );
};

export default Map;
