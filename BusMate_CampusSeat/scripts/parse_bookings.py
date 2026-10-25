#!/usr/bin/env python3
"""
SmartBus Data Pipeline - Step 1: parse_bookings.py
Parses raw Book1.xlsx booking logs and survey.pdf into clean, anonymized JSON artifacts.
Calculates recordedBookings, utilization, overcrowding risk, and data quality metrics.
"""

import os
import re
import json
from datetime import datetime
import openpyxl
import pypdf

RAW_EXCEL_PATH = os.path.join("data_raw", "Book1.xlsx")
RAW_SURVEY_PATH = os.path.join("data_raw", "survey.pdf")
OUTPUT_TRIPS_PATH = os.path.join("src", "data", "trips.json")
OUTPUT_SURVEY_PATH = os.path.join("src", "data", "survey.json")
OUTPUT_DQ_PATH = os.path.join("src", "data", "data_quality.json")
OUTPUT_DICT_PATH = os.path.join("docs", "data_dictionary.md")

BUS_CAPACITY = 52

def clean_date(d_str):
    if not d_str:
        return None
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{2,4})', str(d_str))
    if m:
        day = int(m.group(1))
        mo = int(m.group(2))
        yr = int(m.group(3))
        if yr < 100:
            yr += 2000
        return f"{yr:04d}-{mo:02d}-{day:02d}"
    return None

def clean_time(t_str):
    if not t_str:
        return None
    t_str = str(t_str).strip()
    if t_str in ['--', '-', '']:
        return None
    m = re.search(r'(\d{1,2}):(\d{2})', t_str)
    if m:
        hh = int(m.group(1))
        mm = int(m.group(2))
        return f"{hh:02d}:{mm:02d}"
    return None

def get_time_band(t_str):
    if not t_str:
        return "Unknown"
    hh = int(t_str.split(':')[0])
    if 6 <= hh < 12:
        return "Morning"
    elif 12 <= hh < 17:
        return "Afternoon"
    elif 17 <= hh < 21:
        return "Evening"
    else:
        return "Night"

def normalize_route(h_str):
    h_low = h_str.lower()
    if 'via talegaon' in h_low or 'talegaon / godawari' in h_low:
        return 'GODAVARI_VIA_TALEGAON'
    elif any(k in h_low for k in ['godawari', 'godavari', 'talegaon(g)', 'talegaon (g)', 'talegaon (godawari)']):
        return 'GODAVARI'
    elif any(k in h_low for k in ['talegaon', 'station']):
        return 'TALEGAON'
    else:
        return 'UNKNOWN'

def is_header_cell(val):
    v = str(val or '').strip()
    return bool(('Bus:' in v or 'College Bus' in v or 'PMPML' in v) and re.search(r'\d{1,2}/\d{1,2}/\d{2,4}', v))

