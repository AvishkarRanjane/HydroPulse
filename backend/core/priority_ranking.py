"""
AquaWatch - Leak Priority Ranking Engine

Judges Note & Formula Specification:
Municipal repair crews and dispatchers have limited field resources. The system automatically
prioritizes leaks using a multi-factor weighted scoring function:

Priority Score (0 - 100) = (w_sev * S) + (w_loss * L) + (w_pop * P) + (w_cit * C)

Weights Breakdown:
- w_sev  = 0.35 (35%): Severity Weight (Critical Burst vs Slow Creep)
- w_loss = 0.30 (30%): Water Loss Rate Weight (m³/hour loss velocity)
- w_pop  = 0.20 (20%): Population & Critical Infrastructure Affected
- w_cit  = 0.15 (15%): Citizen Report Corroboration (Dual Confirmation Bonus)
"""

import math
from typing import Dict

# Weights constants (must sum to 1.0)
WEIGHT_SEVERITY = 0.35
WEIGHT_LOSS_RATE = 0.30
WEIGHT_POPULATION = 0.20
WEIGHT_CITIZEN_CORROBORATION = 0.15


def calculate_priority_score(
    severity: str,
    estimated_loss_rate_m3h: float,
    population_affected: int,
    is_citizen_corroborated: bool = False,
    pipe_material: str = "Cast Iron",
    pipe_install_year: int = 1995
) -> Dict[str, float]:
    """
    Computes a standardized 0 - 100 priority score for maintenance dispatch.
    
    Args:
        severity: "Critical", "Moderate", or "Minor"
        estimated_loss_rate_m3h: Flow deviation in cubic meters per hour
        population_affected: Number of residents served by this distribution zone
        is_citizen_corroborated: True if matching citizen report exists in same zone
        pipe_material: Material of the pipe segment (older materials receive slight boost)
        pipe_install_year: Year of installation (aging pipes have higher structural risk)
        
    Returns:
        Dictionary containing total score, rank tier, and factor breakdown.
    """
    # 1. Severity Factor (0 to 100)
    sev_upper = severity.upper()
    if "CRITICAL" in sev_upper:
        score_severity = 100.0
    elif "MODERATE" in sev_upper:
        score_severity = 65.0
    else: # Minor / Low
        score_severity = 30.0

    # 2. Water Loss Rate Factor (0 to 100)
    # Scale: 0 m3/h -> 0 pts, 60+ m3/h -> 100 pts
    score_loss_rate = min(100.0, (max(0.0, estimated_loss_rate_m3h) / 60.0) * 100.0)

    # 3. Population Affected Factor (0 to 100)
    # Logarithmic scaling: 1,000 people -> 20 pts, 10,000 -> 50 pts, 100,000 -> 100 pts
    if population_affected <= 500:
        score_population = 15.0
    else:
        log_pop = math.log10(max(1000, population_affected))
        score_population = min(100.0, max(0.0, (log_pop - 3.0) / 2.0 * 80.0 + 20.0))

    # 4. Citizen Corroboration Factor (0 to 100)
    # Dual-confirmation by both IoT telemetry and on-ground citizen photo reports guarantees high veracity
    score_citizen = 100.0 if is_citizen_corroborated else 0.0

    # 5. Infrastructure Aging Modifier (+0 to +10 bonus points)
    current_year = 2026
    pipe_age = max(0, current_year - pipe_install_year)
    age_bonus = min(10.0, (pipe_age / 40.0) * 10.0) if pipe_material in ["Cast Iron", "Ductile Iron"] else 0.0

    # Weighted Composite Score
    raw_composite = (
        (WEIGHT_SEVERITY * score_severity) +
        (WEIGHT_LOSS_RATE * score_loss_rate) +
        (WEIGHT_POPULATION * score_population) +
        (WEIGHT_CITIZEN_CORROBORATION * score_citizen) +
        age_bonus
    )
    
    total_priority = round(min(100.0, max(5.0, raw_composite)), 1)

    # Classification Tier
    if total_priority >= 80.0:
        priority_level = "Emergency (Tier 1)"
        sla_target = "< 1 Hour Dispatch"
    elif total_priority >= 60.0:
        priority_level = "High (Tier 2)"
        sla_target = "< 4 Hours Dispatch"
    elif total_priority >= 40.0:
        priority_level = "Medium (Tier 3)"
        sla_target = "< 24 Hours Dispatch"
    else:
        priority_level = "Low (Tier 4)"
        sla_target = "Scheduled Maintenance"

    return {
        "priority_score": total_priority,
        "priority_level": priority_level,
        "sla_target": sla_target,
        "breakdown": {
            "severity_component": round(WEIGHT_SEVERITY * score_severity, 1),
            "loss_rate_component": round(WEIGHT_LOSS_RATE * score_loss_rate, 1),
            "population_component": round(WEIGHT_POPULATION * score_population, 1),
            "citizen_component": round(WEIGHT_CITIZEN_CORROBORATION * score_citizen, 1),
            "infrastructure_bonus": round(age_bonus, 1)
        }
    }
