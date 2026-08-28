"use client";

import React, { useEffect, useState } from "react";

interface ZoneFeature {
  type: string; id: string;
  properties: { zone_id: string; name: string; population: number; base_demand: number; risk_level: string; risk_score: number; nrw_percentage: number; center: [number, number]; };
  geometry: any;
}
interface SensorData {
  sensor_id: string; zone_id: string; name: string; type: string; location_lat: number; location_lng: number; status: string; current_flow: number; current_pressure: number;
}
interface CityRiskMapProps {
  geoJsonData: { type: string; features: ZoneFeature[] } | null;
  sensors?: SensorData[];
  onSelectZone?: (zoneId: string) => void;
}

export function CityRiskMap({ geoJsonData, sensors = [], onSelectZone }: CityRiskMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const loadingSkeleton = (
    <div style={{
      borderRadius: 18, border: "1.5px solid var(--border-card)",
      height: 420, display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-primary) 50%, var(--bg-secondary) 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.5s ease infinite",
      fontSize: "0.875rem", color: "var(--text-tertiary)", fontWeight: 500,
    }}>
      Loading GIS Risk Map…
    </div>
  );

  if (!isMounted) return loadingSkeleton;

  const { MapContainer, TileLayer, GeoJSON, Marker, Popup } = require("react-leaflet");
  const L = require("leaflet");

  const getZoneStyle = (feature: any) => {
    const risk = feature?.properties?.risk_score || 0;
    let fillColor = "#34C759"; let borderColor = "#28A847";
    if (risk >= 75) { fillColor = "#FF3B30"; borderColor = "#CC1A13"; }
    else if (risk >= 45) { fillColor = "#FF9500"; borderColor = "#B85C00"; }
    else if (risk >= 25) { fillColor = "#007AFF"; borderColor = "#0055CC"; }
    return { fillColor, weight: 2, opacity: 1, color: borderColor, fillOpacity: 0.28 };
  };

  const createSensorIcon = (status: string) => {
    const isAlert = status === "warning";
    return L.divIcon({
      className: "custom-sensor-marker",
      html: `<div style="width:12px;height:12px;border-radius:50%;background:${isAlert ? "#FF3B30" : "#007AFF"};border:2.5px solid white;box-shadow:0 2px 8px ${isAlert ? "rgba(255,59,48,0.5)" : "rgba(0,122,255,0.4)"},0 0 0 ${isAlert ? "4px rgba(255,59,48,0.2)" : "0"};"></div>`,
      iconSize: [12, 12], iconAnchor: [6, 6],
    });
  };

  return (
    <div className="apple-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.125rem 1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div className="icon-wrap-sm icon-teal">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1C5.79 1 4 2.79 4 5C4 8 8 15 8 15C8 15 12 8 12 5C12 2.79 10.21 1 8 1Z" fill="white" fillOpacity="0.9"/>
                <circle cx="8" cy="5" r="1.8" fill="rgba(255,255,255,0.4)" stroke="white" strokeWidth="0.8"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                City Risk Map & Sensor Telemetry
              </p>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                Choropleth DMA leak probability · Leaflet GIS
              </p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {[
            { color: "#FF3B30", label: "Critical Risk (>75)" },
            { color: "#FF9500", label: "High (45–75)" },
            { color: "#007AFF", label: "Moderate (25–45)" },
            { color: "#34C759", label: "Low Risk (<25)" },
          ].map(({ color, label }) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: "inline-block", opacity: 0.85 }} />
              {label}
            </span>
          ))}
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#007AFF", display: "inline-block", border: "2px solid white", boxShadow: "0 0 0 1.5px rgba(0,122,255,0.5)" }} />
            IoT Sensor
          </span>
        </div>
      </div>

      {/* Map */}
      <div style={{ height: 360, position: "relative", zIndex: 0 }}>
        <MapContainer center={[18.535, 73.845]} zoom={12} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {geoJsonData && (
            <GeoJSON
              data={geoJsonData}
              style={getZoneStyle}
              onEachFeature={(feature: any, layer: any) => {
                layer.on({
                  click: () => { if (onSelectZone) onSelectZone(feature.properties.zone_id); },
                  mouseover: (e: any) => { e.target.setStyle({ fillOpacity: 0.55, weight: 3 }); },
                  mouseout:  (e: any) => { e.target.setStyle({ fillOpacity: 0.28, weight: 2 }); },
                });
                const p = feature.properties;
                layer.bindPopup(`
                  <div style="font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;min-width:180px;padding:2px">
                    <div style="font-weight:800;font-size:14px;color:#007AFF;margin-bottom:4px">${p.name}</div>
                    <div style="font-size:11px;color:#8E8E93;margin-bottom:8px">${p.zone_id}</div>
                    <div style="font-size:12px;color:#1D1D1F;line-height:1.7">
                      <div>Population: <b>${p.population.toLocaleString()}</b></div>
                      <div>Base Demand: <b>${p.base_demand} m³/h</b></div>
                      <div>NRW Loss: <b style="color:${p.nrw_percentage > 20 ? "#FF3B30" : "#1C8338"}">${p.nrw_percentage}%</b></div>
                      <div>Risk Score: <b>${p.risk_score} / 100</b></div>
                    </div>
                  </div>
                `);
              }}
            />
          )}
          {sensors.map(s => (
            <Marker key={s.sensor_id} position={[s.location_lat, s.location_lng]} icon={createSensorIcon(s.status)}>
              <Popup>
                <div style={{ fontFamily: "-apple-system,'Inter',sans-serif", fontSize: 12, minWidth: 160 }}>
                  <div style={{ fontWeight: 800, color: "#007AFF", marginBottom: 3 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: "#8E8E93", marginBottom: 6 }}>{s.sensor_id} · {s.type}</div>
                  <div style={{ color: "#1D1D1F", lineHeight: 1.7 }}>
                    <div>Flow: <b style={{ fontFamily: "monospace" }}>{s.current_flow} m³/h</b></div>
                    <div>Pressure: <b style={{ fontFamily: "monospace" }}>{s.current_pressure} bar</b></div>
                    <div style={{ marginTop: 4, fontWeight: 700, color: s.status === "warning" ? "#FF3B30" : "#1C8338", fontSize: 11 }}>
                      ● {s.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
