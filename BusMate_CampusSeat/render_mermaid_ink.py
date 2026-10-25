import base64
import urllib.request
import os

def render_mermaid_to_png(mermaid_code, output_png_path):
    # Base64 encode the mermaid code string
    encoded_bytes = base64.b64encode(mermaid_code.encode('utf-8'))
    encoded_str = encoded_bytes.decode('utf-8')
    
    # mermaid.ink API URL
    url = f"https://mermaid.ink/img/{encoded_str}?bgColor=FFFFFF"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    print(f"Fetching diagram image from mermaid.ink for {output_png_path}...")
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            with open(output_png_path, 'wb') as f:
                f.write(response.read())
        print(f"Successfully saved PNG image: {output_png_path}")
        return True
    except Exception as e:
        print(f"Error fetching from mermaid.ink: {e}")
        return False

# Test Class Diagram Code
CLASS_MMD = """classDiagram
    direction TB
    class Bus {
        +string id
        +string routeNumber
        +string origin
        +string destination
        +string departureTime
        +number capacity
        +number currentOccupancy
        +number predictedDemand
        +number overcrowdingProbability
        +string riskLevel
        +string fare
    }
    class PassengerRequest {
        +string passengerId
        +number constraintLevel
        +number scheduleDisruption
        +number previousDenials
        +number preferenceMatch
        +boolean isAccessibilityRequired
    }
    class AllocationResult {
        +number totalRequests
        +number capacity
        +number allocatedCount
        +number waitlistedCount
        +Array results
    }
    class AllocationService {
        +runFairAllocation()
    }
    class CounterfactualService {
        +runSingleCounterfactual()
        +runBatchCounterfactualEval()
    }
    AllocationService --> PassengerRequest
    AllocationService --> AllocationResult
    CounterfactualService --> AllocationService
"""

SEQ1_MMD = """sequenceDiagram
    autonumber
    actor Passenger
    participant UI as HomePage / BusCard
    participant ExplModal as ExplanationModal
    participant SeatModal as SeatRequestModal
    participant XAI as XaiService (C14)
    participant Alloc as AllocationService
    participant DB as LocalStorage

    Passenger->>UI: Click "Why is this crowded?" on Bus SB-04
    UI->>ExplModal: Open modal(bus = SB-04)
    ExplModal->>XAI: getShapExplanations("SB-04")
    XAI-->>ExplModal: Return SHAP values (+0.31 Friday, +0.18 Event)
    ExplModal-->>Passenger: Display Simple Passenger Text & Technical SHAP Chart
    Passenger->>ExplModal: Close Explanation Modal

    Passenger->>UI: Click "Request Seat" on Bus SB-04
    UI->>SeatModal: Open modal(bus = SB-04)
    Passenger->>SeatModal: Input info (Urgency=High, Denials=1, Accessibility=Yes)
    Passenger->>SeatModal: Click "Submit & Evaluate Allocation"
    
    SeatModal->>Alloc: runFairAllocation(requests, capacity=50, weights)
    Alloc-->>SeatModal: Return AllocationResult (Status: Allocated, Seat: "Seat-04")
    SeatModal->>DB: setItem("smartbus_my_trips", bookingData)
    SeatModal-->>Passenger: Display "Seat Reserved: Seat-04" + Transparent Reason
"""

SEQ2_MMD = """sequenceDiagram
    autonumber
    actor Admin as Admin / Researcher
    participant CFLab as CounterfactualLabPage
    participant CFService as CounterfactualService (C11)
    participant CalibPage as PolicyCalibrationPage
    participant CalibService as CalibrationService
    participant Alloc as AllocationService
    participant DB as LocalStorage

    Admin->>CFLab: Select Target Passenger "Pass-014" (Baseline: Waitlisted)
    Admin->>CFLab: Perturb Attribute: "Previous Denials: 0 -> 3"
    CFLab->>CFService: runSingleCounterfactual(id="Pass-014", field="previousDenials", val=3)
    CFService->>Alloc: runFairAllocation(baselineRequests, capacity=50, weights)
    Alloc-->>CFService: Baseline Result (Pass-014 = Waitlisted)
    CFService->>Alloc: runFairAllocation(modifiedRequests, capacity=50, weights)
    Alloc-->>CFService: Perturbed Result (Pass-014 = Allocated)
    CFService-->>CFLab: Return Diff (OutcomeChanged = True)
    CFLab-->>Admin: Display Outcome Flip Badge & Sensitivity Explanation

    Admin->>CalibPage: Navigate to Policy Calibration Page
    Admin->>CalibPage: Adjust Sliders (w1=0.35, w2=0.25, w3=0.25, w4=0.15)
    CalibPage->>CalibService: evaluateCustomPolicyWeights(weights)
    CalibService->>Alloc: runFairAllocation(requests, capacity=50, weights)
    Alloc-->>CalibService: Return Metrics (Fairness: 91%, Efficiency: 89%)
    CalibService-->>CalibPage: Return Trade-off Scatter Data
    Admin->>CalibPage: Click "Select Recommended Calibrated Policy"
    CalibPage->>DB: setItem("smartbus_custom_weights", recommendedWeights)
    CalibPage-->>Admin: Display "Selected Pareto Knee-Point Policy" Notification
"""

if __name__ == "__main__":
    render_mermaid_to_png(CLASS_MMD, "class_diagram.png")
    render_mermaid_to_png(SEQ1_MMD, "sequence_diagram_passenger_flow.png")
    render_mermaid_to_png(SEQ2_MMD, "sequence_diagram_counterfactual_flow.png")
