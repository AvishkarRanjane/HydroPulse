"use client";

import React, { useState } from "react";

/* ─── Custom SVG Icons ─── */
const WrenchSvg = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M11.5 3C11.5 3 15 2.5 15 6C15 7.75 13.75 8.75 12 8.75L5.25 15.5C5.25 15.5 3.5 16.25 2.75 15.5C2 14.75 2.75 13 2.75 13L9.5 6.25C9.5 6.25 9.5 4.5 11.5 3Z" fill="currentColor" fillOpacity="0.85"/>
    <circle cx="3.5" cy="14.5" r="1.25" fill="currentColor"/>
    <path d="M12 4.5C12.8 5.3 13 6.2 13 6.2" stroke="white" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

const UserCheckSvg = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="5.5" cy="4.5" r="2.5" fill="currentColor" fillOpacity="0.85"/>
    <path d="M1 12C1 10 2.8 8.5 5.5 8.5C8.2 8.5 10 10 10 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M10.5 7L11.5 8L13.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DualVerifySvg = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1L1.5 3V7C1.5 9.5 3.5 11.2 6 11.8C8.5 11.2 10.5 9.5 10.5 7V3L6 1Z" fill="currentColor" fillOpacity="0.85"/>
    <path d="M4 6L5.5 7.5L8.5 4.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface Ticket {
  ticket_id: string;
  source: string;
  priority_score: number;
  assigned_to?: string;
  status: string;
  anomaly_id?: string;
  report_id?: string;
  zone_id: string;
  pipe_id?: string;
  title: string;
  description?: string;
  estimated_loss_rate: number;
  estimated_cost: number;
  notes?: string;
  created_at: string;
}

interface PriorityQueueProps {
  tickets: Ticket[];
  onSelectTicket?: (ticket: Ticket) => void;
  onAssignTechnician?: (ticketId: string, techName: string) => void;
  technicians?: Array<{ id: string; name: string; specialty: string; status: string }>;
}

type TierConfig = {
  label: string;
  chipBg: string;
  chipColor: string;
  chipBorder: string;
  barColor: string;
  cardBg: string;
  cardBorder: string;
  sla: string;
};