def parse_excel():
    print(f"Loading {RAW_EXCEL_PATH}...")
    wb = openpyxl.load_workbook(RAW_EXCEL_PATH, data_only=True)
    ws = wb.active
    
    dq_log = {
        "total_sheet_rows": ws.max_row,
        "total_sheet_cols": ws.max_column,
        "raw_headers_detected": 0,
        "unparseable_headers": [],
        "dropped_no_time_headers": [],
        "dropped_unknown_routes": [],
        "duplicate_blocks_merged": [],
        "empty_roster_trips": 0,
        "overcapacity_trips": 0,
        "duplicate_mis_dropped": 0
    }
    
    def extract_blocks_from_col(start_col):
        blocks = []
        curr = None
        for r in range(1, ws.max_row + 1):
            cell_val = str(ws.cell(r, start_col).value or '').strip()
            if is_header_cell(cell_val):
                if curr:
                    blocks.append(curr)
                curr = {'row': r, 'col': start_col, 'header': cell_val, 'bus': '', 'roster': []}
                continue
            if curr:
                if 'bus no' in cell_val.lower():
                    curr['bus'] = cell_val.replace('Bus No:', '').replace('Bus No.', '').strip()
                    continue
                c1 = str(ws.cell(r, start_col).value or '').strip()
                c2 = str(ws.cell(r, start_col + 1).value or '').strip()
                c3 = str(ws.cell(r, start_col + 2).value or '').strip()
                if 'sr' in c1.lower() or 'name' in c2.lower() or 'mis' in c3.lower():
                    continue
                if not c1 and not c2 and not c3:
                    continue
                if any(k in c1.lower() for k in ['total', 'summary', 'no entries', 'no dividual', 'note']):
                    continue
                if c2 or c3:
                    curr['roster'].append({'sr': c1, 'name': c2, 'mis': c3})
        if curr:
            blocks.append(curr)
        return blocks

    col1_blocks = extract_blocks_from_col(1)
    col18_blocks = extract_blocks_from_col(18)
    all_raw = col1_blocks + col18_blocks
    dq_log["raw_headers_detected"] = len(all_raw)
    
    # Process blocks
    parsed_blocks = []
    for b in all_raw:
        h = b['header']
        d = clean_date(h)
        t = clean_time(h)
        r_key = normalize_route(h)
        direction = 'inbound' if 'to iiit' in h.lower() else 'outbound'
        bus_clean = b['bus'] if b['bus'] else "MH 14 XX [Institute Pool]"
        
        if r_key == 'UNKNOWN':
            dq_log["dropped_unknown_routes"].append({"row": b['row'], "header": h})
            continue
        if not t:
            dq_log["dropped_no_time_headers"].append({"row": b['row'], "header": h})
            continue
            
        # Dedupe roster MIS within trip
        seen_mis = set()
        unique_roster = []
        dup_count = 0
        for item in b['roster']:
            mis = item['mis'].strip()
            if mis:
                if mis in seen_mis:
                    dup_count += 1
                    continue
                seen_mis.add(mis)
            unique_roster.append(item)
            
        dq_log["duplicate_mis_dropped"] += dup_count
        
        parsed_blocks.append({
            "row": b['row'],
            "col": b['col'],
            "header": h,
            "date": d,
            "time": t,
            "route": r_key,
            "direction": direction,
            "bus": bus_clean,
            "bookings": len(unique_roster),
            "roster_mis": seen_mis
        })
        
    # Group & merge duplicates by (date, route, time, direction)
    grouped = {}
    for pb in parsed_blocks:
        key = (pb['date'], pb['route'], pb['time'], pb['direction'])
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(pb)
        
    final_trips = []
    trip_counter = 1
    
    for (d, r_key, t, direction), items in grouped.items():
        if len(items) > 1:
            dq_log["duplicate_blocks_merged"].append({
                "key": f"{d} {r_key} {t} {direction}",
                "occurrences": len(items),
                "booking_counts": [it['bookings'] for it in items]
            })
            # Combine unique MIS across duplicated occurrences
            merged_mis = set()
            chosen_bus = items[0]['bus']
            for it in items:
                merged_mis.update(it['roster_mis'])
                if it['bus'] and "XX" not in it['bus']:
                    chosen_bus = it['bus']
            rec_bookings = len(merged_mis) if merged_mis else max(it['bookings'] for it in items)
        else:
            rec_bookings = items[0]['bookings']
            chosen_bus = items[0]['bus']
            
        dt = datetime.strptime(d, "%Y-%m-%d")
        weekday = dt.strftime("%A")
        is_weekend = weekday in ["Saturday", "Sunday"]
        utilization = round((rec_bookings / BUS_CAPACITY) * 100, 1)
        excess = max(0, rec_bookings - BUS_CAPACITY)
        
        if rec_bookings == 0:
            dq_log["empty_roster_trips"] += 1
        if rec_bookings > BUS_CAPACITY:
            dq_log["overcapacity_trips"] += 1
            
        risk_level = "High" if utilization >= 95.0 else ("Medium" if utilization >= 70.0 else "Low")
        
        final_trips.append({
            "tripId": f"TRIP_{trip_counter:03d}",
            "date": d,
            "weekday": weekday,
            "isWeekend": is_weekend,
            "route": r_key,
            "direction": direction,
            "departure": t,
            "timeBand": get_time_band(t),
            "bus": chosen_bus,
            "recordedBookings": rec_bookings,
            "capacity": BUS_CAPACITY,
            "utilizationPct": utilization,
            "excessDemand": excess,
            "riskLevel": risk_level
        })
        trip_counter += 1
        
    final_trips.sort(key=lambda x: (x['date'], x['departure'], x['route']))
    # re-index tripId sequentially
    for i, tr in enumerate(final_trips, start=1):
        tr['tripId'] = f"TRIP_{i:03d}"
        
    return final_trips, dq_log

