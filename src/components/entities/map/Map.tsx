import {
  Viewer as CesiumViewer,
  ProviderViewModel,
  WebMapTileServiceImageryProvider,
} from "cesium";
import { useEffect, useRef } from "react";
import { DateRange } from "../../../types/time";
import { MapEntity } from "../../../types/view";
import EntityHeader from "../../page/EntityHeader";
import "./Map.css";
import { gibsTilingScheme } from "./gibs";

export declare type MapProps = {
  dateRange: DateRange;
  mapEntity: MapEntity;
};

export const Map = ({ mapEntity /* dateRange */ }: MapProps) => {
  const map = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const models = [];
    const model = new ProviderViewModel({
      name: "BlueMarble_ShadedRelief_Bathymetry",
      iconUrl: "",
      tooltip: "",
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

    const viewer = new CesiumViewer(map.current as HTMLDivElement, {
      animation: false,
      baseLayerPicker: false,
      geocoder: false,
      timeline: false,
      imageryProviderViewModels: models,
      fullscreenButton: false,
    });

    // Remove cesium-ion credit
    viewer.cesiumWidget.creditContainer.remove();
  }, []);

  return (
    <>
      <EntityHeader title={mapEntity.title} />
      <div className="cesium-container">
        <div className="viewer-container" ref={map} />
      </div>
    </>
  );
};

export default Map;
