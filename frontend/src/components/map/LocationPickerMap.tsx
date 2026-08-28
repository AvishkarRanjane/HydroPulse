"use client";

import React, { useEffect, useState } from "react";

interface LocationPickerMapProps {
  initialLat: number;
  initialLng: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

export function LocationPickerMap({ initialLat, initialLng, onLocationSelect }: LocationPickerMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [position, setPosition] = useState<[number, number]>([initialLat, initialLng]);

  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted) {
    return (
      <div style={{
        height: 220, borderRadius: 14, border: "1.5px solid var(--border-card)",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-primary) 50%, var(--bg-secondary) 75%)",
        backgroundSize: "200% 100%", animation: "shimmer 1.5s ease infinite",
        fontSize: "0.875rem", color: "var(--text-tertiary)", fontWeight: 500,
      }}>
        Loading map…
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, useMapEvents } = require("react-leaflet");
  const L = require("leaflet");

  const pinIcon = L.divIcon({
    className: "custom-sensor-marker",
    html: `<div style="display:flex;flex-direction:column;align-items:center">
      <div style="width:18px;height:18px;border-radius:50%;background:#007AFF;border:3px solid white;box-shadow:0 4px 12px rgba(0,122,255,0.4)"></div>
      <div style="width:2px;height:8px;background:#007AFF;margin-top:-1px;opacity:0.6"></div>
    </div>`,
    iconSize: [18, 26],
    iconAnchor: [9, 26],
  });

  function MapClickHandler() {
    useMapEvents({
      click(e: any) {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        onLocationSelect(lat, lng);
      },
    });
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ height: 220, borderRadius: 14, overflow: "hidden", border: "1.5px solid var(--border-card)", position: "relative", zIndex: 0 }}>
        <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <MapClickHandler />
          <Marker position={position} icon={pinIcon} />
        </MapContainer>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: "0.25rem" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
          📍 Click the map to drop your GPS pin
        </p>
        <code style={{ fontSize: "0.75rem", color: "#007AFF", fontFamily: "monospace", fontWeight: 700 }}>
          {position[0].toFixed(4)}, {position[1].toFixed(4)}
        </code>
      </div>
    </div>
  );
}
