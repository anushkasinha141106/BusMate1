"""
ml_service/main.py
FastAPI Application for Explainable AI (XAI) Transit Pipeline
Exposes:
- Stage 1: POST /ml/predict/demand-uncertainty
- Stage 2: POST /ml/optimize/allocation
- Stage 3: POST /ml/explain/rationale
- Reasoning LLM: POST /ml/explain/allocation (Passenger personalized explanation)
- Contention Solver: POST /ml/allocation/contention-solve
- Full Pipeline: GET /ml/dispatch-recommendation/{route_id}
"""

from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from model import forecaster, resolve_route
from decision_engine import optimize_fleet_allocation
from explanation_generator import generate_natural_language_explanation
from contention_solver import solve_contention, calculate_contention_score
from reasoning_llm import generate_allocation_explanation

app = FastAPI(
    title="BusMate Explainable AI (XAI) Decision Intelligence Service",
    description="Probabilistic demand forecasting (Quantile Regression), fleet allocation optimization, Contention-Resolution Seat Allocation Engine, and Reasoning LLM Rationales.",
    version="2.1.0"
)

# Enable CORS for local client and backend proxy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Request / Response Schemas
# ============================================================================

class DemandPredictionRequest(BaseModel):
    route_id: str = Field(default="route_5_pmpml", description="Route ID e.g. route_5_pmpml or LINE_SWAR_STN")
    timestamp: Optional[str] = Field(default="2026-10-18T18:00:00", description="Departure time or ISO string")
    weather_condition: Optional[str] = Field(default="Heavy Rain", description="Clear, Cloudy, Rain, Heavy Rain")
    is_event_day: Optional[bool] = Field(default=False, description="True if special municipal/campus event day")

class DemandPredictionResponse(BaseModel):
    route_id: str
    p10_lower: int
    p50_median: int
    p90_upper: int
    uncertainty_level: str
    primary_driver: str

class AllocationOptimizationRequest(BaseModel):
    route_id: str = Field(default="route_5_pmpml")
    p10_lower: int = Field(default=18)
    p50_median: int = Field(default=34)
    p90_upper: int = Field(default=52)
    vehicle_capacity: Optional[int] = Field(default=32, description="Seating capacity per bus (e.g. 32)")
    risk_aversion_lambda: Optional[float] = Field(default=0.65, description="Lambda risk factor in [0, 1]")
    cost_per_bus: Optional[float] = Field(default=450.0, description="Operating cost delta per bus in INR")

class RationaleRequest(BaseModel):
    route_id: str = Field(default="route_5_pmpml")
    p10_lower: int = Field(default=18)
    p50_median: int = Field(default=34)
    p90_upper: int = Field(default=52)
    recommended_buses: int = Field(default=3)
    vehicle_capacity: Optional[int] = Field(default=32)
    risk_aversion_lambda: Optional[float] = Field(default=0.65)
    weather_condition: Optional[str] = Field(default="Heavy Rain")
    primary_driver: Optional[str] = Field(default="Heavy evening rain forecast")
    time_window_start: Optional[str] = Field(default="17:30")
    time_window_end: Optional[str] = Field(default="18:30")

class PassengerAllocationExplanationRequest(BaseModel):
    passenger_name: Optional[str] = Field(default="Rahul Deshmukh")
    age: Optional[int] = Field(default=28)
    trip_purpose: Optional[str] = Field(default="WORK_COMMUTE")
    is_flexible: Optional[bool] = Field(default=True)
    flexible_window_minutes: Optional[int] = Field(default=30)
    original_bus_time: Optional[str] = Field(default="17:30")
    assigned_bus_time: Optional[str] = Field(default="17:45")
    status: Optional[str] = Field(default="REALLOCATED_ADJACENT")
    allocated_seat: Optional[str] = Field(default="Seat 14")
    contention_context: Optional[Dict[str, Any]] = Field(
        default={
            "total_competing_requests": 24,
            "available_seats_on_original": 6,
            "higher_priority_passengers_served": 6,
            "reasons_ahead": ["2 Emergency Medical Visits", "4 Senior Citizens"]
        }
    )
    force_fallback: Optional[bool] = Field(default=False)

class ContentionSolveRequest(BaseModel):
    original_bus: Optional[Dict[str, Any]] = Field(
        default={"time": "17:30", "name": "Route 5 Primary Express (17:30)", "available_seats": 2, "capacity": 32}
    )
    candidate_buses: Optional[List[Dict[str, Any]]] = Field(
        default=[
            {"id": "sb-05-1720", "time": "17:20", "name": "Route 5 Preceding Shuttle (17:20)", "available_seats": 4},
            {"id": "sb-05-1738", "time": "17:38", "name": "Route 5 Next Shuttle (17:38)", "available_seats": 6},
            {"id": "sb-05-1740", "time": "17:40", "name": "Route 5 Adjacent Shuttle (17:40)", "available_seats": 8},
            {"id": "sb-05-1745", "time": "17:45", "name": "Route 5 Relief Shuttle (17:45)", "available_seats": 16}
        ]
    )
    requests: Optional[List[Dict[str, Any]]] = Field(default=[])

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "BusMate ML & XAI Decision Service",
        "engine": "Scikit-Learn Quantile GradientBoostingRegressor + Reasoning LLM",
        "quantiles": ["P10 (optimistic)", "P50 (median)", "P90 (surge)"],
        "stages": [
            "Stage 1: Probabilistic Demand Forecasting",
            "Stage 2: Fleet Allocation Optimization",
            "Stage 3: Natural Language Rationale Generation",
            "Contention Engine: Deterministic Constrained Priority Queue",
            "Reasoning LLM: Plain-Language Seat Allocation Explanations"
        ]
    }

