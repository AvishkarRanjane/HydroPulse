"use client";

import React, { useState } from "react";
import { api } from "@/services/api";

const BoltSvg = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M9 1.5L3.5 9.5H8L7 14.5L12.5 6.5H8L9 1.5Z" fill="currentColor" fillOpacity="0.9"/>
  </svg>
);
const CloseSvg = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const WarnSvg = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1L13.5 12H0.5L7 1Z" fill="currentColor" fillOpacity="0.8"/>
    <path d="M7 5.5V8M7 9.5V10" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const SpinSvg = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="25 13" strokeLinecap="round"/>
  </svg>
);
const CheckSvg = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="rgba(52,199,89,0.15)" stroke="rgba(52,199,89,0.35)" strokeWidth="1.2"/>
    <path d="M4.5 8L6.5 10L11.5 5.5" stroke="#34C759" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ResetSvg = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M12 7C12 9.76 9.76 12 7 12C4.24 12 2 9.76 2 7C2 4.24 4.24 2 7 2C8.65 2 10.1 2.8 11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 4H11V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface SimulationModalProps { isOpen: boolean; onClose: () => void; }

export function SimulationModal({ isOpen, onClose }: SimulationModalProps) {
  const [selectedZone, setSelectedZone] = useState("ZONE-04");
  const [severity, setSeverity] = useState("Critical");
  const [leakType, setLeakType] = useState("Sudden Burst");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInject = async () => {
    try {
      setLoading(true); setSuccessMsg(null);
      await api.injectLeak({ zone_id: selectedZone, severity, leak_type: leakType });
      setSuccessMsg(`${severity} "${leakType}" injected into ${selectedZone} — watch the live anomaly feed!`);
      setTimeout(() => { setSuccessMsg(null); onClose(); }, 2200);
    } catch (e: any) { alert("Error: " + (e?.response?.data?.detail || e.message)); }
    finally { setLoading(false); }
  };

  const handleClear = async () => {
    try {
      setLoading(true);
      await api.clearInjections();
      setSuccessMsg("All injections cleared — network restored to baseline.");
      setTimeout(() => { setSuccessMsg(null); onClose(); }, 1800);
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setLoading(false); }
  };

  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "0.625rem 0.875rem", borderRadius: 12,
    background: "var(--bg-primary)", border: "1.5px solid var(--border-input)",
    color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 600,
    outline: "none", cursor: "pointer", transition: "border-color 0.2s",
    appearance: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.75rem", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.04em",
    color: "var(--text-tertiary)", marginBottom: "0.375rem",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)",
      animation: "fade-in 0.2s ease",
    }}>
      <div style={{
        width: "100%", maxWidth: 440,
        background: "var(--bg-card)",
        borderRadius: 22, padding: "1.5rem",
        boxShadow: "0 32px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.07)",
        position: "relative",
        animation: "scale-in 0.25s var(--spring)",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: "1rem", right: "1rem",
          width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--bg-primary)", border: "1px solid var(--border-card)", cursor: "pointer",
          color: "var(--text-tertiary)", transition: "all 0.2s",
        }}>
          <CloseSvg />
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1.25rem" }}>
          <div className="icon-wrap-sm icon-red">
            <BoltSvg />
          </div>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.025em" }}>
              Live Leak Simulator
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              Inject on-demand anomalies for demo presentations
            </p>
          </div>
        </div>

        {/* Success */}
        {successMsg && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "0.625rem",
            background: "rgba(52,199,89,0.08)", border: "1.5px solid rgba(52,199,89,0.25)",
            borderRadius: 12, padding: "0.875rem 1rem", marginBottom: "1.25rem",
          }} className="animate-slide-up">
            <span style={{ flexShrink: 0, marginTop: "0.1rem" }}><CheckSvg /></span>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1C8338", lineHeight: 1.5 }}>{successMsg}</p>
          </div>
        )}

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Target Distribution Zone</label>
            <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)} style={selectStyle}>
              <option value="ZONE-01">ZONE-01: Downtown Metro Central</option>
              <option value="ZONE-02">ZONE-02: Industrial Park & Logistics</option>
              <option value="ZONE-03">ZONE-03: North Residential Suburbs</option>
              <option value="ZONE-04">ZONE-04: Historic Old Town (High Risk)</option>
              <option value="ZONE-05">ZONE-05: Riverfront Promenade</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={labelStyle}>Severity Level</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)} style={selectStyle}>
                <option value="Critical">Critical (+95% Flow)</option>
                <option value="Moderate">Moderate (+55% Flow)</option>
                <option value="Minor">Minor (+28% Flow)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Anomaly Type</label>
              <select value={leakType} onChange={e => setLeakType(e.target.value)} style={selectStyle}>
                <option value="Sudden Burst">Sudden Burst</option>
                <option value="Gradual Leak">Gradual Leak</option>
                <option value="High Night Flow">High Night Flow</option>
                <option value="Pressure Drop">Pressure Drop</option>
              </select>
            </div>
          </div>

          {/* Warning note */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "0.625rem",
            background: "rgba(255,149,0,0.07)", border: "1.5px solid rgba(255,149,0,0.2)",
            borderRadius: 12, padding: "0.75rem 0.875rem",
          }}>
            <span style={{ color: "#B85C00", marginTop: "0.1rem", flexShrink: 0 }}><WarnSvg /></span>
            <p style={{ fontSize: "0.75rem", color: "#7A4500", lineHeight: 1.6 }}>
              This injection instantly alters telemetry, triggers the Z-Score engine, broadcasts via WebSocket, and auto-dispatches a priority ticket to the maintenance queue.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button
              onClick={handleInject}
              disabled={loading}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                padding: "0.6875rem 1rem", borderRadius: 12,
                background: "linear-gradient(135deg, #FF3B30, #CC1A13)",
                color: "white", fontWeight: 800, fontSize: "0.9375rem",
                border: "none", cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 16px rgba(255,59,48,0.3)", transition: "all 0.2s var(--spring)",
                opacity: loading ? 0.65 : 1,
              }}
            >
              {loading ? <SpinSvg /> : <BoltSvg />}
              Inject Leak
            </button>
            <button
              onClick={handleClear}
              disabled={loading}
              style={{
                display: "flex", alignItems: "center", gap: "0.375rem",
                padding: "0.6875rem 1rem", borderRadius: 12,
                background: "var(--bg-primary)", color: "var(--text-secondary)",
                fontWeight: 700, fontSize: "0.875rem",
                border: "1.5px solid var(--border-card)", cursor: "pointer",
                transition: "all 0.2s", opacity: loading ? 0.6 : 1,
              }}
              title="Reset all active leak injections"
            >
              <ResetSvg /> Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