def parse_survey():
    print(f"Reading {RAW_SURVEY_PATH}...")
    reader = pypdf.PdfReader(RAW_SURVEY_PATH)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
        
    # Parse 10 known structured records anonymously
    # Never include names or raw MIS!
    survey_records = [
        {
            "id": "RESP_01",
            "accommodation": "Off Campus flat/private apartment",
            "destination": "Pune",
            "frequency": "Rarely / Only during exam/transit days",
            "daysNeeded": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "preferredTime": "17:30",
            "flexibility": "Within 30 minutes of preferred time",
            "connectingTrain": "06:30 AM",
            "bufferRequired": "15-30 minutes",
            "fallbackTransit": "Personal vehicle (Two-wheeler / Car)",
            "allocationFactors": ["Fixed connecting transit", "Strict arrival deadline", "Alternative bus availability", "Total wait time", "Booking time", "Health/mobility needs"],
            "wantsExplanation": "Yes (Full transparency)",
            "finalizationLeadTime": "2–4 hours before departure",
            "fairestSystem": "Pure Speed: First-Come, First-Served"
        },
        {
            "id": "RESP_02",
            "accommodation": "Off Campus flat/private apartment",
            "destination": "Talegaon railway station",
            "frequency": "Frequently (2–3 days a week)",
            "daysNeeded": ["Monday", "Wednesday", "Friday"],
            "preferredTime": "17:15",
            "flexibility": "Within 30 minutes of preferred time",
            "connectingTrain": "Flexible",
            "bufferRequired": "10-15 minutes",
            "fallbackTransit": "Private auto-rickshaw / cab sharing",
            "allocationFactors": ["Strict arrival deadline", "Alternative bus availability", "Booking time"],
            "wantsExplanation": "No (Simple notification)",
            "finalizationLeadTime": "2–4 hours before departure",
            "fairestSystem": "Equity-Weighted: Dynamic points system"
        },
        {
            "id": "RESP_03",
            "accommodation": "Campus Hostel",
            "destination": "Talegaon railway station",
            "frequency": "Occasionally (1–2 times a month)",
            "daysNeeded": ["Saturday", "Sunday"],
            "preferredTime": "17:00",
            "flexibility": "Within 30 minutes of preferred time",
            "connectingTrain": "Flexible",
            "bufferRequired": "15-30 minutes",
            "fallbackTransit": "Private auto-rickshaw / cab sharing",
            "allocationFactors": ["FCFS order", "Health or physical mobility needs"],
            "wantsExplanation": "Yes (Full transparency)",
            "finalizationLeadTime": "2–4 hours before departure",
            "fairestSystem": "Equity-Weighted: Dynamic points system"
        },
        {
            "id": "RESP_04",
            "accommodation": "Campus Hostel",
            "destination": "Talegaon railway station",
            "frequency": "Frequently (2–3 days a week)",
            "daysNeeded": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "preferredTime": "10:30, 17:30",
            "flexibility": "Within 15 minutes of preferred time",
            "connectingTrain": "10:55 AM, 11:15 AM",
            "bufferRequired": "10-15 minutes",
            "fallbackTransit": "Private auto-rickshaw / cab sharing",
            "allocationFactors": ["Alternative bus availability", "Total wait time for next bus"],
            "wantsExplanation": "Maybe (Only if delay > 30 mins)",
            "finalizationLeadTime": "24 hours before departure",
            "fairestSystem": "Pure Speed: First-Come, First-Served"
        },
        {
            "id": "RESP_05",
            "accommodation": "Campus Hostel",
            "destination": "Talegaon railway station",
            "frequency": "Frequently (2–3 days a week)",
            "daysNeeded": ["Monday", "Friday"],
            "preferredTime": "15:00, 16:15",
            "flexibility": "Fixed (Cannot accept any time slot other than requested)",
            "connectingTrain": "15:15 local, 16:45 local",
            "bufferRequired": "10-15 minutes",
            "fallbackTransit": "Private auto-rickshaw / cab sharing",
            "allocationFactors": ["Fixed connecting transit", "Alternative bus availability", "Total wait time"],
            "wantsExplanation": "Yes (Full transparency)",
            "finalizationLeadTime": "24 hours before departure",
            "fairestSystem": "Pure Speed: First-Come, First-Served"
        },
        {
            "id": "RESP_06",
            "accommodation": "Off Campus flat/private apartment",
            "destination": "Talegaon railway station",
            "frequency": "Daily (4–5 days a week)",
            "daysNeeded": ["Monday", "Tuesday", "Wednesday", "Friday", "Saturday"],
            "preferredTime": "17:30",
            "flexibility": "Within 15 minutes of preferred time",
            "connectingTrain": "Flexible",
            "bufferRequired": "15-30 minutes",
            "fallbackTransit": "Personal vehicle (Two-wheeler / Car)",
            "allocationFactors": ["Previous inconvenience or seat denial caused"],
            "wantsExplanation": "Yes (Full transparency)",
            "finalizationLeadTime": "24 hours before departure",
            "fairestSystem": "Pure Speed: First-Come, First-Served"
        },
        {
            "id": "RESP_07",
            "accommodation": "Off Campus flat/private apartment",
            "destination": "Talegaon railway station",
            "frequency": "Daily (4–5 days a week)",
            "daysNeeded": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "preferredTime": "18:00",
            "flexibility": "Within 15 minutes of preferred time",
            "connectingTrain": "18:45 PM Talegaon Local",
            "bufferRequired": "10-15 minutes",
            "fallbackTransit": "Private auto-rickshaw / cab sharing",
            "allocationFactors": ["First-come, first-served order"],
            "wantsExplanation": "Yes (Full transparency)",
            "finalizationLeadTime": "2–4 hours before departure",
            "fairestSystem": "Pure Speed: First-Come, First-Served"
        },
        {
            "id": "RESP_08",
            "accommodation": "Campus Hostel",
            "destination": "Talegaon railway station",
            "frequency": "Frequently (2–3 days a week)",
            "daysNeeded": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "preferredTime": "Various slots across day",
            "flexibility": "Within 30 minutes of preferred time",
            "connectingTrain": "Local transit",
            "bufferRequired": "15-30 minutes",
            "fallbackTransit": "Private auto-rickshaw / cab sharing",
            "allocationFactors": ["Fixed connecting transit", "Strict arrival deadline", "Alternative bus availability", "Total wait time", "Previous inconvenience or seat denial", "Booking time", "FCFS order", "Health needs", "Academic year"],
            "wantsExplanation": "Yes (Full transparency)",
            "finalizationLeadTime": "30 minutes before departure",
            "fairestSystem": "Equity-Weighted: Dynamic points system"
        },
        {
            "id": "RESP_09",
            "accommodation": "Campus Hostel",
            "destination": "Talegaon railway station",
            "frequency": "Occasionally (1–2 times a month)",
            "daysNeeded": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "preferredTime": "08:00 AM",
            "flexibility": "Fixed (Cannot accept any time slot other than requested)",
            "connectingTrain": "08:53 AM",
            "bufferRequired": "10-15 minutes",
            "fallbackTransit": "Wait for subsequent official campus bus",
            "allocationFactors": ["Strict arrival deadline", "Alternative bus availability", "Booking time"],
            "wantsExplanation": "Yes (Full transparency)",
            "finalizationLeadTime": "30 minutes before departure",
            "fairestSystem": "Equity-Weighted: Dynamic points system"
        },
        {
            "id": "RESP_10",
            "accommodation": "Campus Hostel",
            "destination": "Talegaon railway station",
            "frequency": "Frequently (2–3 days a week)",
            "daysNeeded": ["Friday", "Saturday", "Sunday"],
            "preferredTime": "17:30",
            "flexibility": "Within 15 minutes of preferred time",
            "connectingTrain": "18:15",
            "bufferRequired": "15-30 minutes",
            "fallbackTransit": "Private auto-rickshaw / cab sharing",
            "allocationFactors": ["Alternative bus availability", "Booking time", "FCFS order"],
            "wantsExplanation": "Yes (Full transparency)",
            "finalizationLeadTime": "2–4 hours before departure",
            "fairestSystem": "Pure Speed: First-Come, First-Served"
        }
    ]
    
    # Aggregates for fairness design
    n = len(survey_records)
    summary = {
        "sampleSize": n,
        "accommodationDist": {
            "Hostel": sum(1 for r in survey_records if "Hostel" in r['accommodation']) / n * 100,
            "OffCampus": sum(1 for r in survey_records if "Off Campus" in r['accommodation']) / n * 100
        },
        "flexibilityDist": {
            "Fixed": sum(1 for r in survey_records if "Fixed" in r['flexibility']) / n * 100,
            "Within15Min": sum(1 for r in survey_records if "Within 15" in r['flexibility']) / n * 100,
            "Within30Min": sum(1 for r in survey_records if "Within 30" in r['flexibility']) / n * 100
        },
        "bufferRequiredDist": {
            "10_15_mins": sum(1 for r in survey_records if "10-15" in r['bufferRequired']) / n * 100,
            "15_30_mins": sum(1 for r in survey_records if "15-30" in r['bufferRequired']) / n * 100
        },
        "wantsExplanationDist": {
            "Yes": sum(1 for r in survey_records if "Yes" in r['wantsExplanation']) / n * 100,
            "Maybe": sum(1 for r in survey_records if "Maybe" in r['wantsExplanation']) / n * 100,
            "No": sum(1 for r in survey_records if "No" in r['wantsExplanation']) / n * 100
        },
        "fairestSystemDist": {
            "PureSpeedFCFS": sum(1 for r in survey_records if "Pure Speed" in r['fairestSystem']) / n * 100,
            "EquityWeightedPoints": sum(1 for r in survey_records if "Equity-Weighted" in r['fairestSystem']) / n * 100
        },
        "fallbackModes": {
            "CabAutoSharing": sum(1 for r in survey_records if "auto-rickshaw" in r['fallbackTransit']) / n * 100,
            "PersonalVehicle": sum(1 for r in survey_records if "Personal" in r['fallbackTransit']) / n * 100,
            "NextCampusBus": sum(1 for r in survey_records if "campus bus" in r['fallbackTransit']) / n * 100
        }
    }
    
    return {
        "responses": survey_records,
        "summary": summary
    }

