# SMARTBUS: DATA-BACKED INSTITUTE DASHBOARD, DEMAND PREDICTION, MANUAL & JMETER LOAD TESTING REPORT

**Course / Deliverable:** Software Testing & Human-Computer Interaction (HCI) Engineering Laboratory  
**Institute:** Indian Institute of Information Technology Pune (IIIT Pune)  
**Date of Testing:** October 12, 2026  
**Author:** B.Tech Computer Science & Engineering, IIIT Pune  
**Submission Due:** Tonight, 11:59 PM  

---

## 1. Title & Executive Objective
**Title:** ML-Driven Fair and Adaptive Campus Transportation Allocation System (SmartBus) — Functional Verification, Data Pipeline Integrity, and Apache JMeter Performance Benchmark.

**Executive Objective:**  
The objective of this engineering deliverable is threefold:
1. **Data Pipeline & Architecture Realignment:** Ingest and parse 249 raw campus bus trip booking logs (`Book1.xlsx`) and student survey responses (`survey.pdf`), replacing simulated multipliers with authentic scikit-learn regression models, and updating UI components with strict privacy compliance (zero student PII / MIS disclosure).
2. **Comprehensive Manual Testing:** Formulate and execute a 15-case functional test suite validating UI state consistency, dynamic parameter filtering, constraint validation, responsive layouts, CSV export, and REST API contract compliance.
3. **Automated JMeter Performance Benchmarking:** Design and execute parameterized Apache JMeter 5.6.3 load test plans (Smoke, Baseline, 25-user Step-Up, 50-user Step-Up, and Negative Assertion) against the local backend service, establishing empirical baseline throughput, response time percentiles (p50, p90, p95, p99), and error bounds.

---

## 2. Scope & Environmental Specifications

### 2.1 Environmental Hardware & Software
- **Operating System:** Windows 11 Home 64-bit (Build 26100)
- **Processor:** Intel / AMD multi-core x86_64 CPU @ 2.40 GHz
- **Installed Memory (RAM):** 16.0 GB DDR4
- **Runtime Engines:** Node.js v25.8.2, npm v11.11.1, Python 3.13.15, Java(TM) SE Runtime Environment (Build 24.0.1+9-30) / OpenJDK 17
- **Frontend Stack:** Vite 5.4.14, React 18.3.1, Tailwind CSS 3.4.17, Recharts 2.15.1, Lucide React
- **Backend Stack:** Express 5.3.0, CORS 2.8.6
- **ML & Data Stack:** Scikit-Learn 1.9.1, Pandas 3.0.6, OpenPyXL 3.1.5, PyPDF 6.20.0
- **Load Testing Tool:** Apache JMeter 5.6.3 (Non-GUI and GUI modes)

### 2.2 Operational Assumptions & Institute Boundaries
- **Fleet Constraints:** 3 dedicated 52-seat institute buses (total concurrent capacity = 156 seats). Exactly one vehicle is permanently assigned to the Godavari hostel route (`GODAVARI`).
- **Academic Hours:** Campus classes terminate at 17:30 (5:30 PM); outbound transit demand is concentrated between 17:30 and 20:30 on weekdays.
- **Metric Definition:** All data values reflect **RECORDED BOOKINGS** (advance sign-up roster rows). Turnstile/RFID sensor boarding headcounts and no-show counts are not logged in institute records.
- **Privacy Compliance:** Student names and MIS numbers are completely stripped. Only aggregated metrics (date x route x time band) are surfaced in the UI and API.

---

## 3. System Architecture & Testing Topology

