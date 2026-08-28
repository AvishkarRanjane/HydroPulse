"""
AquaWatch - Synthetic Water Telemetry Data Generator
Simulates realistic urban water distribution telemetry (Flow in m3/hr, Pressure in bar)
with diurnal residential/commercial demand curves, minimum night flow (MNF),
hydraulic pressure loss dynamics, and controllable anomaly injections.
"""

import math
import random
import datetime
from typing import Dict, List, Tuple, Optional

# Active simulated leak injections tracked in memory
# Format: { "sensor_id" or "zone_id": { "type": "burst", "flow_multiplier": 1.7, "pressure_drop": 1.2, "expiry": datetime } }
ACTIVE_INJECTIONS: Dict[str, dict] = {}


def calculate_diurnal_flow(
    hour_of_day: float,
    base_demand: float = 120.0,
    noise_level: float = 0.05
) -> Tuple[float, float]:
    """
    Computes expected diurnal baseline water flow for a specific hour of the day.
    Models typical urban dual-peak pattern (morning peak 07:00-09:00, evening peak 19:00-21:00,
    and minimum night flow MNF at 02:00-04:00).
    
    Returns:
        (expected_flow, actual_simulated_flow_with_noise) in m3/hr
    """
    # Normalized diurnal multiplier (0.4 at night to 1.6 during peak hours)
    # Using dual-harmonic Fourier series approximation for urban water consumption
    t = hour_of_day
    
    # Morning peak wave (peaks around 8:00 AM)
    morning_wave = 0.45 * math.exp(-0.5 * ((t - 8.0) / 2.2) ** 2)
    
    # Evening peak wave (peaks around 20:00 / 8:00 PM)
    evening_wave = 0.35 * math.exp(-0.5 * ((t - 20.0) / 2.5) ** 2)
    
    # Base diurnal oscillation
    base_cycle = 0.65 + 0.15 * math.sin((t - 6.0) * math.pi / 12.0)
    
    multiplier = base_cycle + morning_wave + evening_wave
    expected_flow = base_demand * multiplier
    
    # Add random Gaussian noise (5% standard deviation by default)
    noise = random.gauss(0, noise_level * expected_flow)
    simulated_flow = max(5.0, expected_flow + noise)
    
    return round(expected_flow, 2), round(simulated_flow, 2)


def calculate_pressure_from_flow(
    flow_rate: float,
    base_pressure: float = 4.2,
    pipe_resistance_k: float = 0.00008,
    noise_level: float = 0.03
) -> Tuple[float, float]:
    """
    Computes hydraulic water pressure based on flow rate using Darcy-Weisbach headloss approximation.
    Higher flow velocity creates friction head loss, reducing measured tap/sensor pressure.
    
    Returns:
        (expected_pressure, actual_pressure_with_noise) in bar
    """
    # Head loss is proportional to flow squared (H_loss = k * Q^2)
    head_loss = pipe_resistance_k * (flow_rate ** 2)
    expected_pressure = max(1.5, base_pressure - head_loss)
    
    # Add sensor reading jitter
    noise = random.gauss(0, noise_level * expected_pressure)
    actual_pressure = max(0.8, round(expected_pressure + noise, 2))
    
    return round(expected_pressure, 2), actual_pressure


