import {
  Viewer as CesiumViewer,
  Ion,
  ProviderViewModel,
  UrlTemplateImageryProvider,
} from "cesium";
import { useEffect, useRef } from "react";
import { DateRange } from "../../../types/time";
import { MapEntity } from "../../../types/view";
import EntityHeader from "../../page/EntityHeader";
import "./Map.css";

export declare type MapProps = {
  dateRange: DateRange;
  mapEntity: MapEntity;
};

export const Map = ({ mapEntity /* dateRange */ }: MapProps) => {
  const map = useRef<HTMLDivElement>(null);
  const imageryViewModels: ProviderViewModel[] = [];
  Ion.defaultAccessToken = "";

  imageryViewModels.push(
    new ProviderViewModel({
      name: "BlueMarble_ShadedRelief_Bathymetry",
      tooltip: "BlueMarble_ShadedRelief_Bathymetry",
      iconUrl:
        "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-08/500m/2/1/1.jpeg",
      creationFunction: function () {
        return new UrlTemplateImageryProvider({
          url: "https://gibs-{s}.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-08/500m/{z}/{y}/{x}.jpeg",
          minimumLevel: 0,
          maximumLevel: 18,
        });
      },
    })
  );

  useEffect(() => {
    const viewer = new CesiumViewer(map.current as HTMLDivElement, {
      imageryProviderViewModels: imageryViewModels,
      selectedImageryProviderViewModel: imageryViewModels[1],
      timeline: false,
      animation: false,
      fullscreenButton: false,
      infoBox: false,
    });

    viewer.baseLayerPicker.viewModel.terrainProviderViewModels = [];
    viewer.cesiumWidget.creditContainer.remove();
  }, [imageryViewModels]);

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