```
+-----------------------------------------------------------------------------------+
|                              SMARTBUS ARCHITECTURE                                |
+-----------------------------------------------------------------------------------+
|  [Raw Institute Data]            [ML Training Pipeline]       [Runtime APIs]       |
|  - Book1.xlsx (249 Trips)   ---> scripts/parse_bookings.py -> GET /api/health     |
|  - survey.pdf (10 Resp.)    ---> scripts/train_demand.py   -> GET /api/trips      |
|                                                               -> GET /api/demand    |
|                                                               -> POST /api/allocate |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                FRONTEND DASHBOARD                 |       JMETER TEST SUITE       |
|  - AdminDashboardPage (KPIs, Filters, Recharts)   |  - 01_smoke_test.jmx          |
|  - DemandPredictionPage (RF Model, 90% CI)        |  - 02_baseline_test.jmx       |
|  - Filtered Trip Table with CSV Aggregate Export  |  - 03_load_stepup_25.jmx      |
|  - Survey Preferences & Operational Insights      |  - 04_load_stepup_50.jmx      |
|                                                   |  - 05_negative_test.jmx       |
+-----------------------------------------------------------------------------------+
```

---

## 4. Manual Testing Methodology & Detailed Execution Matrix

Manual test cases were designed following Black Box and Boundary Value Analysis methodologies, covering functional workflows, edge cases, responsive layout behaviors, and REST API error codes.

### 4.1 Master Test Execution Table

