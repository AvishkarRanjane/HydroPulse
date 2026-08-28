import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
    Text,
    Enum
)
from sqlalchemy.orm import relationship
from .database import Base

class Zone(Base):
    """
    District Metered Area (DMA) / Distribution Zone Entity.
    Stores spatial polygon boundaries (in GeoJSON format for cross-database portability),
    population count, base demand metrics, and dynamic risk levels.
    """
    __tablename__ = "zones"

    zone_id = Column(String(50), primary_key=True, index=True) # e.g. "ZONE-01"
    name = Column(String(100), nullable=False)                 # e.g. "Downtown Metro"
    geometry = Column(Text, nullable=False)                    # GeoJSON polygon coordinate string
    center_lat = Column(Float, nullable=False, default=18.5204)
    center_lng = Column(Float, nullable=False, default=73.8567)
    population = Column(Integer, nullable=False, default=25000)
    base_demand = Column(Float, nullable=False, default=150.0) # Base flow rate in m3/hr or L/s
    risk_level = Column(String(20), default="Low")             # Low, Medium, High, Critical
    risk_score = Column(Float, default=12.5)                   # 0.0 - 100.0 risk metric
    nrw_percentage = Column(Float, default=14.2)               # Non-Revenue Water %
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    pipes = relationship("PipeSegment", back_populates="zone", cascade="all, delete-orphan")
    sensors = relationship("Sensor", back_populates="zone", cascade="all, delete-orphan")
    anomalies = relationship("AnomalyEvent", back_populates="zone")
    leak_reports = relationship("LeakReport", back_populates="zone")
    tickets = relationship("MaintenanceTicket", back_populates="zone")


class PipeSegment(Base):
    """
    Pipeline Network Segment Entity.
    Stores pipe geometry (LineString), material, installation year, diameter, and condition status.
    """
    __tablename__ = "pipe_segments"

    pipe_id = Column(String(50), primary_key=True, index=True) # e.g. "PIPE-101"
    zone_id = Column(String(50), ForeignKey("zones.zone_id"), nullable=False, index=True)
    geometry = Column(Text, nullable=False)                    # GeoJSON LineString coordinates
    material = Column(String(50), nullable=False)              # Cast Iron, Ductile Iron, PVC, HDPE, Steel
    install_year = Column(Integer, nullable=False)             # e.g. 1998
    diameter = Column(Float, nullable=False)                   # Pipe diameter in mm (e.g. 150, 300)
    length_meters = Column(Float, default=450.0)
    pressure_zone = Column(String(50), default="PZ-Standard")
    status = Column(String(50), default="Active")              # Active, Degraded, Leaking, Under Repair
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    zone = relationship("Zone", back_populates="pipes")
    sensors = relationship("Sensor", back_populates="pipe")
    tickets = relationship("MaintenanceTicket", back_populates="pipe")


