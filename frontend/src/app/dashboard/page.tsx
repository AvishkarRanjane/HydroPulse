"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { CityRiskMap } from "@/components/map/CityRiskMap";
import { AnomalyFeed } from "@/components/AnomalyFeed";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/services/api";

/* ─── Apple-quality SVG Icons ─── */
const NRWIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M11 2C11 2 5 9.5 5 14C5 17.31 7.69 20 11 20C14.31 20 17 17.31 17 14C17 9.5 11 2 11 2Z" fill="white" fillOpacity="0.9"/>
    <path d="M8 14.5C8 16 9.34 17 11 17" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6"/>
    <path d="M14 7L17 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.6"/>
    <path d="M16 9L20 7" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.4"/>
  </svg>
);

const SavedIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M11 3C11 3 6 9 6 13C6 15.8 8.2 18 11 18C13.8 18 16 15.8 16 13C16 9 11 3 11 3Z" fill="white" fillOpacity="0.85"/>
    <path d="M8 12L10.5 14.5L15 10" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LeakIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M4 11C4 11 6 4 11 4C16 4 18 11 18 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7"/>
    <path d="M4 11H18" stroke="white" strokeWidth="1.5" strokeDasharray="2 2"/>
    <path d="M7 11C7 11 7 14 9 15.5C9 15.5 8 18 11 18C14 18 13 15.5 13 15.5C15 14 15 11 15 11" fill="white" fillOpacity="0.9"/>
    <path d="M3 11L1 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
    <path d="M19 11L21 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
  </svg>
);

const HealthIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M11 3.5L13.5 8.5H19L14.5 11.5L16 17L11 13.5L6 17L7.5 11.5L3 8.5H8.5L11 3.5Z" fill="white" fillOpacity="0.9"/>
    <circle cx="11" cy="11" r="3" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="0.5"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M13.5 7.5C13.5 10.81 10.81 13.5 7.5 13.5C4.19 13.5 1.5 10.81 1.5 7.5C1.5 4.19 4.19 1.5 7.5 1.5C9.5 1.5 11.3 2.5 12.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M10.5 4H12.5V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ZoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.5" fill="#007AFF" fillOpacity="0.7"/>
    <rect x="9" y="1" width="6" height="6" rx="1.5" fill="#007AFF" fillOpacity="0.7"/>
    <rect x="1" y="9" width="6" height="6" rx="1.5" fill="#007AFF" fillOpacity="0.5"/>
    <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#007AFF" fillOpacity="0.5"/>
  </svg>
);