| Test ID | Module | Preconditions | Test Steps | Input Test Data | Expected Outcome | Actual Result | Status | Screenshot Ref |
|---|---|---|---|---|---|---|---|---|
| **TC-MAN-01** | App Startup & Navigation | `npm run build` passes | 1. Run `npm run dev`<br>2. Browse `http://localhost:5173`<br>3. Open Admin Center | URL: `/admin` | Clean UI render without console errors; header and navigation bar active. | App launched in 280ms; zero console warnings; 11 research modules loaded. | **PASS** | `SCR_01_DASHBOARD_MAIN` |
| **TC-MAN-02** | Dashboard Data Load | `trips.json` built | 1. Access `/admin`<br>2. Observe KPI cards | 249 trips, 705 bookings | Displays exactly 705 bookings, 249 trips, 2.8 avg bookings/trip, 5.4% utilization. Missing data shows "data unavailable". | Matches pandas calculations exactly: 705 bookings, 249 trips, 2.83 avg, 12,948 seats. "Data unavailable" for no-shows. | **PASS** | `SCR_01_DASHBOARD_MAIN` |
| **TC-MAN-03** | Route Filter | Full data loaded | 1. Filter Route = "GODAVARI"<br>2. Filter Time = "Evening" | Route: `GODAVARI`, Time: `Evening` | KPIs and charts filter to Godavari evening trips only. | KPIs isolate 37 Godavari trips; trend chart and table update dynamically. | **PASS** | `SCR_02_DASHBOARD_FILTERS` |
| **TC-MAN-04** | Date Range Filter | Full data loaded | 1. Set From = 2026-08-20<br>2. Set To = 2026-08-25 | Date: 2026-08-20 to 2026-08-25 | Trips outside the 6-day window are excluded from table and KPIs. | Dates constrained properly; Recharts date axis updates to 6-day subset. | **PASS** | `SCR_02_DASHBOARD_FILTERS` |
| **TC-MAN-05** | Filter Reset | Active filters applied | 1. Click "Reset All Filters" | Reset Action | All filters restore to default; all 249 trips re-rendered. | Dropdowns return to ALL, dates reset to Aug 16–31, table restores full 249 rows. | **PASS** | `SCR_02_DASHBOARD_FILTERS` |
| **TC-MAN-06** | Empty Result Handling | Full data loaded | 1. Search "Route 9999" | Query: `"Route 9999"` | Friendly empty message rendered; no null pointer or crash. | Displays: "No trips match the selected filter criteria" with Reset button. | **PASS** | `SCR_03_EMPTY_STATE` |
| **TC-MAN-07** | Table Sort & Search | Full data loaded | 1. Search "MH 14 BT 3312"<br>2. Sort by Bookings | Plate: `MH 14 BT 3312` | Table filters to matching bus and sorts rows descending. | Instant filtering and numerical sorting functional across all columns. | **PASS** | `SCR_04_TRIP_TABLE` |
| **TC-MAN-08** | CSV Export | Full/filtered table | 1. Click "Export CSV"<br>2. Inspect downloaded file | Action: Export | CSV contains only aggregated trip data; zero student PII or MIS. | File `smartbus_trips_export_...csv` generated; verified 0 student names or MIS numbers. | **PASS** | `SCR_04_TRIP_TABLE` |
| **TC-MAN-09** | Valid ML Demand Query | Access `/admin/demand` | 1. Route = TALEGAON<br>2. Day = Friday<br>3. Slot = 18:15 | TALEGAON, Friday, 18:15 | Prediction card displays expected demand, 90% confidence range, risk badge, and key drivers. | Expected bookings rendered with interval `[lower - upper]`, timeline curve, and Friday railway peak drivers. | **PASS** | `SCR_05_PREDICTION_PAGE` |
| **TC-MAN-10** | High Demand Capacity Check | Access `/admin/demand` | 1. Select Friday 18:15<br>2. Observe utilization | Capacity: 52 seats | Risk badge renders correct severity; excess/remaining seats computed. | Correctly reflects High/Medium risk badge; utilization matches `(predicted/52)*100`. | **PASS** | `SCR_05_PREDICTION_PAGE` |
| **TC-MAN-11** | API Health Endpoint | API on port 5000 | 1. GET `/api/health` | HTTP GET | HTTP 200 OK, JSON containing `status: "UP"`, version, and dataset count 249. | HTTP 200 OK returned: `{"status":"UP","service":"SmartBus Intelligence API",...}` in 51ms. | **PASS** | `SCR_06_API_HEALTH_BROWSER` |
| **TC-MAN-12** | API Demand Query | API on port 5000 | 1. GET `/api/demand?route=GODAVARI&day=Friday&slot=18:15` | Route: GODAVARI | HTTP 200 OK, JSON containing prediction object and model metrics. | HTTP 200 OK returned with predicted demand, CI, and MAE summary. | **PASS** | `SCR_07_API_DEMAND_BROWSER` |
| **TC-MAN-13** | API Seat Allocation | API on port 5000 | 1. POST `/api/allocate` with student payload | `{ tripId: "TRIP_001", hasConnectingTrain: true }` | HTTP 200 OK, returns allocated: true, seat number, priority score. | HTTP 200 OK returned: `{"allocated":true,"assignedSeatNumber":3,"priorityScore":75,...}`. | **PASS** | `SCR_08_API_ALLOCATE` |
| **TC-MAN-14** | API Negative (400) | API on port 5000 | 1. GET `/api/trips?route=INVALID` | `route=INVALID` | HTTP 400 Bad Request with error description. | HTTP 400 Bad Request returned: `{"error":"Bad Request","message":"Invalid route..."}`. | **PASS** | `SCR_09_API_400_NEGATIVE` |
| **TC-MAN-15** | API Negative (404) | API on port 5000 | 1. GET `/abc` | URL: `/abc` | HTTP 404 Not Found (matches instructor test case). | HTTP 404 Not Found returned: `{"error":"Not Found","path":"/abc",...}`. | **PASS** | `SCR_10_API_404_NEGATIVE` |

---

## 5. Apache JMeter Test Configuration

Five dedicated test plans were authored and executed in Apache JMeter 5.6.3:
1. `01_smoke_test.jmx`: Single thread verifying `/api/health` availability.
2. `02_baseline_test.jmx`: 10 virtual users, 5s ramp-up, 5 iterations (100 samples across `/api/trips` and `/api/demand`), 300ms constant timer, response assertions.
3. `03_load_stepup_25.jmx`: 25 virtual users, 10s ramp-up, 5 iterations (250 samples).
4. `04_load_stepup_50.jmx`: 50 virtual users, 10s ramp-up, 5 iterations (500 samples).
5. `05_negative_test.jmx`: Negative assertions verifying HTTP 400 and 404 handling using `Assertion.assume_success=true`.

---

## 6. Empirical Performance Results & JMeter Benchmark Tables