def generate_single_reading(
    sensor_id: str,
    zone_id: str,
    timestamp: datetime.datetime,
    base_demand: float = 120.0,
    base_pressure: float = 4.2
) -> dict:
    """
    Generates a single telemetry data point for a given sensor at a specific timestamp,
    incorporating any active leak or burst injections for that zone/sensor.
    """
    hour_float = timestamp.hour + timestamp.minute / 60.0 + timestamp.second / 3600.0
    expected_flow, flow_val = calculate_diurnal_flow(hour_float, base_demand=base_demand)
    expected_press, press_val = calculate_pressure_from_flow(flow_val, base_pressure=base_pressure)
    
    is_injected_anomaly = False
    
    # Check if there is an active injected leak for this sensor or zone
    active_inj = ACTIVE_INJECTIONS.get(sensor_id) or ACTIVE_INJECTIONS.get(zone_id)
    if active_inj:
        if timestamp <= active_inj["expiry"]:
            is_injected_anomaly = True
            mult = active_inj.get("flow_multiplier", 1.8)
            p_drop = active_inj.get("pressure_drop", 1.2)
            flow_val = round(flow_val * mult, 2)
            press_val = max(0.5, round(press_val - p_drop, 2))
        else:
            # Expired injection
            if sensor_id in ACTIVE_INJECTIONS:
                del ACTIVE_INJECTIONS[sensor_id]
            if zone_id in ACTIVE_INJECTIONS:
                del ACTIVE_INJECTIONS[zone_id]

    return {
        "sensor_id": sensor_id,
        "zone_id": zone_id,
        "timestamp": timestamp,
        "flow_value": flow_val,
        "pressure_value": press_val,
        "expected_flow": expected_flow,
        "expected_pressure": expected_press,
        "is_injected_anomaly": is_injected_anomaly
    }


def generate_sensor_history(
    sensor_id: str,
    zone_id: str,
    days: int = 7,
    interval_minutes: int = 15,
    base_demand: float = 120.0,
    base_pressure: float = 4.2,
    inject_burst_at_day: Optional[int] = 5
) -> List[dict]:
    """
    Generates historical time-series telemetry records over N days.
    Optionally injects a realistic burst leak event in the historical stream
    so the anomaly engine and analytics dashboards have rich data to demonstrate.
    """
    records = []
    end_time = datetime.datetime.utcnow()
    start_time = end_time - datetime.timedelta(days=days)
    
    current_time = start_time
    total_steps = int((days * 24 * 60) / interval_minutes)
    
    burst_start = start_time + datetime.timedelta(days=inject_burst_at_day) if inject_burst_at_day else None
    burst_end = burst_start + datetime.timedelta(hours=6) if burst_start else None

    while current_time <= end_time:
        hour_float = current_time.hour + current_time.minute / 60.0
        exp_flow, flow = calculate_diurnal_flow(hour_float, base_demand=base_demand)
        exp_press, press = calculate_pressure_from_flow(flow, base_pressure=base_pressure)
        
        is_anomaly = False
        if burst_start and burst_start <= current_time <= burst_end:
            # Inject burst anomaly: +75% flow, -1.4 bar pressure
            is_anomaly = True
            flow = round(flow * 1.75, 2)
            press = max(0.5, round(press - 1.4, 2))
            
        records.append({
            "sensor_id": sensor_id,
            "timestamp": current_time,
            "flow_value": flow,
            "pressure_value": press,
            "expected_flow": exp_flow,
            "expected_pressure": exp_press,
            "is_anomaly": is_anomaly
        })
        
        current_time += datetime.timedelta(minutes=interval_minutes)
        
    return records


def inject_leak_event(
    target_id: str,
    severity: str = "Critical",
    leak_type: str = "Sudden Burst",
    duration_hours: int = 4
) -> dict:
    """
    Registers an on-demand leak injection for a zone or sensor.
    Immediately alters real-time telemetry generation.
    """
    if severity == "Critical":
        multiplier = 1.95
        p_drop = 1.6
    elif severity == "Moderate":
        multiplier = 1.55
        p_drop = 0.9
    else: # Minor
        multiplier = 1.28
        p_drop = 0.4
        
    expiry = datetime.datetime.utcnow() + datetime.timedelta(hours=duration_hours)
    
    injection_data = {
        "target_id": target_id,
        "severity": severity,
        "leak_type": leak_type,
        "flow_multiplier": multiplier,
        "pressure_drop": p_drop,
        "expiry": expiry,
        "started_at": datetime.datetime.utcnow()
    }
    
    ACTIVE_INJECTIONS[target_id] = injection_data
    return injection_data


def clear_leak_injections(target_id: Optional[str] = None):
    """Clears active injected anomalies."""
    global ACTIVE_INJECTIONS
    if target_id:
        if target_id in ACTIVE_INJECTIONS:
            del ACTIVE_INJECTIONS[target_id]
    else:
        ACTIVE_INJECTIONS.clear()
