"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { PriorityQueue } from "@/components/PriorityQueue";
import { StatusTimeline } from "@/components/StatusTimeline";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/services/api";

const WrenchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M14.5 4.5C14.5 4.5 18 4 18 7.5C18 9.5 16.5 10.5 14.5 10.5L6.5 18.5C6.5 18.5 4.5 19.5 3.5 18.5C2.5 17.5 3.5 15.5 3.5 15.5L11.5 7.5C11.5 7.5 11.5 5.5 14.5 4.5Z" fill="white" fillOpacity="0.9"/>
    <circle cx="4.5" cy="17.5" r="1.5" fill="white" fillOpacity="0.6"/>
    <path d="M15 6C16 7 16 8 16 8" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.5"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="9" cy="7" r="3.5" fill="white" fillOpacity="0.9"/>
    <path d="M3 18C3 15 5.5 13 9 13C12.5 13 15 15 15 18" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="16" cy="7.5" r="2.5" fill="white" fillOpacity="0.6"/>
    <path d="M15.5 13C17.5 13 19.5 14.5 19.5 17" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6"/>
  </svg>
);
const PinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M6.5 1C4.57 1 3 2.57 3 4.5C3 7 6.5 12 6.5 12C6.5 12 10 7 10 4.5C10 2.57 8.43 1 6.5 1Z" fill="currentColor" fillOpacity="0.8"/>
    <circle cx="6.5" cy="4.5" r="1.5" fill="white"/>
  </svg>
);
const ShieldCheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M6.5 1L2 3V7C2 9.76 4 12.26 6.5 13C9 12.26 11 9.76 11 7V3L6.5 1Z" fill="currentColor" fillOpacity="0.8"/>
    <path d="M4.5 7L6 8.5L9 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function MaintenancePage() {
  const { isConnected, lastMessage } = useWebSocket();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [citizenReports, setCitizenReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, techRes, repRes] = await Promise.all([
        api.getTickets(), api.getTechnicians(), api.getAllCitizenReports(),
      ]);
      setTickets(tRes); setTechnicians(techRes); setCitizenReports(repRes);
      if (tRes.length > 0 && !selectedTicket) setSelectedTicket(tRes[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (lastMessage && (lastMessage.event === "ticket_updated" || lastMessage.event === "ticket_created")) {
      api.getTickets().then(fresh => {
        setTickets(fresh);
        if (selectedTicket) {
          const updated = fresh.find((t: any) => t.ticket_id === selectedTicket.ticket_id);
          if (updated) setSelectedTicket(updated);
        }
      });
    }
  }, [lastMessage]);

  const handleUpdateStatus = async (ticketId: string, newStatus: string, notes?: string) => {
    const updated = await api.updateTicket(ticketId, {
      status: newStatus,
      notes: notes ? `${notes}\n[Updated to ${newStatus} at ${new Date().toLocaleTimeString()}]` : undefined,
    });
    setSelectedTicket(updated);
    setTickets(prev => prev.map(t => t.ticket_id === ticketId ? updated : t));
  };

  const handleAssignTechnician = async (ticketId: string, techName: string) => {
    const updated = await api.updateTicket(ticketId, {
      assigned_to: techName, status: "Assigned",
      notes: `[Dispatched]: Assigned to ${techName} on ${new Date().toLocaleString()}`,
    });
    setSelectedTicket(updated);
    setTickets(prev => prev.map(t => t.ticket_id === ticketId ? updated : t));
  };

  const statusColor = (s: string) =>
    s === "Verified" ? "#1C8338" : s === "Assigned" ? "#0055CC" : "#B85C00";
  const statusBg = (s: string) =>
    s === "Verified" ? "rgba(52,199,89,0.1)" : s === "Assigned" ? "rgba(0,122,255,0.1)" : "rgba(255,149,0,0.1)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar wsConnected={isConnected} />

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 60% 40% at 30% 5%, rgba(255,149,0,0.04) 0%, transparent 65%)" }} />

      <main className="page-container animate-fade-in" style={{ position: "relative", zIndex: 1, paddingTop: "1.75rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span className="chip chip-orange">
              <WrenchIcon />
              Maintenance Operations
            </span>
            <span className="chip chip-green" style={{ fontSize: "0.6875rem" }}>✓ Auto-Priority Active</span>
          </div>
          <h1 className="page-title">Repair & Dispatch <span style={{ color: "#FF9500" }}>Queue</span></h1>
          <p className="page-subtitle">Priority-ranked leak tickets · Technician dispatch · Citizen cross-referencing</p>
        </div>

        {/* Priority Queue + Timeline */}
        <div style={{ display: "grid", gridTemplateColumns: "5fr 4fr", gap: "1rem", marginBottom: "1rem" }}
          className="grid-cols-1 lg:grid-cols-2">
          <div>
            <PriorityQueue
              tickets={tickets}
              onSelectTicket={setSelectedTicket}
              onAssignTechnician={handleAssignTechnician}
              technicians={technicians}
            />
          </div>
          <div>
            <StatusTimeline ticket={selectedTicket} onUpdateStatus={handleUpdateStatus} />
          </div>
        </div>

        {/* Citizen Reports */}
        <div className="apple-card animate-slide-up delay-200" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.125rem 1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <div className="icon-wrap-sm icon-teal">
                <UsersIcon />
              </div>
              <div>
                <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  Citizen Reports & IoT Corroboration
                </p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  GPS-pinned submissions cross-referenced against live sensor anomalies
                </p>
              </div>
            </div>
            <span className="chip chip-blue">{citizenReports.length} Reports</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "0.875rem", padding: "1.125rem" }}>
            {citizenReports.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem 0", color: "var(--text-tertiary)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📋</div>
                <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No citizen reports yet</p>
              </div>
            ) : (
              citizenReports.map(rep => (
                <div key={rep.report_id} style={{
                  borderRadius: 14,
                  border: `1.5px solid ${rep.is_sensor_corroborated ? "rgba(52,199,89,0.25)" : "var(--border-card)"}`,
                  background: rep.is_sensor_corroborated ? "linear-gradient(135deg, rgba(52,199,89,0.04), white)" : "white",
                  padding: "1rem",
                  boxShadow: "var(--shadow-xs)",
                  transition: "all 0.25s var(--spring)",
                }}
                  className="hover:shadow-md">
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <div>
                      <code style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#007AFF", fontFamily: "monospace", letterSpacing: "0.02em" }}>
                        {rep.tracking_code}
                      </code>
                      <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                        {rep.citizen_name}
                      </p>
                    </div>
                    {rep.is_sensor_corroborated ? (
                      <span className="chip chip-green" style={{ fontSize: "0.6875rem", flexShrink: 0 }}>
                        <ShieldCheckIcon /> IoT Corroborated
                      </span>
                    ) : (
                      <span className="chip chip-gray" style={{ fontSize: "0.6875rem", flexShrink: 0 }}>Unverified</span>
                    )}
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "0.75rem",
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    &ldquo;{rep.description}&rdquo;
                  </p>

                  {/* Address */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                    <span style={{ color: "#FF3B30" }}><PinIcon /></span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {rep.address_text || "GPS Location"}
                    </span>
                  </div>

                  {/* Footer */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--separator-light)", paddingTop: "0.625rem" }}>
                    <code style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                      {rep.zone_id || "Matched"}
                    </code>
                    <span style={{
                      fontSize: "0.6875rem", fontWeight: 700, padding: "0.2rem 0.625rem", borderRadius: 20,
                      background: statusBg(rep.status), color: statusColor(rep.status),
                    }}>{rep.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
