from typing import Optional, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field

# --- User & Auth Schemas ---
class UserBase(BaseModel):
    username: str
    email: str
    role: str = "Utility Staff"
    zone_access: str = "ALL"
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    user_id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Zone Schemas ---
class ZoneBase(BaseModel):
    name: str
    geometry: str # GeoJSON Polygon string
    center_lat: float
    center_lng: float
    population: int
    base_demand: float
    risk_level: str = "Low"
    risk_score: float = 10.0
    nrw_percentage: float = 15.0

class ZoneCreate(ZoneBase):
    zone_id: str

class ZoneResponse(ZoneBase):
    zone_id: str
    created_at: datetime
    active_anomalies_count: Optional[int] = 0
    active_tickets_count: Optional[int] = 0
    current_flow_rate: Optional[float] = 0.0
    current_avg_pressure: Optional[float] = 0.0

    class Config:
        from_attributes = True


# --- Pipe Segment Schemas ---
class PipeSegmentBase(BaseModel):
    zone_id: str
    geometry: str # GeoJSON LineString
    material: str
    install_year: int
    diameter: float
    length_meters: float = 450.0
    pressure_zone: str = "PZ-Standard"
    status: str = "Active"

class PipeSegmentCreate(PipeSegmentBase):
    pipe_id: str

class PipeSegmentResponse(PipeSegmentBase):
    pipe_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Sensor Schemas ---
class SensorBase(BaseModel):
    pipe_id: Optional[str] = None
    zone_id: str
    name: str
    type: str = "flow" # flow, pressure, combined
    location_lat: float
    location_lng: float
    status: str = "online"
    battery_level: float = 95.0
    sensitivity_threshold: float = 2.5

class SensorCreate(SensorBase):
    sensor_id: str

class SensorResponse(SensorBase):
    sensor_id: str
    last_reading_time: datetime
    current_flow: float
    current_pressure: float
    created_at: datetime

    class Config:
        from_attributes = True


# --- Consumption / Telemetry Record Schemas ---
class ConsumptionRecordBase(BaseModel):
    sensor_id: str
    timestamp: datetime
    flow_value: float
    pressure_value: float
    expected_flow: Optional[float] = None
    expected_pressure: Optional[float] = None
    is_anomaly: bool = False
    z_score: float = 0.0

class ConsumptionRecordCreate(BaseModel):
    sensor_id: str
    flow_value: float
    pressure_value: float
    timestamp: Optional[datetime] = None

class ConsumptionRecordResponse(ConsumptionRecordBase):
    record_id: int

    class Config:
        from_attributes = True


# --- Anomaly Event Schemas ---
class AnomalyEventBase(BaseModel):
    zone_id: str
    sensor_id: Optional[str] = None
    pipe_id: Optional[str] = None
    severity: str = "Moderate" # Minor, Moderate, Critical
    type: str = "Sudden Burst" # Sudden Burst, Gradual Leak, Pressure Drop, High Night Flow
    status: str = "Active"
    z_score: float = 3.0
    flow_deviation: float = 30.0
    pressure_drop: float = 0.5
    estimated_loss_rate: float = 30.0
    description: Optional[str] = None

class AnomalyEventCreate(AnomalyEventBase):
    event_id: Optional[str] = None

class AnomalyEventResponse(AnomalyEventBase):
    event_id: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Leak Report (Citizen) Schemas ---
class LeakReportCreate(BaseModel):
    citizen_name: Optional[str] = "Anonymous Citizen"
    citizen_phone: Optional[str] = None
    citizen_email: Optional[str] = None
    zone_id: Optional[str] = None
    location_lat: float
    location_lng: float
    address_text: Optional[str] = None
    description: str
    photo_url: Optional[str] = None

class LeakReportResponse(BaseModel):
    report_id: str
    tracking_code: str
    citizen_name: Optional[str]
    citizen_phone: Optional[str]
    citizen_email: Optional[str]
    zone_id: Optional[str]
    location_lat: float
    location_lng: float
    address_text: Optional[str]
    description: str
    photo_url: Optional[str]
    status: str
    linked_anomaly_id: Optional[str]
    is_sensor_corroborated: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Maintenance Ticket Schemas ---
class MaintenanceTicketCreate(BaseModel):
    source: str = "sensor" # sensor, citizen, combined
    priority_score: Optional[float] = 50.0
    assigned_to: Optional[str] = None
    status: str = "Reported"
    anomaly_id: Optional[str] = None
    report_id: Optional[str] = None
    zone_id: str
    pipe_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    estimated_loss_rate: float = 25.0
    estimated_cost: float = 1000.0
    notes: Optional[str] = None

class MaintenanceTicketUpdate(BaseModel):
    assigned_to: Optional[str] = None
    status: Optional[str] = None # Reported, Assigned, In Progress, Verified Fixed
    priority_score: Optional[float] = None
    notes: Optional[str] = None

class MaintenanceTicketResponse(BaseModel):
    ticket_id: str
    source: str
    priority_score: float
    assigned_to: Optional[str]
    status: str
    anomaly_id: Optional[str]
    report_id: Optional[str]
    zone_id: str
    pipe_id: Optional[str]
    title: str
    description: Optional[str]
    estimated_loss_rate: float
    estimated_cost: float
    total_volume_lost: float
    notes: Optional[str]
    created_at: datetime
    assigned_at: Optional[datetime]
    in_progress_at: Optional[datetime]
    fixed_at: Optional[datetime]
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Simulation & Admin Schemas ---
class LeakInjectionRequest(BaseModel):
    zone_id: str
    severity: str = "Critical" # Minor, Moderate, Critical
    leak_type: str = "Sudden Burst" # Sudden Burst, Gradual Leak, Low Pressure
    flow_spike_percent: float = 85.0 # percentage increase over baseline
    pressure_drop_bar: float = 1.2
    duration_hours: int = 4

class SensitivityUpdateRequest(BaseModel):
    sensitivity_threshold: float = Field(ge=1.0, le=5.0)

class DashboardSummaryResponse(BaseModel):
    nrw_percentage: float
    water_saved_m3: float
    active_leaks_count: int
    total_population_protected: int
    daily_volume_lost_m3: float
    estimated_daily_loss_cost: float
    network_health_score: float
    system_status: str
