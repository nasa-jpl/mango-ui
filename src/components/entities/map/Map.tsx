import L, { Map as MapType } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import useResizeObserver from "../../../hooks/resizeObserver";
import { DateRange } from "../../../types/time";
import { MapEntity } from "../../../types/view";
import EntityHeader from "../../page/EntityHeader";
import "./Map.css";

export declare type MapProps = {
  dateRange: DateRange;
  mapEntity: MapEntity;
};

export const Map = ({ mapEntity /* ,dateRange */ }: MapProps) => {
  const [mapInitialized, setMapInitialized] = useState(false);
  const map = useRef<MapType | null>();

  const test = "";

  const onResize = useCallback((target: HTMLDivElement) => {
    // Handle the resize event
    if (target.getBoundingClientRect().height > 0) {
      map.current?.invalidateSize();
    }
  }, []);

  const mapRef = useResizeObserver(onResize);

  useEffect(() => {
    if (mapRef.current && !mapInitialized) {
      setMapInitialized(true);
      if (mapRef.current.childElementCount === 0) {
        map.current = L.map(mapRef.current).setView([30, 30], 10);
        L.tileLayer(
          "https://gibs-{s}.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/EPSG3857_500m/{z}/{y}/{x}.jpeg",
          {
            maxZoom: 8,
          }
        ).addTo(map.current);
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
