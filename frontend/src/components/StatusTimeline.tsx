"use client";

import React, { useState } from "react";

/* ─── Custom SVG Icons ─── */
const ReportedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M8 4.5V8L10 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const AssignedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5" r="2.5" fill="currentColor" fillOpacity="0.85"/>
    <path d="M2 13C2 11 3.8 9.5 6 9.5C8.2 9.5 10 11 10 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M11.5 8L12.5 9L14.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ProgressIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10.5 3C10.5 3 13.5 2.5 13.5 5.5C13.5 7 12.5 7.75 11 7.75L5 14C5 14 3.5 14.5 3 13.75C2.5 13 3.25 11.5 3.25 11.5L9.5 5.5C9.5 5.5 9.5 3.75 10.5 3Z" fill="currentColor" fillOpacity="0.85"/>
    <circle cx="3.5" cy="12.5" r="1.2" fill="currentColor"/>
  </svg>
);
const VerifiedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1L2 4V9C2 12.3 4.7 15.3 8 16C11.3 15.3 14 12.3 14 9V4L8 1Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5 8.5L7 10.5L11 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SendIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M11.5 1.5L1 5L5.5 7M11.5 1.5L8 12L5.5 7M11.5 1.5L5.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2.5 6.5H10.5M7 3L10.5 6.5L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const NoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="1.5" width="10" height="11" rx="2" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M4.5 5H9.5M4.5 7.5H9.5M4.5 10H7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
);
const WrenchSmIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M18 5C18 5 23.5 4.5 23.5 9.5C23.5 12 21.5 13.5 19 13.5L8 24.5C8 24.5 6 25.5 5 24.5C4 23.5 5 21.5 5 21.5L16 10.5C16 10.5 16 8 18 5Z" fill="#AEAEB2" fillOpacity="0.6"/>
    <circle cx="5.5" cy="23.5" r="2" fill="#AEAEB2" fillOpacity="0.5"/>
  </svg>
);

interface StatusTimelineProps {
  ticket: any;
  onUpdateStatus: (ticketId: string, newStatus: string, notes?: string) => Promise<void>;
}