export default function DashboardPage() {
  const { isConnected, lastMessage } = useWebSocket();
  const [summary, setSummary] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [geoJson, setGeoJson] = useState<any>(null);
  const [sensors, setSensors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeAlert, setRealtimeAlert] = useState<any>(null);
  const [ticking, setTicking] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, zonesRes, geoRes, sensRes] = await Promise.all([
        api.getDashboardSummary(), api.getZones(), api.getZonesGeoJSON(), api.getSensors(),
      ]);
      setSummary(sumRes); setZones(zonesRes); setGeoJson(geoRes); setSensors(sensRes);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.event === "telemetry_update") {
      setSensors(prev => prev.map(s =>
        s.sensor_id === lastMessage.sensor_id
          ? { ...s, current_flow: lastMessage.flow, current_pressure: lastMessage.pressure, status: lastMessage.is_anomaly ? "warning" : "online" }
          : s
      ));
    } else if (lastMessage.event === "new_anomaly_alert") {
      setRealtimeAlert(lastMessage.anomaly);
      api.getDashboardSummary().then(setSummary).catch(console.error);
      api.getZones().then(setZones).catch(console.error);
    }
  }, [lastMessage]);

  const handleTick = async () => {
    try { setTicking(true); await api.simulateTick(); await loadData(); }
    catch (e) { console.error(e); }
    finally { setTicking(false); }
  };

  const kpis = [
    {
      label: "Non-Revenue Water",
      value: summary ? `${summary.nrw_percentage}%` : "—",
      sub: "Target < 15%",
      chip: summary?.nrw_percentage > 15 ? "⚠ Above Target" : "✓ On Target",
      chipClass: summary?.nrw_percentage > 15 ? "chip-orange" : "chip-green",
      Icon: NRWIcon,
      iconClass: "icon-blue",
      accentClass: "kpi-accent-blue",
      progress: Math.min(100, (summary?.nrw_percentage || 16) * 4),
      progressColor: "#007AFF",
    },
    {
      label: "Water Conserved",
      value: summary ? `${(summary.water_saved_m3 / 1000).toFixed(1)}k m³` : "—",
      sub: `≈ $${summary ? (summary.water_saved_m3 * 1.8).toFixed(0) : 0} saved vs 72h lag`,
      chip: "vs Baseline",
      chipClass: "chip-green",
      Icon: SavedIcon,
      iconClass: "icon-green",
      accentClass: "kpi-accent-green",
      progress: 80,
      progressColor: "#34C759",
    },
    {
      label: "Active Anomalies",
      value: summary?.active_leaks_count ?? "—",
      sub: `~${summary?.daily_volume_lost_m3 ?? 0} m³/day loss`,
      chip: summary?.active_leaks_count > 0 ? "Alert Active" : "All Clear",
      chipClass: summary?.active_leaks_count > 0 ? "chip-red" : "chip-green",
      Icon: LeakIcon,
      iconClass: "icon-red",
      accentClass: "kpi-accent-red",
      progress: Math.min(100, (summary?.active_leaks_count || 0) * 20),
      progressColor: "#FF3B30",
    },
    {
      label: "Network Health",
      value: summary ? `${summary.network_health_score}%` : "—",
      sub: `${summary?.total_population_protected?.toLocaleString() ?? 0} citizens served`,
      chip: summary?.system_status || "Optimal",
      chipClass: (summary?.network_health_score || 0) >= 70 ? "chip-green" : "chip-orange",
      Icon: HealthIcon,
      iconClass: "icon-teal",
      accentClass: "kpi-accent-orange",
      progress: summary?.network_health_score || 0,
      progressColor: "#5AC8FA",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar wsConnected={isConnected} />

      {/* Subtle radial background accent */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(0,122,255,0.05) 0%, transparent 65%)",
      }} />

      <main className="page-container animate-fade-in" style={{ position: "relative", zIndex: 1, paddingTop: "1.75rem" }}>

        {/* ═══ HEADER ═══ */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.75rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span className="chip chip-blue">
                <span className="live-indicator" />
                Municipal Operations Center
              </span>
            </div>
            <h1 className="page-title">Water Operations <span style={{ color: "#007AFF" }}>Dashboard</span></h1>
            <p className="page-subtitle">5 District Metered Areas · 12 IoT sensor nodes · Automated leak dispatch</p>
          </div>
          <button
            onClick={handleTick}
            disabled={ticking}
            className="btn-apple btn-surface"
            style={{ gap: "0.5rem", alignSelf: "flex-start" }}
          >
            <RefreshIcon />
            <span style={{ color: ticking ? "#007AFF" : undefined }}>
              {ticking ? "Updating…" : "Step Telemetry"}
            </span>
          </button>
        </div>

        {/* ═══ KPI CARDS ═══ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {kpis.map(({ label, value, sub, chip, chipClass, Icon, iconClass, accentClass, progress, progressColor }, i) => (
            <div key={label} className={`kpi-apple ${accentClass} animate-slide-up delay-${i * 50}`}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div className={`icon-wrap ${iconClass}`}>
                  <Icon />
                </div>
                <span className={`chip ${chipClass}`}>{chip}</span>
              </div>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", marginBottom: "0.25rem" }}>
                {label}
              </p>
              <p style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-primary)", lineHeight: 1 }}>
                {value}
              </p>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.375rem" }}>{sub}</p>
              <div className="progress-apple">
                <div className="progress-fill-apple" style={{ width: `${progress}%`, background: progressColor }} />
              </div>
            </div>
          ))}
        </div>

        {/* ═══ ZONE TELEMETRY ═══ */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
            <div className="section-label">
              <ZoneIcon />
              Real-Time Zone Telemetry — District Metered Areas
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 500 }}>
              Auto-updating via WebSocket
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "0.875rem" }}>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{
                    height: 140, borderRadius: 18, border: "1px solid var(--border-card)",
                    background: "linear-gradient(90deg, #F2F2F7 25%, #E5E5EA 50%, #F2F2F7 75%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.4s ease infinite",
                  }} />
                ))
              : zones.map((zone) => {
                  const isCritical = zone.risk_level === "Critical";
                  const isHigh = zone.risk_level === "High";
                  return (
                    <div key={zone.zone_id} className={`zone-apple ${isCritical ? "zone-critical" : isHigh ? "zone-high" : "zone-normal"} animate-slide-up`}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.75rem" }}>
                        <div>
                          <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                            {zone.name}
                          </p>
                          <code style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                            {zone.zone_id}
                          </code>
                        </div>
                        <span className={`chip ${isCritical ? "chip-red" : isHigh ? "chip-orange" : "chip-green"}`}
                          style={{ fontSize: "0.625rem", padding: "0.15rem 0.5rem", flexShrink: 0 }}>
                          {zone.risk_level}
                        </span>
                      </div>

                      <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr",
                        gap: "0.5rem", background: "var(--bg-primary)",
                        borderRadius: 10, padding: "0.625rem", marginBottom: "0.75rem",
                        border: "1px solid var(--separator-light)",
                      }}>
                        <div>
                          <p style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-tertiary)", marginBottom: "0.15rem" }}>Flow</p>
                          <p style={{ fontSize: "0.9375rem", fontWeight: 800, color: "#007AFF", fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                            {zone.current_flow_rate}<span style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", fontWeight: 500 }}> m³/h</span>
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-tertiary)", marginBottom: "0.15rem" }}>Pressure</p>
                          <p style={{ fontSize: "0.9375rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                            {zone.current_avg_pressure}<span style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", fontWeight: 500 }}> bar</span>
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          NRW <strong style={{ color: "var(--text-primary)" }}>{zone.nrw_percentage}%</strong>
                        </span>
                        {zone.active_anomalies_count > 0 ? (
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#CC1A13", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M6 1L11 10H1L6 1Z" fill="#FF3B30"/><path d="M6 5V7M6 8.5V9" stroke="white" strokeWidth="1" strokeLinecap="round"/>
                            </svg>
                            {zone.active_anomalies_count}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1C8338" }}>✓ Normal</span>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* ═══ MAP + ANOMALY FEED ═══ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }} className="lg:grid-cols-3">
          <div style={{ gridColumn: "span 1" }} className="lg:col-span-2">
            <CityRiskMap geoJsonData={geoJson} sensors={sensors} />
          </div>
          <div className="lg:col-span-1">
            <AnomalyFeed realtimeAnomaly={realtimeAlert} />
          </div>
        </div>

      </main>
    </div>
  );
}
