"""
ml_service/reasoning_llm.py
Reasoning LLM Engine for Plain-Language Seat Allocation Explanations.
Connects Gemini 1.5 Flash / OpenAI with a resilient sub-1200ms edge fallback.
"""

import os
import time
import httpx
from typing import Dict, Any, Optional

SYSTEM_PROMPT = """You are an empathetic, transparent transit dispatcher for Pune's PMPML bus network.
Your job is to generate a short, honest, plain-language explanation (2 to 3 sentences maximum) informing a passenger whether they received a seat on their requested bus, were shifted to an adjacent bus, or were waitlisted, and EXACTLY WHY.

Rules:
1. Ground the explanation in the provided facts: mention their specific trip purpose, age tier, and whether they opted into time flexibility.
2. If seats were limited, honestly cite the contention (e.g., "There were only 6 seats for 24 requests, prioritized for medical/senior transit").
3. If they were shifted to an adjacent bus, thank them for their flexibility and emphasize that their seat on the new bus is guaranteed.
4. Tone: Grounded, respectful, clear, and reassuring. Avoid technical jargon like 'knapsack', 'quantile', or 'LLM'.
"""

def generate_heuristic_edge_fallback(state: Dict[str, Any]) -> str:
    """
    Resilient Edge Fallback: Generates deterministic, personalized, grounded
    plain-language explanation within 1ms if LLM API is unavailable, times out,
    or lacks API key.
    """
    passenger_name = state.get("passenger_name", "Commuter")
    age = int(state.get("age", 28))
    purpose = str(state.get("trip_purpose", "GENERAL_LEISURE")).upper()
    is_flexible = bool(state.get("is_flexible", False))
    window = int(state.get("flexible_window_minutes", 30))
    orig_time = state.get("original_bus_time", "17:30")
    new_time = state.get("assigned_bus_time") or "17:40"
    status = str(state.get("status", "CONFIRMED")).upper()
    seat = state.get("allocated_seat") or "Seat 2A"
    pos = state.get("waitlist_position", 1)

    ctx = state.get("contention_context", {})
    reqs = ctx.get("total_competing_requests", 20)
    avail = ctx.get("available_seats_on_original", 2)
    served = ctx.get("higher_priority_passengers_served", avail)
    reasons_ahead = ctx.get("reasons_ahead", [])

    purpose_labels = {
        "MEDICAL": "medical appointment",
        "EDUCATION_EXAM": "exam & education travel",
        "WORK_COMMUTE": "work commute",
        "SHIFT_WORK": "shift commute",
        "GENERAL_LEISURE": "general travel"
    }
    purpose_desc = purpose_labels.get(purpose, "travel")

    # Scenario A: Shifted to adjacent shuttle based on flexibility
    if "REALLOCATED" in status or status == "REALLOCATED_ADJACENT":
        if reasons_ahead:
            top_reason = "medical and senior commuters" if any("Medical" in r or "Senior" in r for r in reasons_ahead) else "higher-urgency priority passengers"
            return (
                f"Due to high peak demand, only {avail} seats were available on the {orig_time} shuttle for {reqs} competing requests, "
                f"which were prioritized for {top_reason}. Because you permitted a ±{window} min flexible schedule, "
                f"your {seat} is confirmed on the {new_time} shuttle with zero delay risk. Thank you for helping keep Pune's transit accessible!"
            )
        return (
            f"Because you noted flexibility within ±{window} minutes, your seat was placed on the {new_time} shuttle. "
            f"This allowed high-priority medical commuters to board the crowded {orig_time} bus. "
            f"Your confirmed {seat} on the {new_time} bus is locked with zero delay risk."
        )

    # Scenario B: Confirmed on original bus
    if "CONFIRMED" in status:
        if purpose == "MEDICAL" or age >= 60:
            return (
                f"Your requested {orig_time} departure is confirmed ({seat}) under Priority Access for your {purpose_desc}. "
                f"Dedicated front seating has been reserved to ensure your journey is safe and on schedule."
            )
        return (
            f"Your requested {orig_time} departure is confirmed for your {purpose_desc}. "
            f"The system maintained your exact schedule as requested."
        )

    # Scenario C: Waitlisted / Standby
    if "WAITLIST" in status:
        return (
            f"Only {avail} seats were available on the {orig_time} shuttle for {reqs} competing requests, "
            f"which were filled by emergency medical and senior commuters. Because your schedule was strictly set to {orig_time}, "
            f"your reservation is placed on standby waitlist #{pos}. You can enable schedule flexibility to be confirmed immediately on an adjacent bus."
        )

    # Default fallback
    return (
        f"Your {purpose_desc} booking status has been updated for the {orig_time} departure in accordance with PMPML transit guidelines."
    )

