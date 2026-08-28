"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/services/api";

/* SVG Icons */
const GearIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="3.5" fill="white" fillOpacity="0.9"/>
    <path d="M11 1.5V4M11 18V20.5M1.5 11H4M18 11H20.5M4 4L5.8 5.8M16.2 16.2L18 18M4 18L5.8 16.2M16.2 5.8L18 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.65"/>
  </svg>
);
const BoltIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M13 2L5 13H11L9 20L17 9H11L13 2Z" fill="white" fillOpacity="0.9"/>
  </svg>
);
const SensorIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="3" fill="white" fillOpacity="0.9"/>
    <path d="M7 7C5.5 8.5 4.5 10.1 4.5 11.5C4.5 13 5.5 14.5 7 16" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7"/>
    <path d="M15 7C16.5 8.5 17.5 10.1 17.5 11.5C17.5 13 16.5 14.5 15 16" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7"/>
    <path d="M4.5 4.5C2 6.5 0.5 9 0.5 11.5C0.5 14 2 16.5 4.5 18.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4"/>
    <path d="M17.5 4.5C20 6.5 21.5 9 21.5 11.5C21.5 14 20 16.5 17.5 18.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4"/>
  </svg>
);
const TeamIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="8" cy="6.5" r="3.5" fill="white" fillOpacity="0.9"/>
    <path d="M2 18C2 15 4.5 13 8 13C11.5 13 14 15 14 18" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="16" cy="7.5" r="2.5" fill="white" fillOpacity="0.6"/>
    <path d="M16 13.5C18.5 13.5 21 15 21 17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6"/>
  </svg>
);
const RotateIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M12.5 7C12.5 10.04 10.04 12.5 7 12.5C3.96 12.5 1.5 10.04 1.5 7C1.5 3.96 3.96 1.5 7 1.5C8.75 1.5 10.3 2.35 11.25 3.65" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M9.5 3.65H11.25V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4"/>
    <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function AdminPage() {
  const { isConnected } = useWebSocket();
  const [zones, setZones] = useState<any[]>([]);
  const [sensors, setSensors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholds] = useState<{ [id: string]: number }>({});
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [simZone, setSimZone] = useState("ZONE-04");
  const [simSeverity, setSimSeverity] = useState("Critical");
  const [simType, setSimType] = useState("Sudden Burst");

  const notify = (msg: string) => { setSavedMsg(msg); setTimeout(() => setSavedMsg(null), 3500); };

  const loadData = async () => {
    try {
      setLoading(true);
      const [zRes, sRes, uRes] = await Promise.all([
        api.getZones(), api.getSensors(),
        api.getUsers().catch(() => [
          { user_id: "USR-01", username: "admin", email: "admin@aquawatch.gov", role: "Admin", full_name: "Chief Engineer" },
          { user_id: "USR-02", username: "staff", email: "staff@aquawatch.gov", role: "Utility Staff", full_name: "Field Dispatcher" },
          { user_id: "USR-03", username: "viewer", email: "viewer@aquawatch.gov", role: "Viewer", full_name: "Audit Inspector" },
        ]),
      ]);
      setZones(zRes); setSensors(sRes); setUsers(uRes);
      const th: { [k: string]: number } = {};
      zRes.forEach((z: any) => { th[z.zone_id] = 2.5; });
      setThresholds(th);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveThreshold = async (zoneId: string) => {
    try {
      await api.updateSensitivityThreshold(zoneId, thresholds[zoneId] || 2.5);
      notify(`Z-Score threshold for ${zoneId} updated to ${(thresholds[zoneId] || 2.5).toFixed(1)}σ`);
    } catch (e: any) { alert("Error: " + e.message); }
  };

  const handleInjectSim = async () => {
    try { await api.injectLeak({ zone_id: simZone, severity: simSeverity, leak_type: simType }); notify(`Simulated ${simSeverity} "${simType}" injected into ${simZone}!`); }
    catch (e: any) { alert("Error: " + e.message); }
  };

  const handleClearSim = async () => {
    try { await api.clearInjections(); notify("All injections cleared — baseline restored."); }
    catch (e: any) { alert("Error: " + e.message); }
  };

  const roleStyle = (role: string) => ({
    Admin: { bg: "rgba(255,59,48,0.10)", color: "#CC1A13" },
    "Utility Staff": { bg: "rgba(0,122,255,0.10)", color: "#0055CC" },
    Viewer: { bg: "rgba(142,142,147,0.10)", color: "#6E6E73" },
  }[role] || { bg: "rgba(0,0,0,0.06)", color: "#6E6E73" });

  const sensorStatusStyle = (s: string) => s === "warning"
    ? { bg: "rgba(255,59,48,0.09)", color: "#CC1A13" }
    : { bg: "rgba(52,199,89,0.09)", color: "#1C8338" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar wsConnected={isConnected} />

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 60% 40% at 70% 10%, rgba(88,86,214,0.04) 0%, transparent 60%)" }} />

      <main className="page-container animate-fade-in" style={{ position: "relative", zIndex: 1, paddingTop: "1.75rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span className="chip" style={{ background: "rgba(255,59,48,0.10)", color: "#CC1A13", border: "1px solid rgba(255,59,48,0.2)", fontSize: "0.75rem" }}>
              🔒 Admin Access
            </span>
          </div>
          <h1 className="page-title">System <span style={{ color: "#007AFF" }}>Administration</span></h1>
          <p className="page-subtitle">Anomaly engine config · Simulation control · IoT registry · RBAC accounts</p>
        </div>

        {/* Toast */}
        {savedMsg && (
          <div style={{ background: "rgba(52,199,89,0.10)", border: "1.5px solid rgba(52,199,89,0.28)", borderRadius: 14, padding: "0.875rem 1.125rem", display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", color: "#1C8338" }}
            className="animate-slide-up">
            <CheckIcon />
            <p style={{ fontSize: "0.9375rem", fontWeight: 600 }}>{savedMsg}</p>
          </div>
        )}

        {/* ─── Z-Score Thresholds ─── */}
        <div className="apple-card animate-slide-up" style={{ marginBottom: "1rem", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.125rem 1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <div className="icon-wrap-sm icon-blue"><GearIcon /></div>
              <div>
                <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  Z-Score Anomaly Sensitivity Thresholds
                </p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Lower σ = more sensitive · Higher σ = fewer false positives</p>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.875rem", padding: "1.125rem" }}>
            {zones.map(zone => {
              const val = thresholds[zone.zone_id] || 2.5;
              const pct = ((val - 1.0) / 3.5) * 100;
              const fillColor = val < 2 ? "#FF3B30" : val < 3 ? "#007AFF" : "#34C759";
              return (
                <div key={zone.zone_id} className="control-apple">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                    <div>
                      <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>{zone.name}</p>
                      <code style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontFamily: "monospace" }}>{zone.zone_id}</code>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "1.5rem", fontWeight: 900, color: fillColor, fontFamily: "monospace", letterSpacing: "-0.04em" }}>
                        {val.toFixed(1)}<span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-tertiary)" }}>σ</span>
                      </p>
                    </div>
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.06)", borderRadius: 99, height: 4, marginBottom: "0.375rem", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: fillColor, transition: "width 0.4s, background 0.3s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", fontWeight: 600 }}>HIGH SENS (1.0)</span>
                    <span style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", fontWeight: 600 }}>CONSERVATIVE (4.5)</span>
                  </div>

                  <input
                    type="range" min="1.0" max="4.5" step="0.1" value={val}
                    onChange={e => setThresholds(p => ({ ...p, [zone.zone_id]: parseFloat(e.target.value) }))}
                    style={{ accentColor: fillColor, marginBottom: "0.875rem" }}
                  />

                  <button onClick={() => handleSaveThreshold(zone.zone_id)} className="btn-apple btn-ghost-apple" style={{ width: "100%", justifyContent: "center", fontSize: "0.8125rem" }}>
                    Save Threshold
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Simulation Control ─── */}
        <div style={{ background: "linear-gradient(135deg, #FFF5F4, #FFFBFA)", border: "1.5px solid rgba(255,59,48,0.18)", borderRadius: 22, marginBottom: "1rem", overflow: "hidden", boxShadow: "var(--shadow-md)" }}
          className="animate-slide-up delay-100">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.125rem 1.375rem", borderBottom: "1px solid rgba(255,59,48,0.12)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <div className="icon-wrap-sm icon-red"><BoltIcon /></div>
              <div>
                <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  Live Simulation Control Center
                </p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  Inject pipeline failures for live demo &amp; judging scenarios
                </p>
              </div>
            </div>
            <span className="chip" style={{ background: "rgba(255,59,48,0.10)", color: "#CC1A13", border: "1px solid rgba(255,59,48,0.2)", fontSize: "0.6875rem" }}>Demo Mode</span>
          </div>
          <div style={{ padding: "1.125rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto auto", gap: "0.875rem", alignItems: "end" }}
            className="grid-cols-1 md:grid-cols-5">
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "0.375rem" }}>Target Zone</label>
              <select value={simZone} onChange={e => setSimZone(e.target.value)} className="input-apple">
                {zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.name} ({z.zone_id})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "0.375rem" }}>Severity</label>
              <select value={simSeverity} onChange={e => setSimSeverity(e.target.value)} className="input-apple">
                <option value="Critical">Critical (+95% Flow)</option>
                <option value="Moderate">Moderate (+55% Flow)</option>
                <option value="Minor">Minor (+28% Flow)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "0.375rem" }}>Type</label>
              <select value={simType} onChange={e => setSimType(e.target.value)} className="input-apple">
                <option value="Sudden Burst">Sudden Burst</option>
                <option value="Gradual Leak">Gradual Leak</option>
                <option value="High Night Flow">High Night Flow</option>
                <option value="Pressure Drop">Pressure Drop</option>
              </select>
            </div>
            <button onClick={handleInjectSim} className="btn-apple btn-red" style={{ alignSelf: "end" }}>
              <BoltIcon /> Inject
            </button>
            <button onClick={handleClearSim} className="btn-apple btn-surface" title="Reset all" style={{ alignSelf: "end" }}>
              <RotateIcon /> Reset
            </button>
          </div>
        </div>

        {/* ─── Sensor Registry + User Registry ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}
          className="grid-cols-1 lg:grid-cols-3 animate-slide-up delay-200">
          {/* Sensor Table */}
          <div className="apple-card" style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.125rem 1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                <div className="icon-wrap-sm icon-teal"><SensorIcon /></div>
                <div>
                  <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>IoT Sensor Registry</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Deployed telemetry nodes</p>
                </div>
              </div>
              <span className="chip chip-blue">{sensors.length} nodes</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Sensor ID</th><th>Name</th><th>Zone</th>
                    <th style={{ textAlign: "right" }}>Flow</th>
                    <th style={{ textAlign: "right" }}>Bar</th>
                    <th style={{ textAlign: "right" }}>Batt.</th>
                    <th style={{ textAlign: "right" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sensors.map(s => {
                    const st = sensorStatusStyle(s.status);
                    return (
                      <tr key={s.sensor_id}>
                        <td><code style={{ fontFamily: "monospace", color: "#007AFF", fontWeight: 700, fontSize: "0.8125rem" }}>{s.sensor_id}</code></td>
                        <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</td>
                        <td style={{ color: "var(--text-tertiary)" }}>{s.zone_id}</td>
                        <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#007AFF" }}>{s.current_flow}</td>
                        <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: "var(--text-primary)" }}>{s.current_pressure}</td>
                        <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: "#1C8338" }}>{s.battery_level}%</td>
                        <td style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.6875rem", fontWeight: 700, padding: "0.2rem 0.625rem", borderRadius: 20, background: st.bg, color: st.color }}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Registry */}
          <div className="apple-card" style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "1.125rem 1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
              <div className="icon-wrap-sm icon-purple"><TeamIcon /></div>
              <div>
                <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>RBAC Accounts</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Role-based access control</p>
              </div>
            </div>
            <div style={{ padding: "0.875rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {users.map(u => {
                const rs = roleStyle(u.role);
                return (
                  <div key={u.user_id} className="control-apple" style={{ borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>{u.full_name || u.username}</p>
                      <span style={{ fontSize: "0.6875rem", fontWeight: 700, padding: "0.2rem 0.625rem", borderRadius: 20, background: rs.bg, color: rs.color }}>
                        {u.role}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontFamily: "monospace", marginBottom: "0.5rem" }}>{u.email}</p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--separator-light)", paddingTop: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Zones: <strong>{u.zone_access || "ALL"}</strong></span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1C8338" }}>● Active</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