export function PriorityQueue({
  tickets,
  onSelectTicket,
  onAssignTechnician,
  technicians = [],
}: PriorityQueueProps) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    tickets.length > 0 ? tickets[0].ticket_id : null
  );
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);

  const getTier = (score: number): TierConfig => {
    if (score >= 80) {
      return {
        label: "TIER 1 · EMERGENCY",
        chipBg: "rgba(255,59,48,0.10)",
        chipColor: "#CC1A13",
        chipBorder: "rgba(255,59,48,0.25)",
        barColor: "#FF3B30",
        cardBg: "rgba(255,59,48,0.02)",
        cardBorder: "rgba(255,59,48,0.20)",
        sla: "< 1h SLA",
      };
    }
    if (score >= 60) {
      return {
        label: "TIER 2 · HIGH",
        chipBg: "rgba(255,149,0,0.10)",
        chipColor: "#B85C00",
        chipBorder: "rgba(255,149,0,0.25)",
        barColor: "#FF9500",
        cardBg: "rgba(255,149,0,0.02)",
        cardBorder: "rgba(255,149,0,0.18)",
        sla: "< 4h SLA",
      };
    }
    if (score >= 40) {
      return {
        label: "TIER 3 · MEDIUM",
        chipBg: "rgba(0,122,255,0.09)",
        chipColor: "#0055CC",
        chipBorder: "rgba(0,122,255,0.22)",
        barColor: "#007AFF",
        cardBg: "rgba(0,122,255,0.02)",
        cardBorder: "rgba(0,122,255,0.15)",
        sla: "< 24h SLA",
      };
    }
    return {
      label: "TIER 4 · LOW",
      chipBg: "rgba(142,142,147,0.10)",
      chipColor: "#6E6E73",
      chipBorder: "rgba(142,142,147,0.20)",
      barColor: "#8E8E93",
      cardBg: "transparent",
      cardBorder: "rgba(0,0,0,0.07)",
      sla: "Scheduled",
    };
  };

  const statusStyle = (s: string) => {
    if (s === "Reported") return { bg: "rgba(255,149,0,0.10)", color: "#B85C00" };
    if (s === "In Progress") return { bg: "rgba(0,122,255,0.10)", color: "#0055CC" };
    if (s === "Assigned") return { bg: "rgba(88,86,214,0.10)", color: "#4040B8" };
    return { bg: "rgba(52,199,89,0.10)", color: "#1C8338" };
  };

  return (
    <div className="apple-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* ── Card Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.125rem 1.375rem",
          borderBottom: "1px solid var(--separator-light)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div className="icon-wrap-sm icon-orange">
            <WrenchSvg />
          </div>
          <div>
            <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Leak-Priority Work Queue
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
              Ranked by Severity × Population × Loss × Dual-Confirm
            </p>
          </div>
        </div>
        <span className="chip chip-blue" style={{ fontVariantNumeric: "tabular-nums" }}>
          {tickets.length} Tickets
        </span>
      </div>

      {/* ── Scrollable Ticket List ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxHeight: "560px",
        }}
      >
        {tickets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✅</div>
            <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              No active work orders
            </p>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
              All maintenance queues are clear
            </p>
          </div>
        ) : (
          tickets.map((t) => {
            const tier = getTier(t.priority_score);
            const isSelected = selectedTicketId === t.ticket_id;
            const ss = statusStyle(t.status);

            return (
              <div
                key={t.ticket_id}
                onClick={() => {
                  setSelectedTicketId(t.ticket_id);
                  if (onSelectTicket) onSelectTicket(t);
                }}
                style={{
                  flexShrink: 0,
                  borderRadius: 14,
                  border: `1.5px solid ${isSelected ? "rgba(0,122,255,0.5)" : tier.cardBorder}`,
                  background: isSelected
                    ? "rgba(0,122,255,0.04)"
                    : t.priority_score >= 80
                    ? "rgba(255,59,48,0.03)"
                    : "var(--bg-secondary)",
                  padding: "1rem 1.125rem",
                  cursor: "pointer",
                  transition: "all 0.2s var(--spring)",
                  boxShadow: isSelected
                    ? "0 0 0 3px rgba(0,122,255,0.12), var(--shadow-sm)"
                    : "var(--shadow-xs)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Priority accent strip on left */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: tier.barColor,
                    borderRadius: "14px 0 0 14px",
                  }}
                />

                {/* Header Strip: Priority Badge + Score */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    marginBottom: "0.625rem",
                    paddingLeft: "0.375rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        padding: "0.2rem 0.6rem",
                        borderRadius: 20,
                        background: tier.chipBg,
                        color: tier.chipColor,
                        border: `1px solid ${tier.chipBorder}`,
                      }}
                    >
                      {tier.label}
                    </span>
                    {t.source === "combined" && (
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.55rem",
                          borderRadius: 20,
                          background: "rgba(52,199,89,0.10)",
                          color: "#1C8338",
                          border: "1px solid rgba(52,199,89,0.22)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        <DualVerifySvg /> Dual-Verified
                      </span>
                    )}
                    <span style={{ fontSize: "0.6875rem", fontFamily: "monospace", color: "var(--text-tertiary)", fontWeight: 600 }}>
                      {t.ticket_id}
                    </span>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 900,
                        color: tier.chipColor,
                        fontFamily: "monospace",
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {t.priority_score.toFixed(0)}
                    </span>
                    <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 500 }}>
                      /100
                    </span>
                  </div>
                </div>

                {/* Priority Score Progress Bar */}
                <div
                  style={{
                    height: 4,
                    background: "rgba(0,0,0,0.06)",
                    borderRadius: 99,
                    marginBottom: "0.75rem",
                    overflow: "hidden",
                    marginLeft: "0.375rem",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${t.priority_score}%`,
                      background: tier.barColor,
                      borderRadius: 99,
                    }}
                  />
                </div>

                {/* Title & Description */}
                <div style={{ paddingLeft: "0.375rem", marginBottom: "0.75rem" }}>
                  <p
                    style={{
                      fontSize: "0.9375rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      letterSpacing: "-0.015em",
                      marginBottom: "0.3rem",
                      lineHeight: 1.35,
                    }}
                  >
                    {t.title}
                  </p>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.55,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {t.description}
                  </p>
                </div>

                {/* Metrics Row & Technician Dispatch */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    paddingTop: "0.625rem",
                    paddingLeft: "0.375rem",
                    borderTop: "1px solid var(--separator-light)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#CC1A13" }}>
                      −{t.estimated_loss_rate} m³/h
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                      Est. ${t.estimated_cost}
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#007AFF" }}>
                      {t.zone_id}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {t.assigned_to ? (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          padding: "0.2rem 0.6rem",
                          borderRadius: 20,
                          background: "rgba(52,199,89,0.10)",
                          color: "#1C8338",
                          border: "1px solid rgba(52,199,89,0.22)",
                        }}
                      >
                        <UserCheckSvg /> {t.assigned_to}
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssigningTicketId(assigningTicketId === t.ticket_id ? null : t.ticket_id);
                        }}
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "0.3rem 0.8rem",
                          borderRadius: 20,
                          background: "var(--apple-blue)",
                          color: "white",
                          border: "none",
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(0,122,255,0.25)",
                          transition: "all 0.2s",
                        }}
                      >
                        Assign Crew
                      </button>
                    )}

                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.6rem",
                        borderRadius: 20,
                        background: ss.bg,
                        color: ss.color,
                      }}
                    >
                      {t.status}
                    </span>
                  </div>
                </div>

                {/* Inline Technician Assignment Selector */}
                {assigningTicketId === t.ticket_id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      marginTop: "0.75rem",
                      marginLeft: "0.375rem",
                      padding: "0.875rem",
                      borderRadius: 12,
                      background: "var(--bg-primary)",
                      border: "1.5px solid rgba(0,122,255,0.18)",
                      boxShadow: "var(--shadow-md)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        marginBottom: "0.625rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Dispatch Field Technician
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      {technicians.map((tech) => (
                        <button
                          key={tech.id}
                          onClick={() => {
                            if (onAssignTechnician) onAssignTechnician(t.ticket_id, tech.name);
                            setAssigningTicketId(null);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.625rem 0.75rem",
                            borderRadius: 10,
                            background: "var(--bg-secondary)",
                            border: "1px solid var(--border-card)",
                            cursor: "pointer",
                            transition: "all 0.18s",
                            boxShadow: "var(--shadow-xs)",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,122,255,0.4)";
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,122,255,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-card)";
                            (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-secondary)";
                          }}
                        >
                          <div>
                            <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-primary)", textAlign: "left" }}>
                              {tech.name}
                            </p>
                            <p style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textAlign: "left" }}>
                              {tech.specialty}
                            </p>
                          </div>
                          <span
                            style={{
                              fontSize: "0.625rem",
                              fontWeight: 700,
                              padding: "0.15rem 0.5rem",
                              borderRadius: 20,
                              background: tech.status === "Available" ? "rgba(52,199,89,0.10)" : "rgba(255,149,0,0.10)",
                              color: tech.status === "Available" ? "#1C8338" : "#B85C00",
                            }}
                          >
                            {tech.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