class Sensor(Base):
    """
    IoT Telemetry Sensor Entity.
    Deployed on pipelines or zone inlet/outlet nodes to monitor flow (m3/h) and pressure (bar).
    """
    __tablename__ = "sensors"

    sensor_id = Column(String(50), primary_key=True, index=True) # e.g. "SNS-FLW-101"
    pipe_id = Column(String(50), ForeignKey("pipe_segments.pipe_id"), nullable=True, index=True)
    zone_id = Column(String(50), ForeignKey("zones.zone_id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False, default="flow")    # flow, pressure, combined
    location_lat = Column(Float, nullable=False)
    location_lng = Column(Float, nullable=False)
    status = Column(String(20), default="online")                # online, warning, offline
    battery_level = Column(Float, default=95.0)                  # Percentage 0-100%
    sensitivity_threshold = Column(Float, default=2.5)           # Configurable Z-score sensitivity limit
    last_reading_time = Column(DateTime, default=datetime.datetime.utcnow)
    current_flow = Column(Float, default=0.0)
    current_pressure = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    zone = relationship("Zone", back_populates="sensors")
    pipe = relationship("PipeSegment", back_populates="sensors")
    readings = relationship("ConsumptionRecord", back_populates="sensor", cascade="all, delete-orphan")
    anomalies = relationship("AnomalyEvent", back_populates="sensor")


class ConsumptionRecord(Base):
    """
    Time-Series Sensor Telemetry Record.
    Stores periodic snapshots of flow rate and water pressure.
    """
    __tablename__ = "consumption_records"

    record_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    sensor_id = Column(String(50), ForeignKey("sensors.sensor_id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True, default=datetime.datetime.utcnow)
    flow_value = Column(Float, nullable=False)     # m3/hr or L/s
    pressure_value = Column(Float, nullable=False) # bar
    expected_flow = Column(Float, nullable=True)   # Normal baseline predicted flow
    expected_pressure = Column(Float, nullable=True)
    is_anomaly = Column(Boolean, default=False)
    z_score = Column(Float, default=0.0)

    # Relationships
    sensor = relationship("Sensor", back_populates="readings")


class AnomalyEvent(Base):
    """
    Detected Anomaly Event Entity.
    Generated by the analytical engine when z-score or Isolation Forest flags severe deviations.
    """
    __tablename__ = "anomaly_events"

    event_id = Column(String(50), primary_key=True, index=True) # e.g. "ANM-2026-001"
    zone_id = Column(String(50), ForeignKey("zones.zone_id"), nullable=False, index=True)
    sensor_id = Column(String(50), ForeignKey("sensors.sensor_id"), nullable=True, index=True)
    pipe_id = Column(String(50), nullable=True)
    detected_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
    severity = Column(String(20), nullable=False, default="Moderate") # Minor, Moderate, Critical
    type = Column(String(50), nullable=False) # Sudden Burst, Gradual Leak, Pressure Drop, High Night Flow
    status = Column(String(20), default="Active") # Active, Investigating, Resolved, False Positive
    z_score = Column(Float, nullable=False, default=3.2)
    flow_deviation = Column(Float, nullable=False, default=45.0) # Flow delta in m3/hr above baseline
    pressure_drop = Column(Float, default=0.8)                   # Pressure delta in bar
    estimated_loss_rate = Column(Float, default=45.0)            # m3/hour
    description = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    zone = relationship("Zone", back_populates="anomalies")
    sensor = relationship("Sensor", back_populates="anomalies")
    ticket = relationship("MaintenanceTicket", back_populates="anomaly", uselist=False)
    leak_reports = relationship("LeakReport", back_populates="linked_anomaly")


class LeakReport(Base):
    """
    Citizen Leak & Issue Report Entity.
    Public submission from residents with geolocation, photo evidence, and status tracking.
    """
    __tablename__ = "leak_reports"

    report_id = Column(String(50), primary_key=True, index=True) # e.g. "REP-8492"
    tracking_code = Column(String(20), unique=True, index=True)  # e.g. "AQ-94812"
    citizen_name = Column(String(100), nullable=True, default="Anonymous Citizen")
    citizen_phone = Column(String(20), nullable=True)
    citizen_email = Column(String(100), nullable=True)
    zone_id = Column(String(50), ForeignKey("zones.zone_id"), nullable=True, index=True)
    location_lat = Column(Float, nullable=False)
    location_lng = Column(Float, nullable=False)
    address_text = Column(String(255), nullable=True)
    description = Column(Text, nullable=False)
    photo_url = Column(String(255), nullable=True)
    status = Column(String(30), default="Submitted") # Submitted, Under Review, Verified, Assigned, Resolved
    linked_anomaly_id = Column(String(50), ForeignKey("anomaly_events.event_id"), nullable=True)
    is_sensor_corroborated = Column(Boolean, default=False) # True if spatial match with active sensor anomaly
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    zone = relationship("Zone", back_populates="leak_reports")
    linked_anomaly = relationship("AnomalyEvent", back_populates="leak_reports")
    tickets = relationship("MaintenanceTicket", back_populates="report")


class MaintenanceTicket(Base):
    """
    Field Maintenance & Repair Work Order Entity.
    Created automatically via sensor anomaly triggers or converted from verified citizen reports.
    """
    __tablename__ = "maintenance_tickets"

    ticket_id = Column(String(50), primary_key=True, index=True) # e.g. "TCK-2026-104"
    source = Column(String(20), nullable=False, default="sensor") # sensor, citizen, combined
    priority_score = Column(Float, nullable=False, default=50.0)  # Calculated dynamic score (0.0 to 100.0)
    assigned_to = Column(String(100), nullable=True)              # Technician name or team ID
    status = Column(String(30), default="Reported")               # Reported, Assigned, In Progress, Verified Fixed
    anomaly_id = Column(String(50), ForeignKey("anomaly_events.event_id"), nullable=True)
    report_id = Column(String(50), ForeignKey("leak_reports.report_id"), nullable=True)
    zone_id = Column(String(50), ForeignKey("zones.zone_id"), nullable=False, index=True)
    pipe_id = Column(String(50), ForeignKey("pipe_segments.pipe_id"), nullable=True)
    
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    estimated_loss_rate = Column(Float, default=30.0) # m3/hr
    estimated_cost = Column(Float, default=1200.0)    # Estimated repair & water loss cost ($ or ₹)
    total_volume_lost = Column(Float, default=0.0)    # Cumulative m3 lost until resolved
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    assigned_at = Column(DateTime, nullable=True)
    in_progress_at = Column(DateTime, nullable=True)
    fixed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    zone = relationship("Zone", back_populates="tickets")
    pipe = relationship("PipeSegment", back_populates="tickets")
    anomaly = relationship("AnomalyEvent", back_populates="ticket")
    report = relationship("LeakReport", back_populates="tickets")


class User(Base):
    """
    System User Entity with JWT Authentication & RBAC (Admin, Utility Staff, Viewer).
    """
    __tablename__ = "users"

    user_id = Column(String(50), primary_key=True, index=True) # e.g. "USR-001"
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="Utility Staff") # Admin, Utility Staff, Viewer
    zone_access = Column(String(200), default="ALL")                  # "ALL" or comma separated "ZONE-01,ZONE-02"
    full_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
