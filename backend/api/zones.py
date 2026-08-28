"""
AquaWatch - Zones & GIS Network API
Provides endpoints for District Metered Areas (DMAs), pipe segments, IoT sensors,
and aggregated real-time zone telemetry summaries for dashboard and analytics.
"""

import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.database import get_db
from models.models import Zone, PipeSegment, Sensor, AnomalyEvent, MaintenanceTicket, ConsumptionRecord
from models.schemas import (
    ZoneResponse,
    ZoneCreate,
    PipeSegmentResponse,
    SensorResponse,
    DashboardSummaryResponse
)

router = APIRouter(prefix="/api/zones", tags=["Distribution Zones & GIS"])


@router.get("", response_model=List[ZoneResponse])
def get_zones(db: Session = Depends(get_db)):
    """
    Returns all distribution zones with real-time calculated metrics:
    active anomalies count, open maintenance tickets, current flow, and average pressure.
    """
    zones = db.query(Zone).all()
    results = []
    
    for z in zones:
        active_anomalies = db.query(AnomalyEvent).filter(
            AnomalyEvent.zone_id == z.zone_id,
            AnomalyEvent.status.in_(["Active", "Investigating"])
        ).count()
        
        active_tickets = db.query(MaintenanceTicket).filter(
            MaintenanceTicket.zone_id == z.zone_id,
            MaintenanceTicket.status.in_(["Reported", "Assigned", "In Progress"])
        ).count()
        
        # Calculate current aggregate flow and pressure from sensors in this zone
        sensors = db.query(Sensor).filter(Sensor.zone_id == z.zone_id).all()
        avg_flow = sum(s.current_flow for s in sensors) if sensors else z.base_demand
        avg_pressure = (sum(s.current_pressure for s in sensors) / len(sensors)) if sensors else 4.0
        
        # Calculate dynamic risk score: base + active anomalies impact
        dynamic_risk_score = min(100.0, z.risk_score + (active_anomalies * 25.0))
        risk_level = "Critical" if dynamic_risk_score >= 75 else ("High" if dynamic_risk_score >= 50 else ("Medium" if dynamic_risk_score >= 25 else "Low"))
        
        zone_dict = {
            "zone_id": z.zone_id,
            "name": z.name,
            "geometry": z.geometry,
            "center_lat": z.center_lat,
            "center_lng": z.center_lng,
            "population": z.population,
            "base_demand": z.base_demand,
            "risk_level": risk_level,
            "risk_score": round(dynamic_risk_score, 1),
            "nrw_percentage": z.nrw_percentage,
            "created_at": z.created_at,
            "active_anomalies_count": active_anomalies,
            "active_tickets_count": active_tickets,
            "current_flow_rate": round(avg_flow, 2),
            "current_avg_pressure": round(avg_pressure, 2)
        }
        results.append(zone_dict)
        
    return results


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Computes global system-level Hero KPIs:
    - NRW % this month
    - Water saved to date (m³)
    - Active leak count
    - Total population protected
    - Daily volume lost and cost
    - Network health score (0-100%)
    """
    zones = db.query(Zone).all()
    active_anomalies = db.query(AnomalyEvent).filter(
        AnomalyEvent.status.in_(["Active", "Investigating"])
    ).all()
    
    total_pop = sum(z.population for z in zones)
    avg_nrw = (sum(z.nrw_percentage for z in zones) / len(zones)) if zones else 16.4
    
    # Calculate daily loss from active anomalies
    total_hourly_loss = sum(a.estimated_loss_rate for a in active_anomalies)
    daily_volume_lost = total_hourly_loss * 24.0
    daily_cost_loss = daily_volume_lost * 1.80 # tariff + pumping surcharge
    
    # Estimate water saved to date based on resolved tickets
    resolved_tickets = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.status == "Verified Fixed"
    ).count()
    water_saved_m3 = 1450.0 + (resolved_tickets * 320.0) # Base historic saved + resolved tickets
    
    # Health score: 100 - penalties for active critical/moderate leaks
    penalty = sum(25.0 if a.severity == "Critical" else 10.0 for a in active_anomalies)
    health_score = max(35.0, min(100.0, 98.0 - penalty))
    
    system_status = "Optimal" if health_score >= 85 else ("Warning" if health_score >= 60 else "Critical Alert")

    return {
        "nrw_percentage": round(avg_nrw, 1),
        "water_saved_m3": round(water_saved_m3, 1),
        "active_leaks_count": len(active_anomalies),
        "total_population_protected": total_pop,
        "daily_volume_lost_m3": round(daily_volume_lost, 1),
        "estimated_daily_loss_cost": round(daily_cost_loss, 2),
        "network_health_score": round(health_score, 1),
        "system_status": system_status
    }


@router.get("/geojson")
def get_zones_geojson(db: Session = Depends(get_db)):
    """
    Returns standard GeoJSON FeatureCollection of all zones for Leaflet GIS mapping.
    """
    zones = db.query(Zone).all()
    features = []
    
    for z in zones:
        try:
            geom_dict = json.loads(z.geometry)
        except Exception:
            geom_dict = {
                "type": "Polygon",
                "coordinates": [
                    [
                        [z.center_lng - 0.015, z.center_lat - 0.015],
                        [z.center_lng + 0.015, z.center_lat - 0.015],
                        [z.center_lng + 0.015, z.center_lat + 0.015],
                        [z.center_lng - 0.015, z.center_lat + 0.015],
                        [z.center_lng - 0.015, z.center_lat - 0.015]
                    ]
                ]
            }
            
        features.append({
            "type": "Feature",
            "id": z.zone_id,
            "properties": {
                "zone_id": z.zone_id,
                "name": z.name,
                "population": z.population,
                "base_demand": z.base_demand,
                "risk_level": z.risk_level,
                "risk_score": z.risk_score,
                "nrw_percentage": z.nrw_percentage,
                "center": [z.center_lat, z.center_lng]
            },
            "geometry": geom_dict
        })
        
    return {
        "type": "FeatureCollection",
        "features": features
    }


@router.get("/{zone_id}", response_model=ZoneResponse)
def get_zone_by_id(zone_id: str, db: Session = Depends(get_db)):
    """Returns details of a specific zone."""
    zone = db.query(Zone).filter(Zone.zone_id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
        
    active_anomalies = db.query(AnomalyEvent).filter(
        AnomalyEvent.zone_id == zone.zone_id,
        AnomalyEvent.status.in_(["Active", "Investigating"])
    ).count()
    active_tickets = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.zone_id == zone.zone_id,
        MaintenanceTicket.status.in_(["Reported", "Assigned", "In Progress"])
    ).count()
    
    sensors = db.query(Sensor).filter(Sensor.zone_id == zone.zone_id).all()
    avg_flow = sum(s.current_flow for s in sensors) if sensors else zone.base_demand
    avg_pressure = (sum(s.current_pressure for s in sensors) / len(sensors)) if sensors else 4.0

    return {
        "zone_id": zone.zone_id,
        "name": zone.name,
        "geometry": zone.geometry,
        "center_lat": zone.center_lat,
        "center_lng": zone.center_lng,
        "population": zone.population,
        "base_demand": zone.base_demand,
        "risk_level": zone.risk_level,
        "risk_score": zone.risk_score,
        "nrw_percentage": zone.nrw_percentage,
        "created_at": zone.created_at,
        "active_anomalies_count": active_anomalies,
        "active_tickets_count": active_tickets,
        "current_flow_rate": round(avg_flow, 2),
        "current_avg_pressure": round(avg_pressure, 2)
    }


@router.get("/pipes/all", response_model=List[PipeSegmentResponse])
def get_all_pipes(db: Session = Depends(get_db)):
    """Returns all pipeline segments in the city network."""
    return db.query(PipeSegment).all()


@router.get("/pipes/geojson")
def get_pipes_geojson(db: Session = Depends(get_db)):
    """
    Returns GeoJSON FeatureCollection of all pipeline segments with material, age, diameter, and condition properties.
    """
    pipes = db.query(PipeSegment).all()
    features = []
    current_year = 2026
    
    for p in pipes:
        try:
            geom_dict = json.loads(p.geometry)
        except Exception:
            geom_dict = {
                "type": "LineString",
                "coordinates": [[73.85, 18.52], [73.86, 18.53]]
            }
            
        pipe_age = current_year - p.install_year
        features.append({
            "type": "Feature",
            "id": p.pipe_id,
            "properties": {
                "pipe_id": p.pipe_id,
                "zone_id": p.zone_id,
                "material": p.material,
                "install_year": p.install_year,
                "age_years": pipe_age,
                "diameter_mm": p.diameter,
                "length_meters": p.length_meters,
                "pressure_zone": p.pressure_zone,
                "status": p.status
            },
            "geometry": geom_dict
        })
        
    return {
        "type": "FeatureCollection",
        "features": features
    }


@router.get("/sensors/all", response_model=List[SensorResponse])
def get_all_sensors(db: Session = Depends(get_db)):
    """Returns all IoT sensors in the network with their latest telemetry readouts."""
    return db.query(Sensor).all()
