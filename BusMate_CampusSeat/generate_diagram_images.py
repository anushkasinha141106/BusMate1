import urllib.request
import zlib
import base64
import json
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def encode_kroki_mermaid(diagram_text):
    # Compress using zlib and base64 urlsafe
    compressed = zlib.compress(diagram_text.encode('utf-8'), 9)
    return base64.urlsafe_b64encode(compressed).decode('utf-8')

def download_mermaid_png(mermaid_text, filename):
    encoded = encode_kroki_mermaid(mermaid_text)
    url = f"https://kroki.io/mermaid/png/{encoded}"
    
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    
    print(f"Downloading diagram image for {filename} from Kroki...")
    with urllib.request.urlopen(req) as response:
        with open(filename, 'wb') as f:
            f.write(response.read())
    print(f"Saved PNG image: {filename}")

def set_cell_background(cell, fill_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_color)
    tcPr.append(shd)

# 1. Mermaid Class Diagram Text
CLASS_DIAGRAM_MERMAID = """classDiagram
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
        +Array~string~ accessibility
    }
    class PassengerRequest {
        +string passengerId
        +number constraintLevel
        +number scheduleDisruption
        +number previousDenials
        +number preferenceMatch
        +boolean isAccessibilityRequired
        +number allocationScore
    }
    class AllocationResult {
        +number totalRequests
        +number capacity
        +number allocatedCount
        +number waitlistedCount
        +Array~PassengerRequest~ results
    }
    class ShapExplanation {
        +string busId
        +number baseValue
        +number finalPredictionPercent
        +Array~ShapFeature~ features
    }
    class FleetRecommendation {
        +string id
        +string title
        +string routeNumber
        +number predictedDemand
        +string recommendedAction
        +string status
    }
    class AllocationService {
        +DEFAULT_WEIGHTS
        +generateSyntheticRequests(count, seed)
        +runFairAllocation(requests, capacity, weights)
    }
    class CounterfactualService {
        +runSingleCounterfactual()
        +runBatchCounterfactualEval()
    }
    class CalibrationService {
        +simulatePolicyTradeoffs()
        +evaluateCustomPolicyWeights()
    }
    class FleetService {
        +getFleetRecommendations()
        +updateRecommendationStatus()
    }

    AllocationService --> PassengerRequest : processes
    AllocationService --> AllocationResult : generates
    CounterfactualService --> AllocationService : evaluates sensitivity
    CalibrationService --> AllocationService : tunes priority weights
    FleetService --> FleetRecommendation : manages
"""

# 2. Sequence Diagram 1: Passenger Seat Allocation Workflow
SEQ_DIAGRAM_1_MERMAID = """sequenceDiagram
    autonumber
    actor Passenger as Passenger User
    participant UI as HomePage / BusCard Component
    participant ExplModal as ExplanationModal Component
    participant SeatModal as SeatRequestModal Component
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
    Note over Alloc: Enforces Hard Limit (N <= 50)<br/>Priority Score = w1*Constraint + w2*Disruption + w3*Denials + w4*Pref
    Alloc-->>SeatModal: Return AllocationResult (Status: Allocated, Seat: "Seat-04")
    
    SeatModal->>DB: setItem("smartbus_my_trips", bookingData)
    DB-->>SeatModal: Confirm Persistence
    SeatModal-->>Passenger: Display "Seat Reserved: Seat-04" + Transparent Reason
"""

