import os
import sys

os.environ["TESTING"] = "true"
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(__file__))

from main import app
from core.anomaly_engine import AnomalyEngine
from core.priority_ranking import calculate_priority_score
from core.loss_estimation import calculate_water_loss, calculate_nrw_percentage, calculate_water_saved_metric

client = TestClient(app)


def test_anomaly_engine_z_score():
    """Verifies statistical rolling z-score and burst anomaly detection."""
    engine = AnomalyEngine(default_threshold=2.5)
    
    # Baseline history with mean=100, std=5
    flow_history = [98.0, 102.0, 100.0, 99.0, 101.0, 100.0, 97.0, 103.0]
    press_history = [4.2, 4.1, 4.3, 4.2, 4.2, 4.1, 4.3, 4.2]
    
    # Test normal reading
    diag_normal = engine.detect_single_reading(
        flow_value=101.0,
        pressure_value=4.2,
        flow_history=flow_history,
        pressure_history=press_history
    )
    assert not diag_normal["is_anomaly"]
    assert diag_normal["severity"] == "Normal"

    # Test Sudden Burst (surge in flow, plunge in pressure)
    diag_burst = engine.detect_single_reading(
        flow_value=185.0, # Huge spike
        pressure_value=2.0, # Severe drop
        flow_history=flow_history,
        pressure_history=press_history
    )
    assert diag_burst["is_anomaly"]
    assert diag_burst["severity"] == "Critical"
    assert diag_burst["type"] == "Sudden Burst"
    assert diag_burst["z_score"] > 4.0


def test_priority_ranking_weights():
    """Verifies the multi-factor weighted priority score formula."""
    # Emergency scenario: Critical severity + High loss rate (70 m3/h) + Large population + Citizen corroborated
    score_emergency = calculate_priority_score(
        severity="Critical",
        estimated_loss_rate_m3h=70.0,
        population_affected=50000,
        is_citizen_corroborated=True
    )
    assert score_emergency["priority_score"] >= 80.0
    assert "Emergency" in score_emergency["priority_level"]

    # Low scenario: Minor severity + Low loss rate (5 m3/h) + Small population + Not corroborated
    score_low = calculate_priority_score(
        severity="Minor",
        estimated_loss_rate_m3h=5.0,
        population_affected=1500,
        is_citizen_corroborated=False
    )
    assert score_low["priority_score"] < 50.0


def test_loss_estimation_formulas():
    """Verifies volumetric and economic loss calculations."""
    loss = calculate_water_loss(flow_deviation_m3h=50.0, duration_hours=4.0)
    assert loss["volume_lost_m3"] == 200.0
    assert loss["volume_lost_liters"] == 200000.0
    assert loss["total_financial_loss"] > 0

    nrw = calculate_nrw_percentage(system_input_volume_m3=1000.0, authorized_consumption_m3=820.0)
    assert nrw == 18.0

    saved = calculate_water_saved_metric(flow_deviation_m3h=40.0, actual_resolution_hours=4.0)
    assert saved["hours_faster_than_traditional"] == 68.0
    assert saved["water_saved_m3"] == 2720.0


def test_auth_login():
    """Verifies JWT login with standard seeded admin credentials."""
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "Admin"


def test_zones_and_summary_api():
    """Verifies zones listing, summary KPIs, and GeoJSON endpoints."""
    # Summary KPI
    summary_resp = client.get("/api/zones/summary")
    assert summary_resp.status_code == 200
    s_data = summary_resp.json()
    assert "nrw_percentage" in s_data
    assert "water_saved_m3" in s_data
    assert "network_health_score" in s_data

    # Zones list
    zones_resp = client.get("/api/zones")
    assert zones_resp.status_code == 200
    zones = zones_resp.json()
    assert len(zones) >= 5

    # GeoJSON FeatureCollection
    geo_resp = client.get("/api/zones/geojson")
    assert geo_resp.status_code == 200
    geo = geo_resp.json()
    assert geo["type"] == "FeatureCollection"
    assert len(geo["features"]) >= 5


def test_citizen_report_and_spatial_cross_reference():
    """Verifies public citizen report submission and automated spatial correlation."""
    report_payload = {
        "citizen_name": "Test Citizen",
        "citizen_phone": "+91 99999 88888",
        "location_lat": 18.502,
        "location_lng": 73.825,
        "description": "Visible gushing water near old town market.",
        "address_text": "Old Town Market Square"
    }
    resp = client.post("/api/citizen/reports", json=report_payload)
    assert resp.status_code == 200
    rep_data = resp.json()
    assert "tracking_code" in rep_data
    assert rep_data["tracking_code"].startswith("AQ-")
    assert rep_data["is_sensor_corroborated"] is True # Matches seeded ZONE-04 anomaly!

    # Test tracking lookup
    track_resp = client.get(f"/api/citizen/track/{rep_data['tracking_code']}")
    assert track_resp.status_code == 200
    assert track_resp.json()["tracking_code"] == rep_data["tracking_code"]


def test_maintenance_tickets_api():
    """Verifies maintenance queue priority ordering and lifecycle progression."""
    tickets_resp = client.get("/api/maintenance/tickets")
    assert tickets_resp.status_code == 200
    tickets = tickets_resp.json()
    assert len(tickets) > 0
    # Check descending order by priority_score
    scores = [t["priority_score"] for t in tickets]
    assert scores == sorted(scores, reverse=True)

    # Update ticket status
    t_id = tickets[0]["ticket_id"]
    upd_resp = client.put(f"/api/maintenance/tickets/{t_id}", json={"status": "In Progress", "assigned_to": "Rajesh Sharma"})
    assert upd_resp.status_code == 200
    assert upd_resp.json()["status"] == "In Progress"


if __name__ == "__main__":
    print("[*] Running AquaWatch backend tests...")
    test_anomaly_engine_z_score()
    print("[OK] test_anomaly_engine_z_score passed")
    test_priority_ranking_weights()
    print("[OK] test_priority_ranking_weights passed")
    test_loss_estimation_formulas()
    print("[OK] test_loss_estimation_formulas passed")
    test_auth_login()
    print("[OK] test_auth_login passed")
    test_zones_and_summary_api()
    print("[OK] test_zones_and_summary_api passed")
    test_citizen_report_and_spatial_cross_reference()
    print("[OK] test_citizen_report_and_spatial_cross_reference passed")
    test_maintenance_tickets_api()
    print("[OK] test_maintenance_tickets_api passed")
    print("[ALL PASS] All backend tests successfully validated!")

