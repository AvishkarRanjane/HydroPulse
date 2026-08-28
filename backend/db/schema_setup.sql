-- AquaWatch Standard SQL Schema (SQLite / PostgreSQL ANSI Compatible)

CREATE TABLE IF NOT EXISTS zones (
    zone_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    geometry TEXT NOT NULL,
    center_lat FLOAT NOT NULL DEFAULT 18.5204,
    center_lng FLOAT NOT NULL DEFAULT 73.8567,
    population INTEGER NOT NULL DEFAULT 25000,
    base_demand FLOAT NOT NULL DEFAULT 150.0,
    risk_level VARCHAR(20) DEFAULT 'Low',
    risk_score FLOAT DEFAULT 12.5,
    nrw_percentage FLOAT DEFAULT 14.2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipe_segments (
    pipe_id VARCHAR(50) PRIMARY KEY,
    zone_id VARCHAR(50) NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
    geometry TEXT NOT NULL,
    material VARCHAR(50) NOT NULL,
    install_year INTEGER NOT NULL,
    diameter FLOAT NOT NULL,
    length_meters FLOAT DEFAULT 450.0,
    pressure_zone VARCHAR(50) DEFAULT 'PZ-Standard',
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sensors (
    sensor_id VARCHAR(50) PRIMARY KEY,
    pipe_id VARCHAR(50) REFERENCES pipe_segments(pipe_id) ON DELETE SET NULL,
    zone_id VARCHAR(50) NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'flow',
    location_lat FLOAT NOT NULL,
    location_lng FLOAT NOT NULL,
    status VARCHAR(20) DEFAULT 'online',
    battery_level FLOAT DEFAULT 95.0,
    sensitivity_threshold FLOAT DEFAULT 2.5,
    last_reading_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_flow FLOAT DEFAULT 0.0,
    current_pressure FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consumption_records (
    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id VARCHAR(50) NOT NULL REFERENCES sensors(sensor_id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    flow_value FLOAT NOT NULL,
    pressure_value FLOAT NOT NULL,
    expected_flow FLOAT,
    expected_pressure FLOAT,
    is_anomaly BOOLEAN DEFAULT 0,
    z_score FLOAT DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_records_sensor_time ON consumption_records(sensor_id, timestamp);

CREATE TABLE IF NOT EXISTS anomaly_events (
    event_id VARCHAR(50) PRIMARY KEY,
    zone_id VARCHAR(50) NOT NULL REFERENCES zones(zone_id),
    sensor_id VARCHAR(50) REFERENCES sensors(sensor_id),
    pipe_id VARCHAR(50),
    detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(20) NOT NULL DEFAULT 'Moderate',
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    z_score FLOAT NOT NULL DEFAULT 3.2,
    flow_deviation FLOAT NOT NULL DEFAULT 45.0,
    pressure_drop FLOAT DEFAULT 0.8,
    estimated_loss_rate FLOAT DEFAULT 45.0,
    description TEXT,
    resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leak_reports (
    report_id VARCHAR(50) PRIMARY KEY,
    tracking_code VARCHAR(20) UNIQUE NOT NULL,
    citizen_name VARCHAR(100) DEFAULT 'Anonymous Citizen',
    citizen_phone VARCHAR(20),
    citizen_email VARCHAR(100),
    zone_id VARCHAR(50) REFERENCES zones(zone_id),
    location_lat FLOAT NOT NULL,
    location_lng FLOAT NOT NULL,
    address_text VARCHAR(255),
    description TEXT NOT NULL,
    photo_url VARCHAR(255),
    status VARCHAR(30) DEFAULT 'Submitted',
    linked_anomaly_id VARCHAR(50) REFERENCES anomaly_events(event_id),
    is_sensor_corroborated BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_tickets (
    ticket_id VARCHAR(50) PRIMARY KEY,
    source VARCHAR(20) NOT NULL DEFAULT 'sensor',
    priority_score FLOAT NOT NULL DEFAULT 50.0,
    assigned_to VARCHAR(100),
    status VARCHAR(30) DEFAULT 'Reported',
    anomaly_id VARCHAR(50) REFERENCES anomaly_events(event_id),
    report_id VARCHAR(50) REFERENCES leak_reports(report_id),
    zone_id VARCHAR(50) NOT NULL REFERENCES zones(zone_id),
    pipe_id VARCHAR(50) REFERENCES pipe_segments(pipe_id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    estimated_loss_rate FLOAT DEFAULT 30.0,
    estimated_cost FLOAT DEFAULT 1200.0,
    total_volume_lost FLOAT DEFAULT 0.0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    in_progress_at TIMESTAMP,
    fixed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'Utility Staff',
    zone_access VARCHAR(200) DEFAULT 'ALL',
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