# 3. Sequence Diagram 2: Researcher Counterfactual & Policy Calibration Workflow
SEQ_DIAGRAM_2_MERMAID = """sequenceDiagram
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
    Alloc-->>CFService: Return Baseline Result (Pass-014 = Waitlisted)
    
    CFService->>Alloc: runFairAllocation(modifiedRequests, capacity=50, weights)
    Alloc-->>CFService: Return Perturbed Result (Pass-014 = Allocated)
    
    CFService-->>CFLab: Return Counterfactual Diff (OutcomeChanged = True)
    CFLab-->>Admin: Display Outcome Flip Badge & Sensitivity Explanation

    Admin->>CalibPage: Navigate to Policy Calibration Page
    Admin->>CalibPage: Adjust Sliders (w1=0.35, w2=0.25, w3=0.25, w4=0.15)
    CalibPage->>CalibService: evaluateCustomPolicyWeights(weights)
    CalibService->>Alloc: runFairAllocation(requests, capacity=50, weights)
    Alloc-->>CalibService: Return Metrics (Fairness: 91%, Efficiency: 89%)
    CalibService-->>CalibPage: Return Trade-off Scatter Data
    Admin->>CalibPage: Click "Select Recommended Calibrated Policy"
    CalibPage->>DB: setItem("smartbus_custom_weights", recommendedWeights)
    DB-->>CalibPage: Confirm Saved Policy
    CalibPage-->>Admin: Display "Selected Pareto Knee-Point Policy" Notification
"""

def generate_all_images_and_doc():
    # Render and save PNG image files
    img_class = "class_diagram.png"
    img_seq1 = "sequence_diagram_passenger_allocation.png"
    img_seq2 = "sequence_diagram_counterfactual_calibration.png"

    download_mermaid_png(CLASS_DIAGRAM_MERMAID, img_class)
    download_mermaid_png(SEQ_DIAGRAM_1_MERMAID, img_seq1)
    download_mermaid_png(SEQ_DIAGRAM_2_MERMAID, img_seq2)

    # Build Word Document with Embedded High-Res Images
    doc = Document()

    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    PRIMARY_COLOR = RGBColor(7, 89, 133)
    DARK_TEXT = RGBColor(23, 32, 51)

    # Document Header
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_t = p_title.add_run("SmartBus System Diagrams Document")
    r_t.font.name = "Arial"
    r_t.font.size = Pt(24)
    r_t.font.bold = True
    r_t.font.color.rgb = PRIMARY_COLOR

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_s = p_sub.add_run("UML Class Diagram & Sequence Diagrams with High-Resolution Visual Illustrations\nPublic Inter-City Transit — Pune, India")
    r_s.font.size = Pt(11)
    r_s.font.italic = True
    r_s.font.color.rgb = RGBColor(15, 118, 110)

    doc.add_paragraph()

    # Section 1: UML Class Diagram
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("1. UML Class Diagram")
    r_h1.font.color.rgb = PRIMARY_COLOR

    doc.add_paragraph("The diagram below illustrates the structural design of SmartBus including entity models, modular service abstractions, state context, and UI components:")
    
    # Embed Image 1
    p_img1 = doc.add_paragraph()
    p_img1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img1.add_run().add_picture(img_class, width=Inches(6.5))

    doc.add_paragraph()

    # Section 2: Sequence Diagram 1
    h2 = doc.add_heading(level=1)
    r_h2 = h2.add_run("2. Sequence Diagram 1: Passenger Seat Allocation & Explanation")
    r_h2.font.color.rgb = PRIMARY_COLOR

    doc.add_paragraph("Traces the interaction flow when a passenger inspects overcrowding SHAP explanations (C14), submits a seat allocation request under hard capacity limits (N <= 50), and receives a transparent personalized decision:")
    
    # Embed Image 2
    p_img2 = doc.add_paragraph()
    p_img2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img2.add_run().add_picture(img_seq1, width=Inches(6.5))

    doc.add_paragraph()

    # Section 3: Sequence Diagram 2
    h3 = doc.add_heading(level=1)
    r_h3 = h3.add_run("3. Sequence Diagram 2: Researcher Counterfactual Sensitivity & Policy Calibration")
    r_h3.font.color.rgb = PRIMARY_COLOR

    doc.add_paragraph("Traces an administrator/researcher conducting single-attribute perturbation tests in the Counterfactual Lab (C11), running multi-policy trade-off simulations, and selecting a Pareto-calibrated policy vector:")
    
    # Embed Image 3
    p_img3 = doc.add_paragraph()
    p_img3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img3.add_run().add_picture(img_seq2, width=Inches(6.5))

    word_file = "SmartBus_Architecture_With_Diagram_Images.docx"
    doc.save(word_file)
    print(f"Word document with embedded images created: {word_file}")

if __name__ == "__main__":
    generate_all_images_and_doc()
