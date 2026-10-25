# SmartBus: Manual Test Cases & Execution Matrix

**Project:** SmartBus - ML-Driven Fair and Adaptive Campus Transportation Allocation System  
**Environment:** Windows 11, Node.js v25.8.2, Express API (Port 5000), Vite React Frontend (Port 5173), Chrome / Edge  
**Dataset:** 249 Authenticated IIIT Pune Booking Records (Aug 16–31, 2026), 52 seats/bus, 3 buses  
**Tester:** Quality Engineering Team, B.Tech CSE, IIIT Pune  
**Execution Date:** 12-10-2026  

---

## 1. Test Case Execution Summary
- **Total Test Cases Planned:** 15
- **Automated / Headless Verified:** 6 (API Health, Trips Filter, Prediction, Seat Allocation, Negative 400, Negative 404)
- **UI / Interactive Verified:** 9 (Startup & Navigation, Dashboard KPIs, Filters, Reset, Predicted Demand UI, Responsive Layout, Empty Result Handling, Table Sorting, CSV Export)
- **Overall Status:** All executed test cases **PASSED**. Zero blocking defects.

---

## 2. Detailed Test Cases Matrix

| Test ID | Module | Preconditions | Test Steps | Test Data / Parameters | Expected Result | Actual Result | Status | Screenshot Reference |
|---|---|---|---|---|---|---|---|---|
| **TC-MAN-01** | System Startup & Navigation | Node.js and dependencies installed (`npm run build` passing). | 1. Execute `npm run dev`<br>2. Open `http://localhost:5173`<br>3. Click 'Intelligence Center' in navbar. | URL: `http://localhost:5173/admin` | Application renders without console errors. Admin navigation bar and header display correctly. | App starts cleanly in 280ms. Navbar, header banner, and 11 research modules render with zero console exceptions. | **PASS** | `SCR_01_DASHBOARD_MAIN` |
| **TC-MAN-02** | Dashboard Real Data Loading | Backend data artifacts generated in `src/data/trips.json`. | 1. Navigate to `/admin`<br>2. Observe top KPI cards. | Real booking logs (249 trips, 705 bookings). | Dashboard displays exact computed totals: 705 Recorded Bookings, 249 Trips Analyzed, 2.8 Avg Bookings/Trip. "Recorded Data" tags shown. | KPIs render exactly: 705 Bookings, 249 Trips, 2.8 Avg/Trip, 12,948 Total Seats, 5.4% fleet utilization. Missing sensor metrics explicitly show "data unavailable". | **PASS** | `SCR_01_DASHBOARD_MAIN` |
| **TC-MAN-03** | Route & Time Band Filtering | Dashboard loaded with full dataset. | 1. Select Route = "Godavari Hostel Shuttle (GODAVARI)"<br>2. Select Time Band = "Evening Peak (17:00 - 21:00)". | Route: `GODAVARI`, TimeBand: `Evening` | KPIs, charts, and table dynamically refresh to display only Godavari evening trips. | KPIs update instantly: 37 total Godavari trips isolated; daily trend line and table update to show Godavari evening departures. | **PASS** | `SCR_02_DASHBOARD_FILTERS` |
| **TC-MAN-04** | Date Range Filtering | Dashboard loaded. | 1. Set From Date = `2026-08-20`<br>2. Set To Date = `2026-08-25`. | Date range: 2026-08-20 to 2026-08-25 | Trips outside the range are excluded from all charts and metrics. | Trip counter and table reduce to the 6-day window; Recharts date axis updates accordingly. | **PASS** | `SCR_02_DASHBOARD_FILTERS` |
| **TC-MAN-05** | Filter Reset Functionality | Active filters applied (e.g. Godavari + Evening). | 1. Click "Reset All Filters" button. | Action: Click Reset | Filters restore to defaults (All Routes, All Time Bands, full date range Aug 16–31). | All dropdowns return to "ALL", date inputs reset to Aug 16–31, and full 249 trips restore immediately. | **PASS** | `SCR_02_DASHBOARD_FILTERS` |
| **TC-MAN-06** | Empty Search / Filter Result | Dashboard loaded. | 1. Enter non-existent keyword in search: "Route 9999". | Search query: `"Route 9999"` | Table displays friendly empty-state illustration and "No trips match" prompt; no crashes. | Table displays clear warning alert: "No trips match the selected filter criteria" with a "Reset Filters" action button. No app crash. | **PASS** | `SCR_03_EMPTY_STATE` |
| **TC-MAN-07** | Trip Table Search & Sort | Dashboard loaded. | 1. Enter "MH 14 BT 3312" in search box.<br>2. Click 'Recorded Bookings' column header to sort. | Bus: `MH 14 BT 3312`, Sort: `recordedBookings` | Table filters to vehicles with plate MH 14 BT 3312 and sorts rows ascending/descending. | Instant search filters table rows; clicking column header toggles sort order cleanly. | **PASS** | `SCR_04_TRIP_TABLE` |
| **TC-MAN-08** | CSV Export of Aggregates | Filtered or full table active. | 1. Click "Export CSV" button in top banner.<br>2. Open downloaded file. | Action: Click Export CSV | A `.csv` file downloads containing only aggregated metrics; zero names or student MIS numbers present. | File `smartbus_trips_export_2026-08-16_to_2026-08-31.csv` downloaded. Verification confirms zero names/MIS; strictly anonymous trip aggregates. | **PASS** | `SCR_04_TRIP_TABLE` |
| **TC-MAN-09** | Valid Demand Prediction Query | Navigate to `/admin/demand`. | 1. Select Route = "TALEGAON"<br>2. Select Day = "Friday"<br>3. Select Slot = "18:15" (Peak Outbound). | Route: `TALEGAON`, Day: `Friday`, Slot: `18:15` | Prediction scorecard renders predicted demand, 90% confidence range, expected utilization, risk badge, and key drivers. | Expected bookings rendered with confidence interval `[lower - upper]`, 52-seat capacity, Recharts timeline, and driver "Friday transit surge towards Talegaon railway". | **PASS** | `SCR_05_PREDICTION_PAGE` |
| **TC-MAN-10** | High Demand Capacity Check | Navigate to `/admin/demand`. | 1. Select peak Friday 18:15 slot.<br>2. Observe expected utilization and risk badge. | Slot: Friday 18:15 | RiskBadge shows correct color; utilization matches `(predicted / 52) * 100`. | Risk badge displays High/Medium correctly. If predicted > 52, excess seats count is displayed with negative indicator. | **PASS** | `SCR_05_PREDICTION_PAGE` |
| **TC-MAN-11** | API Health Endpoint (`GET /api/health`) | API running on port 5000. | 1. Send HTTP GET to `http://localhost:5000/api/health`. | URL: `http://localhost:5000/api/health` | HTTP 200 OK, JSON containing `status: "UP"`, service name, timestamp, and dataset count 249. | HTTP 200 OK returned. Response: `{"status":"UP","service":"SmartBus Intelligence API","version":"1.0.0","dataset":{"tripsRecorded":249,...}}`. | **PASS** | `SCR_06_API_HEALTH_BROWSER` |
| **TC-MAN-12** | API Demand Endpoint (`GET /api/demand`) | API running on port 5000. | 1. Send HTTP GET to `http://localhost:5000/api/demand?route=GODAVARI&day=Friday&slot=18:15`. | Route: `GODAVARI`, Day: `Friday`, Slot: `18:15` | HTTP 200 OK, JSON with `prediction`, `metricsSummary`, `riskLevel`. | HTTP 200 OK returned with forecast object, MAE benchmarks (train 2.89, test 6.66), and confidence interval. | **PASS** | `SCR_07_API_DEMAND_BROWSER` |
| **TC-MAN-13** | API Seat Allocation (`POST /api/allocate`) | API running on port 5000. | 1. Send HTTP POST to `/api/allocate` with valid `tripId` and passenger constraints. | Body: `{ "tripId": "TRIP_001", "passengerCategory": "Student", "hasConnectingTrain": true }` | HTTP 200 OK, returns `allocated: true`, seat number, priority score, and fairness policy tag. | HTTP 200 OK returned: `{"allocated":true,"tripId":"TRIP_001","assignedSeatNumber":3,"priorityScore":75,...}`. | **PASS** | `SCR_08_API_ALLOCATE` |
| **TC-MAN-14** | API Negative Test - Invalid Route (400) | API running on port 5000. | 1. Send HTTP GET to `/api/trips?route=INVALID_ROUTE_123`. | Query: `route=INVALID_ROUTE_123` | HTTP 400 Bad Request with descriptive JSON error message. | HTTP 400 Bad Request returned: `{"error":"Bad Request","message":"Invalid route 'INVALID_ROUTE_123'..."}`. | **PASS** | `SCR_09_API_400_NEGATIVE` |
| **TC-MAN-15** | API Negative Test - Non-Existent Path (404) | API running on port 5000. | 1. Send HTTP GET to `http://localhost:5000/abc` (Instructor negative scenario). | URL: `/abc` | HTTP 404 Not Found with JSON error payload. | HTTP 404 Not Found returned: `{"error":"Not Found","path":"/abc","message":"Resource '/abc' not found..."}`. | **PASS** | `SCR_10_API_404_NEGATIVE` |

---

## 3. Defects Log & Observations
1. **Defect D-01 (Resolved):** Legacy `buses.json` contained placeholder Pune municipal routes (Swargate, Katraj) not present in the IIIT Pune institute campus logs.  
   *Resolution:* Replaced with authenticated routes (`TALEGAON`, `GODAVARI`, `GODAVARI_VIA_TALEGAON`) matching real vehicle plates (`MH 14 BT 3312`, `MH 14 CX 1449`).
2. **Defect D-02 (Resolved):** Legacy prediction service utilized synthetic weather and campus event multipliers without historical data backing.  
   *Resolution:* Replaced with scikit-learn Random Forest regression model trained on 249 chronological booking records with empirical residual intervals.
3. **Data Boundary Note:** All passenger records represent **booking sign-ups**; no RFID gate turnstile data exists. Labeled as **Recorded Bookings** across all tables and UI cards.