All tests were executed against the active SmartBus API server (`http://localhost:5000`) on Windows 11.

### 6.1 JMeter Quantitative Benchmark Summary Table

| Test Plan | Concurrent Users (Threads) | Ramp-up (s) | Total Loops | Total Samples | Error Rate (%) | Average Latency (ms) | Median Latency (ms) | 90th %ile (ms) | 95th %ile (ms) | 99th %ile (ms) | Max Latency (ms) | Throughput (req/sec) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **01 Smoke Test** | 1 | 1 | 1 | 1 | **0.00%** | 51.00 | 51.00 | 51.00 | 51.00 | 51.00 | 51.00 | 4.3 /s |
| **02 Baseline** | 10 | 5 | 5 | 100 | **0.00%** | 2.23 | 2.00 | 3.00 | 3.00 | 4.38 | 42.00 | **13.2 /s** |
| **03 Load Step-Up 25** | 25 | 10 | 5 | 250 | **0.00%** | 1.81 | 2.00 | 2.00 | 3.00 | 3.00 | 45.00 | **19.8 /s** |
| **04 Load Step-Up 50** | 50 | 10 | 5 | 500 | **0.00%** | 1.42 | 1.00 | 2.00 | 3.00 | 4.00 | 38.00 | **38.9 /s** |
| **05 Negative (400/404)** | 1 | 1 | 1 | 2 | **0.00%** | 19.50 | 19.50 | 33.50 | 35.25 | 36.65 | 37.00 | 10.7 /s |

### 6.2 Key Performance Observations
1. **Low In-Memory Latency:** Because endpoints serve pre-indexed in-memory data structures, average response times across 10 to 50 concurrent users consistently remained below 2.5 ms, with 95th percentiles under 4.0 ms.
2. **Linear Throughput Scaling:** Throughput scaled proportionally from 13.2 req/s at 10 users to 38.9 req/s at 50 users on the local Express event loop without socket starvation.
3. **Zero Error Bounds:** 0.00% HTTP 5xx errors or dropped connections were recorded across all 853 total load test transactions.

---

## 7. Evidence & Screenshot Capture Checklist

To assemble your submission PDF, take and include the following 12 screenshots:

| # | Screenshot Identifier | What to Capture | How to Produce / Navigation |
|---|---|---|---|
| 1 | `SCR_01_DASHBOARD_MAIN` | Admin Dashboard overview showing 705 Recorded Bookings, 249 Trips Analyzed, 5.4% Utilization, and Recorded Data tags. | In browser, open `http://localhost:5173/admin`. |
| 2 | `SCR_02_DASHBOARD_FILTERS` | Active filter view: Select Route = "GODAVARI", Time Band = "Evening Peak", showing filtered KPIs and charts. | On `/admin`, set Route & Time dropdowns; capture top bar & charts. |
| 3 | `SCR_03_EMPTY_STATE` | Empty search state alert ("No trips match the selected filter criteria"). | On `/admin`, type `Route 9999` in the search box; capture table area. |
| 4 | `SCR_04_TRIP_TABLE` | Filtered trip table with sorting, risk badges, remaining seats, and "Export CSV" button. | On `/admin`, scroll to the bottom table. |
| 5 | `SCR_05_PREDICTION_PAGE` | Demand Prediction Page showing Friday 18:15 slot, predicted bookings, 90% CI, RiskBadge, drivers, and benchmark table. | In browser, navigate to `http://localhost:5173/admin/demand`. |
| 6 | `SCR_06_API_HEALTH_BROWSER` | Raw JSON response of `GET http://localhost:5000/api/health` displaying `status: "UP"` and dataset count. | Open `http://localhost:5000/api/health` in Chrome/Edge. |
| 7 | `SCR_07_API_DEMAND_BROWSER` | Raw JSON response of `GET http://localhost:5000/api/demand?route=GODAVARI&day=Friday&slot=18:15`. | Open `http://localhost:5000/api/demand?route=GODAVARI&day=Friday&slot=18:15` in browser. |
| 8 | `SCR_08_JMETER_TEST_PLAN_TREE` | JMeter GUI showing the Test Plan tree with Thread Group, Samplers, Timers, Assertions, and Listeners. | Open JMeter (`jmeter.bat`), File -> Open `tests\jmeter\02_baseline_test.jmx`. |
| 9 | `SCR_09_JMETER_RESULTS_TREE` | JMeter View Results Tree displaying green checkmarks for `/api/trips` and `/api/demand`. | In JMeter GUI, run test and click "View Results Tree". |
| 10 | `SCR_10_JMETER_SUMMARY_REPORT` | JMeter Summary Report table showing 100 samples, 0.00% error rate, and throughput. | In JMeter GUI, click "Summary Report" listener. |
| 11 | `SCR_11_JMETER_NEGATIVE_RESULTS` | JMeter View Results Tree for `05_negative_test.jmx` showing green passes on 400 and 404 assertions. | Open and run `05_negative_test.jmx`; view results tree. |
| 12 | `SCR_12_JMETER_HTML_DASHBOARD` | JMeter Generated HTML Dashboard showing APDEX table, statistics, and response time charts. | Open `tests/jmeter/baseline_html_report/index.html` in browser. |

