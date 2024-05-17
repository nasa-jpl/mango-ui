import { Viewer as CesiumViewer } from "cesium";
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

  useEffect(() => {
    new CesiumViewer(map.current as HTMLDivElement, {
      timeline: false,
      animation: false,
      fullscreenButton: false,
    });
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
