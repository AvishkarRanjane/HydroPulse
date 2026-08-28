"""
AquaWatch - Water Loss & Economic Impact Estimation Engine

Calculates:
1. Volumetric Loss: Duration (hours) x Flow Rate Deviation (m³/h)
2. Direct Financial Loss: Volume x (Treated Water Tariff + Energy Pumping Cost)
3. Non-Revenue Water (NRW %): (System Input Volume - Billed Authorized Volume) / System Input Volume
4. Water-Saved-to-Date: Cumulative water conserved through proactive anomaly detection vs traditional delayed reporting.
"""

from typing import Dict, List
import datetime

# Economic Constants for Urban Water Utilities
TARIFF_PER_M3 = 1.45       # Base treated water supply cost ($ or converted unit per m3)
ENERGY_COST_PER_M3 = 0.35  # Pumping and treatment electricity cost per m3
CARBON_KG_PER_M3 = 0.298   # kg of CO2 emissions from electricity per m3 treated water

# Traditional benchmark: Average undetected leak duration without IoT telemetry = 72 hours (3 days)
TRADITIONAL_DETECTION_HOURS = 72.0


def calculate_water_loss(
    flow_deviation_m3h: float,
    duration_hours: float
) -> Dict[str, float]:
    """
    Estimates total volume, cost, and energy impact for a leak event.
    """
    duration = max(0.1, duration_hours)
    volume_lost_m3 = round(flow_deviation_m3h * duration, 2)
    water_cost = round(volume_lost_m3 * TARIFF_PER_M3, 2)
    energy_cost = round(volume_lost_m3 * ENERGY_COST_PER_M3, 2)
    total_financial_loss = round(water_cost + energy_cost, 2)
    carbon_footprint_kg = round(volume_lost_m3 * CARBON_KG_PER_M3, 2)

    return {
        "volume_lost_m3": volume_lost_m3,
        "volume_lost_liters": round(volume_lost_m3 * 1000.0, 1),
        "total_financial_loss": total_financial_loss,
        "water_cost": water_cost,
        "energy_cost": energy_cost,
        "carbon_footprint_kg": carbon_footprint_kg
    }


def calculate_nrw_percentage(
    system_input_volume_m3: float,
    authorized_consumption_m3: float
) -> float:
    """
    Computes Non-Revenue Water percentage:
    NRW % = ((Input - Authorized) / Input) * 100
    """
    if system_input_volume_m3 <= 0:
        return 0.0
    nrw = ((system_input_volume_m3 - authorized_consumption_m3) / system_input_volume_m3) * 100.0
    return round(max(0.0, min(100.0, nrw)), 2)


def calculate_water_saved_metric(
    flow_deviation_m3h: float,
    actual_resolution_hours: float
) -> Dict[str, float]:
    """
    Estimates water saved by AquaWatch's rapid AI detection compared to
    the municipal baseline of traditional 72-hour delay.
    """
    hours_saved = max(0.0, TRADITIONAL_DETECTION_HOURS - actual_resolution_hours)
    water_saved_m3 = round(flow_deviation_m3h * hours_saved, 2)
    money_saved = round(water_saved_m3 * (TARIFF_PER_M3 + ENERGY_COST_PER_M3), 2)
    co2_saved_kg = round(water_saved_m3 * CARBON_KG_PER_M3, 2)

    return {
        "water_saved_m3": water_saved_m3,
        "money_saved": money_saved,
        "co2_saved_kg": co2_saved_kg,
        "hours_faster_than_traditional": round(hours_saved, 1)
    }