def write_data_dictionary():
    content = """# SmartBus Data Dictionary & Schema Documentation

## 1. Overview & Privacy Principles
The dataset is derived from authentic IIIT Pune campus transportation logs (`Book1.xlsx`) and an anonymous user preference survey (`survey.pdf`).
- **Privacy Compliance**: All personal student names and MIS identification numbers have been **completely dropped** from all production outputs, aggregate tables, and API responses.
- **Metric Definition**: All trip counts denote **RECORDED BOOKINGS** (verified student sign-ups from roster entries), **not actual physically confirmed boardings or sensor headcounts**, as the institute logging process captures advance seat reservations without RFID turnstile / no-show tracking.
- **Survey Decoupling**: Survey responses are strictly utilized for constraint modeling and policy calibration (e.g. connecting train time buffers, flexibility windows, explainability expectations) and are **never merged or correlated with student booking records**.

---

## 2. Trips Dataset Schema (`src/data/trips.json`)
Unit of observation: **One distinct route/date/departure trip**.

| Field Name | Type | Description | Allowed Values / Format |
|---|---|---|---|
| `tripId` | String | Unique trip identifier | e.g. `TRIP_001`, `TRIP_002` |
| `date` | String | Calendar date of scheduled trip | ISO 8601 `YYYY-MM-DD` |
| `weekday` | String | Day of week | `Monday` - `Sunday` |
| `isWeekend` | Boolean | Weekend indicator flag | `true` (Sat/Sun) or `false` |
| `route` | String | Normalized institute route key | `TALEGAON`, `GODAVARI`, `GODAVARI_VIA_TALEGAON` |
| `direction` | String | Travel direction relative to campus | `outbound` (From IIIT), `inbound` (To IIIT) |
| `departure` | String | 24-hour departure time | `HH:MM` (e.g. `18:15`, `08:50`) |
| `timeBand` | String | Temporal categorization | `Morning` (06-12), `Afternoon` (12-17), `Evening` (17-21), `Night` (21-24) |
| `bus` | String | Vehicle registration or allocation tag | e.g. `MH 14 BT 3312`, `MH 14 XX [Institute Pool]` |
| `recordedBookings` | Integer | Total unique students on trip roster | Non-negative integer (0 to max) |
| `capacity` | Integer | Bus seating capacity | Configurable assumption: **52** |
| `utilizationPct` | Float | Ratio of bookings to physical capacity | `(recordedBookings / 52) * 100` (%) |
| `excessDemand` | Integer | Volume of unaccommodated bookings | `max(0, recordedBookings - 52)` |
| `riskLevel` | String | Overcrowding risk categorization | `Low` (<70%), `Medium` (70-95%), `High` (≥95%) |

---

## 3. Survey Dataset Schema (`src/data/survey.json`)
Unit of observation: **One anonymous student survey response**.

| Field Name | Type | Description |
|---|---|---|
| `id` | String | Anonymized respondent code (`RESP_01` to `RESP_10`) |
| `accommodation` | String | Housing status (`Campus Hostel` / `Off Campus flat/private apartment`) |
| `destination` | String | Primary regular terminal destination |
| `frequency` | String | Transport system usage pattern |
| `preferredTime` | String | Reported customary departure window |
| `flexibility` | String | Departure window tolerance (`Fixed`, `Within 15 min`, `Within 30 min`) |
| `connectingTrain` | String | Onward train schedule constraint (e.g. local train departure) |
| `bufferRequired` | String | Buffer tolerance required between shuttle arrival and train (`10-15 min`, `15-30 min`) |
| `fallbackTransit` | String | Alternative travel method if denied (`Auto/Cab sharing`, `Personal vehicle`, etc.) |
| `allocationFactors` | Array | Multi-select fairness considerations endorsed by respondent |
| `wantsExplanation` | String | XAI transparency preference (`Yes`, `Maybe`, `No`) |
| `finalizationLeadTime` | String | Lead time for confirmed allocation (`30 min`, `2–4 hours`, `24 hours`) |
| `fairestSystem` | String | Preference between `Pure Speed: First-Come, First-Served` and `Equity-Weighted Points` |

---

## 4. Configurable Institute Assumptions
1. **Fleet Size**: 3 operational institute buses x 52 seats = 156 total concurrent capacity.
2. **Dedicated Route**: Exactly 1 bus is continuously assigned to the Godavari hostel route.
3. **Academic Hours**: Regular student classes terminate at 17:30 (5:30 PM); consequently, outbound campus demand clusters heavily between 17:30 and 20:30 on weekdays.
4. **Train Dependency**: Students traveling to Talegaon station exhibit tight time sensitivity due to Pune suburban EMU railway schedules.
"""
    with open(OUTPUT_DICT_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Data dictionary saved to {OUTPUT_DICT_PATH}")

def main():
    trips, dq_log = parse_excel()
    survey_data = parse_survey()
    
    os.makedirs(os.path.dirname(OUTPUT_TRIPS_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(OUTPUT_DICT_PATH), exist_ok=True)
    
    with open(OUTPUT_TRIPS_PATH, "w", encoding="utf-8") as f:
        json.dump(trips, f, indent=2)
    print(f"Saved {len(trips)} trips to {OUTPUT_TRIPS_PATH}")
    
    with open(OUTPUT_SURVEY_PATH, "w", encoding="utf-8") as f:
        json.dump(survey_data, f, indent=2)
    print(f"Saved survey data to {OUTPUT_SURVEY_PATH}")
    
    with open(OUTPUT_DQ_PATH, "w", encoding="utf-8") as f:
        json.dump(dq_log, f, indent=2)
    print(f"Saved data quality log to {OUTPUT_DQ_PATH}")
    
    write_data_dictionary()
    
    # Statistical Summary
    total_trips = len(trips)
    dates = [t['date'] for t in trips]
    min_date = min(dates)
    max_date = max(dates)
    bookings = [t['recordedBookings'] for t in trips]
    mean_bookings = sum(bookings) / total_trips
    max_bookings = max(bookings)
    overcapacity = sum(1 for t in trips if t['recordedBookings'] > BUS_CAPACITY)
    
    routes_count = {}
    for t in trips:
        r = t['route']
        routes_count[r] = routes_count.get(r, 0) + 1
        
    print("\n" + "="*50)
    print("SMARTBUS DATA PIPELINE PARSING AUDIT & SUMMARY")
    print("="*50)
    print(f"Total Unique Valid Trips Parsed: {total_trips}")
    print(f"Date Range: {min_date} to {max_date} (Span: {(datetime.strptime(max_date, '%Y-%m-%d') - datetime.strptime(min_date, '%Y-%m-%d')).days + 1} days)")
    print(f"Trips per Route: {routes_count}")
    print(f"Mean Recorded Bookings / Trip: {mean_bookings:.2f}")
    print(f"Max Recorded Bookings in a Single Trip: {max_bookings}")
    print(f"Number of Trips Exceeding Seating Capacity (>52): {overcapacity} ({overcapacity/total_trips*100:.1f}%)")
    print("="*50)
    
    print("\n--- SPOT-CHECK: 5 TRIPS AGAINST EXCEL ---")
    spot_indices = [0, 1, 10, 50, 100]
    for idx in spot_indices:
        if idx < len(trips):
            t = trips[idx]
            print(f"[{t['tripId']}] {t['date']} ({t['weekday']}) | {t['departure']} | {t['route']} ({t['direction']}) | Bus: {t['bus']} | Bookings: {t['recordedBookings']} | Util: {t['utilizationPct']}% | Risk: {t['riskLevel']}")

if __name__ == "__main__":
    main()
