"use client";

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface TelemetryPoint {
  timestamp: string;
  flow_value: number;
  expected_flow: number;
  pressure_value: number;
  is_anomaly: boolean;
}

interface ConsumptionBandChartProps {
  data: TelemetryPoint[];
  zoneName?: string;
  sensorId?: string;
}

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const actual = payload.find((p: any) => p.dataKey === "actualFlow")?.value;
  const expected = payload.find((p: any) => p.dataKey === "expectedFlow")?.value;
  const upper = payload.find((p: any) => p.dataKey === "upperBand")?.value;
  const lower = payload.find((p: any) => p.dataKey === "lowerBand")?.value;
  const isAnomaly = payload[0]?.payload?.isAnomaly;

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(0, 0, 0, 0.08)",
        borderRadius: "14px",
        padding: "0.75rem 1rem",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
        fontSize: "12px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
      }}
    >
      <div style={{ fontWeight: 700, color: "#1D1D1F", marginBottom: "6px" }}>
        Time: {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <span style={{ color: "#8E8E93" }}>Actual Flow:</span>
          <span style={{ fontWeight: 800, color: isAnomaly ? "#FF3B30" : "#007AFF" }}>
            {actual} m³/h {isAnomaly ? "⚠️ (Anomaly)" : ""}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <span style={{ color: "#8E8E93" }}>Expected Flow:</span>
          <span style={{ fontWeight: 600, color: "#6E6E73" }}>{expected} m³/h</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <span style={{ color: "#8E8E93" }}>Confidence Band:</span>
          <span style={{ color: "#8E8E93" }}>{lower} - {upper} m³/h</span>
        </div>
      </div>
    </div>
  );
};

export function ConsumptionBandChart({
  data,
  zoneName = "Historic Old Town",
  sensorId = "SNS-Z4-01",
}: ConsumptionBandChartProps) {
  const chartData = data.map((d) => {
    const exp = d.expected_flow || d.flow_value * 0.9;
    const timeLabel = new Date(d.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return {
      time: timeLabel,
      actualFlow: d.flow_value,
      expectedFlow: Number(exp.toFixed(1)),
      upperBand: Number((exp * 1.2).toFixed(1)),
      lowerBand: Number((exp * 0.8).toFixed(1)),
      pressure: d.pressure_value,
      isAnomaly: d.is_anomaly,
    };
  });

  return (
    <div style={{ width: "100%" }}>
      {/* Legend & Meta Indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="chip chip-blue" style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}>
            Confidence Envelope ±20%
          </span>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>
            {zoneName} · Sensor {sensorId}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span
              style={{
                width: 14,
                height: 3,
                borderRadius: 99,
                background: "#007AFF",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Actual Flow
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span
              style={{
                width: 12,
                height: 10,
                borderRadius: 3,
                background: "rgba(0, 122, 255, 0.15)",
                border: "1px solid rgba(0, 122, 255, 0.3)",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Expected Band
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#FF3B30",
                display: "inline-block",
                boxShadow: "0 0 0 2px rgba(255,59,48,0.2)",
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Leak Anomaly
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ height: 280, width: "100%" }}>
        {chartData.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-tertiary)",
              fontSize: "0.875rem",
            }}
          >
            Loading telemetry envelope chart...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="appleBandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007AFF" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#007AFF" stopOpacity={0.03} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="transparent"
                tick={{ fontSize: 10, fill: "#8E8E93", fontWeight: 600 }}
                tickLine={false}
              />
              <YAxis
                stroke="transparent"
                tick={{ fontSize: 10, fill: "#8E8E93", fontWeight: 600 }}
                tickLine={false}
                label={{
                  value: "m³/h",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#8E8E93",
                  fontSize: 10,
                }}
              />
              <Tooltip content={<CustomChartTooltip />} />

              {/* Upper Confidence Band */}
              <Area
                type="monotone"
                dataKey="upperBand"
                stroke="transparent"
                fill="url(#appleBandGradient)"
                name="Confidence Upper"
              />

              {/* Lower Confidence Cutout (matches pure card background) */}
              <Area
                type="monotone"
                dataKey="lowerBand"
                stroke="transparent"
                fill="#FFFFFF"
                name="Confidence Lower"
              />

              {/* Expected Diurnal Mean Line */}
              <Line
                type="monotone"
                dataKey="expectedFlow"
                stroke="#8E8E93"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                name="Expected Mean"
              />

              {/* Actual Measured Flow Line with Apple Blue & Anomaly Dots */}
              <Line
                type="monotone"
                dataKey="actualFlow"
                stroke="#007AFF"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.isAnomaly) {
                    return (
                      <circle
                        key={`anomaly-dot-${props.index}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="#FF3B30"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                      />
                    );
                  }
                  return <React.Fragment key={`dot-${props.index}`} />;
                }}
                activeDot={{ r: 6, fill: "#007AFF", stroke: "#FFFFFF", strokeWidth: 2 }}
                name="Actual Flow"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
