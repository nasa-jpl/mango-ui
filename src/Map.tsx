import { useEffect, useRef, useState } from "react";
import "@nasa-jpl/react-stellar/dist/esm/stellar.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function Map() {
  const [mapInitialized, setMapInitialized] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current && !mapInitialized) {
      setMapInitialized(true);
      // Strict mode BS
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

  return <div ref={mapRef} id="map" />;
}

export default Map;
