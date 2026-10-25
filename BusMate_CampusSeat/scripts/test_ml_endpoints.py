import sys
import json
sys.path.append('ml_service')
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("\n--- Testing Health Check ---")
r0 = client.get("/health")
print("Status:", r0.status_code)
print(r0.json())

print("\n--- Testing Stage 1: /ml/predict/demand-uncertainty ---")
r1 = client.post("/ml/predict/demand-uncertainty", json={
    "route_id": "route_5_pmpml",
    "timestamp": "2026-10-18T18:00:00",
    "weather_condition": "Heavy Rain",
    "is_event_day": False
})
print("Status:", r1.status_code)
print("Response:", json.dumps(r1.json(), indent=2))

pred_data = r1.json()
assert pred_data["route_id"] == "route_5_pmpml"
assert pred_data["p10_lower"] == 18
assert pred_data["p50_median"] == 34
assert pred_data["p90_upper"] == 52
assert pred_data["uncertainty_level"] == "HIGH"
assert pred_data["primary_driver"] == "Heavy evening rain forecast"
print("Stage 1 assertion PASSED!")

print("\n--- Testing Stage 2: /ml/optimize/allocation ---")
r2 = client.post("/ml/optimize/allocation", json={
    "route_id": "route_5_pmpml",
    "p10_lower": pred_data["p10_lower"],
    "p50_median": pred_data["p50_median"],
    "p90_upper": pred_data["p90_upper"],
    "vehicle_capacity": 32,
    "risk_aversion_lambda": 0.65
})
print("Status:", r2.status_code)
print("Response:", json.dumps(r2.json(), indent=2))
alloc_data = r2.json()
assert alloc_data["recommended_buses"] == 3
print("Stage 2 assertion PASSED!")

print("\n--- Testing Stage 3: /ml/explain/rationale ---")
r3 = client.post("/ml/explain/rationale", json={
    "route_id": "route_5_pmpml",
    "p10_lower": 18,
    "p50_median": 34,
    "p90_upper": 52,
    "recommended_buses": 3,
    "vehicle_capacity": 32,
    "risk_aversion_lambda": 0.65,
    "weather_condition": "Heavy Rain",
    "primary_driver": "Heavy evening rain forecast",
    "time_window_start": "17:30",
    "time_window_end": "18:30"
})
print("Status:", r3.status_code)
print("Response:", json.dumps(r3.json(), indent=2))
exp_data = r3.json()
assert "Allocating 3 buses on Route 5 (Swargate ➔ Pune Station) between 17:30 and 18:30." in exp_data["summary"]
assert "Expected median demand is 34 passengers, with a surge potential up to 52 passengers (P90). 2 buses would risk leaving up to 12 commuters waiting due to heavy rain conditions." in exp_data["why_this_was_chosen"]
assert "Adding the 3rd bus reduces overflow risk to under 8% with an estimated operating cost delta of ₹450." in exp_data["trade_off_highlight"]
print("Stage 3 assertion PASSED!")

print("\n--- Testing Full Recommendation Pipeline ---")
r4 = client.get("/ml/dispatch-recommendation/route_5_pmpml?weather=Heavy%20Rain&timestamp=18:00")
print("Status:", r4.status_code)
print("Keys:", list(r4.json().keys()))
assert r4.json()["success"] is True
print("All ML tests PASSED successfully!")
