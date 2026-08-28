"""
AquaWatch - Maintenance Work Orders & Priority Queue API
Handles ticket creation, dynamic priority ranking sorting, technician dispatch,
and repair lifecycle status tracking (Reported -> Assigned -> In Progress -> Verified Fixed).
"""

import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from models.database import get_db
from models.models import MaintenanceTicket, AnomalyEvent, LeakReport, Zone, PipeSegment
from models.schemas import (
    MaintenanceTicketCreate,
    MaintenanceTicketUpdate,
    MaintenanceTicketResponse
)
from core.priority_ranking import calculate_priority_score
from core.websocket_manager import ws_manager

router = APIRouter(prefix="/api/maintenance", tags=["Maintenance & Field Operations"])

# Available municipal field technicians
TECHNICIAN_ROSTER = [
    {"id": "TECH-01", "name": "Rajesh Sharma", "specialty": "Main Trunk Burst Repair", "status": "Available"},
    {"id": "TECH-02", "name": "Amina Patel", "specialty": "Pressure Valve Calibration", "status": "In Field"},
    {"id": "TECH-03", "name": "Vikram Deshmukh", "specialty": "Acoustic Leak Detection", "status": "Available"},
    {"id": "TECH-04", "name": "Deepak Verma", "specialty": "GIS Pipeline Excavation", "status": "Available"},
    {"id": "TECH-05", "name": "Pooja Joshi", "specialty": "IoT Sensor Diagnostics", "status": "Available"}
]


@router.get("/tickets", response_model=List[MaintenanceTicketResponse])
def get_maintenance_tickets(
    zone_id: Optional[str] = None,
    status: Optional[str] = None,
    min_priority: Optional[float] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Returns maintenance tickets sorted by priority_score descending (highest priority emergency first).
    """
    query = db.query(MaintenanceTicket)
    
    if zone_id:
        query = query.filter(MaintenanceTicket.zone_id == zone_id)
    if status:
        query = query.filter(MaintenanceTicket.status == status)
    if min_priority is not None:
        query = query.filter(MaintenanceTicket.priority_score >= min_priority)
        
    return query.order_by(MaintenanceTicket.priority_score.desc()).limit(limit).all()


@router.get("/technicians")
def get_technicians():
    """Returns list of utility field technicians."""
    return TECHNICIAN_ROSTER


@router.post("/tickets", response_model=MaintenanceTicketResponse)
async def create_maintenance_ticket(
    ticket_in: MaintenanceTicketCreate,
    db: Session = Depends(get_db)
):
    """Creates a new maintenance work order with calculated priority score."""
    ticket_id = f"TCK-{int(datetime.datetime.utcnow().timestamp())}"
    
    zone = db.query(Zone).filter(Zone.zone_id == ticket_in.zone_id).first()
    pipe = db.query(PipeSegment).filter(PipeSegment.pipe_id == ticket_in.pipe_id).first() if ticket_in.pipe_id else None
    
    priority_score = ticket_in.priority_score
    if not priority_score or priority_score == 50.0:
        p_info = calculate_priority_score(
            severity="Moderate",
            estimated_loss_rate_m3h=ticket_in.estimated_loss_rate,
            population_affected=zone.population if zone else 25000,
            is_citizen_corroborated=(ticket_in.source in ["citizen", "combined"]),
            pipe_material=pipe.material if pipe else "Cast Iron",
            pipe_install_year=pipe.install_year if pipe else 1998
        )
        priority_score = p_info["priority_score"]

    new_ticket = MaintenanceTicket(
        ticket_id=ticket_id,
        source=ticket_in.source,
        priority_score=priority_score,
        assigned_to=ticket_in.assigned_to,
        status=ticket_in.status,
        anomaly_id=ticket_in.anomaly_id,
        report_id=ticket_in.report_id,
        zone_id=ticket_in.zone_id,
        pipe_id=ticket_in.pipe_id,
        title=ticket_in.title,
        description=ticket_in.description,
        estimated_loss_rate=ticket_in.estimated_loss_rate,
        estimated_cost=ticket_in.estimated_cost,
        notes=ticket_in.notes
    )
    
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    # Broadcast ticket creation over websocket
    await ws_manager.broadcast_json({
        "event": "ticket_created",
        "ticket": {
            "ticket_id": new_ticket.ticket_id,
            "title": new_ticket.title,
            "priority_score": new_ticket.priority_score,
            "status": new_ticket.status,
            "zone_id": new_ticket.zone_id
        }
    })

    return new_ticket


@router.put("/tickets/{ticket_id}", response_model=MaintenanceTicketResponse)
async def update_ticket(
    ticket_id: str,
    update_in: MaintenanceTicketUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates maintenance ticket state along the lifecycle:
    Reported -> Assigned -> In Progress -> Verified Fixed
    """
    ticket = db.query(MaintenanceTicket).filter(MaintenanceTicket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found")

    now = datetime.datetime.utcnow()

    if update_in.assigned_to is not None:
        ticket.assigned_to = update_in.assigned_to
        if not ticket.assigned_at:
            ticket.assigned_at = now
        if ticket.status == "Reported":
            ticket.status = "Assigned"

    if update_in.status is not None:
        old_status = ticket.status
        ticket.status = update_in.status
        
        if update_in.status == "Assigned" and not ticket.assigned_at:
            ticket.assigned_at = now
        elif update_in.status == "In Progress" and not ticket.in_progress_at:
            ticket.in_progress_at = now
        elif update_in.status == "Verified Fixed":
            ticket.fixed_at = now
            # Mark linked anomaly as resolved
            if ticket.anomaly_id:
                anom = db.query(AnomalyEvent).filter(AnomalyEvent.event_id == ticket.anomaly_id).first()
                if anom:
                    anom.status = "Resolved"
                    anom.resolved_at = now
            # Mark linked citizen report as resolved
            if ticket.report_id:
                rep = db.query(LeakReport).filter(LeakReport.report_id == ticket.report_id).first()
                if rep:
                    rep.status = "Resolved"

    if update_in.priority_score is not None:
        ticket.priority_score = update_in.priority_score

    if update_in.notes is not None:
        ticket.notes = update_in.notes

    ticket.updated_at = now
    db.commit()
    db.refresh(ticket)

    # Broadcast ticket status change
    await ws_manager.broadcast_json({
        "event": "ticket_updated",
        "ticket_id": ticket.ticket_id,
        "status": ticket.status,
        "assigned_to": ticket.assigned_to
    })

    return ticket


@router.get("/tickets/{ticket_id}", response_model=MaintenanceTicketResponse)
def get_ticket_by_id(ticket_id: str, db: Session = Depends(get_db)):
    """Returns single ticket details."""
    ticket = db.query(MaintenanceTicket).filter(MaintenanceTicket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found")
    return ticket
