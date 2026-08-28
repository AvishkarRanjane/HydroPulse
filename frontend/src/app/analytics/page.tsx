"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ConsumptionBandChart } from "@/components/charts/ConsumptionBandChart";
import { ZoneComparisonChart } from "@/components/charts/ZoneComparisonChart";
import { WaterLossHeatmap } from "@/components/charts/WaterLossHeatmap";
import { NetworkGisMap } from "@/components/map/NetworkGisMap";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/services/api";

/* SVG Icons */
const ChartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <rect x="2" y="13" width="4" height="7" rx="1.5" fill="white" fillOpacity="0.9"/>
    <rect x="9" y="8" width="4" height="12" rx="1.5" fill="white" fillOpacity="0.75"/>
    <rect x="16" y="3" width="4" height="17" rx="1.5" fill="white" fillOpacity="0.6"/>
    <path d="M4 12L11 7L18 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
  </svg>
);
const FilterIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
    <path d="M1 3h13M3 7.5h9M5.5 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
  </svg>
);
const MapIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M8 3L2 5V19L8 17L14 19L20 17V3L14 5L8 3Z" fill="white" fillOpacity="0.9" stroke="white" strokeWidth="0.5"/>
    <path d="M8 3V17M14 5V19" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2"/>
    <circle cx="11" cy="9" r="2" fill="rgba(255,255,255,0.3)" stroke="white" strokeWidth="1"/>
  </svg>
);
const LossIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M4 18L8 12L12 14L18 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="4" cy="18" r="2" fill="white" fillOpacity="0.8"/>
    <circle cx="18" cy="6" r="2" fill="white" fillOpacity="0.8"/>
  </svg>
);

export default function AnalyticsPage() {
  const { isConnected } = useWebSocket();
  const [zones, setZones] = useState<any[]>([]);
  const [pipesGeoJson, setPipesGeoJson] = useState<any>(null);
  const [zonesGeoJson, setZonesGeoJson] = useState<any>(null);
  const [lossRanking, setLossRanking] = useState<any[]>([]);
  const [sensors, setSensors] = useState<any[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState("SNS-Z4-01");
  const [sensorHistory, setSensorHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [zonesRes, pipesRes, zonesGeoRes, lossRes, sensRes] = await Promise.all([
          api.getZones(), api.getPipesGeoJSON(), api.getZonesGeoJSON(), api.getLossRanking(), api.getSensors(),
        ]);
        setZones(zonesRes); setPipesGeoJson(pipesRes); setZonesGeoJson(zonesGeoRes);
        setLossRanking(lossRes); setSensors(sensRes);
        const hist = await api.getSensorHistory(selectedSensorId, 60);
        setSensorHistory(hist);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleSensorChange = async (id: string) => {
    setSelectedSensorId(id);
    try { const h = await api.getSensorHistory(id, 60); setSensorHistory(h); }
    catch (e) { console.error(e); }
  };

  const selectedSensor = sensors.find(s => s.sensor_id === selectedSensorId);
  const selectedZone = zones.find(z => z.zone_id === selectedSensor?.zone_id);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar wsConnected={isConnected} />

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 50% 35% at 80% 10%, rgba(0,122,255,0.04) 0%, transparent 60%)" }} />

      <main className="page-container animate-fade-in" style={{ position: "relative", zIndex: 1, paddingTop: "1.75rem" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.75rem" }}>
          <div>
            <div style={{ marginBottom: "0.5rem" }}>
              <span className="chip chip-blue">
                <ChartIcon />
                Analytics & Intelligence
              </span>
            </div>
            <h1 className="page-title">Water Loss <span style={{ color: "#007AFF" }}>Analytics</span> & GIS</h1>
            <p className="page-subtitle">Diurnal envelopes · Hydraulic modeling · GIS pipeline audit</p>
          </div>

          {/* Sensor Picker */}
          <div className="apple-card-sm" style={{ padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "0.625rem", alignSelf: "flex-start" }}>
            <div style={{ color: "#007AFF", display: "flex" }}>
              <FilterIcon />
            </div>
            <select
              value={selectedSensorId}
              onChange={e => handleSensorChange(e.target.value)}
              className="input-apple"
              style={{ border: "none", padding: "0", background: "transparent", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", minWidth: 200 }}
            >
              {sensors.map(s => (
                <option key={s.sensor_id} value={s.sensor_id}>{s.name} ({s.sensor_id})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 1: Consumption Chart */}
        <div className="apple-card animate-slide-up" style={{ marginBottom: "1rem", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.125rem 1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <div className="icon-wrap-sm icon-blue">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1 12L5 7L9 9L15 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 12L5 7L9 9L15 3" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.15"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  Normal vs Abnormal Diurnal Consumption Envelope
                </p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                  Zone: {selectedZone?.name || "Target Zone"} · Sensor: {selectedSensorId}
                </p>
              </div>
            </div>
            <span className="chip chip-blue" style={{ flexShrink: 0 }}>60 Readings</span>
          </div>
          <div style={{ padding: "1.25rem" }}>
            <ConsumptionBandChart data={sensorHistory} zoneName={selectedZone?.name || "Target Zone"} sensorId={selectedSensorId} />
          </div>
        </div>

        {/* Section 2: GIS + Zone Comparison */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}
          className="grid-cols-1 lg:grid-cols-2">
          <div className="apple-card animate-slide-up delay-100" style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1.125rem 1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
              <div className="icon-wrap-sm icon-purple">
                <MapIcon />
              </div>
              <div>
                <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Network GIS Infrastructure</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Pipe material · Age · Condition</p>
              </div>
            </div>
            <div style={{ padding: "1rem" }}>
              <NetworkGisMap pipesGeoJson={pipesGeoJson} zonesGeoJson={zonesGeoJson} />
            </div>
          </div>

          <div className="apple-card animate-slide-up delay-150" style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1.125rem 1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
              <div className="icon-wrap-sm icon-teal">
                <ChartIcon />
              </div>
              <div>
                <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>DMA Zone Comparison</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>NRW % & demand across 5 DMAs</p>
              </div>
            </div>
            <div style={{ padding: "1.25rem" }}>
              <ZoneComparisonChart zones={zones} />
            </div>
          </div>
        </div>

        {/* Section 3: Loss Heatmap */}
        <div className="apple-card animate-slide-up delay-200" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.125rem 1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div className="icon-wrap-sm icon-red">
                <LossIcon />
              </div>
              <div>
                <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  Area-Wise Water Loss Financial Ranking
                </p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  Volume · Cost · NRW % per zone — sorted by severity
                </p>
              </div>
            </div>
          </div>
          <div style={{ padding: "1.25rem" }}>
            <WaterLossHeatmap data={lossRanking} />
          </div>
        </div>

      </main>
    </div>
  );
}
