"""
ml_service/contention_solver.py
Deterministic Constrained Priority Queue Seat Contention Solver
Implements multi-factor priority scoring and multi-bus optimization.
"""

import time
from typing import List, Dict, Any, Optional

PURPOSE_WEIGHTS = {
    "MEDICAL": 50,
    "EDUCATION_EXAM": 35,
    "WORK_COMMUTE": 20,
    "SHIFT_WORK": 20,
    "GENERAL_LEISURE": 5,
    "GENERAL": 5
}

def time_to_minutes(time_str: str = "17:30") -> int:
    try:
        parts = time_str.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 17 * 60 + 30

def calculate_contention_score(request: Dict[str, Any], now_ms: Optional[float] = None) -> Dict[str, Any]:
    """
    Score_i = W_purpose + W_vulnerability + W_flexibility_penalty + W_timestamp
    """
    if now_ms is None:
        now_ms = time.time() * 1000.0

    # 1. Purpose Weight
    purpose = str(request.get("trip_purpose") or request.get("tripPurpose") or "GENERAL_LEISURE").upper()
    w_purpose = PURPOSE_WEIGHTS.get(purpose, 5)

    # 2. Vulnerability Weight
    age = int(request.get("age", 28))
    is_divyang = bool(request.get("is_divyang") or request.get("isDivyang", False))
    
    if is_divyang:
        w_vulnerability = 50
    elif age >= 60:
        w_vulnerability = 40
    elif age <= 10:
        w_vulnerability = 25
    else:
        w_vulnerability = 10

    # 3. Flexibility Buffer (-15 from primary bus priority if flexible)
    is_flexible = bool(request.get("is_flexible") or request.get("isFlexible", False))
    w_flex_penalty = -15 if is_flexible else 0

    # 4. Fairness Tie-breaker (FCFS millisecond/second bonus, capped to preserve priority tiers)
    req_ts = request.get("request_timestamp") or request.get("requestTimestamp")
    if req_ts:
        try:
            req_ts_float = float(req_ts)
            if req_ts_float < 1e11:  # already in seconds
                req_ts_float *= 1000.0
            wait_sec = max(0.0, (now_ms - req_ts_float) / 1000.0)
        except Exception:
            wait_sec = 0.0
    else:
        wait_sec = 0.0

    # 0.001 * seconds waiting, capped at 5.0 to break ties between identical scores without eclipsing priority tiers
    w_timestamp = round(min(5.0, 0.001 * wait_sec), 4)
    total_score = round(w_purpose + w_vulnerability + w_flex_penalty + w_timestamp, 4)

    return {
        "total_score": total_score,
        "w_purpose": w_purpose,
        "w_vulnerability": w_vulnerability,
        "w_flex_penalty": w_flex_penalty,
        "w_timestamp": w_timestamp,
        "is_high_priority": (w_purpose + w_vulnerability) >= 70
    }

