# SmartBus Data Dictionary & Schema Documentation

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
