-- ====================================================================
-- AquaWatch: PostgreSQL + PostGIS Spatial Schema Extension
-- Note for production deployment: Run in a PostgreSQL database with PostGIS enabled
-- Command: CREATE EXTENSION IF NOT EXISTS postgis;
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Distribution Zones with PostGIS Polygon Geometry
CREATE TABLE IF NOT EXISTS zones (
    zone_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    geom GEOMETRY(POLYGON, 4326) NOT NULL,
    center_lat DOUBLE PRECISION NOT NULL DEFAULT 18.5204,
    center_lng DOUBLE PRECISION NOT NULL DEFAULT 73.8567,
    population INTEGER NOT NULL DEFAULT 25000,
    base_demand DOUBLE PRECISION NOT NULL DEFAULT 150.0,
    risk_level VARCHAR(20) DEFAULT 'Low',
    risk_score DOUBLE PRECISION DEFAULT 12.5,
    nrw_percentage DOUBLE PRECISION DEFAULT 14.2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zones_geom ON zones USING GIST (geom);

-- 2. Pipe Segments with PostGIS LineString Geometry
CREATE TABLE IF NOT EXISTS pipe_segments (
    pipe_id VARCHAR(50) PRIMARY KEY,
    zone_id VARCHAR(50) NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
    geom GEOMETRY(LINESTRING, 4326) NOT NULL,
    material VARCHAR(50) NOT NULL,
    install_year INTEGER NOT NULL,
    diameter DOUBLE PRECISION NOT NULL,
    length_meters DOUBLE PRECISION DEFAULT 450.0,
    pressure_zone VARCHAR(50) DEFAULT 'PZ-Standard',
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pipes_geom ON pipe_segments USING GIST (geom);

-- 3. Telemetry Sensors with PostGIS Point Geometry
CREATE TABLE IF NOT EXISTS sensors (
    sensor_id VARCHAR(50) PRIMARY KEY,
    pipe_id VARCHAR(50) REFERENCES pipe_segments(pipe_id) ON DELETE SET NULL,
    zone_id VARCHAR(50) NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'flow',
    geom GEOMETRY(POINT, 4326) NOT NULL,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    status VARCHAR(20) DEFAULT 'online',
    battery_level DOUBLE PRECISION DEFAULT 95.0,
    sensitivity_threshold DOUBLE PRECISION DEFAULT 2.5,
    last_reading_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    current_flow DOUBLE PRECISION DEFAULT 0.0,
    current_pressure DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sensors_geom ON sensors USING GIST (geom);

-- 4. Time-Series Consumption Records
CREATE TABLE IF NOT EXISTS consumption_records (
    record_id BIGSERIAL PRIMARY KEY,
    sensor_id VARCHAR(50) NOT NULL REFERENCES sensors(sensor_id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    flow_value DOUBLE PRECISION NOT NULL,
    pressure_value DOUBLE PRECISION NOT NULL,
    expected_flow DOUBLE PRECISION,
    expected_pressure DOUBLE PRECISION,
    is_anomaly BOOLEAN DEFAULT FALSE,
    z_score DOUBLE PRECISION DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_records_sensor_timestamp ON consumption_records(sensor_id, timestamp DESC);

-- 5. Anomaly Events
CREATE TABLE IF NOT EXISTS anomaly_events (
    event_id VARCHAR(50) PRIMARY KEY,
    zone_id VARCHAR(50) NOT NULL REFERENCES zones(zone_id),
    sensor_id VARCHAR(50) REFERENCES sensors(sensor_id),
    pipe_id VARCHAR(50),
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(20) NOT NULL DEFAULT 'Moderate',
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    z_score DOUBLE PRECISION NOT NULL DEFAULT 3.2,
    flow_deviation DOUBLE PRECISION NOT NULL DEFAULT 45.0,
    pressure_drop DOUBLE PRECISION DEFAULT 0.8,
    estimated_loss_rate DOUBLE PRECISION DEFAULT 45.0,
    description TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 6. Citizen Leak Reports with Point Geometry
CREATE TABLE IF NOT EXISTS leak_reports (
    report_id VARCHAR(50) PRIMARY KEY,
    tracking_code VARCHAR(20) UNIQUE NOT NULL,
    citizen_name VARCHAR(100) DEFAULT 'Anonymous Citizen',
    citizen_phone VARCHAR(20),
    citizen_email VARCHAR(100),
    zone_id VARCHAR(50) REFERENCES zones(zone_id),
    geom GEOMETRY(POINT, 4326) NOT NULL,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    address_text VARCHAR(255),
    description TEXT NOT NULL,
    photo_url VARCHAR(255),
    status VARCHAR(30) DEFAULT 'Submitted',
    linked_anomaly_id VARCHAR(50) REFERENCES anomaly_events(event_id),
    is_sensor_corroborated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_geom ON leak_reports USING GIST (geom);

-- 7. Maintenance Work Orders
CREATE TABLE IF NOT EXISTS maintenance_tickets (
    ticket_id VARCHAR(50) PRIMARY KEY,
    source VARCHAR(20) NOT NULL DEFAULT 'sensor',
    priority_score DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    assigned_to VARCHAR(100),
    status VARCHAR(30) DEFAULT 'Reported',
    anomaly_id VARCHAR(50) REFERENCES anomaly_events(event_id),
    report_id VARCHAR(50) REFERENCES leak_reports(report_id),
    zone_id VARCHAR(50) NOT NULL REFERENCES zones(zone_id),
    pipe_id VARCHAR(50) REFERENCES pipe_segments(pipe_id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    estimated_loss_rate DOUBLE PRECISION DEFAULT 30.0,
    estimated_cost DOUBLE PRECISION DEFAULT 1200.0,
    total_volume_lost DOUBLE PRECISION DEFAULT 0.0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP WITH TIME ZONE,
    in_progress_at TIMESTAMP WITH TIME ZONE,
    fixed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Users & Access Control
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'Utility Staff',
    zone_access VARCHAR(200) DEFAULT 'ALL',
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
