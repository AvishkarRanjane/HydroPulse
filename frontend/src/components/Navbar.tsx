"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SimulationModal } from "./SimulationModal";

/* ─── Custom Apple-quality SVG Icons ─── */
const AquaWatchLogo = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34AADC"/>
        <stop offset="100%" stopColor="#0055D5"/>
      </linearGradient>
      <filter id="logoShadow">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,85,213,0.25)"/>
      </filter>
    </defs>
    <rect width="36" height="36" rx="10" fill="url(#logoGrad)" filter="url(#logoShadow)"/>
    {/* Water drop main */}
    <path d="M18 7C18 7 11 15.5 11 20.5C11 24.09 14.13 27 18 27C21.87 27 25 24.09 25 20.5C25 15.5 18 7 18 7Z" fill="white" fillOpacity="0.95"/>
    {/* Inner highlight */}
    <path d="M15.5 20C15.5 20 14 21.2 14 22.5C14 24.43 15.79 26 18 26" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.5"/>
    {/* Wifi/signal arcs — IoT */}
    <path d="M22 11.5C24.5 13.5 25 17 25 17" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.7"/>
    <path d="M24 9.5C27.5 12 28.5 17 28.5 17" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.4"/>
  </svg>
);

const DashboardIcon = ({ active }: { active?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.5" fill={active ? "#007AFF" : "#8E8E93"} fillOpacity={active ? 1 : 0.8}/>
    <rect x="9" y="1" width="6" height="6" rx="1.5" fill={active ? "#007AFF" : "#8E8E93"} fillOpacity={active ? 0.7 : 0.5}/>
    <rect x="1" y="9" width="6" height="6" rx="1.5" fill={active ? "#007AFF" : "#8E8E93"} fillOpacity={active ? 0.7 : 0.5}/>
    <rect x="9" y="9" width="6" height="6" rx="1.5" fill={active ? "#007AFF" : "#8E8E93"} fillOpacity={active ? 0.5 : 0.3}/>
  </svg>
);

const AnalyticsIcon = ({ active }: { active?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="10" width="3" height="5" rx="1" fill={active ? "#007AFF" : "#8E8E93"}/>
    <rect x="6" y="6" width="3" height="9" rx="1" fill={active ? "#007AFF" : "#8E8E93"} fillOpacity={active ? 0.8 : 0.65}/>
    <rect x="11" y="1" width="3" height="14" rx="1" fill={active ? "#007AFF" : "#8E8E93"} fillOpacity={active ? 0.6 : 0.45}/>
    <path d="M2.5 9L7.5 5L12.5 1" stroke={active ? "#007AFF" : "#8E8E93"} strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.5"/>
  </svg>
);

const MaintenanceIcon = ({ active }: { active?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10.5 2.5C10.5 2.5 13.5 2 13.5 5C13.5 6.5 12.5 7.5 11 7.5L4.5 14C4.5 14 3 14.5 2.5 13.5C2 12.5 2.5 11 2.5 11L9 4.5C9 4.5 9 3 10.5 2.5Z" fill={active ? "#007AFF" : "#8E8E93"} fillOpacity={active ? 0.9 : 0.7}/>
    <circle cx="3.5" cy="12.5" r="1.2" fill={active ? "#007AFF" : "#8E8E93"}/>
    <path d="M11.5 4C12 4.5 12 5 12 5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

const CitizenIcon = ({ active }: { active?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="2.8" fill={active ? "#007AFF" : "#8E8E93"} fillOpacity={active ? 0.9 : 0.7}/>
    <path d="M8 9C5 9 3 10.5 3 12.5V13.5C3 13.8 3.2 14 3.5 14H12.5C12.8 14 13 13.8 13 13.5V12.5C13 10.5 11 9 8 9Z" fill={active ? "#007AFF" : "#8E8E93"} fillOpacity={active ? 0.7 : 0.5}/>
    <path d="M8 9V14" stroke="white" strokeWidth="0.8" strokeOpacity="0.5"/>
  </svg>
);

const AdminIcon = ({ active }: { active?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2.2" fill={active ? "#007AFF" : "#8E8E93"}/>
    <path d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.4 3.4L4.5 4.5M11.5 11.5L12.6 12.6M3.4 12.6L4.5 11.5M11.5 4.5L12.6 3.4" stroke={active ? "#007AFF" : "#8E8E93"} strokeWidth="1.5" strokeLinecap="round" strokeOpacity={active ? 0.7 : 0.55}/>
  </svg>
);

const SimIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 1.5L9.5 5.5L14 6.5L10.5 9.5L11.5 14L7.5 11.5L3.5 14L4.5 9.5L1 6.5L5.5 5.5L7.5 1.5Z" fill="white" fillOpacity="0.9"/>
  </svg>
);

interface NavbarProps { wsConnected?: boolean; }

export function Navbar({ wsConnected = true }: NavbarProps) {
  const pathname = usePathname();
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);

  const navItems = [
    { label: "Dashboard",    href: "/dashboard",     Icon: DashboardIcon },
    { label: "Analytics",    href: "/analytics",     Icon: AnalyticsIcon },
    { label: "Maintenance",  href: "/maintenance",   Icon: MaintenanceIcon },
    { label: "Report",       href: "/citizen-report",Icon: CitizenIcon },
    { label: "Admin",        href: "/admin",         Icon: AdminIcon },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full apple-glass-nav">
        <div style={{ maxWidth: 1380, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem" }}>

          {/* ─ Logo ─ */}
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none", flexShrink: 0 }}
            className="group">
            <div style={{ transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}
              className="group-hover:scale-105">
              <AquaWatchLogo />
            </div>
            <div style={{ lineHeight: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.0625rem", fontWeight: 800, letterSpacing: "-0.03em", color: "#1D1D1F" }}>
                  Aqua<span style={{ color: "#007AFF" }}>Watch</span>
                </span>
                <span className="chip chip-blue" style={{ fontSize: "0.625rem", padding: "0.15rem 0.5rem" }}>AI DMA</span>
              </div>
              <p style={{ fontSize: "0.6875rem", color: "#8E8E93", fontWeight: 500, marginTop: "0.125rem" }}>
                Urban Water Intelligence
              </p>
            </div>
          </Link>

          {/* ─ Nav Links ─ */}
          <nav style={{ display: "flex", alignItems: "center", gap: "0.125rem", flex: 1, justifyContent: "center" }}
            className="hidden lg:flex">
            {navItems.map(({ label, href, Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link key={href} href={href} className={`nav-apple ${isActive ? "active" : ""}`}>
                  <Icon active={isActive} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* ─ Right Actions ─ */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
            {/* Live Telemetry Status */}
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.375rem 0.875rem",
              borderRadius: 20,
              fontSize: "0.75rem",
              fontWeight: 600,
              background: wsConnected ? "rgba(52,199,89,0.10)" : "rgba(255,149,0,0.10)",
              color: wsConnected ? "#1C8338" : "#B85C00",
              border: `1px solid ${wsConnected ? "rgba(52,199,89,0.22)" : "rgba(255,149,0,0.22)"}`,
            }}
              className="hidden sm:flex">
              <span className={wsConnected ? "live-indicator" : ""} style={!wsConnected ? {
                width: 8, height: 8, borderRadius: "50%",
                background: "#FF9500", flexShrink: 0, display: "block"
              } : {}} />
              {wsConnected ? "Live Telemetry" : "Offline"}
            </div>

            {/* Simulate Burst */}
            <button
              onClick={() => setIsSimModalOpen(true)}
              className="btn-apple btn-red"
              style={{ fontSize: "0.8125rem", padding: "0.5rem 1rem" }}
            >
              <SimIcon />
              <span className="hidden sm:inline">Simulate Burst</span>
              <span className="sm:hidden">Sim</span>
            </button>

            {/* Profile Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", paddingLeft: "0.75rem", borderLeft: "1px solid rgba(60,60,67,0.15)" }}
              className="hidden lg:flex">
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg, #007AFF, #0055CC)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,122,255,0.25)",
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="5.5" r="2.8" fill="white"/>
                  <path d="M3 13C3 11 5 9.5 8 9.5C11 9.5 13 11 13 13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#1D1D1F" }}>Admin</p>
                <p style={{ fontSize: "0.6875rem", color: "#007AFF", fontWeight: 500 }}>All Zones</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <SimulationModal isOpen={isSimModalOpen} onClose={() => setIsSimModalOpen(false)} />
    </>
  );
}
