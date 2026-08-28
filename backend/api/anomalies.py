"""
AquaWatch - Anomalies & Analytics API
Provides endpoints for reviewing detected anomaly events, updating zone sensitivity thresholds,
and retrieving area-wise water loss ranking metrics.
"""

from typing import List, Optional
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.database import get_db
from models.models import AnomalyEvent, Zone, Sensor, MaintenanceTicket
from models.schemas import AnomalyEventResponse, SensitivityUpdateRequest
from core.loss_estimation import calculate_water_loss

router = APIRouter(prefix="/api/anomalies", tags=["Anomalies & Detection Engine"])


@router.get("", response_model=List[AnomalyEventResponse])
def get_anomalies(
    zone_id: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Returns detected anomaly events with optional filters (zone, severity, status).
    Ordered with newest anomalies first.
    """
    query = db.query(AnomalyEvent)
    
    if zone_id:
        query = query.filter(AnomalyEvent.zone_id == zone_id)
    if severity:
        query = query.filter(AnomalyEvent.severity == severity)
    if status:
        query = query.filter(AnomalyEvent.status == status)
        
    return query.order_by(AnomalyEvent.detected_at.desc()).limit(limit).all()


@router.get("/feed")
def get_live_anomaly_feed(limit: int = 20, db: Session = Depends(get_db)):
    """
    Returns compact live anomaly feed for dashboard ticker and alerts widget.
    """
    anomalies = db.query(AnomalyEvent).order_by(
        AnomalyEvent.detected_at.desc()
    ).limit(limit).all()

    results = []
    for a in anomalies:
        zone = db.query(Zone).filter(Zone.zone_id == a.zone_id).first()
        zone_name = zone.name if zone else a.zone_id
        
        # Calculate duration in hours
        end_time = a.resolved_at or datetime.datetime.utcnow()
        duration_hrs = max(0.1, (end_time - a.detected_at).total_seconds() / 3600.0)
        loss_info = calculate_water_loss(a.flow_deviation, duration_hrs)

        results.append({
            "event_id": a.event_id,
            "zone_id": a.zone_id,
            "zone_name": zone_name,
            "sensor_id": a.sensor_id,
            "pipe_id": a.pipe_id,
            "severity": a.severity,
            "type": a.type,
            "status": a.status,
            "z_score": a.z_score,
            "flow_deviation": a.flow_deviation,
            "pressure_drop": a.pressure_drop,
            "estimated_loss_rate": a.estimated_loss_rate,
            "volume_lost_m3": loss_info["volume_lost_m3"],
            "financial_loss_cost": loss_info["total_financial_loss"],
            "description": a.description,
            "detected_at": a.detected_at.isoformat(),
            "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None
        })
        
    return results


@router.put("/{event_id}/status")
def update_anomaly_status(
    event_id: str,
    new_status: str, # Active, Investigating, Resolved, False Positive
    db: Session = Depends(get_db)
):
    """Updates status of a detected anomaly."""
    anomaly = db.query(AnomalyEvent).filter(AnomalyEvent.event_id == event_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly event not found")
        
    anomaly.status = new_status
    if new_status in ["Resolved", "False Positive"]:
        anomaly.resolved_at = datetime.datetime.utcnow()
        
    db.commit()
    return {"status": "success", "event_id": event_id, "new_status": new_status}


@router.put("/zones/{zone_id}/threshold")
def update_zone_sensitivity(
    zone_id: str,
    req: SensitivityUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Configures Z-score sensitivity threshold for all sensors in a zone.
    Lower threshold = higher sensitivity (more alerts), higher threshold = lower false positives.
    """
    zone = db.query(Zone).filter(Zone.zone_id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
        
    sensors = db.query(Sensor).filter(Sensor.zone_id == zone_id).all()
    for s in sensors:
        s.sensitivity_threshold = req.sensitivity_threshold
        
    db.commit()
    return {
        "status": "success",
        "zone_id": zone_id,
        "new_sensitivity_threshold": req.sensitivity_threshold,
        "sensors_updated": len(sensors)
    }


@router.get("/loss-ranking")
def get_area_loss_ranking(db: Session = Depends(get_db)):
    """
    Computes area-wise ranked water loss table and heatmap data for the Analytics view.
    """
    zones = db.query(Zone).all()
    results = []
    
    for z in zones:
        anomalies = db.query(AnomalyEvent).filter(AnomalyEvent.zone_id == z.zone_id).all()
        active_count = sum(1 for a in anomalies if a.status in ["Active", "Investigating"])
        
        total_loss_m3 = 0.0
        total_loss_cost = 0.0
        
        for a in anomalies:
            end_time = a.resolved_at or datetime.datetime.utcnow()
            dur = max(0.2, (end_time - a.detected_at).total_seconds() / 3600.0)
            loss = calculate_water_loss(a.flow_deviation, dur)
            total_loss_m3 += loss["volume_lost_m3"]
            total_loss_cost += loss["total_financial_loss"]

        # Base estimated annual loss based on NRW %
        annual_volume_produced = z.base_demand * 24 * 365
        estimated_nrw_volume = annual_volume_produced * (z.nrw_percentage / 100.0)

        results.append({
            "zone_id": z.zone_id,
            "zone_name": z.name,
            "population": z.population,
            "base_demand": z.base_demand,
            "risk_score": z.risk_score,
            "risk_level": z.risk_level,
            "nrw_percentage": z.nrw_percentage,
            "active_anomalies": active_count,
            "total_incidents": len(anomalies),
            "recent_volume_lost_m3": round(total_loss_m3, 1),
            "recent_financial_loss": round(total_loss_cost, 2),
            "estimated_annual_nrw_loss_m3": round(estimated_nrw_volume, 0)
        })
        
    # Sort by recent financial loss descending
    results.sort(key=lambda x: x["recent_financial_loss"], reverse=True)
    return results