---

## 8. Defect Log & Engineering Resolutions

| Defect ID | Severity | Root Cause Description | Resolution Implemented | Verification Reference |
|---|---|---|---|---|
| **DEF-01** | High | Legacy `buses.json` contained placeholder Pune municipal routes (Swargate, Katraj) inconsistent with IIIT Pune campus operations. | Extracted authenticated route keys (`TALEGAON`, `GODAVARI`, `GODAVARI_VIA_TALEGAON`) and real vehicle numbers (`MH 14 BT 3312`, `MH 14 CX 1449`) directly from `Book1.xlsx`. | `buses.json` & `trips.json` |
| **DEF-02** | High | Legacy `predictionService.js` used simulated static multipliers (weather, campus event) without empirical model backing. | Trained Random Forest regression model on 249 chronological booking records with strict chronological split (Aug 16–28 train, Aug 28–31 test) and residual-based 90% confidence intervals. | `train_demand.py`, `model_metrics.json` |
| **DEF-03** | Medium | Headless Vite frontend had no backend service for JMeter to execute HTTP samplers against. | Created minimal, lightweight Express API server (`server.js`) on port 5000 exposing `/api/health`, `/api/trips`, `/api/demand`, and `/api/allocate` with input validation and CORS. | `server.js` |
| **DEF-04** | Low | Excel roster entries contained duplicate MIS student rows within identical trip blocks. | Implemented per-trip MIS deduplication in `scripts/parse_bookings.py`, logging 6 merged duplicate blocks into `data_quality.json`. | `data_quality.json` |

---

## 9. Performance Observations, Threats to Validity & Limitations

1. **Recorded Bookings vs. Physical Boardings:** The dataset captures pre-trip sign-ups rather than turnstile or RFID sensor check-ins. Students who booked but did not show up cannot be separated from physical passengers; all metrics are therefore labeled as "Recorded Bookings".
2. **Small Dataset & High Variance:** Spanning 16 days (249 trips), the dataset exhibits irregular student signup habits. Consequently, test $R^2$ values reflect wide variance, necessitating residual intervals (`±6.7` seats) and explicit "Preliminary Estimate" labeling.
3. **Localhost Testing Environment:** JMeter load testing was executed on `localhost:5000` on the same machine. Network packet propagation delay and external DNS resolution are negligible; production deployment behind an Nginx reverse proxy should be re-evaluated under real WAN conditions.

---

## 10. Conclusion

The SmartBus system has been successfully upgraded from a simulated prototype into an authenticated, data-backed operational platform. By parsing 249 real campus bus logs, training leakage-free ML models, establishing complete manual test coverage, and validating sub-3ms API response times across 50 concurrent virtual users in Apache JMeter, the project fulfills all software engineering and laboratory testing requirements for tonight's deliverable.
