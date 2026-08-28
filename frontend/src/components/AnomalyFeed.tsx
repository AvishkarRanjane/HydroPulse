"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/services/api";

/* Apple-quality SVG icons */
const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1L2 4V9C2 12.3 4.7 15.3 8 16C11.3 15.3 14 12.3 14 9V4L8 1Z" fill="white" fillOpacity="0.9"/>
    <path d="M5.5 8.5L7 10L10.5 6.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.1"/>
    <path d="M5.5 3V5.5L7 6.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
);

const DropIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M5.5 1C5.5 1 2.5 4.5 2.5 7C2.5 8.65 3.85 10 5.5 10C7.15 10 8.5 8.65 8.5 7C8.5 4.5 5.5 1 5.5 1Z" fill="currentColor"/>
  </svg>
);

interface AnomalyItem {
  event_id: string;
  zone_id: string;
  zone_name: string;
  sensor_id: string;
  pipe_id: string;
  severity: string;
  type: string;
  status: string;
  z_score: number;
  flow_deviation: number;
  pressure_drop: number;
  estimated_loss_rate: number;
  financial_loss_cost: number;
  description: string;
  detected_at: string;
}

interface AnomalyFeedProps {
  realtimeAnomaly?: any;
}

export function AnomalyFeed({ realtimeAnomaly }: AnomalyFeedProps) {
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    try {
      const data = await api.getAnomalyFeed();
      setAnomalies(data);
    } catch (e) {
      console.error("Error fetching anomaly feed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeed(); }, []);

  useEffect(() => {
    if (realtimeAnomaly) {
      setAnomalies((prev) => {
        if (prev.some((a) => a.event_id === realtimeAnomaly.event_id)) return prev;
        return [
          {
            event_id: realtimeAnomaly.event_id,
            zone_id: realtimeAnomaly.zone_id,
            zone_name: realtimeAnomaly.zone_id,
            sensor_id: realtimeAnomaly.sensor_id,
            pipe_id: "PIPE-AUTO",
            severity: realtimeAnomaly.severity,
            type: realtimeAnomaly.type,
            status: "Active",
            z_score: realtimeAnomaly.z_score,
            flow_deviation: 45.0,
            pressure_drop: 0.8,
            estimated_loss_rate: 45.0,
            financial_loss_cost: 81.0,
            description: realtimeAnomaly.description,
            detected_at: realtimeAnomaly.detected_at,
          },
          ...prev.slice(0, 19),
        ];
      });
    }
  }, [realtimeAnomaly]);

  const sevColor = (s: string) =>
    s === "Critical" ? "#FF3B30" : s === "Moderate" ? "#FF9500" : "#007AFF";
  const sevBg = (s: string) =>
    s === "Critical" ? "rgba(255,59,48,0.06)" : s === "Moderate" ? "rgba(255,149,0,0.06)" : "rgba(0,122,255,0.06)";
  const sevBorder = (s: string) =>
    s === "Critical" ? "rgba(255,59,48,0.22)" : s === "Moderate" ? "rgba(255,149,0,0.20)" : "rgba(0,122,255,0.20)";
  const statusStyle = (s: string) =>
    s === "Active" ? { bg: "rgba(255,59,48,0.09)", color: "#CC1A13" }
    : s === "Investigating" ? { bg: "rgba(255,149,0,0.09)", color: "#B85C00" }
    : { bg: "rgba(52,199,89,0.09)", color: "#1C8338" };

  return (
    <div className="apple-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Card Header */}
      <div style={{
        padding: "1rem 1.125rem",
        borderBottom: "1px solid var(--separator-light)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div className="icon-wrap-sm icon-red">
            <ShieldIcon />
          </div>
          <div>
            <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Live Anomaly Stream
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Real-time Z-Score telemetry alerts
            </p>
          </div>
        </div>
        <button
          onClick={fetchFeed}
          className="btn-apple btn-ghost-apple"
          style={{ padding: "0.3rem 0.75rem", fontSize: "0.8125rem" }}
        >
          Refresh
        </button>
      </div>

      {/* Feed List */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "0.875rem",
        display: "flex", flexDirection: "column", gap: "0.5rem",
        maxHeight: 420,
      }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "2.5rem 0", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
            Connecting to telemetry…
          </div>
        ) : anomalies.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem 0" }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ margin: "0 auto 0.75rem", display: "block" }}>
              <circle cx="22" cy="22" r="21" fill="rgba(52,199,89,0.09)" stroke="rgba(52,199,89,0.28)" strokeWidth="1.5"/>
              <path d="M14 22L19 27L30 16" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#1C8338" }}>Network Nominal</p>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>No active anomalies</p>
          </div>
        ) : (
          anomalies.map((item) => {
            const ss = statusStyle(item.status);
            return (
              <div
                key={item.event_id}
                style={{
                  flexShrink: 0,
                  padding: "0.875rem",
                  borderRadius: 12,
                  border: `1.5px solid ${sevBorder(item.severity)}`,
                  background: sevBg(item.severity),
                  borderLeft: `3px solid ${sevColor(item.severity)}`,
                  transition: "all 0.2s",
                  animation: "slide-in-up 0.3s var(--spring)",
                }}
              >
                {/* Row 1: Severity, Zone, Time */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "0.625rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
                      padding: "0.18rem 0.55rem", borderRadius: 20,
                      background: sevBg(item.severity), color: sevColor(item.severity),
                      border: `1px solid ${sevBorder(item.severity)}`,
                    }}>
                      {item.severity}
                    </span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                      {item.zone_name}
                    </span>
                    <code style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                      {item.sensor_id}
                    </code>
                  </div>
                  <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <ClockIcon />
                    {new Date(item.detected_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Description */}
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "0.625rem" }}>
                  {item.description}
                </p>

                {/* Stats */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  paddingTop: "0.5rem", borderTop: "1px solid var(--separator-light)",
                }}>
                  <div style={{ display: "flex", gap: "0.875rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: sevColor(item.severity), display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <DropIcon /> +{item.flow_deviation} m³/h
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      Z={item.z_score.toFixed(2)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      ${item.financial_loss_cost.toFixed(0)}
                    </span>
                  </div>
                  <span style={{
                    fontSize: "0.6875rem", fontWeight: 700, padding: "0.18rem 0.55rem", borderRadius: 20,
                    background: ss.bg, color: ss.color,
                  }}>
                    {item.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
