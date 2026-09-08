"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [9.9333, -84.0833];
const DEFAULT_ZOOM = 13;

let defaultIconConfigured = false;
function configureDefaultIcon() {
  if (defaultIconConfigured) return;
  defaultIconConfigured = true;
  const iconUrl =
    "data:image/svg+xml;base64," +
    btoa(
      `<?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.6 12.5 28.5 12.5 28.5S25 21.1 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#2563eb"/>
        <circle cx="12.5" cy="12.5" r="5" fill="#ffffff"/>
      </svg>`,
    );
  L.Icon.Default.mergeOptions({
    iconUrl,
    iconRetinaUrl: iconUrl,
    shadowUrl: "",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -34],
  });
}

interface Props {
  latitud: number | null;
  longitud: number | null;
  radio: number;
  geocercaActiva: boolean;
  onChange: (lat: number, lng: number) => void;
}

export default function SucursalMapaLeaflet({
  latitud,
  longitud,
  radio,
  geocercaActiva,
  onChange,
}: Props) {
  useEffect(() => {
    configureDefaultIcon();
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (latitud != null && longitud != null) {
      return [latitud, longitud];
    }
    return DEFAULT_CENTER;
  }, [latitud, longitud]);

  const markerRef = useRef<L.Marker | null>(null);

  return (
    <div className="relative isolate h-72 w-full rounded-md overflow-hidden border">
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        {latitud != null && longitud != null && (
          <>
            <Marker
              draggable
              position={[latitud, longitud]}
              ref={(ref) => {
                markerRef.current = ref;
              }}
              eventHandlers={{
                dragend: () => {
                  const marker = markerRef.current;
                  if (marker) {
                    const pos = marker.getLatLng();
                    onChange(pos.lat, pos.lng);
                  }
                },
              }}
            />
            <Circle
              center={[latitud, longitud]}
              radius={radio}
              pathOptions={{
                color: geocercaActiva ? "#16a34a" : "#9ca3af",
                fillColor: geocercaActiva ? "#22c55e" : "#d1d5db",
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          </>
        )}
        <RecenterOn
          coords={
            latitud != null && longitud != null ? [latitud, longitud] : null
          }
        />
      </MapContainer>
    </div>
  );
}

function ClickHandler({
  onChange,
}: {
  onChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterOn({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, map.getZoom() < 14 ? 15 : map.getZoom());
    }
  }, [coords, map]);
  return null;
}
