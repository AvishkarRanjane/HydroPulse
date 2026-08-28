"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { LocationPickerMap } from "@/components/map/LocationPickerMap";
import { api } from "@/services/api";

/* Premium SVG icons */
const DropWave = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
    <defs>
      <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34AADC"/><stop offset="100%" stopColor="#0071E3"/>
      </linearGradient>
    </defs>
    <circle cx="26" cy="26" r="26" fill="rgba(0,122,255,0.08)"/>
    <path d="M26 10C26 10 15 22 15 30C15 36.6 19.9 42 26 42C32.1 42 37 36.6 37 30C37 22 26 10 26 10Z" fill="url(#heroGrad)"/>
    <path d="M20 30C20 33.3 22.7 36 26 36" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6"/>
    <path d="M30 18L35 13" stroke="#34AADC" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7"/>
    <path d="M33 21L39 18" stroke="#34AADC" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
  </svg>
);
const CheckBig = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
    <circle cx="28" cy="28" r="28" fill="rgba(52,199,89,0.12)"/>
    <circle cx="28" cy="28" r="20" fill="rgba(52,199,89,0.15)" stroke="rgba(52,199,89,0.3)" strokeWidth="1.5"/>
    <path d="M18 28L24 34L38 20" stroke="#34C759" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1C4.79 1 3 2.79 3 5C3 8 7 13 7 13C7 13 11 8 11 5C11 2.79 9.21 1 7 1Z" fill="currentColor" fillOpacity="0.8"/>
    <circle cx="7" cy="5" r="1.8" fill="white"/>
  </svg>
);
const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M5.5 2.5L4.5 4H2C1.45 4 1 4.45 1 5V13C1 13.55 1.45 14 2 14H14C14.55 14 15 13.55 15 13V5C15 4.45 14.55 4 14 4H11.5L10.5 2.5H5.5Z" fill="currentColor" fillOpacity="0.8"/>
    <circle cx="8" cy="9" r="2.5" fill="white"/>
  </svg>
);
const ArrowIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M3 7.5H12M8 3.5L12 7.5L8 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ShieldCheckSm = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1L2 4V9C2 12.3 4.7 15.3 8 16C11.3 15.3 14 12.3 14 9V4L8 1Z" fill="currentColor" fillOpacity="0.85"/>
    <path d="M5.5 8.5L7 10L10.5 6.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const HashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 5H11M3 9H11M6 2L5 12M9 2L8 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const AlertTriIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1L15 14H1L8 1Z" fill="currentColor" fillOpacity="0.8"/>
    <path d="M8 6V9M8 11V11.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

