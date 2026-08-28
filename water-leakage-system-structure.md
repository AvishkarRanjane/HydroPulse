# Urban Water Leakage & Loss Detection System — Software Structure

## 1. System Overview

```
                        ┌─────────────────────┐
                        │   Data Sources        │
                        │ (IoT sensors / CSV /   │
                        │  simulated generator)  │
                        └──────────┬─────────────┘
                                   │
                        ┌──────────▼─────────────┐
                        │   Backend (FastAPI)     │
                        │  - Ingestion API        │
                        │  - Anomaly Engine        │
                        │  - Business Logic       │
                        └──────────┬─────────────┘
                                   │
                  ┌────────────────┼────────────────┐
                  │                │                │
          ┌───────▼──────┐ ┌──────▼──────┐ ┌───────▼───────┐
          │ PostgreSQL +  │ │  WebSocket   │ │  Auth Service │
          │  PostGIS      │ │  (live push) │ │  (roles)      │
          └───────────────┘ └──────────────┘ └───────────────┘
                                   │
                        ┌──────────▼─────────────┐
                        │  Frontend (React/Next)  │
                        │  Dashboard / Analytics / │
                        │  Maintenance / Admin /   │
                        │  Citizen Portal          │
                        └─────────────────────────┘
```

---

## 2. Page-Level Structure

### 2.1 Dashboard (landing, internal — utility staff)
- Hero KPI: NRW % (Non-Revenue Water) this month
- Real-time flow & pressure readouts (per zone)
- City risk map (color-coded by leak probability)
- Live anomaly feed (scrolling list, timestamped)
- Water-saved-to-date counter

### 2.2 Analytics
- Distribution-zone comparison (table + chart)
- Normal vs abnormal consumption band chart (expected range vs actual)
- Pipeline/network GIS map (layered: age, material, pressure zone, leak history)
- Area-wise water-loss estimation (ranked heatmap/table)
- Historical trend explorer (filter by zone/date range)

### 2.3 Maintenance
- Leak-priority queue (sortable by severity × population affected × loss rate)
- Repair status timeline (Reported → Assigned → In Progress → Verified Fixed)
- Citizen report list, cross-referenced against sensor-flagged zones
- Technician assignment + task tracking

### 2.4 Admin/Config (internal)
- Sensor/zone/pipe registry management
- Threshold configuration (anomaly sensitivity per zone)
- User & role management (Admin / Utility Staff / Viewer)

### 2.5 Citizen Portal (public, no login)
- Simple leak-report form (location pin, photo upload, description)
- Report status lookup

---

## 3. Data Model (core entities)

| Entity | Key Fields |
|---|---|
| **Zone** | zone_id, name, geometry (PostGIS polygon), population |
| **PipeSegment** | pipe_id, zone_id, geometry (line), material, install_year, diameter |
| **Sensor** | sensor_id, pipe_id/zone_id, type (flow/pressure), location, status |
| **ConsumptionRecord** | record_id, sensor_id, timestamp, flow_value, pressure_value |
| **AnomalyEvent** | event_id, zone_id, sensor_id, detected_at, severity, type, status |
| **LeakReport** | report_id, citizen_id (nullable), zone_id, location, description, photo_url, status, linked_anomaly_id |
| **MaintenanceTicket** | ticket_id, source (sensor/citizen), priority_score, assigned_to, status, timestamps |
| **User** | user_id, role, zone_access |

---

## 4. Backend Module Structure

```
/backend
 ├── main.py                 # FastAPI app entrypoint
 ├── /api
 │    ├── ingestion.py        # receives sensor/simulated data
 │    ├── zones.py
 │    ├── anomalies.py
 │    ├── maintenance.py
 │    ├── citizen_reports.py
 │    └── auth.py
 ├── /core
 │    ├── anomaly_engine.py   # rolling mean/std-dev, z-score, (later: Isolation Forest)
 │    ├── priority_ranking.py # leak priority scoring logic
 │    ├── loss_estimation.py  # area-wise water-loss calc
 │    └── websocket_manager.py
 ├── /models                  # SQLAlchemy models (matches data model above)
 ├── /simulator
 │    └── data_generator.py   # synthetic flow/pressure data + injected leaks
 └── /db
      └── postgis_setup.sql
```

---

## 5. Frontend Module Structure

```
/frontend
 ├── /pages (or /app if Next.js)
 │    ├── dashboard/
 │    ├── analytics/
 │    ├── maintenance/
 │    ├── admin/
 │    └── citizen-report/      # public route, no auth
 ├── /components
 │    ├── charts/               # Recharts wrappers
 │    ├── map/                  # Leaflet/Mapbox layers
 │    ├── AnomalyFeed.tsx
 │    ├── PriorityQueue.tsx
 │    └── StatusTimeline.tsx
 ├── /hooks
 │    └── useWebSocket.ts
 └── /services
      └── api.ts
```

---

## 6. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React / Next.js + Tailwind | Fast to build, judge-friendly demo |
| Maps/GIS | Leaflet.js (or Mapbox GL) | Lightweight, no heavy GIS server needed |
| Backend | FastAPI (Python) | Native fit with pandas/numpy/scikit-learn for anomaly logic |
| Database | PostgreSQL + PostGIS | Real geospatial queries for zones/pipes |
| Charts | Recharts / Chart.js | Fast integration with React |
| Anomaly detection | pandas rolling z-score → Isolation Forest (stretch) | Simple baseline, upgradeable story for judges |
| Real-time | WebSockets (FastAPI native) | Live dashboard feel even with simulated data |
| Auth | JWT-based roles (Admin/Staff/Viewer) | Simple, sufficient for PS demo |

---

## 7. Build Sequence

1. Data model + PostgreSQL/PostGIS schema
2. Synthetic data generator (with injected anomalies)
3. Anomaly detection engine (z-score baseline)
4. Priority ranking + loss estimation logic
5. Backend APIs (ingestion, zones, anomalies, maintenance, citizen reports)
6. Dashboard UI (wire to live/simulated data via WebSocket)
7. Analytics UI (historical charts, zone comparison, GIS layers)
8. Maintenance workflow UI (queue, status timeline)
9. Citizen portal (public form + status lookup)
10. Admin/Config UI
11. Polish: demo script, seed realistic data, prepare judge walkthrough