def generate_allocation_explanation(state: Dict[str, Any], force_fallback: bool = False) -> Dict[str, Any]:
    """
    Main dispatch entry point:
    Tries Gemini 1.5 Flash / OpenAI first (timeout 1.2s).
    If unavailable or timeout exceeded, falls back smoothly to heuristic reasoning builder.
    """
    start_time = time.time()
    gemini_key = os.environ.get("GEMINI_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if not force_fallback and (gemini_key or openai_key):
        # 1. Attempt Gemini 1.5 Flash call
        if gemini_key:
            try:
                user_content = (
                    f"Passenger: {state.get('passenger_name', 'Commuter')}, Age: {state.get('age', 28)}, "
                    f"Purpose: {state.get('trip_purpose', 'WORK_COMMUTE')}, "
                    f"Flexible: {state.get('is_flexible', False)} (±{state.get('flexible_window_minutes', 30)}m), "
                    f"Requested Bus: {state.get('original_bus_time', '17:30')}, "
                    f"Assigned Bus: {state.get('assigned_bus_time', '17:40')}, "
                    f"Status: {state.get('status', 'REALLOCATED_ADJACENT')}, "
                    f"Contention: {state.get('contention_context', {})}"
                )

                payload = {
                    "contents": [{"role": "user", "parts": [{"text": user_content}]}],
                    "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                    "generationConfig": {"temperature": 0.2, "maxOutputTokens": 200}
                }

                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
                with httpx.Client(timeout=1.2) as client:
                    resp = client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        latency_ms = int((time.time() - start_time) * 1000)
                        return {
                            "success": True,
                            "explanation": text,
                            "engine": "Gemini-1.5-Flash",
                            "latency_ms": latency_ms,
                            "is_fallback": False,
                            "passenger_status": state.get("status")
                        }
            except Exception as e:
                # Log and proceed to edge fallback
                pass

        # 2. Attempt OpenAI call if key exists
        if openai_key:
            try:
                url = "https://api.openai.com/v1/chat/completions"
                headers = {"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"}
                user_msg = str(state)
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_msg}
                    ],
                    "temperature": 0.2,
                    "max_tokens": 150
                }
                with httpx.Client(timeout=1.2) as client:
                    resp = client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        text = resp.json()["choices"][0]["message"]["content"].strip()
                        latency_ms = int((time.time() - start_time) * 1000)
                        return {
                            "success": True,
                            "explanation": text,
                            "engine": "OpenAI-GPT",
                            "latency_ms": latency_ms,
                            "is_fallback": False,
                            "passenger_status": state.get("status")
                        }
            except Exception:
                pass

    # 3. Resilient Edge Fallback
    heuristic_text = generate_heuristic_edge_fallback(state)
    latency_ms = int((time.time() - start_time) * 1000)

    return {
        "success": True,
        "explanation": heuristic_text,
        "engine": "Reasoning-Edge-Fallback",
        "latency_ms": latency_ms,
        "is_fallback": True,
        "passenger_status": state.get("status")
    }
