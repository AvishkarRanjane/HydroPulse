"use client";

import React, { useEffect, useState } from "react";

interface NetworkGisMapProps {
  pipesGeoJson: { type: string; features: any[] } | null;
  zonesGeoJson: any;
}

export function NetworkGisMap({ pipesGeoJson, zonesGeoJson }: NetworkGisMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeLayer, setActiveLayer] = useState<"material" | "age" | "status">("material");

  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted) {
    return (
      <div style={{
        height: 460, borderRadius: 14, border: "1.5px solid var(--border-card)",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-primary) 50%, var(--bg-secondary) 75%)",
        backgroundSize: "200% 100%", animation: "shimmer 1.5s ease infinite",
        fontSize: "0.875rem", color: "var(--text-tertiary)", fontWeight: 500,
      }}>
        Loading Pipeline Network GIS…
      </div>
    );
  }

  const { MapContainer, TileLayer, GeoJSON } = require("react-leaflet");

  const getPipeStyle = (feature: any) => {
    const props = feature?.properties;
    let color = "#007AFF"; let weight = 3;
    if (activeLayer === "material") {
      const mat: Record<string, string> = { "Cast Iron": "#FF3B30", "Ductile Iron": "#FF9500", "HDPE": "#34C759", "PVC": "#5AC8FA", "Steel": "#AF52DE" };
      color = mat[props?.material] || "#007AFF";
    } else if (activeLayer === "age") {
      const age = props?.age_years || 0;
      if (age >= 35) { color = "#FF3B30"; weight = 4; }
      else if (age >= 20) { color = "#FF9500"; }
      else { color = "#34C759"; }
    } else if (activeLayer === "status") {
      if (props?.status === "Leaking")      { color = "#FF3B30"; weight = 5; }
      else if (props?.status === "Degraded"){ color = "#FF9500"; weight = 3.5; }
      else if (props?.status === "Under Repair") { color = "#AF52DE"; }
      else { color = "#34C759"; }
    }
    return { color, weight, opacity: 0.9 };
  };

  const layers: { key: "material" | "age" | "status"; label: string }[] = [
    { key: "material", label: "Material" },
    { key: "age",      label: "Pipe Age" },
    { key: "status",   label: "Condition" },
  ];

  const legends: Record<string, { color: string; label: string }[]> = {
    material: [
      { color: "#FF3B30", label: "Cast Iron" },
      { color: "#FF9500", label: "Ductile Iron" },
      { color: "#34C759", label: "HDPE" },
      { color: "#5AC8FA", label: "PVC" },
      { color: "#AF52DE", label: "Steel" },
    ],
    age: [
      { color: "#FF3B30", label: "35+ Years" },
      { color: "#FF9500", label: "20–35 Years" },
      { color: "#34C759", label: "<20 Years" },
    ],
    status: [
      { color: "#FF3B30", label: "Active Leak" },
      { color: "#FF9500", label: "Degraded" },
      { color: "#AF52DE", label: "Under Repair" },
      { color: "#34C759", label: "Nominal" },
    ],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      {/* Layer Switcher + Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        <div style={{ display: "flex", background: "var(--bg-primary)", borderRadius: 12, padding: 4, border: "1px solid var(--border-card)", width: "fit-content" }}>
          {layers.map(l => (
            <button
              key={l.key}
              onClick={() => setActiveLayer(l.key)}
              style={{
                padding: "0.375rem 0.875rem", borderRadius: 9, fontSize: "0.8125rem", fontWeight: 700,
                cursor: "pointer", border: "none", transition: "all 0.2s var(--spring)",
                background: activeLayer === l.key ? "var(--apple-blue)" : "transparent",
                color: activeLayer === l.key ? "white" : "var(--text-secondary)",
                boxShadow: activeLayer === l.key ? "var(--shadow-blue)" : "none",
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", flexWrap: "wrap" }}>
          {legends[activeLayer].map(({ color, label }) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              <span style={{ width: 14, height: 4, borderRadius: 99, background: color, display: "inline-block" }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ height: 380, borderRadius: 14, overflow: "hidden", border: "1.5px solid var(--border-card)", position: "relative", zIndex: 0 }}>
        <MapContainer center={[18.535, 73.845]} zoom={12} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {zonesGeoJson && (
            <GeoJSON data={zonesGeoJson} style={{ fillColor: "rgba(0,122,255,0.04)", fillOpacity: 1, color: "rgba(0,122,255,0.2)", weight: 1, dashArray: "4 3" }} />
          )}
          {pipesGeoJson && (
            <GeoJSON
              key={activeLayer}
              data={pipesGeoJson}
              style={getPipeStyle}
              onEachFeature={(feature: any, layer: any) => {
                const p = feature.properties;
                layer.bindPopup(`
                  <div style="font-family:-apple-system,'Inter',sans-serif;font-size:12px;min-width:170px">
                    <div style="font-weight:800;color:#007AFF;margin-bottom:3px">Pipe ${p.pipe_id}</div>
                    <div style="font-size:10px;color:#8E8E93;margin-bottom:7px">Zone: ${p.zone_id}</div>
                    <div style="color:#1D1D1F;line-height:1.7">
                      <div>Material: <b>${p.material}</b></div>
                      <div>Installed: <b>${p.install_year}</b> (${p.age_years} yrs)</div>
                      <div>Diameter: <b>${p.diameter_mm} mm</b></div>
                      <div>Length: <b>${p.length_meters} m</b></div>
                      <div style="margin-top:4px;font-weight:800;color:${p.status === 'Leaking' ? '#FF3B30' : '#34C759'}">● ${p.status}</div>
                    </div>
                  </div>
                `);
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
