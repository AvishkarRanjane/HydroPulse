"""
AquaWatch - Citizen Leak Reporting & Spatial Cross-Referencing API
Public portal endpoints for citizen leak submissions, photo uploads, tracking code lookups,
and automated spatial matching with active sensor anomalies.
"""

import os
import uuid
import datetime
import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from models.database import get_db
from models.models import LeakReport, Zone, AnomalyEvent, MaintenanceTicket, PipeSegment
from models.schemas import LeakReportCreate, LeakReportResponse
from core.priority_ranking import calculate_priority_score
from core.websocket_manager import ws_manager

router = APIRouter(prefix="/api/citizen", tags=["Citizen Reporting Portal"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def find_nearest_zone(lat: float, lng: float, db: Session) -> Optional[Zone]:
    """Finds the closest distribution zone for a given citizen GPS pin."""
    zones = db.query(Zone).all()
    if not zones:
        return None
    
    closest_zone = None
    min_dist = float("inf")
    for z in zones:
        dist = haversine_distance_km(lat, lng, z.center_lat, z.center_lng)
        if dist < min_dist:
            min_dist = dist
            closest_zone = z
            
    return closest_zone


@router.post("/reports", response_model=LeakReportResponse)
async def submit_leak_report(
    report_in: LeakReportCreate,
    db: Session = Depends(get_db)
):
    """
    Public endpoint: Accepts citizen water leak incident report, assigns unique tracking code,
    performs automated spatial cross-referencing with active sensor anomalies, and adjusts priority.
    """
    now = datetime.datetime.utcnow()
    rand_code = uuid.uuid4().hex[:6].upper()
    tracking_code = f"AQ-{rand_code}"
    report_id = f"REP-{int(now.timestamp())}"

    # Auto-resolve zone if not provided
    zone_id = report_in.zone_id
    if not zone_id:
        nearest_zone = find_nearest_zone(report_in.location_lat, report_in.location_lng, db)
        zone_id = nearest_zone.zone_id if nearest_zone else "ZONE-01"

    # Cross-reference with active sensor anomalies in this zone
    active_anomaly = db.query(AnomalyEvent).filter(
        AnomalyEvent.zone_id == zone_id,
        AnomalyEvent.status.in_(["Active", "Investigating"])
    ).first()

    is_corroborated = bool(active_anomaly)
    linked_anomaly_id = active_anomaly.event_id if active_anomaly else None

    new_report = LeakReport(
        report_id=report_id,
        tracking_code=tracking_code,
        citizen_name=report_in.citizen_name or "Anonymous Citizen",
        citizen_phone=report_in.citizen_phone,
        citizen_email=report_in.citizen_email,
        zone_id=zone_id,
        location_lat=report_in.location_lat,
        location_lng=report_in.location_lng,
        address_text=report_in.address_text or f"GPS Pin ({report_in.location_lat:.4f}, {report_in.location_lng:.4f})",
        description=report_in.description,
        photo_url=report_in.photo_url,
        status="Verified" if is_corroborated else "Submitted",
        linked_anomaly_id=linked_anomaly_id,
        is_sensor_corroborated=is_corroborated
    )
    db.add(new_report)
    db.flush()

    # If linked to an existing active anomaly, escalate maintenance ticket priority score
    if is_corroborated and active_anomaly:
        ticket = db.query(MaintenanceTicket).filter(
            MaintenanceTicket.anomaly_id == active_anomaly.event_id
        ).first()
        
        if ticket:
            ticket.report_id = new_report.report_id
            ticket.source = "combined"
            ticket.priority_score = min(100.0, ticket.priority_score + 15.0) # Bonus for citizen verification
            ticket.notes = (ticket.notes or "") + f"\n[Citizen Dual-Verified]: Report {tracking_code} received."
        else:
            # Create combined ticket
            zone_obj = db.query(Zone).filter(Zone.zone_id == zone_id).first()
            p_info = calculate_priority_score(
                severity=active_anomaly.severity,
                estimated_loss_rate_m3h=active_anomaly.estimated_loss_rate,
                population_affected=zone_obj.population if zone_obj else 25000,
                is_citizen_corroborated=True
            )
            new_ticket = MaintenanceTicket(
                ticket_id=f"TCK-{int(now.timestamp())}-CIT",
                source="combined",
                priority_score=p_info["priority_score"],
                status="Reported",
                anomaly_id=active_anomaly.event_id,
                report_id=new_report.report_id,
                zone_id=zone_id,
                title=f"Dual-Corroborated Leak: {zone_id}",
                description=f"Sensor Anomaly & Citizen Report ({tracking_code}) correlate at {report_in.address_text}",
                estimated_loss_rate=active_anomaly.estimated_loss_rate,
                estimated_cost=1500.0
            )
            db.add(new_ticket)
    else:
        # Create ticket directly from citizen report
        zone_obj = db.query(Zone).filter(Zone.zone_id == zone_id).first()
        p_info = calculate_priority_score(
            severity="Minor",
            estimated_loss_rate_m3h=15.0,
            population_affected=zone_obj.population if zone_obj else 20000,
            is_citizen_corroborated=False
        )
        new_ticket = MaintenanceTicket(
            ticket_id=f"TCK-{int(now.timestamp())}-CIT",
            source="citizen",
            priority_score=p_info["priority_score"],
            status="Reported",
            report_id=new_report.report_id,
            zone_id=zone_id,
            title=f"Citizen Reported Leak: {new_report.address_text or zone_id}",
            description=new_report.description,
            estimated_loss_rate=15.0,
            estimated_cost=800.0
        )
        db.add(new_ticket)

    db.commit()
    db.refresh(new_report)

    # Broadcast event via WebSocket
    await ws_manager.broadcast_json({
        "event": "citizen_report_submitted",
        "tracking_code": tracking_code,
        "zone_id": zone_id,
        "is_corroborated": is_corroborated,
        "address": new_report.address_text
    })

    return new_report


@router.post("/upload-photo")
async def upload_leak_photo(file: UploadFile = File(...)):
    """Uploads a photo of the water leak and returns accessible URL."""
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"leak_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    return {
        "status": "success",
        "filename": filename,
        "photo_url": f"/uploads/{filename}"
    }


@router.get("/track/{tracking_code}", response_model=LeakReportResponse)
def track_report_by_code(tracking_code: str, db: Session = Depends(get_db)):
    """
    Public lookup endpoint: Residents track real-time resolution status of their reported leak.
    """
    code_clean = tracking_code.strip().upper()
    report = db.query(LeakReport).filter(
        (LeakReport.tracking_code == code_clean) | (LeakReport.report_id == tracking_code)
    ).first()
    
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Report with tracking ID '{tracking_code}' not found. Please check your reference code."
        )
        
    return report


@router.get("/reports/all", response_model=List[LeakReportResponse])
def get_all_reports(db: Session = Depends(get_db)):
    """Internal API: Returns all citizen leak reports."""
    return db.query(LeakReport).order_by(LeakReport.created_at.desc()).all()