def solve_contention(
    original_bus: Dict[str, Any],
    candidate_buses: List[Dict[str, Any]],
    requests: List[Dict[str, Any]],
    now_ms: Optional[float] = None
) -> Dict[str, Any]:
    """
    Deterministic Constrained Priority Queue Contention Resolution Pipeline
    """
    if now_ms is None:
        now_ms = time.time() * 1000.0

    orig_time = original_bus.get("time", "17:30")
    orig_name = original_bus.get("name", f"Route 5 Primary ({orig_time})")
    available_seats = int(original_bus.get("available_seats", original_bus.get("availableSeats", 0)))

    # Deep copy candidate buses
    deep_buses = [
        {
            "id": b.get("id"),
            "time": b.get("time"),
            "name": b.get("name", f"Route 5 ({b.get('time')})"),
            "departure_minutes": time_to_minutes(b.get("time", "17:40")),
            "available_seats": int(b.get("available_seats", b.get("availableSeats", 0)))
        }
        for b in candidate_buses
    ]

    # 1. Score all competing requests
    scored_requests = []
    for idx, req in enumerate(requests):
        score_info = calculate_contention_score(req, now_ms)
        scored_requests.append({
            "id": req.get("id", f"req_{idx + 1}"),
            "passenger_name": req.get("passenger_name") or req.get("passengerName") or req.get("name") or f"Passenger {idx + 1}",
            "age": int(req.get("age", 28)),
            "trip_purpose": str(req.get("trip_purpose") or req.get("tripPurpose") or "GENERAL_LEISURE").upper(),
            "is_divyang": bool(req.get("is_divyang") or req.get("isDivyang", False)),
            "is_flexible": bool(req.get("is_flexible") or req.get("isFlexible", False)),
            "flexible_window_minutes": int(req.get("flexible_window_minutes") or req.get("flexibleWindowMinutes") or (30 if req.get("is_flexible") else 0)),
            "flexibility_direction": req.get("flexibility_direction") or req.get("flexibilityDirection") or "ANY",
            "score": score_info["total_score"],
            "score_breakdown": score_info
        })

    # 2. Sort candidate pool by Score descending
    scored_requests.sort(key=lambda x: x["score"], reverse=True)

    seated_original = []
    reallocated_adjacent = []
    waitlisted = []
    seats_remaining = available_seats
    seat_counter = 1
    waitlist_counter = 1
    reasons_ahead = []

    for req in scored_requests:
        if seats_remaining > 0:
            seats_remaining -= 1
            seat_num = f"Seat {seat_counter}"
            seat_counter += 1

            seated_original.append({
                **req,
                "status": "CONFIRMED_ORIGINAL",
                "original_bus_time": orig_time,
                "assigned_bus_time": orig_time,
                "assigned_bus_name": orig_name,
                "allocated_seat": seat_num,
                "waitlist_position": None,
                "contention_context": {
                    "total_competing_requests": len(scored_requests),
                    "available_seats_on_original": available_seats,
                    "higher_priority_passengers_served": len(seated_original),
                    "reasons_ahead": list(reasons_ahead)
                }
            })

            # Record reason
            if req["trip_purpose"] == "MEDICAL":
                reasons_ahead.append(f"{req['passenger_name']} (Medical Emergency)")
            elif req["age"] >= 60:
                reasons_ahead.append(f"{req['passenger_name']} (Senior Citizen {req['age']}yo)")
            elif req["is_divyang"]:
                reasons_ahead.append(f"{req['passenger_name']} (Divyang Access)")
            else:
                reasons_ahead.append(f"{req['passenger_name']} (Priority Seating)")
        else:
            # Check flexible reassignment
            reassigned = False
            if req["is_flexible"] and req["flexible_window_minutes"] > 0:
                req_min = time_to_minutes(orig_time)
                win_min = req["flexible_window_minutes"]
                direction = req["flexibility_direction"]

                # Eligible alternative buses
                eligible = []
                for b in deep_buses:
                    if b["time"] == orig_time:
                        continue
                    diff = b["departure_minutes"] - req_min
                    if abs(diff) > win_min:
                        continue
                    if direction == "EARLIER_ONLY" and diff >= 0:
                        continue
                    if direction == "LATER_ONLY" and diff <= 0:
                        continue
                    if b["available_seats"] > 0:
                        eligible.append((abs(diff), b))

                eligible.sort(key=lambda x: x[0])
                if eligible:
                    best_b = eligible[0][1]
                    best_b["available_seats"] -= 1
                    reassigned = True
                    reallocated_adjacent.append({
                        **req,
                        "status": "REALLOCATED_ADJACENT",
                        "original_bus_time": orig_time,
                        "assigned_bus_time": best_b["time"],
                        "assigned_bus_name": best_b["name"],
                        "allocated_seat": f"Seat {12 + len(reallocated_adjacent)}",
                        "waitlist_position": None,
                        "contention_context": {
                            "total_competing_requests": len(scored_requests),
                            "available_seats_on_original": available_seats,
                            "higher_priority_passengers_served": len(seated_original),
                            "reasons_ahead": list(reasons_ahead)
                        }
                    })

            if not reassigned:
                waitlisted.append({
                    **req,
                    "status": "WAITLISTED_STANDBY",
                    "original_bus_time": orig_time,
                    "assigned_bus_time": None,
                    "assigned_bus_name": None,
                    "allocated_seat": None,
                    "waitlist_position": waitlist_counter,
                    "contention_context": {
                        "total_competing_requests": len(scored_requests),
                        "available_seats_on_original": available_seats,
                        "higher_priority_passengers_served": len(seated_original),
                        "reasons_ahead": list(reasons_ahead)
                    }
                })
                waitlist_counter += 1

    return {
        "success": True,
        "original_bus": {
            **original_bus,
            "seats_remaining": seats_remaining
        },
        "candidate_buses": deep_buses,
        "seated_original": seated_original,
        "reallocated_adjacent": reallocated_adjacent,
        "waitlisted": waitlisted,
        "all_allocations": seated_original + reallocated_adjacent + waitlisted,
        "summary": {
            "total_requests": len(requests),
            "available_seats_on_original": available_seats,
            "seated_original_count": len(seated_original),
            "reallocated_adjacent_count": len(reallocated_adjacent),
            "waitlisted_count": len(waitlisted)
        }
    }
