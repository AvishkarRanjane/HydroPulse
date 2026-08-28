"use client";

import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

interface LossRankItem {
  zone_id: string; zone_name: string; population: number; base_demand: number; risk_score: number;
  risk_level: string; nrw_percentage: number; active_anomalies: number; total_incidents: number;
  recent_volume_lost_m3: number; recent_financial_loss: number; estimated_annual_nrw_loss_m3: number;
}

const getRiskStyle = (level: string) => {
  const l = level.toLowerCase();
  if (l === "critical") return { bg: "rgba(255,59,48,0.09)",  color: "#CC1A13", border: "rgba(255,59,48,0.22)"  };
  if (l === "high")     return { bg: "rgba(255,149,0,0.09)",  color: "#B85C00", border: "rgba(255,149,0,0.22)"  };
  if (l === "medium")   return { bg: "rgba(0,122,255,0.09)",  color: "#0055CC", border: "rgba(0,122,255,0.22)"  };
  return                       { bg: "rgba(52,199,89,0.09)",  color: "#1C8338", border: "rgba(52,199,89,0.22)"  };
};

const getNrwColor = (n: number) => n >= 25 ? "#FF3B30" : n >= 16 ? "#FF9500" : "#007AFF";

const AppleTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 12, padding: "0.625rem 0.875rem", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", fontFamily: "-apple-system,'Inter',sans-serif" }}>
      <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#8E8E93", marginBottom: "0.25rem" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontSize: "0.9375rem", fontWeight: 900, color: p.color || "#1D1D1F" }}>
          ${p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export function WaterLossHeatmap({ data }: { data: LossRankItem[] }) {
  const totalLoss   = data.reduce((a, c) => a + c.recent_financial_loss, 0);
  const totalVolume = data.reduce((a, c) => a + c.recent_volume_lost_m3, 0);

  const barData = data.map(d => ({
    name: d.zone_name.split(" ")[0],
    loss: d.recent_financial_loss,
    risk: d.risk_level,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Summary KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
        {[
          { label: "Total Financial Loss", value: `$${totalLoss.toLocaleString()}`, color: "#CC1A13", bg: "rgba(255,59,48,0.05)", border: "rgba(255,59,48,0.15)" },
          { label: "Volume Lost (Recent)", value: `${totalVolume.toLocaleString()} m³`, color: "#007AFF", bg: "rgba(0,122,255,0.05)", border: "rgba(0,122,255,0.15)" },
          { label: "Zones Ranked", value: `${data.length} DMAs`, color: "#8E8E93", bg: "var(--bg-primary)", border: "var(--separator-light)" },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1.5px solid ${k.border}`, borderRadius: 12, padding: "0.75rem 0.875rem" }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-tertiary)", marginBottom: "0.3rem" }}>{k.label}</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 900, color: k.color, letterSpacing: "-0.04em", lineHeight: 1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
            <XAxis dataKey="name" stroke="transparent" tick={{ fontSize: 11, fill: "#8E8E93", fontWeight: 700 }} tickLine={false} />
            <YAxis stroke="transparent" tick={{ fontSize: 10, fill: "#AEAEB2" }} tickLine={false}
              tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
            <Tooltip content={<AppleTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)", radius: 8 }} />
            <Bar dataKey="loss" radius={[8, 8, 0, 0]} maxBarSize={56}>
              {barData.map((entry, i) => {
                const color = entry.risk === "Critical" ? "#FF3B30" : entry.risk === "High" ? "#FF9500" : entry.risk === "Medium" ? "#007AFF" : "#34C759";
                return <Cell key={`cell-${i}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
      <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid var(--border-card)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--separator-light)" }}>
              {["Zone / DMA", "Population", "Risk Level", "NRW %", "Active Leaks", "Volume Lost", "Financial Impact"].map((h, i) => (
                <th key={h} style={{
                  padding: "0.625rem 0.875rem", fontSize: "0.6875rem", fontWeight: 800,
                  textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)",
                  textAlign: i >= 3 ? "right" : "left", whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => {
              const rs = getRiskStyle(item.risk_level);
              const nrwColor = getNrwColor(item.nrw_percentage);
              return (
                <tr key={item.zone_id} style={{
                  borderBottom: "1px solid var(--separator-light)",
                  background: idx % 2 === 0 ? "white" : "var(--bg-secondary)",
                  transition: "background 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(0,122,255,0.03)"}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? "white" : "var(--bg-secondary)"}
                >
                  <td style={{ padding: "0.75rem 0.875rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: "50%", background: "var(--bg-primary)", border: "1px solid var(--border-card)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.625rem", fontWeight: 900, color: "var(--text-tertiary)", flexShrink: 0,
                        fontFamily: "monospace",
                      }}>
                        {idx + 1}
                      </span>
                      <div>
                        <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>{item.zone_name}</p>
                        <code style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontFamily: "monospace" }}>{item.zone_id}</code>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 0.875rem", fontSize: "0.8125rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                    {item.population.toLocaleString()}
                  </td>
                  <td style={{ padding: "0.75rem 0.875rem" }}>
                    <span style={{
                      fontSize: "0.6875rem", fontWeight: 700, padding: "0.22rem 0.625rem", borderRadius: 20,
                      background: rs.bg, color: rs.color, border: `1px solid ${rs.border}`,
                    }}>
                      {item.risk_level} ({item.risk_score.toFixed(0)})
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 0.875rem", textAlign: "right" }}>
                    <span style={{ fontSize: "0.9375rem", fontWeight: 900, color: nrwColor, fontFamily: "monospace" }}>
                      {item.nrw_percentage}%
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 0.875rem", textAlign: "right" }}>
                    {item.active_anomalies > 0 ? (
                      <span style={{
                        fontSize: "0.6875rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 20,
                        background: "rgba(255,59,48,0.09)", color: "#CC1A13", border: "1px solid rgba(255,59,48,0.2)",
                      }}>
                        {item.active_anomalies} Active
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.8125rem", color: "#1C8338", fontWeight: 600 }}>✓ None</span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 0.875rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#007AFF", fontSize: "0.8125rem" }}>
                    {item.recent_volume_lost_m3.toLocaleString()} m³
                  </td>
                  <td style={{ padding: "0.75rem 0.875rem", textAlign: "right" }}>
                    <span style={{ fontSize: "0.9375rem", fontWeight: 900, color: "#CC1A13", fontFamily: "monospace", letterSpacing: "-0.03em" }}>
                      ${item.recent_financial_loss.toLocaleString()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