export function StatusTimeline({ ticket, onUpdateStatus }: StatusTimelineProps) {
  const [noteInput, setNoteInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!ticket) {
    return (
      <div className="apple-card" style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "3rem 2rem", minHeight: 300, height: "100%",
      }}>
        <div style={{ marginBottom: "1rem", opacity: 0.4 }}><WrenchSmIcon /></div>
        <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
          Select a Work Order
        </p>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", maxWidth: 220, lineHeight: 1.55 }}>
          Click any ticket in the queue to view its lifecycle, dispatch crew, and log field notes.
        </p>
      </div>
    );
  }

  const stages = [
    { key: "Reported",      label: "Reported",    Icon: ReportedIcon,  desc: "Sensor flag or citizen report logged" },
    { key: "Assigned",      label: "Assigned",    Icon: AssignedIcon,  desc: "Technician assigned for field audit" },
    { key: "In Progress",   label: "In Progress", Icon: ProgressIcon,  desc: "Excavation, acoustic test, or repair" },
    { key: "Verified Fixed",label: "Verified",    Icon: VerifiedIcon,  desc: "Post-repair flow & pressure normalized" },
  ];

  const currentIdx = stages.findIndex(s => s.key === ticket.status);
  const nextStage  = currentIdx < stages.length - 1 ? stages[currentIdx + 1] : null;

  const handleAdvance = async (targetStatus: string) => {
    try { setLoading(true); await onUpdateStatus(ticket.ticket_id, targetStatus, noteInput); setNoteInput(""); }
    catch (e: any) { alert("Error: " + e.message); }
    finally { setLoading(false); }
  };

  const priorityColor = (score: number) =>
    score >= 80 ? "#FF3B30" : score >= 60 ? "#FF9500" : score >= 40 ? "#007AFF" : "#8E8E93";

  const detailFields = [
    { label: "Assigned Tech",   value: ticket.assigned_to || "Unassigned",          color: ticket.assigned_to ? "#1C8338" : "var(--text-tertiary)" },
    { label: "Loss Rate",       value: `${ticket.estimated_loss_rate} m³/h`,        color: "#CC1A13" },
    { label: "Financial Impact",value: `$${ticket.estimated_cost}`,                 color: "#B85C00" },
    { label: "Source",          value: ticket.source?.toUpperCase() || "SENSOR",    color: "#007AFF" },
  ];

  return (
    <div className="apple-card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Card Header ── */}
      <div style={{ padding: "1.125rem 1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
              <code style={{
                fontSize: "0.8125rem", fontWeight: 800, color: "#007AFF", fontFamily: "monospace",
                letterSpacing: "0.04em", padding: "0.15rem 0.5rem", borderRadius: 6,
                background: "rgba(0,122,255,0.08)", border: "1px solid rgba(0,122,255,0.18)",
              }}>
                {ticket.ticket_id}
              </code>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>· Zone {ticket.zone_id}</span>
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1.3 }}>
              {ticket.title}
            </h3>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontSize: "1.25rem", fontWeight: 900, color: priorityColor(ticket.priority_score),
              fontFamily: "monospace", letterSpacing: "-0.04em", lineHeight: 1,
            }}>
              {ticket.priority_score.toFixed(0)}
            </div>
            <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontWeight: 500, marginTop: "0.1rem" }}>
              Priority Score
            </div>
          </div>
        </div>
      </div>

      {/* ── Progress Stepper ── */}
      <div style={{ padding: "1.25rem 1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          {/* Background rail */}
          <div style={{
            position: "absolute", top: 18, left: 18, right: 18, height: 2,
            background: "var(--bg-primary)", borderRadius: 99, zIndex: 0,
          }} />
          {/* Filled rail */}
          <div style={{
            position: "absolute", top: 18, left: 18, height: 2,
            background: `linear-gradient(90deg, #007AFF, #34C759)`,
            borderRadius: 99, zIndex: 0, transition: "width 0.6s var(--spring)",
            width: `${(Math.max(0, currentIdx) / (stages.length - 1)) * (100 - 12)}%`,
          }} />

          {stages.map((stage, idx) => {
            const isCompleted = idx <= currentIdx;
            const isCurrent   = idx === currentIdx;
            const Icon = stage.Icon;

            return (
              <div key={stage.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1, flex: 1 }}>
                {/* Step Bubble */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: isCompleted
                    ? "linear-gradient(135deg, #007AFF, #34C759)"
                    : "var(--bg-secondary)",
                  border: isCompleted ? "none" : "1.5px solid var(--separator)",
                  color: isCompleted ? "white" : "var(--text-tertiary)",
                  boxShadow: isCurrent
                    ? "0 0 0 5px rgba(0,122,255,0.12), var(--shadow-sm)"
                    : isCompleted ? "var(--shadow-sm)" : "none",
                  transform: isCurrent ? "scale(1.12)" : "scale(1)",
                  transition: "all 0.3s var(--spring)",
                }}>
                  <Icon />
                </div>
                {/* Label */}
                <p style={{
                  fontSize: "0.6875rem", fontWeight: isCurrent ? 800 : isCompleted ? 600 : 500,
                  marginTop: "0.5rem", textAlign: "center",
                  color: isCurrent ? "#007AFF" : isCompleted ? "var(--text-primary)" : "var(--text-tertiary)",
                  lineHeight: 1.3,
                }}>
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Ticket Details Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", padding: "0.875rem 1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
        {detailFields.map(f => (
          <div key={f.label} style={{
            background: "var(--bg-primary)", borderRadius: 10, padding: "0.625rem 0.75rem",
            border: "1px solid var(--separator-light)",
          }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-tertiary)", marginBottom: "0.25rem" }}>
              {f.label}
            </p>
            <p style={{ fontSize: "0.9375rem", fontWeight: 800, color: f.color, letterSpacing: "-0.02em" }}>
              {f.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Advance Status Action ── */}
      {nextStage && (
        <div style={{
          margin: "0.875rem 1.375rem 0",
          padding: "0.875rem 1rem",
          borderRadius: 12,
          background: "rgba(0,122,255,0.04)",
          border: "1.5px solid rgba(0,122,255,0.15)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem",
        }}>
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
              Next: Advance to <span style={{ color: "#007AFF" }}>{nextStage.key}</span>
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{nextStage.desc}</p>
          </div>
          <button
            onClick={() => handleAdvance(nextStage.key)}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: "0.375rem",
              padding: "0.5625rem 1rem", borderRadius: 10,
              background: "var(--apple-blue)", color: "white",
              fontWeight: 700, fontSize: "0.8125rem",
              border: "none", cursor: "pointer", flexShrink: 0,
              boxShadow: "var(--shadow-blue)",
              transition: "all 0.2s var(--spring)",
              opacity: loading ? 0.5 : 1,
            }}
          >
            Mark {nextStage.label} <ArrowRightIcon />
          </button>
        </div>
      )}

      {/* ── Field Activity Log ── */}
      <div style={{ flex: 1, padding: "0.875rem 1.375rem 1.125rem", marginTop: "0.125rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
          <span style={{ color: "var(--text-secondary)" }}><NoteIcon /></span>
          <h4 style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Field Activity Log
          </h4>
        </div>

        {/* Log Display */}
        <div style={{
          background: "var(--bg-primary)", border: "1px solid var(--separator-light)", borderRadius: 10,
          padding: "0.75rem", maxHeight: 100, overflowY: "auto", marginBottom: "0.625rem",
          fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.7,
        }}>
          {ticket.notes ? (
            ticket.notes.split("\n").map((line: string, i: number) => (
              <p key={i} style={{ margin: 0, padding: "0.1rem 0" }}>{line}</p>
            ))
          ) : (
            <span style={{ color: "var(--text-tertiary)", fontFamily: "inherit", fontStyle: "italic" }}>No field notes recorded yet.</span>
          )}
        </div>

        {/* Note Input */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && noteInput.trim() && handleAdvance(ticket.status)}
            placeholder="Add valve tags, acoustic readings, repair notes…"
            className="input-apple"
            style={{ fontSize: "0.8125rem", padding: "0.5625rem 0.75rem" }}
          />
          <button
            onClick={() => handleAdvance(ticket.status)}
            disabled={!noteInput.trim() || loading}
            style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              padding: "0.5625rem 0.875rem", borderRadius: 10,
              background: noteInput.trim() ? "var(--apple-blue)" : "var(--bg-primary)",
              color: noteInput.trim() ? "white" : "var(--text-tertiary)",
              fontWeight: 700, fontSize: "0.8125rem",
              border: noteInput.trim() ? "none" : "1px solid var(--border-input)",
              cursor: noteInput.trim() ? "pointer" : "default",
              transition: "all 0.2s var(--spring)", flexShrink: 0,
              opacity: loading ? 0.5 : 1,
              boxShadow: noteInput.trim() ? "var(--shadow-blue)" : "none",
            }}
          >
            <SendIcon /> Add Note
          </button>
        </div>
      </div>
    </div>
  );
}
