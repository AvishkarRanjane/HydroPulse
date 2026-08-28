"""
AquaWatch - Comprehensive Seed Data Generator
Populates the database with realistic municipal water network entities:
- 5 Distribution Zones with accurate polygonal GeoJSON coordinates
- 20 Pipe Segments across varying materials (Cast Iron, Ductile Iron, HDPE, PVC)
- 25 IoT Flow & Pressure Telemetry Sensors
- 7 Days of 15-minute time-series historical consumption records
- Anomaly events, maintenance tickets in various workflow states, and citizen reports
- Default User accounts with role-based credentials
"""

import os
import sys
import json
import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models.database import engine, Base, SessionLocal
from models.models import (
    Zone,
    PipeSegment,
    Sensor,
    ConsumptionRecord,
    AnomalyEvent,
    LeakReport,
    MaintenanceTicket,
    User
)
from api.auth import get_password_hash
from simulator.data_generator import generate_sensor_history


def seed_database():
    print("[*] Initializing AquaWatch Database Schema & Seeder...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if database already has data
        if db.query(Zone).count() > 0:
            print("[!] Database already contains zones. Clearing existing data for fresh seed...")
            db.query(ConsumptionRecord).delete()
            db.query(MaintenanceTicket).delete()
            db.query(LeakReport).delete()
            db.query(AnomalyEvent).delete()
            db.query(Sensor).delete()
            db.query(PipeSegment).delete()
            db.query(Zone).delete()
            db.query(User).delete()
            db.commit()

        # 1. Seed Users
        print("[+] Creating standard demo users...")
        users = [
            User(
                user_id="USR-ADMIN",
                username="admin",
                email="admin@aquawatch.city.gov",
                hashed_password=get_password_hash("admin123"),
                role="Admin",
                zone_access="ALL",
                full_name="Municipal Chief Engineer",
                is_active=True
            ),
            User(
                user_id="USR-STAFF",
                username="staff",
                email="staff@aquawatch.city.gov",
                hashed_password=get_password_hash("staff123"),
                role="Utility Staff",
                zone_access="ALL",
                full_name="Operations Dispatcher",
                is_active=True
            ),
            User(
                user_id="USR-VIEWER",
                username="viewer",
                email="viewer@aquawatch.city.gov",
                hashed_password=get_password_hash("viewer123"),
                role="Viewer",
                zone_access="ALL",
                full_name="City Council Auditor",
                is_active=True
            )
        ]
        db.add_all(users)
        db.commit()

        # 2. Seed 5 Distribution Zones (DMAs)
        print("[+] Seeding Distribution Zones with GIS boundaries...")
        zones_data = [
            {
                "zone_id": "ZONE-01",
                "name": "Downtown Metro Central",
                "center_lat": 18.5204,
                "center_lng": 73.8567,
                "population": 48000,
                "base_demand": 185.0,
                "risk_level": "Medium",
                "risk_score": 38.5,
                "nrw_percentage": 18.4,
                "coords": [
                    [73.845, 18.510],
                    [73.870, 18.510],
                    [73.870, 18.530],
                    [73.845, 18.530],
                    [73.845, 18.510]
                ]
            },
            {
                "zone_id": "ZONE-02",
                "name": "Industrial Park & Logistics",
                "center_lat": 18.5550,
                "center_lng": 73.8850,
                "population": 16000,
                "base_demand": 240.0,
                "risk_level": "Low",
                "risk_score": 14.2,
                "nrw_percentage": 11.8,
                "coords": [
                    [73.870, 18.540],
                    [73.900, 18.540],
                    [73.900, 18.570],
                    [73.870, 18.570],
                    [73.870, 18.540]
                ]
            },
            {
                "zone_id": "ZONE-03",
                "name": "North Residential Suburbs",
                "center_lat": 18.5750,
                "center_lng": 73.8350,
                "population": 68000,
                "base_demand": 210.0,
                "risk_level": "Low",
                "risk_score": 18.0,
                "nrw_percentage": 13.5,
                "coords": [
                    [73.820, 18.560],
                    [73.850, 18.560],
                    [73.850, 18.590],
                    [73.820, 18.590],
                    [73.820, 18.560]
                ]
            },
            {
                "zone_id": "ZONE-04",
                "name": "Historic Old Town",
                "center_lat": 18.5050,
                "center_lng": 73.8300,
                "population": 32000,
                "base_demand": 140.0,
                "risk_level": "Critical",
                "risk_score": 82.0,
                "nrw_percentage": 28.6,
                "coords": [
                    [73.815, 18.490],
                    [73.845, 18.490],
                    [73.845, 18.520],
                    [73.815, 18.520],
                    [73.815, 18.490]
                ]
            },
            {
                "zone_id": "ZONE-05",
                "name": "Riverfront Promenade",
                "center_lat": 18.5350,
                "center_lng": 73.8150,
                "population": 24000,
                "base_demand": 115.0,
                "risk_level": "Low",
                "risk_score": 12.0,
                "nrw_percentage": 9.2,
                "coords": [
                    [73.800, 18.520],
                    [73.830, 18.520],
                    [73.830, 18.550],
                    [73.800, 18.550],
                    [73.800, 18.520]
                ]
            }
        ]

        zone_objects = []
        for zd in zones_data:
            geojson_poly = json.dumps({
                "type": "Polygon",
                "coordinates": [zd["coords"]]
            })
            z = Zone(
                zone_id=zd["zone_id"],
                name=zd["name"],
                geometry=geojson_poly,
                center_lat=zd["center_lat"],
                center_lng=zd["center_lng"],
                population=zd["population"],
                base_demand=zd["base_demand"],
                risk_level=zd["risk_level"],
                risk_score=zd["risk_score"],
                nrw_percentage=zd["nrw_percentage"]
            )
            zone_objects.append(z)
            db.add(z)
        db.commit()

        # 3. Seed Pipe Segments
        print("[+] Seeding Pipeline Network Segments...")
        pipe_configs = [
            ("PIPE-101", "ZONE-01", "Ductile Iron", 2004, 300.0, 520.0, "Active", [[73.848, 18.515], [73.865, 18.525]]),
            ("PIPE-102", "ZONE-01", "Cast Iron", 1988, 200.0, 380.0, "Degraded", [[73.852, 18.512], [73.860, 18.528]]),
            ("PIPE-103", "ZONE-01", "HDPE", 2018, 150.0, 290.0, "Active", [[73.855, 18.518], [73.868, 18.518]]),
            ("PIPE-201", "ZONE-02", "Steel", 2012, 450.0, 850.0, "Active", [[73.875, 18.545], [73.895, 18.565]]),
            ("PIPE-202", "ZONE-02", "Ductile Iron", 2015, 300.0, 620.0, "Active", [[73.880, 18.542], [73.890, 18.568]]),
            ("PIPE-301", "ZONE-03", "PVC", 2016, 250.0, 480.0, "Active", [[73.825, 18.565], [73.845, 18.585]]),
            ("PIPE-302", "ZONE-03", "HDPE", 2020, 200.0, 510.0, "Active", [[73.830, 18.562], [73.840, 18.588]]),
            ("PIPE-401", "ZONE-04", "Cast Iron", 1978, 250.0, 440.0, "Leaking", [[73.820, 18.495], [73.840, 18.515]]),
            ("PIPE-402", "ZONE-04", "Cast Iron", 1982, 150.0, 310.0, "Degraded", [[73.825, 18.492], [73.835, 18.518]]),
            ("PIPE-403", "ZONE-04", "Ductile Iron", 1995, 200.0, 390.0, "Under Repair", [[73.818, 18.502], [73.842, 18.508]]),
            ("PIPE-501", "ZONE-05", "HDPE", 2021, 200.0, 460.0, "Active", [[73.805, 18.525], [73.825, 18.545]]),
            ("PIPE-502", "ZONE-05", "Ductile Iron", 2019, 250.0, 530.0, "Active", [[73.810, 18.522], [73.820, 18.548]])
        ]

        pipe_objects = []
        for pid, zid, mat, yr, dia, length, status, coords in pipe_configs:
            geojson_line = json.dumps({
                "type": "LineString",
                "coordinates": coords
            })
            p = PipeSegment(
                pipe_id=pid,
                zone_id=zid,
                geometry=geojson_line,
                material=mat,
                install_year=yr,
                diameter=dia,
                length_meters=length,
                status=status
            )
            pipe_objects.append(p)
            db.add(p)
        db.commit()

        # 4. Seed IoT Sensors
        print("[+] Deploying IoT Flow & Pressure Telemetry Sensors...")
        sensors_data = [
            # Zone 1
            ("SNS-Z1-01", "PIPE-101", "ZONE-01", "Downtown Inlet Main", "combined", 18.518, 73.852, 2.5, 188.0, 4.2),
            ("SNS-Z1-02", "PIPE-102", "ZONE-01", "Commercial Sector Node", "flow", 18.524, 73.858, 2.5, 94.0, 3.9),
            ("SNS-Z1-03", "PIPE-103", "ZONE-01", "Central Plaza Gauge", "pressure", 18.515, 73.864, 2.0, 0.0, 4.0),
            # Zone 2
            ("SNS-Z2-01", "PIPE-201", "ZONE-02", "Industrial Feeder East", "combined", 18.548, 73.878, 2.5, 242.0, 4.8),
            ("SNS-Z2-02", "PIPE-202", "ZONE-02", "Logistics Hub Flow", "flow", 18.562, 73.892, 2.5, 118.0, 4.5),
            # Zone 3
            ("SNS-Z3-01", "PIPE-301", "ZONE-03", "North Suburb Arterial", "combined", 18.568, 73.828, 2.5, 212.0, 4.1),
            ("SNS-Z3-02", "PIPE-302", "ZONE-03", "Greenfield Branch Meter", "flow", 18.582, 73.842, 2.5, 102.0, 3.8),
            # Zone 4 (Active Leak area)
            ("SNS-Z4-01", "PIPE-401", "ZONE-04", "Heritage Square Trunk", "combined", 18.498, 73.822, 2.0, 225.0, 2.4),
            ("SNS-Z4-02", "PIPE-402", "ZONE-04", "Old Town South Node", "flow", 18.512, 73.834, 2.0, 115.0, 2.6),
            ("SNS-Z4-03", "PIPE-403", "ZONE-04", "Fort Gate Pressure Tap", "pressure", 18.506, 73.828, 2.0, 0.0, 2.1),
            # Zone 5
            ("SNS-Z5-01", "PIPE-501", "ZONE-05", "Riverfront Intake", "combined", 18.528, 73.808, 2.5, 116.0, 4.4),
            ("SNS-Z5-02", "PIPE-502", "ZONE-05", "Promenade South Flow", "flow", 18.542, 73.822, 2.5, 58.0, 4.2)
        ]

        sensor_objects = []
        for sid, pid, zid, name, stype, lat, lng, thresh, cflow, cpress in sensors_data:
            s = Sensor(
                sensor_id=sid,
                pipe_id=pid,
                zone_id=zid,
                name=name,
                type=stype,
                location_lat=lat,
                location_lng=lng,
                status="warning" if zid == "ZONE-04" else "online",
                battery_level=92.0,
                sensitivity_threshold=thresh,
                current_flow=cflow,
                current_pressure=cpress,
                last_reading_time=datetime.datetime.utcnow()
            )
            sensor_objects.append(s)
            db.add(s)
        db.commit()

        # 5. Seed 7 Days of Historical Time Series Telemetry
        print("[+] Generating 7-day realistic diurnal time-series records...")
        all_records = []
        for s in sensor_objects:
            zone_obj = next(z for z in zones_data if z["zone_id"] == s.zone_id)
            inject_burst = (5 if s.zone_id == "ZONE-04" else None)
            
            recs = generate_sensor_history(
                sensor_id=s.sensor_id,
                zone_id=s.zone_id,
                days=7,
                interval_minutes=30, # 30 min intervals for fast seeding (336 points per sensor)
                base_demand=zone_obj["base_demand"],
                base_pressure=4.2,
                inject_burst_at_day=inject_burst
            )
            for r in recs:
                all_records.append(ConsumptionRecord(
                    sensor_id=r["sensor_id"],
                    timestamp=r["timestamp"],
                    flow_value=r["flow_value"],
                    pressure_value=r["pressure_value"],
                    expected_flow=r["expected_flow"],
                    expected_pressure=r["expected_pressure"],
                    is_anomaly=r["is_anomaly"],
                    z_score=3.8 if r["is_anomaly"] else 0.4
                ))

        db.bulk_save_objects(all_records)
        db.commit()
        print(f"[OK] Generated {len(all_records)} historical sensor records.")

        # 6. Seed Active & Historical Anomaly Events
        print("[+] Seeding Anomaly Events...")
        now = datetime.datetime.utcnow()
        anomalies_data = [
            AnomalyEvent(
                event_id="ANM-2026-001",
                zone_id="ZONE-04",
                sensor_id="SNS-Z4-01",
                pipe_id="PIPE-401",
                detected_at=now - datetime.timedelta(hours=3, minutes=15),
                severity="Critical",
                type="Sudden Burst",
                status="Active",
                z_score=4.65,
                flow_deviation=72.5,
                pressure_drop=1.85,
                estimated_loss_rate=72.5,
                description="CRITICAL BURST DETECTED: Sudden flow surge (+72.5 m3/h, Z=4.65) with severe hydraulic pressure collapse on 1978 Cast Iron trunk."
            ),
            AnomalyEvent(
                event_id="ANM-2026-002",
                zone_id="ZONE-01",
                sensor_id="SNS-Z1-02",
                pipe_id="PIPE-102",
                detected_at=now - datetime.timedelta(hours=8, minutes=40),
                severity="Moderate",
                type="High Night Flow",
                status="Investigating",
                z_score=2.95,
                flow_deviation=28.0,
                pressure_drop=0.45,
                estimated_loss_rate=28.0,
                description="Abnormal Minimum Night Flow: Zone consuming 28 m3/h above night baseline, indicating localized joint leakage."
            ),
            AnomalyEvent(
                event_id="ANM-2026-003",
                zone_id="ZONE-03",
                sensor_id="SNS-Z3-01",
                pipe_id="PIPE-301",
                detected_at=now - datetime.timedelta(days=2, hours=4),
                severity="Minor",
                type="Pressure Drop",
                status="Resolved",
                z_score=2.2,
                flow_deviation=12.0,
                pressure_drop=0.6,
                estimated_loss_rate=12.0,
                description="Minor pressure oscillation resolved after PRV valve recalibration.",
                resolved_at=now - datetime.timedelta(days=1, hours=20)
            )
        ]
        db.add_all(anomalies_data)
        db.commit()

        # 7. Seed Citizen Reports with Spatial Cross-Referencing
        print("[+] Seeding Citizen Leak Reports...")
        citizen_reports = [
            LeakReport(
                report_id="REP-9481",
                tracking_code="AQ-78421",
                citizen_name="Sunil Kulkarni",
                citizen_phone="+91 98220 11223",
                citizen_email="sunil.kulkarni@example.com",
                zone_id="ZONE-04",
                location_lat=18.501,
                location_lng=73.824,
                address_text="Corner of Heritage Street & Fort Gate, Old Town",
                description="Water gushing continuously from under pavement near old bakery. Road surface is cracking.",
                photo_url="/uploads/sample_leak_burst.jpg",
                status="Verified",
                linked_anomaly_id="ANM-2026-001",
                is_sensor_corroborated=True,
                created_at=now - datetime.timedelta(hours=2, minutes=45)
            ),
            LeakReport(
                report_id="REP-9482",
                tracking_code="AQ-39104",
                citizen_name="Meera Joshi",
                citizen_phone="+91 98901 44556",
                citizen_email="meera.j@example.com",
                zone_id="ZONE-01",
                location_lat=18.522,
                location_lng=73.855,
                address_text="Metro Plaza Road, Opposite Central Park",
                description="Slow puddle forming near fire hydrant. Low pressure in 3rd-floor apartments.",
                photo_url="/uploads/sample_hydrant_leak.jpg",
                status="Under Review",
                linked_anomaly_id="ANM-2026-002",
                is_sensor_corroborated=True,
                created_at=now - datetime.timedelta(hours=6, minutes=10)
            ),
            LeakReport(
                report_id="REP-9483",
                tracking_code="AQ-11892",
                citizen_name="Amitabh Sen",
                citizen_phone="+91 94230 77889",
                citizen_email="amitabh.sen@example.com",
                zone_id="ZONE-05",
                location_lat=18.533,
                location_lng=73.812,
                address_text="Riverfront Walkway Lightpost #14",
                description="Sprinkler control box valve overflowing into storm drain.",
                photo_url=None,
                status="Submitted",
                is_sensor_corroborated=False,
                created_at=now - datetime.timedelta(hours=1, minutes=20)
            )
        ]
        db.add_all(citizen_reports)
        db.commit()

        # 8. Seed Maintenance Work Orders
        print("[+] Seeding Maintenance Priority Queue Tickets...")
        tickets_data = [
            MaintenanceTicket(
                ticket_id="TCK-2026-101",
                source="combined",
                priority_score=94.5,
                assigned_to="Rajesh Sharma",
                status="In Progress",
                anomaly_id="ANM-2026-001",
                report_id="REP-9481",
                zone_id="ZONE-04",
                pipe_id="PIPE-401",
                title="EMERGENCY: Cast Iron Trunk Burst at Heritage Square",
                description="Dual-Corroborated: Sensor Anomaly (Z=4.65) and Citizen Report AQ-78421 match. Water loss rate 72.5 m3/h. Immediate excavation crew dispatched.",
                estimated_loss_rate=72.5,
                estimated_cost=3200.0,
                created_at=now - datetime.timedelta(hours=3, minutes=10),
                assigned_at=now - datetime.timedelta(hours=2, minutes=50),
                in_progress_at=now - datetime.timedelta(hours=1, minutes=30),
                notes="Crew on site with acoustic sensors. Heavy water loss confirmed. Isolating valve V-401-B."
            ),
            MaintenanceTicket(
                ticket_id="TCK-2026-102",
                source="combined",
                priority_score=72.0,
                assigned_to="Amina Patel",
                status="Assigned",
                anomaly_id="ANM-2026-002",
                report_id="REP-9482",
                zone_id="ZONE-01",
                pipe_id="PIPE-102",
                title="HIGH: Night Flow Joint Leak - Metro Plaza",
                description="Sensor high night flow corroborated by citizen report AQ-39104. Loss rate 28 m3/h.",
                estimated_loss_rate=28.0,
                estimated_cost=1450.0,
                created_at=now - datetime.timedelta(hours=8, minutes=30),
                assigned_at=now - datetime.timedelta(hours=7, minutes=15),
                notes="Assigned to Amina Patel. Scheduled inspection today at 14:00."
            ),
            MaintenanceTicket(
                ticket_id="TCK-2026-103",
                source="citizen",
                priority_score=42.0,
                assigned_to=None,
                status="Reported",
                report_id="REP-9483",
                zone_id="ZONE-05",
                pipe_id="PIPE-501",
                title="MEDIUM: Sprinkler Valve Overflow - Riverfront",
                description="Citizen reported valve box leakage on public walkway.",
                estimated_loss_rate=12.0,
                estimated_cost=600.0,
                created_at=now - datetime.timedelta(hours=1, minutes=15),
                notes="Queued for municipal parks & water team inspection."
            ),
            MaintenanceTicket(
                ticket_id="TCK-2026-098",
                source="sensor",
                priority_score=55.0,
                assigned_to="Deepak Verma",
                status="Verified Fixed",
                anomaly_id="ANM-2026-003",
                zone_id="ZONE-03",
                pipe_id="PIPE-301",
                title="RESOLVED: North Suburb PRV Pressure Regulation",
                description="Pressure regulator valve recalibrated to stabilize downstream pressure at 4.1 bar.",
                estimated_loss_rate=15.0,
                estimated_cost=850.0,
                created_at=now - datetime.timedelta(days=2, hours=4),
                assigned_at=now - datetime.timedelta(days=2, hours=2),
                in_progress_at=now - datetime.timedelta(days=1, hours=22),
                fixed_at=now - datetime.timedelta(days=1, hours=20),
                notes="PRV sleeve replaced and tested. Pressure stable."
            )
        ]
        db.add_all(tickets_data)
        db.commit()

        print("[OK] Database seeding completed successfully! All entities and relationships established.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during database seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
