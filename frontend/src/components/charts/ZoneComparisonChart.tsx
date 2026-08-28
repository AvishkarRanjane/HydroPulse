"use client";

import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

interface ZoneData {
  zone_id: string; name: string; nrw_percentage: number; current_flow_rate: number;
  current_avg_pressure: number; risk_score: number; risk_level: string;
}

const getBarColor = (nrw: number) =>
  nrw >= 25 ? "#FF3B30" : nrw >= 16 ? "#FF9500" : "#007AFF";

const AppleTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const color = getBarColor(val);
  return (
    <div style={{
      background: "white", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 12,
      padding: "0.625rem 0.875rem", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      fontFamily: "-apple-system,'Inter',sans-serif",
    }}>
      <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>{label}</p>
      <p style={{ fontSize: "1.125rem", fontWeight: 900, color, letterSpacing: "-0.03em" }}>{val}%</p>
      <p style={{ fontSize: "0.6875rem", color: "#8E8E93", marginTop: "0.125rem" }}>NRW Loss</p>
    </div>
  );
};

export function ZoneComparisonChart({ zones }: { zones: ZoneData[] }) {
  const chartData = zones.map(z => ({
    name: z.name.split(" ")[0],
    fullName: z.name,
    nrw: z.nrw_percentage,
    flow: z.current_flow_rate,
    zone_id: z.zone_id,
    risk_level: z.risk_level,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Bar Chart */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="transparent"
              tick={{ fontSize: 11, fill: "#8E8E93", fontWeight: 700 }}
              tickLine={false}
            />
            <YAxis
              stroke="transparent"
              tick={{ fontSize: 10, fill: "#AEAEB2", fontWeight: 600 }}
              tickLine={false}
              label={{ value: "NRW %", angle: -90, position: "insideLeft", fill: "#AEAEB2", fontSize: 10 }}
            />
            <Tooltip content={<AppleTooltip />} cursor={{ fill: "rgba(0,122,255,0.05)", radius: 8 }} />
            {/* Target line at 15% */}
            <Bar dataKey="nrw" radius={[8, 8, 0, 0]} maxBarSize={48}>
              {chartData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={getBarColor(entry.nrw)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary mini-cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--separator-light)" }}>
        {zones.map(z => {
          const color = getBarColor(z.nrw_percentage);
          return (
            <div key={z.zone_id} style={{
              padding: "0.5rem 0.625rem", borderRadius: 10,
              background: "var(--bg-primary)", border: "1px solid var(--separator-light)",
              textAlign: "center",
            }}>
              <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-tertiary)", marginBottom: "0.2rem",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {z.name.split(" ")[0]}
              </p>
              <p style={{ fontSize: "0.9375rem", fontWeight: 900, color, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {z.nrw_percentage}%
              </p>
              <p style={{ fontSize: "0.625rem", color: "var(--text-tertiary)", marginTop: "0.2rem", fontFamily: "monospace" }}>
                {z.current_flow_rate} m³/h
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
