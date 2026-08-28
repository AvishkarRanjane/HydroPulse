/**
 * AquaWatch Frontend API Client Service
 */

import axios from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token interceptor if present
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("aquawatch_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// API Helper Functions
export const api = {
  // Auth
  login: async (credentials: { username: string; password: string }) => {
    const res = await apiClient.post("/api/auth/login", credentials);
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get("/api/auth/me");
    return res.data;
  },
  getUsers: async () => {
    const res = await apiClient.get("/api/auth/users");
    return res.data;
  },

  // Zones & GIS
  getZones: async () => {
    const res = await apiClient.get("/api/zones");
    return res.data;
  },
  getDashboardSummary: async () => {
    const res = await apiClient.get("/api/zones/summary");
    return res.data;
  },
  getZonesGeoJSON: async () => {
    const res = await apiClient.get("/api/zones/geojson");
    return res.data;
  },
  getPipesGeoJSON: async () => {
    const res = await apiClient.get("/api/zones/pipes/geojson");
    return res.data;
  },
  getSensors: async () => {
    const res = await apiClient.get("/api/zones/sensors/all");
    return res.data;
  },

  // Telemetry & Simulation
  getSensorHistory: async (sensorId: string, limit = 100) => {
    const res = await apiClient.get(`/api/ingestion/history/${sensorId}?limit=${limit}`);
    return res.data;
  },
  simulateTick: async () => {
    const res = await apiClient.post("/api/ingestion/simulate-tick");
    return res.data;
  },
  injectLeak: async (data: {
    zone_id: string;
    severity: string;
    leak_type: string;
    duration_hours?: number;
  }) => {
    const res = await apiClient.post("/api/ingestion/inject-leak", data);
    return res.data;
  },
  clearInjections: async () => {
    const res = await apiClient.post("/api/ingestion/clear-injections");
    return res.data;
  },

  // Anomalies
  getAnomalies: async (params?: { zone_id?: string; severity?: string; status?: string }) => {
    const res = await apiClient.get("/api/anomalies", { params });
    return res.data;
  },
  getAnomalyFeed: async () => {
    const res = await apiClient.get("/api/anomalies/feed");
    return res.data;
  },
  updateAnomalyStatus: async (eventId: string, newStatus: string) => {
    const res = await apiClient.put(`/api/anomalies/${eventId}/status?new_status=${newStatus}`);
    return res.data;
  },
  updateSensitivityThreshold: async (zoneId: string, sensitivityThreshold: number) => {
    const res = await apiClient.put(`/api/anomalies/zones/${zoneId}/threshold`, {
      sensitivity_threshold: sensitivityThreshold,
    });
    return res.data;
  },
  getLossRanking: async () => {
    const res = await apiClient.get("/api/anomalies/loss-ranking");
    return res.data;
  },

  // Maintenance
  getTickets: async (params?: { zone_id?: string; status?: string }) => {
    const res = await apiClient.get("/api/maintenance/tickets", { params });
    return res.data;
  },
  getTechnicians: async () => {
    const res = await apiClient.get("/api/maintenance/technicians");
    return res.data;
  },
  createTicket: async (data: any) => {
    const res = await apiClient.post("/api/maintenance/tickets", data);
    return res.data;
  },
  updateTicket: async (ticketId: string, data: any) => {
    const res = await apiClient.put(`/api/maintenance/tickets/${ticketId}`, data);
    return res.data;
  },

  // Citizen Reports
  submitCitizenReport: async (data: {
    citizen_name?: string;
    citizen_phone?: string;
    citizen_email?: string;
    zone_id?: string;
    location_lat: number;
    location_lng: number;
    address_text?: string;
    description: string;
    photo_url?: string;
  }) => {
    const res = await apiClient.post("/api/citizen/reports", data);
    return res.data;
  },
  trackReport: async (trackingCode: string) => {
    const res = await apiClient.get(`/api/citizen/track/${trackingCode}`);
    return res.data;
  },
  getAllCitizenReports: async () => {
    const res = await apiClient.get("/api/citizen/reports/all");
    return res.data;
  },
  uploadPhoto: async (formData: FormData) => {
    const res = await apiClient.post("/api/citizen/upload-photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};