@app.post("/ml/predict/demand-uncertainty", response_model=DemandPredictionResponse)
def predict_demand_uncertainty(req: DemandPredictionRequest):
    """
    Stage 1: Probabilistic Demand Forecasting with Uncertainty Bands.
    """
    res = forecaster.predict_uncertainty(
        route_id=req.route_id,
        timestamp_str=req.timestamp,
        weather_condition=req.weather_condition,
        is_event_day=req.is_event_day
    )
    return DemandPredictionResponse(
        route_id=res["route_id"],
        p10_lower=res["p10_lower"],
        p50_median=res["p50_median"],
        p90_upper=res["p90_upper"],
        uncertainty_level=res["uncertainty_level"],
        primary_driver=res["primary_driver"]
    )

@app.post("/ml/optimize/allocation")
def optimize_allocation(req: AllocationOptimizationRequest):
    """
    Stage 2: Decision Engine (Demand ➔ Fleet Allocation).
    """
    route_meta = resolve_route(req.route_id)
    return optimize_fleet_allocation(
        route_id=route_meta["id"],
        p10_lower=req.p10_lower,
        p50_median=req.p50_median,
        p90_upper=req.p90_upper,
        vehicle_capacity=req.vehicle_capacity or route_meta.get("default_capacity", 32),
        risk_aversion_lambda=req.risk_aversion_lambda if req.risk_aversion_lambda is not None else 0.65,
        cost_per_bus=req.cost_per_bus or 450.0,
        turnaround_minutes=route_meta.get("turnaround_minutes", 24)
    )

@app.post("/ml/explain/rationale")
def explain_rationale(req: RationaleRequest):
    """
    Stage 3: Operational Natural Language Explanation Generator (XAI).
    """
    route_meta = resolve_route(req.route_id)
    forecast_data = {
        "p10_lower": req.p10_lower,
        "p50_median": req.p50_median,
        "p90_upper": req.p90_upper,
        "primary_driver": req.primary_driver,
        "weather_condition": req.weather_condition
    }
    allocation_data = optimize_fleet_allocation(
        route_id=route_meta["id"],
        p10_lower=req.p10_lower,
        p50_median=req.p50_median,
        p90_upper=req.p90_upper,
        vehicle_capacity=req.vehicle_capacity or 32,
        risk_aversion_lambda=req.risk_aversion_lambda if req.risk_aversion_lambda is not None else 0.65
    )
    allocation_data["recommended_buses"] = req.recommended_buses

    return generate_natural_language_explanation(
        route_meta=route_meta,
        forecast=forecast_data,
        allocation=allocation_data,
        time_window_start=req.time_window_start or "17:30",
        time_window_end=req.time_window_end or "18:30"
    )

@app.post("/ml/explain/allocation")
def explain_passenger_allocation(req: PassengerAllocationExplanationRequest):
    """
    Reasoning LLM Pipeline: Generates personalized, contextually valid plain-language rationales
    grounded in specific passenger trip purpose, age tier, time flexibility, and contention context.
    Connects to Gemini 1.5 Flash / OpenAI with resilient edge fallback.
    """
    state_dict = req.model_dump()
    return generate_allocation_explanation(state_dict, force_fallback=req.force_fallback)

@app.post("/ml/allocation/contention-solve")
def solve_seat_contention_api(req: ContentionSolveRequest):
    """
    Contention Solver: Deterministic Constrained Priority Queue Solver.
    Resolves extreme contention spikes (e.g. 20 requests for 2 seats)
    using multi-factor priority scoring and multi-bus optimization.
    """
    return solve_contention(
        original_bus=req.original_bus,
        candidate_buses=req.candidate_buses,
        requests=req.requests
    )

@app.get("/ml/dispatch-recommendation/{route_id}")
def get_full_dispatch_recommendation(
    route_id: str,
    timestamp: str = Query(default="18:00"),
    weather: str = Query(default="Heavy Rain"),
    is_event: bool = Query(default=False),
    lambda_risk: float = Query(default=0.65),
    capacity: int = Query(default=32)
):
    """
    End-to-End Pipeline execution
    """
    route_meta = resolve_route(route_id)

    forecast = forecaster.predict_uncertainty(
        route_id=route_id,
        timestamp_str=timestamp,
        weather_condition=weather,
        is_event_day=is_event
    )

    allocation = optimize_fleet_allocation(
        route_id=route_meta["id"],
        p10_lower=forecast["p10_lower"],
        p50_median=forecast["p50_median"],
        p90_upper=forecast["p90_upper"],
        vehicle_capacity=capacity,
        risk_aversion_lambda=lambda_risk,
        turnaround_minutes=route_meta.get("turnaround_minutes", 24)
    )

    explanation = generate_natural_language_explanation(
        route_meta=route_meta,
        forecast=forecast,
        allocation=allocation,
        time_window_start="17:30",
        time_window_end="18:30"
    )

    return {
        "success": True,
        "route": route_meta,
        "forecast": forecast,
        "allocation": allocation,
        "explanation": explanation,
        "pipeline_metadata": {
            "model": "Quantile Regression (Gradient Boosting with quantile loss)",
            "risk_aversion_factor": lambda_risk,
            "vehicle_seating_capacity": capacity
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
