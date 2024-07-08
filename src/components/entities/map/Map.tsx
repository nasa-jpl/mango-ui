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

export const Map = ({ mapEntity, products, dateRange }: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>();
  const cancelHandles: Record<string, () => void> = {};
  //TODO: this should probably be wrraped in the MapEntity
  let points: { latitude: number; longitude: number }[] = [];

  const fetchLayerData = (
    layer: MapLayer,
    products: Product[],
    startTime: string | undefined,
    endTime: string | undefined
  ): Promise<{ layer: MapLayer; result: DataResponse }> => {
    /* TODO maybe add the chart ID in here too so we can plot the stream multiple times on the same chart with diff options if needed */
    const layerFullId = `${layer.mission}_${layer.dataset}_${layer.field}_${layer.instrument}`;
    if (cancelHandles[layerFullId]) {
      cancelHandles[layerFullId]();
    }
    return new Promise((resolve, reject) => {
      const computedStartTime = startTime || layer.startTime;
      const computedEndTime = endTime || layer.endTime;
      const product = getProductForLayer(layer, products);
      let downsamplingFactor = 1;

      if (product) {
        for (let i = 0; i < product.available_resolutions.length; i++) {
          const resolution = product.available_resolutions[i];
          const nextResolution = product.available_resolutions[i + 1];
          const tmpds = zoomLevel / 1000000;
          if (
            tmpds < resolution.downsampling_factor ||
            nextResolution == null
          ) {
            downsamplingFactor = resolution.downsampling_factor;
            break;
          }
        }
      }
      console.log("Downsampling: ", downsamplingFactor);

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
          // console.log("Error caught: ", error);
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
      console.log("aborting");
      return;
    }
    results.map(({ result }) => {
      // clear old points
      points = [];
      result.data.forEach((d) => {
        const geolocation = d.location;
        // Case where downsampling is not applied
        if (result.downsampling_factor === 1) {
          points.push({
            latitude: geolocation.latitude,
            longitude: geolocation.longitude,
          });
        } else {
          points.push({
            latitude: geolocation.latitude,
            longitude: geolocation.longitude,
          });
        }
      });
    });

    if (viewerRef.current) {
      // clear existing entities
      viewerRef.current.entities.removeAll();
      points.forEach((d) => {
        viewerRef.current?.entities.add({
          position: Cartesian3.fromDegrees(d.longitude, d.latitude),
          point: {
            pixelSize: 2,
            color: Color.RED,
          },
        });
      });
      viewerRef.current.scene.requestRender();
    }
  };

  const onZoomComplete = () => {
    if (viewerRef.current) {
      const newZoomLevel = viewerRef.current.camera.positionCartographic.height;
      setZoomLevel(newZoomLevel);
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
        // must be provided or cesium will attempt to load Bing maps
        selectedImageryProviderViewModel: models[0],
        fullscreenButton: false,
      });

      viewerRef.current.camera.changed.addEventListener(onZoomComplete);

      // set max/min zoom (camera height in meters)
      viewerRef.current.scene.screenSpaceCameraController.minimumZoomDistance = 200000;
      viewerRef.current.scene.screenSpaceCameraController.maximumZoomDistance = 20000000;
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
  }, [dateRange, zoomLevel, products, mapEntity.layers]);

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
