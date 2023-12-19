import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { MapEntity } from "../../../types/view";
import EntityHeader from "../../page/EntityHeader";
import "./Map.css";

export declare type ChartProps = {
  mapEntity: MapEntity;
};

export const Map = ({ mapEntity }: ChartProps) => {
  const [mapInitialized, setMapInitialized] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current && !mapInitialized) {
      setMapInitialized(true);
      if (mapRef.current.childElementCount === 0) {
        const map = L.map(mapRef.current).setView([0, 0], 2);
        L.tileLayer(
          "https://gibs-{s}.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/EPSG3857_500m/{z}/{y}/{x}.jpeg",
          {
            maxZoom: 8,
          }
        ).addTo(map);
      }
    }
  }, [mapRef, mapInitialized]);

  return (
    <div className="map">
      <EntityHeader title={mapEntity.title} />
      <div ref={mapRef} id="map" />
    </div>
  );
};

export default Map;
