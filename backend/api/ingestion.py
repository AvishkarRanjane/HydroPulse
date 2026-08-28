"""
AquaWatch - Telemetry Ingestion & Simulation API
Handles real-time IoT sensor telemetry ingestion, on-demand leak injection,
simulation tick stepping, and historical data retrieval.
"""

import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from models.database import get_db
from models.models import (
    Sensor,
    Zone,
    PipeSegment,
    ConsumptionRecord,
    AnomalyEvent,
    MaintenanceTicket,
    LeakReport
)
from models.schemas import (
    ConsumptionRecordCreate,
    ConsumptionRecordResponse,
    LeakInjectionRequest
)
from simulator.data_generator import (
    generate_single_reading,
    inject_leak_event,
    clear_leak_injections,
    ACTIVE_INJECTIONS
)
from core.anomaly_engine import anomaly_engine
from core.priority_ranking import calculate_priority_score
from core.websocket_manager import ws_manager

router = APIRouter(prefix="/api/ingestion", tags=["Telemetry Ingestion & Simulation"])


@router.post("/telemetry")
async def ingest_telemetry(
    record_in: ConsumptionRecordCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Ingests a single IoT sensor reading, executes real-time statistical anomaly analysis,
    persists the record, updates sensor current status, and triggers live WebSocket push.
    """
    sensor = db.query(Sensor).filter(Sensor.sensor_id == record_in.sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail=f"Sensor {record_in.sensor_id} not found")

    timestamp = record_in.timestamp or datetime.datetime.utcnow()

    # Retrieve last 30 readings for rolling baseline calculation
    past_records = db.query(ConsumptionRecord).filter(
        ConsumptionRecord.sensor_id == sensor.sensor_id
    ).order_by(ConsumptionRecord.timestamp.desc()).limit(30).all()

    flow_history = [r.flow_value for r in reversed(past_records)]
    pressure_history = [r.pressure_value for r in reversed(past_records)]

    # Run anomaly detection engine
    diagnosis = anomaly_engine.detect_single_reading(
        flow_value=record_in.flow_value,
        pressure_value=record_in.pressure_value,
        flow_history=flow_history,
        pressure_history=pressure_history,
        sensitivity_threshold=sensor.sensitivity_threshold,
        timestamp=timestamp
    )

    # Save consumption record
    new_record = ConsumptionRecord(
        sensor_id=sensor.sensor_id,
        timestamp=timestamp,
        flow_value=record_in.flow_value,
        pressure_value=record_in.pressure_value,
        expected_flow=diagnosis["mean_flow"],
        expected_pressure=diagnosis["mean_pressure"],
        is_anomaly=diagnosis["is_anomaly"],
        z_score=diagnosis["z_score"]
    )
    db.add(new_record)

    # Update sensor live state
    sensor.current_flow = record_in.flow_value
    sensor.current_pressure = record_in.pressure_value
    sensor.last_reading_time = timestamp
    sensor.status = "warning" if diagnosis["is_anomaly"] else "online"

    # If anomaly is detected and no active unresolved anomaly exists for this sensor, create AnomalyEvent
    created_anomaly = None
    created_ticket = None

    if diagnosis["is_anomaly"]:
        existing_active = db.query(AnomalyEvent).filter(
            AnomalyEvent.sensor_id == sensor.sensor_id,
            AnomalyEvent.status == "Active"
        ).first()

        if not existing_active:
            event_id = f"ANM-{int(timestamp.timestamp())}-{sensor.sensor_id[-3:]}"
            new_anomaly = AnomalyEvent(
                event_id=event_id,
                zone_id=sensor.zone_id,
                sensor_id=sensor.sensor_id,
                pipe_id=sensor.pipe_id,
                detected_at=timestamp,
                severity=diagnosis["severity"],
                type=diagnosis["type"],
                status="Active",
                z_score=diagnosis["z_score"],
                flow_deviation=diagnosis["flow_deviation"],
                pressure_drop=diagnosis["pressure_drop"],
                estimated_loss_rate=diagnosis["estimated_loss_rate"],
                description=diagnosis["description"]
            )
            db.add(new_anomaly)
            db.flush()
            created_anomaly = new_anomaly

            # Check for citizen reports in the same zone within the last 24 hours
            zone_obj = db.query(Zone).filter(Zone.zone_id == sensor.zone_id).first()
            matching_report = db.query(LeakReport).filter(
                LeakReport.zone_id == sensor.zone_id,
                LeakReport.status.in_(["Submitted", "Under Review"])
            ).first()

            is_corroborated = bool(matching_report)
            if matching_report:
                matching_report.is_sensor_corroborated = True
                matching_report.linked_anomaly_id = new_anomaly.event_id

            # Calculate Priority Ranking
            pipe_obj = db.query(PipeSegment).filter(PipeSegment.pipe_id == sensor.pipe_id).first()
            mat = pipe_obj.material if pipe_obj else "Cast Iron"
            yr = pipe_obj.install_year if pipe_obj else 1998
            pop = zone_obj.population if zone_obj else 25000

            priority_info = calculate_priority_score(
                severity=diagnosis["severity"],
                estimated_loss_rate_m3h=diagnosis["estimated_loss_rate"],
                population_affected=pop,
                is_citizen_corroborated=is_corroborated,
                pipe_material=mat,
                pipe_install_year=yr
            )

            # Auto-generate Maintenance Ticket for urgent dispatch
            ticket_id = f"TCK-{int(timestamp.timestamp())}-{sensor.zone_id[-2:]}"
            new_ticket = MaintenanceTicket(
                ticket_id=ticket_id,
                source="combined" if is_corroborated else "sensor",
                priority_score=priority_info["priority_score"],
                status="Reported",
                anomaly_id=new_anomaly.event_id,
                report_id=matching_report.report_id if matching_report else None,
                zone_id=sensor.zone_id,
                pipe_id=sensor.pipe_id,
                title=f"Pipe Leak: {sensor.zone_id} ({diagnosis['type']})",
                description=f"Auto-generated dispatch: {diagnosis['description']} SLA: {priority_info['sla_target']}",
                estimated_loss_rate=diagnosis["estimated_loss_rate"],
                estimated_cost=round(diagnosis["estimated_loss_rate"] * 24 * 1.80, 2)
            )
            db.add(new_ticket)
            created_ticket = new_ticket

    db.commit()

    # Broadcast real-time update via WebSocket
    payload = {
        "event": "telemetry_update",
        "sensor_id": sensor.sensor_id,
        "zone_id": sensor.zone_id,
        "flow": record_in.flow_value,
        "pressure": record_in.pressure_value,
        "is_anomaly": diagnosis["is_anomaly"],
        "severity": diagnosis["severity"],
        "timestamp": timestamp.isoformat()
    }
    background_tasks.add_task(ws_manager.broadcast_json, payload)

    if created_anomaly:
        alert_payload = {
            "event": "new_anomaly_alert",
            "anomaly": {
                "event_id": created_anomaly.event_id,
                "zone_id": created_anomaly.zone_id,
                "sensor_id": created_anomaly.sensor_id,
                "severity": created_anomaly.severity,
                "type": created_anomaly.type,
                "z_score": created_anomaly.z_score,
                "description": created_anomaly.description,
                "detected_at": created_anomaly.detected_at.isoformat()
            },
            "ticket_created": created_ticket.ticket_id if created_ticket else None
        }
        background_tasks.add_task(ws_manager.broadcast_json, alert_payload)

    return {
        "status": "success",
        "diagnosis": diagnosis,
        "anomaly_created": bool(created_anomaly),
        "ticket_created": created_ticket.ticket_id if created_ticket else None
    }


@router.post("/simulate-tick")
async def simulate_tick(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Steps the simulation forward by 1 interval for all sensors in the city.
    Generates new flow and pressure data points, runs anomaly checks, and broadcasts results.
    """
    sensors = db.query(Sensor).all()
    now = datetime.datetime.utcnow()
    processed_count = 0
    anomalies_flagged = 0

    for sensor in sensors:
        zone = db.query(Zone).filter(Zone.zone_id == sensor.zone_id).first()
        base_demand = zone.base_demand if zone else 120.0
        
        reading = generate_single_reading(
            sensor_id=sensor.sensor_id,
            zone_id=sensor.zone_id,
            timestamp=now,
            base_demand=base_demand
        )
        
        # Ingest this reading
        record_create = ConsumptionRecordCreate(
            sensor_id=sensor.sensor_id,
            flow_value=reading["flow_value"],
            pressure_value=reading["pressure_value"],
            timestamp=now
        )
        await ingest_telemetry(record_create, background_tasks, db)
        processed_count += 1
        if reading.get("is_injected_anomaly"):
            anomalies_flagged += 1

    return {
        "status": "success",
        "sensors_simulated": processed_count,
        "anomalies_injected": anomalies_flagged,
        "timestamp": now.isoformat()
    }


@router.post("/inject-leak")
async def trigger_leak_injection(
    req: LeakInjectionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Simulates a sudden pipeline burst or leak in the chosen zone for live hackathon judging demos.
    Immediately triggers simulated tick to produce live alerts.
    """
    zone = db.query(Zone).filter(Zone.zone_id == req.zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone {req.zone_id} not found")

    injection = inject_leak_event(
        target_id=req.zone_id,
        severity=req.severity,
        leak_type=req.leak_type,
        duration_hours=req.duration_hours
    )

    # Immediately step a tick so judges see instantaneous anomaly detection
    await simulate_tick(background_tasks, db)

    return {
        "status": "leak_injected_successfully",
        "zone_id": req.zone_id,
        "severity": req.severity,
        "leak_type": req.leak_type,
        "details": injection
    }


@router.post("/clear-injections")
def reset_injections():
    """Clears all active synthetic leak injections."""
    clear_leak_injections()
    return {"status": "all_leak_injections_cleared"}


@router.get("/history/{sensor_id}")
def get_sensor_history(
    sensor_id: str,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Returns chronological telemetry data for charting."""
    records = db.query(ConsumptionRecord).filter(
        ConsumptionRecord.sensor_id == sensor_id
    ).order_by(ConsumptionRecord.timestamp.desc()).limit(limit).all()

    return [
        {
            "record_id": r.record_id,
            "sensor_id": r.sensor_id,
            "timestamp": r.timestamp.isoformat(),
            "flow_value": r.flow_value,
            "pressure_value": r.pressure_value,
            "expected_flow": r.expected_flow,
            "expected_pressure": r.expected_pressure,
            "is_anomaly": r.is_anomaly,
            "z_score": r.z_score
        }
        for r in reversed(records)
    ]