export default function CitizenReportPage() {
  const [activeTab, setActiveTab] = useState<"submit" | "track">("submit");
  const [citizenName, setCitizenName] = useState("");
  const [citizenPhone, setCitizenPhone] = useState("");
  const [addressText, setAddressText] = useState("");
  const [description, setDescription] = useState("");
  const [locationLat, setLocationLat] = useState(18.5204);
  const [locationLng, setLocationLng] = useState(73.8567);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [trackingResult, setTrackingResult] = useState<any | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const handleLocationSelect = (lat: number, lng: number) => {
    setLocationLat(lat); setLocationLng(lng);
    setAddressText(`GPS: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    try {
      setSubmitting(true);
      let photoUrl = null;
      if (selectedFile) {
        const fd = new FormData(); fd.append("file", selectedFile);
        const r = await api.uploadPhoto(fd); photoUrl = r.photo_url;
      }
      const res = await api.submitCitizenReport({
        citizen_name: citizenName || "Concerned Resident",
        citizen_phone: citizenPhone,
        location_lat: locationLat, location_lng: locationLng,
        address_text: addressText || `GPS (${locationLat.toFixed(4)}, ${locationLng.toFixed(4)})`,
        description, photo_url: photoUrl || undefined,
      });
      setSubmittedReport(res);
      setCitizenName(""); setCitizenPhone(""); setDescription("");
      setSelectedFile(null); setFilePreview(null);
    } catch (err: any) { alert("Error: " + (err?.response?.data?.detail || err.message)); }
    finally { setSubmitting(false); }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingInput.trim()) return;
    try {
      setTrackingLoading(true); setTrackingError(null);
      const res = await api.trackReport(trackingInput.trim());
      setTrackingResult(res);
    } catch (err: any) {
      setTrackingResult(null);
      setTrackingError(err?.response?.data?.detail || "Report not found. Check your Tracking ID.");
    } finally { setTrackingLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar wsConnected={true} />

      {/* ══ HERO ══ */}
      <div className="portal-hero-apple">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
            <div className="animate-float"><DropWave /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
            <span className="chip chip-blue" style={{ fontSize: "0.75rem", padding: "0.35rem 0.875rem" }}>
              Public Water Utility Incident Portal
            </span>
          </div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 900, letterSpacing: "-0.04em", color: "var(--text-primary)", lineHeight: 1.15, marginBottom: "0.875rem", textAlign: "center" }}>
            Report a Water Leak in<br />
            <span style={{ color: "#007AFF" }}>Your Neighborhood</span>
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: 440, margin: "0 auto 2rem", lineHeight: 1.6, textAlign: "center" }}>
            Every report conserves treated water. Submit GPS-pinned incident photos or track your repair request in real time.
          </p>

          {/* Tab Switcher */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(16px)", borderRadius: 14, padding: "4px", border: "1px solid var(--border-card)", boxShadow: "var(--shadow-sm)" }}>
              {[{ id: "submit", label: "Submit Leak Report" }, { id: "track", label: "Track Report" }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  className="btn-apple"
                  style={{
                    background: activeTab === tab.id ? "var(--apple-blue)" : "transparent",
                    color: activeTab === tab.id ? "white" : "var(--text-secondary)",
                    boxShadow: activeTab === tab.id ? "var(--shadow-blue)" : "none",
                    fontSize: "0.9375rem", padding: "0.5625rem 1.5rem",
                  }}>
                  {tab.id === "track" ? <SearchIcon /> : null}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem 1.5rem 3rem" }}>

        {/* ── SUBMIT TAB ── */}
        {activeTab === "submit" && (
          <div className="apple-card animate-scale-in" style={{ overflow: "hidden" }}>
            {submittedReport ? (
              /* Success */
              <div style={{ padding: "3rem 2rem", textAlign: "center" }} className="animate-scale-in">
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                  <CheckBig />
                </div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                  Report Submitted!
                </h2>
                <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", marginBottom: "1.75rem", lineHeight: 1.6 }}>
                  Thank you for helping protect your city's water supply. Your incident is queued for field inspection.
                </p>
                <div style={{ background: "rgba(0,122,255,0.06)", border: "1.5px solid rgba(0,122,255,0.18)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.25rem" }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>
                    Your Tracking Code
                  </p>
                  <p style={{ fontSize: "2.5rem", fontWeight: 900, letterSpacing: "0.08em", color: "#007AFF", fontFamily: "monospace" }}>
                    {submittedReport.tracking_code}
                  </p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "0.375rem" }}>
                    Save this to look up repair progress anytime
                  </p>
                </div>
                {submittedReport.is_sensor_corroborated && (
                  <div style={{ background: "rgba(52,199,89,0.08)", border: "1.5px solid rgba(52,199,89,0.25)", borderRadius: 14, padding: "1rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", textAlign: "left" }}>
                    <span style={{ color: "#1C8338" }}><ShieldCheckSm /></span>
                    <p style={{ fontSize: "0.875rem", color: "#1C8338", fontWeight: 600 }}>
                      IoT Corroborated! Your report matches an active sensor anomaly in {submittedReport.zone_id}. Priority upgraded.
                    </p>
                  </div>
                )}
                <button onClick={() => setSubmittedReport(null)} className="btn-apple btn-ghost-apple">
                  Submit Another Report
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit}>
                {/* Step 1: Map */}
                <div style={{ padding: "1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 13, background: "#007AFF", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.8125rem", fontWeight: 800 }}>1</div>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Pin the Leak Location
                    </h3>
                  </div>
                  <LocationPickerMap initialLat={locationLat} initialLng={locationLng} onLocationSelect={handleLocationSelect} />
                </div>

                {/* Step 2: Details */}
                <div style={{ padding: "1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 13, background: "#007AFF", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.8125rem", fontWeight: 800 }}>2</div>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)" }}>Incident Details</h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "0.375rem" }}>
                        Name (Optional)
                      </label>
                      <input type="text" value={citizenName} onChange={e => setCitizenName(e.target.value)} placeholder="Your name" className="input-apple" />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "0.375rem" }}>
                        Phone (Optional)
                      </label>
                      <input type="text" value={citizenPhone} onChange={e => setCitizenPhone(e.target.value)} placeholder="Contact number" className="input-apple" />
                    </div>
                  </div>
                  <div style={{ marginBottom: "0.75rem" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "0.375rem" }}>
                      Address / Landmark
                    </label>
                    <input type="text" value={addressText} onChange={e => setAddressText(e.target.value)} placeholder="e.g. Corner of Main Road & 4th Street" className="input-apple" />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "0.375rem" }}>
                      Describe the Incident *
                    </label>
                    <textarea
                      rows={3} value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="e.g. Large pool of water emerging from pavement. Steady high-pressure stream overflowing into storm drain for last 2 hours..."
                      required className="input-apple"
                      style={{ resize: "none", lineHeight: 1.6 }}
                    />
                  </div>
                </div>

                {/* Step 3: Photo + Submit */}
                <div style={{ padding: "1.125rem 1.375rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                  <label className="btn-apple btn-surface" style={{ cursor: "pointer", gap: "0.5rem" }}>
                    <span style={{ color: "#007AFF", display: "flex" }}><CameraIcon /></span>
                    {selectedFile ? "Change Photo" : "Attach Photo"}
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                  </label>
                  {filePreview && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={filePreview} alt="Preview" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", border: "2px solid rgba(0,122,255,0.3)", boxShadow: "var(--shadow-xs)" }} />
                  )}
                  <button type="submit" disabled={submitting || !description.trim()} className="btn-apple btn-blue" style={{ marginLeft: "auto", gap: "0.5rem", opacity: (submitting || !description.trim()) ? 0.5 : 1 }}>
                    {submitting ? "Submitting…" : "Submit Report"}
                    {!submitting && <ArrowIcon />}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── TRACK TAB ── */}
        {activeTab === "track" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }} className="animate-scale-in">
            <div className="apple-card" style={{ padding: "1.375rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.875rem" }}>
                <span style={{ color: "#007AFF" }}><HashIcon /></span>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--text-primary)" }}>Enter Your Tracking ID</h3>
              </div>
              <form onSubmit={handleTrack} style={{ display: "flex", gap: "0.625rem" }}>
                <input
                  type="text" value={trackingInput}
                  onChange={e => setTrackingInput(e.target.value.toUpperCase())}
                  placeholder="AQ-78421" required className="input-apple"
                  style={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.08em", fontSize: "1rem", color: "#007AFF" }}
                />
                <button type="submit" disabled={trackingLoading} className="btn-apple btn-blue" style={{ whiteSpace: "nowrap" }}>
                  {trackingLoading ? "Searching…" : "Track"}
                </button>
              </form>
            </div>

            {trackingError && (
              <div style={{ background: "rgba(255,59,48,0.07)", border: "1.5px solid rgba(255,59,48,0.22)", borderRadius: 14, padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}
                className="animate-slide-up">
                <span style={{ color: "#FF3B30", flexShrink: 0 }}><AlertTriIcon /></span>
                <p style={{ fontSize: "0.875rem", color: "#CC1A13", fontWeight: 500 }}>{trackingError}</p>
              </div>
            )}

            {trackingResult && (
              <div className="apple-card animate-scale-in" style={{ overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "1.375rem", borderBottom: "1px solid var(--separator-light)" }}>
                  <div>
                    <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", marginBottom: "0.25rem" }}>
                      Tracking Reference
                    </p>
                    <p style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "0.05em", color: "#007AFF", fontFamily: "monospace" }}>
                      {trackingResult.tracking_code}
                    </p>
                  </div>
                  <span style={{
                    fontSize: "0.8125rem", fontWeight: 700, padding: "0.35rem 0.875rem", borderRadius: 20,
                    background: trackingResult.status === "Resolved" ? "rgba(52,199,89,0.1)" : trackingResult.status === "Assigned" ? "rgba(0,122,255,0.1)" : "rgba(255,149,0,0.1)",
                    color: trackingResult.status === "Resolved" ? "#1C8338" : trackingResult.status === "Assigned" ? "#007AFF" : "#B85C00",
                  }}>{trackingResult.status}</span>
                </div>
                <div style={{ padding: "1.375rem" }}>
                  <div style={{ marginBottom: "1rem" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-tertiary)", marginBottom: "0.3rem" }}>Address</p>
                    <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-primary)" }}>{trackingResult.address_text}</p>
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-tertiary)", marginBottom: "0.3rem" }}>Description</p>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>&ldquo;{trackingResult.description}&rdquo;</p>
                  </div>
                  {trackingResult.is_sensor_corroborated && (
                    <div style={{ background: "rgba(52,199,89,0.08)", border: "1.5px solid rgba(52,199,89,0.22)", borderRadius: 12, padding: "0.875rem", display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
                      <span style={{ color: "#1C8338" }}><ShieldCheckSm /></span>
                      <p style={{ fontSize: "0.875rem", color: "#1C8338", fontWeight: 600 }}>
                        IoT-corroborated in {trackingResult.zone_id} — field crew dispatched
                      </p>
                    </div>
                  )}
                  <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textAlign: "right" }}>
                    Logged {new Date(trackingResult.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
