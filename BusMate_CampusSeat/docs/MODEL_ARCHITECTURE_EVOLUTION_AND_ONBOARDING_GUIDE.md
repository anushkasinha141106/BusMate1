# SMARTBUS ARCHITECTURE EVOLUTION & ML ENGINEERING GUIDE
## A Comprehensive 360° Developer Onboarding, Mathematical Modeling, and Continuous Learning Blueprint

**Author:** SmartBus Core Machine Learning & Systems Architecture Group  
**Target Audience:** New Engineers, Data Scientists, Academic Evaluators, and Systems Maintainers  
**Target System:** SmartBus Fair & Adaptive Campus Transportation Allocation Network (IIIT Pune)  
**Status:** Living Engineering Blueprint & Production Evolution Roadmap  

---

## 1. FOUNDATIONAL MENTAL MODEL: UNDERSTANDING THE SYSTEM FROM ZERO

### 1.1 The Operational Problem in Plain Terms
Academic campus transit networks operate under severe structural constraints:
1. **Fixed, Inelastic Supply:** IIIT Pune operates exactly **3 buses of 52 seats each** (maximum total concurrent fleet capacity = 156 seats). Exactly one vehicle is perpetually dedicated to the Godavari hostel route.
2. **Highly Bursting, Non-Uniform Demand:** Students do not travel randomly. Mandatory campus instruction ends at **17:30 (5:30 PM)**. Outbound demand therefore spikes severely between 17:30 and 19:30 on weekdays.
3. **Hard External Deadlines:** Students traveling to Talegaon frequently connect with the Pune suburban EMU railway network. Missing an outbound campus bus risks missing the 18:45 Talegaon Local train, creating hours of delay.
4. **The Flaw of Naive First-Come-First-Served (FCFS):** Pure speed-based allocation favors students with fast automated bots or flexible lab schedules, penalizing students with rigid class hours, physical mobility needs, or past seat denials.

### 1.2 The Fundamental Data Trap: Recorded Bookings vs. Physical Boardings
The first trap any newcomer must avoid is confusing **booking logs** with **physical passenger counts**:
$$\mathbf{Recorded\ Bookings} \neq \mathbf{Physical\ Boardings}$$
- **What We Have:** Historical logs from `data_raw/Book1.xlsx` reflect advance digital sign-ups from student portal rosters.
- **What We Do NOT Have:** RFID card turnstile taps at bus boarding doors, GPS automated passenger counter (APC) optical sensors, or conductor check-in tallies.
- **Why This Matters:** If 30 students book a 19:00 bus, but 10 decide to stay back for a coding contest and 5 take private auto-rickshaws, only 15 physically board. A model trained on bookings predicts **registration pressure**, not physical axle load. Throughout the code and user interface, this metric is strictly labeled **Recorded Bookings**, and the no-show rate is explicitly flagged as `"data unavailable"`.

### 1.3 The End-to-End Five-Stage Pipeline
The system operates as an integrated pipeline:
```
+---------------------------------------------------------------------------------------------------+
|                                  END-TO-END PIPELINE ARCHITECTURE                                 |
+---------------------------------------------------------------------------------------------------+
|  [STAGE 1] Ingestion & Parsing      -> scripts/parse_bookings.py reads Book1.xlsx & survey.pdf    |
|  [STAGE 2] Feature Engineering      -> Extract calendar, temporal & causal rolling mean features  |
|  [STAGE 3] ML Model & Uncertainty   -> RandomForest + Ridge with residual 90% confidence bounds    |
|  [STAGE 4] Service Layer & API      -> Node.js Express server.js exposing /api/demand, /api/trips |
|  [STAGE 5] Downstream Decisions     -> Admin Dashboard, XAI Explanations & Constraint Allocation   |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. DEEP DIVE INTO THE EXISTING MACHINE LEARNING MODEL

### 2.1 Mathematical Formulation
The demand prediction problem is framed as a supervised regression task over discrete scheduled trips:
$$\hat{y}_i = f(\mathbf{x}_i; \mathbf{\Theta})$$
where:
- $\mathbf{x}_i \in \mathbb{R}^d$ is the feature vector describing trip $i$.
- $y_i \in \mathbb{N}_0$ is the target count of recorded bookings ($0 \le y_i \le 52$).
- $\hat{y}_i$ is the predicted expected booking volume.
- $C = 52$ is the physical seating capacity.

### 2.2 Why Scikit-Learn Random Forest and Ridge Were Selected
With $N = 249$ usable historical trips spanning 16 calendar days, training a deep neural network (e.g., LSTM or Transformer) would cause immediate catastrophic overfitting due to parameter explosion ($P \gg N$).
- **Ridge Regression ($L_2$ Regularized):** Provides an interpretable linear baseline that penalizes extreme feature coefficients:
  $$\min_{\mathbf{w}} \sum_{i=1}^N \left( y_i - \mathbf{w}^T \mathbf{x}_i \right)^2 + \alpha \|\mathbf{w}\|_2^2$$
- **Random Forest Regressor:** An ensemble of $B = 100$ decorrelated decision trees using bootstrap aggregation (bagging) and randomized feature subspace selection:
  $$\hat{y}_{\text{RF}}(\mathbf{x}) = \frac{1}{B} \sum_{b=1}^B T_b(\mathbf{x})$$
  Trees naturally capture non-linear step-function boundaries (e.g., the sharp jump in demand immediately after 17:30) and multi-way categorical interactions without requiring complex polynomial transformations.

### 2.3 Strict Chronological Validation (Zero Data Leakage)
In time-series forecasting, standard randomized $k$-fold cross-validation is completely invalid because it allows a model to learn from tomorrow's demand to predict yesterday's demand (future lookahead leakage). We enforced a strict chronological split:
- **Training Set (80%):** Trips 1 to 199 (August 16, 2026, 19:01 to August 28, 2026, 16:32).
- **Testing Holdout (20%):** Trips 200 to 249 (August 28, 2026, 16:35 to August 31, 2026, 10:39).

All rolling historical features (such as `prior_mean`) are computed **strictly causally** using expanding windows up to time $t-1$:
$$\text{prior\_mean}_t = \frac{1}{t-1} \sum_{k=1}^{t-1} y_k$$

### 2.4 Honest Empirical Benchmarks & Interpretation
The empirical results on the holdout test set reflect genuine real-world characteristics:

| Model Architecture | Train MAE | Train RMSE | Test MAE | Test RMSE | Test $R^2$ |
|---|---|---|---|---|---|
| **Historical Baseline (Mean)** | 3.89 | 5.76 | **3.59** | **4.49** | -0.003 |
| **Ridge Regression** | 3.61 | 5.34 | **5.27** | **6.10** | -0.851 |
| **Random Forest Regressor** | **2.89** | **4.10** | **6.66** | **7.86** | -2.077 |

#### How to Explain These Results to Evaluators
1. **The Mean is a Strong Baseline on Small Samples:** In an academic setting where average booking volume is $2.83$ students per trip, a simple historical average achieves a strong Mean Absolute Error of $\approx 3.6$ students.
2. **The Cause of Negative $R^2$ on Test:** $R^2 = 1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y}_{\text{test}})^2}$. When test set sample sizes are small ($n=50$) and contain outlier spikes (e.g., student rush trips with 28–31 bookings), squared error metrics heavily penalize point-prediction deviations.
3. **The Solution — Residual-Based Confidence Intervals:** Instead of pretending the model produces exact point estimates, the system computes the residual standard error on training residuals:
   $$\sigma_{\text{residual}} = 4.09\text{ seats} \implies \text{CI}_{90\%} = \pm 1.645 \cdot \sigma_{\text{residual}} \approx \pm 6.7\text{ seats}$$
   Every prediction displayed to administrators is bounded: $[\max(0, \hat{y} - 6.7), \hat{y} + 6.7]$.

---

## 3. HOW TO IMPROVE THE ARCHITECTURAL STRUCTURE

If you are a software engineer seeking to refactor and modularize this repository, here is the exact architectural blueprint to follow.

### 3.1 Problem with the Current Structure
Currently, processed data artifacts (`trips.json`, `predictions.json`, `survey.json`) are committed as flat JSON files inside `src/data/`. This was necessary for rapid, zero-dependency prototyping, but creates limitations:
- **No Concurrency Control:** Simultaneous write operations cannot be performed safely.
- **Memory Overhead:** As trips accumulate from hundreds to tens of thousands, reading entire JSON blobs into memory degrades performance.
- **Coupled Re-computation:** Updating a single trip requires re-exporting the entire JSON file.

### 3.2 Target Production Architecture (Domain-Driven Design)

```
hci_project/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── health.py
│   │   │   │   │   ├── trips.py
│   │   │   │   │   ├── demand.py
│   │   │   │   │   └── allocation.py
│   │   ├── core/
│   │   │   ├── config.py             # Environment configurations
│   │   │   └── security.py           # Rate limiting & token auth
│   │   ├── domain/                   # Business domain entities
│   │   │   ├── models/
│   │   │   │   ├── trip.py           # Trip entity
│   │   │   │   ├── booking.py        # Booking roster entity
│   │   │   │   └── vehicle.py        # 52-seat Bus entity
│   │   │   └── services/
│   │   │       ├── fairness_engine.py# Pareto & dynamic points system
│   │   │       └── constraint_mgr.py # Hard 52-seat capacity limits
│   │   ├── infrastructure/
│   │   │   ├── db/
│   │   │   │   ├── database.py       # SQLAlchemy / TimescaleDB session
│   │   │   │   └── repositories/     # CRUD abstractions
│   │   │   └── ml/
│   │   │       ├── features/
│   │   │       │   └── feature_pipeline.py # Feature extraction transforms
│   │   │       ├── models/
│   │   │       │   ├── model_registry.py   # Versioned model weights (.joblib)
│   │   │       │   └── predictor.py        # Live inference wrapper
│   │   │       └── training/
│   │   │           └── retrain_task.py     # Celery / Cron worker script
│   └── main.py                       # Application entrypoint
├── frontend/                         # Vite + React 18 SPA (Unchanged UI)
└── docs/                             # Schemas & test reports
```

### 3.3 Database Schema Migration Blueprint
Replace flat files with an ACID-compliant relational schema (PostgreSQL or SQLite with foreign key enforcement):

```sql
-- 1. Routes Table
CREATE TABLE routes (
    route_id VARCHAR(32) PRIMARY KEY, -- 'TALEGAON', 'GODAVARI', 'GODAVARI_VIA_TALEGAON'
    display_name VARCHAR(128) NOT NULL,
    default_capacity INT DEFAULT 52
);

-- 2. Vehicles Fleet Table
CREATE TABLE fleet_vehicles (
    vehicle_id VARCHAR(32) PRIMARY KEY, -- 'SB-01', 'SB-02'
    registration_plate VARCHAR(32) NOT NULL, -- 'MH 14 BT 3312'
    seating_capacity INT DEFAULT 52,
    is_dedicated_route BOOLEAN DEFAULT FALSE,
    dedicated_route_id VARCHAR(32) REFERENCES routes(route_id)
);

-- 3. Scheduled Trips Table
CREATE TABLE trips (
    trip_id VARCHAR(32) PRIMARY KEY, -- 'TRIP_001'
    route_id VARCHAR(32) REFERENCES routes(route_id),
    vehicle_id VARCHAR(32) REFERENCES fleet_vehicles(vehicle_id),
    scheduled_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    direction VARCHAR(16) CHECK (direction IN ('outbound', 'inbound')),
    time_band VARCHAR(16) CHECK (time_band IN ('Morning', 'Afternoon', 'Evening', 'Night')),
    recorded_bookings_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Anonymized Bookings Table (Zero Student PII)
CREATE TABLE anonymized_bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id VARCHAR(32) REFERENCES trips(trip_id) ON DELETE CASCADE,
    student_mis_hash VARCHAR(64) NOT NULL, -- SHA-256(MIS + SALT)
    booking_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    has_connecting_train BOOLEAN DEFAULT FALSE,
    has_mobility_need BOOLEAN DEFAULT FALSE,
    allocated_seat_number INT,
    allocation_status VARCHAR(16) DEFAULT 'CONFIRMED'
);

-- Indices for high-performance temporal queries
CREATE INDEX idx_trips_date_route ON trips(scheduled_date, route_id);
CREATE INDEX idx_trips_departure ON trips(departure_time);
```

---

## 4. HOW THE MODEL SHOULD EVOLVE AS NEW DATA ARRIVES

As new semesters unfold, thousands of new data points will be ingested. The model must not remain a static one-time snapshot. It must transition into an **Adaptive Continuous Learning Pipeline**.

### 4.1 New Data Modalities to Capture

```
+----------------------------------------------------------------------------------------------------+
|                                    INCOMING NEW DATA FEEDS                                         |
+----------------------------------------------------------------------------------------------------+
|  [FEED 1] RFID Door Turnstiles    -> Boarding timestamp - booking timestamp = No-show ground truth |
|  [FEED 2] Student Cancellations   -> Cancellation lead time (hazard analysis)                      |
|  [FEED 3] Academic Timetable API  -> Exam schedules, project submission dates, academic holidays   |
|  [FEED 4] Rail Transit Delays     -> Indian Railways / IRCTC live EMU local train status at Talegaon|
|  [FEED 5] Campus Weather Sensors  -> Precipitation rate, heat index, severe storm alerts           |
+----------------------------------------------------------------------------------------------------+
```

### 4.2 Handling Data Drift and Concept Drift
In real-world transit, models degrade over time due to three phenomena:

#### 1. Covariate Shift ($P(\mathbf{x})$ changes while $P(y|\mathbf{x})$ remains constant)
- *Example:* The academic administration changes class dismissal time from 17:30 to 16:30 for second-year students.
- *Detection:* Compute the **Population Stability Index (PSI)** on feature distributions every 7 days:
  $$\text{PSI} = \sum_{k=1}^K \left( P_k - Q_k \right) \times \ln\left( \frac{P_k}{Q_k} \right)$$
  - $\text{PSI} < 0.1$: No significant shift.
  - $0.1 \le \text{PSI} \le 0.25$: Moderate shift; trigger automated warning.
  - $\text{PSI} > 0.25$: Severe shift; trigger immediate model retraining.

#### 2. Concept Drift ($P(y|\mathbf{x})$ changes while $P(\mathbf{x})$ remains constant)
- *Example:* Fuel price increases or private auto-rickshaw fare hikes make students twice as likely to book campus shuttles on Friday evenings than previously observed.
- *Detection:* Track rolling holdout MAE on the past 20 completed trips. If $\text{MAE}_{\text{rolling}} > 4.5\text{ seats}$, flag concept drift.

### 4.3 The Continuous Retraining Architecture (MLOps Loop)

```
[New Trip Data Ingested] 
          |
          v
[Automated Data Hygiene & Deduplication]
          |
          v
[Drift Detection (PSI & Rolling Residuals)]
          |
          +---> If Drift Detected OR Weekly Cron Triggered:
          |         |
          |         v
          |   [Train Candidate Model (RandomForest / LightGBM)]
          |         |
          |         v
          |   [Champion-Challenger Validation on Chronological Test Set]
          |         |
          |         +---> Is Challenger MAE < Current Champion MAE - 5%?
          |                   |
          |                   +-- YES --> [Promote Challenger to Model Registry]
          |                   |           [Hot-Swap In-Memory Predictor]
          |                   |
          |                   +-- NO  --> [Retain Champion, Log Alert to MLflow]
```

---

## 5. NEXT-GENERATION ADVANCED MODELING METHODOLOGIES

To reach state-of-the-art predictive accuracy as the dataset scales from 250 trips to 5,000+ trips, move away from simple standard Gaussian regressors. Transit booking volume is **discrete, non-negative count data**. Standard Mean Squared Error (MSE) minimization fails because:
1. It assumes symmetric, Gaussian errors with constant variance (homoscedasticity).
2. It can predict negative demand values.
3. It ignores the Poisson nature of discrete passenger arrivals.

Here are the five specific advanced models to implement:

### Method 1: Negative Binomial Count Regression (Solves Overdispersion)
Standard Poisson models assume the variance equals the mean ($\text{Var}(Y) = \mathbb{E}[Y]$). In bus bookings, variance frequently exceeds the mean ($\text{Var}(Y) > \mathbb{E}[Y]$), known as **overdispersion**.
- **Negative Binomial Formulation:**
  $$P(Y = y | \mathbf{x}) = \frac{\Gamma(y + \alpha^{-1})}{\Gamma(y + 1)\Gamma(\alpha^{-1})} \left(\frac{\alpha^{-1}}{\alpha^{-1} + \mu(\mathbf{x})}\right)^{\alpha^{-1}} \left(\frac{\mu(\mathbf{x})}{\alpha^{-1} + \mu(\mathbf{x})}\right)^y$$
  where $\mu(\mathbf{x}) = \exp(\mathbf{w}^T \mathbf{x})$ guarantees non-negative predicted demand, and $\alpha$ is the dispersion parameter.
- **Python Implementation:**
  ```python
  import statsmodels.api as sm
  nb_model = sm.GLM(y_train, X_train, family=sm.families.NegativeBinomial(alpha=0.5)).fit()
  ```

### Method 2: Gradient Boosted Decision Trees with Tweedie / Poisson Objective (LightGBM)
When dataset size reaches $N > 1,000$ trips, LightGBM outperforms Random Forest by optimizing custom loss functions and handling categorical route features natively without one-hot encoding bloat.
- **Tweedie Loss Function:**
  $$\mathcal{L}(y, \hat{y}) = - y \frac{\hat{y}^{1-p}}{1-p} + \frac{\hat{y}^{2-p}}{2-p}, \quad 1 < p < 2$$
- **Monotonic Constraints:** Enforce that demand must strictly increase as class dismissal approaches 17:30:
  ```python
  import lightgbm as lgb
  params = {
      'objective': 'poisson',
      'metric': 'mae',
      'monotone_constraints': [1, 0, 0, 1, ...], # Enforce monotonic time relationship
      'learning_rate': 0.03,
      'num_leaves': 31
  }
  ```

### Method 3: Two-Stage Hurdle / Zero-Inflated Model
Many off-peak trips (e.g., Sunday 08:00 AM or Tuesday 14:00 PM) have exactly **0 bookings**, creating a heavy spike at zero. A standard regressor struggles to fit both the probability of zero and the distribution of non-zero bookings.
- **Stage 1 (Binary Logistic Gate):** Predicts the probability that *anyone* books the bus:
  $$P(y_i > 0) = \sigma(\mathbf{w}_1^T \mathbf{x}_i)$$
- **Stage 2 (Truncated Count Regressor):** If $y_i > 0$, predicts how many students book:
  $$\mathbb{E}[y_i | y_i > 0] = g(\mathbf{w}_2^T \mathbf{x}_i)$$
- **Combined Expectation:**
  $$\hat{y}_i = P(y_i > 0) \times \mathbb{E}[y_i | y_i > 0]$$

### Method 4: Hierarchical Bayesian Dynamic Generalized Linear Models (DGLM)
When multiple routes share seasonal trends, a Hierarchical Bayesian model pools statistical strength across routes. Low-sample routes (e.g., `GODAVARI_VIA_TALEGAON` with only 5 trips) "borrow strength" from high-sample routes (`TALEGAON` with 207 trips):
$$y_{r, t} \sim \text{Poisson}(\lambda_{r, t})$$
$$\log(\lambda_{r, t}) = \alpha_r + \beta_r \cdot \text{time\_dec}_t + \gamma_{\text{day}(t)}$$
$$\alpha_r \sim \mathcal{N}(\mu_{\alpha}, \sigma_{\alpha}^2), \quad \beta_r \sim \mathcal{N}(\mu_{\beta}, \sigma_{\beta}^2)$$
Implemented via PyMC or Stan, this yields exact posterior predictive distributions rather than simple point estimates.

### Method 5: Survival Analysis for Booking Finalization Lead Times
Using survey question 14 ("How long before departure should seat assignments be finalized?"), implement a Cox Proportional Hazards model predicting the arrival probability of late bookings:
$$h(t | \mathbf{x}) = h_0(t) \exp(\mathbf{\beta}^T \mathbf{x})$$
This allows the system to determine the exact minute before departure when seat reservations should lock to maintain 95% fairness stability.

---

## 6. ACTIONABLE ROADMAP FOR INCOMING DEVELOPERS

Follow this sequential checklist to master and enhance the SmartBus system:

### Phase 1: Local Setup & Comprehension (Days 1–3)
- [ ] Clone the repository and inspect [`src/App.jsx`](file:///c:/Users/Lenovo/hci_project/src/App.jsx) and the routing topology.
- [ ] Run the parser manually: `python scripts/parse_bookings.py`. Inspect generated statistics and cross-reference with [`docs/data_dictionary.md`](file:///c:/Users/Lenovo/hci_project/docs/data_dictionary.md).
- [ ] Run the training engine: `python scripts/train_demand.py`. Inspect [`src/data/model_metrics.json`](file:///c:/Users/Lenovo/hci_project/src/data/model_metrics.json) and observe train vs. test MAE.
- [ ] Start the backend server (`npm run api`) and frontend client (`npm run dev`). Access the Admin Dashboard at `http://localhost:5173/admin`.
- [ ] Open Apache JMeter GUI: `& "C:\Users\Lenovo\apache-jmeter-5.6.3\bin\jmeter.bat"` and load [`tests/jmeter/02_baseline_test.jmx`](file:///c:/Users/Lenovo/hci_project/tests/jmeter/02_baseline_test.jmx) to execute a live test.

### Phase 2: Database Migration (Week 1)
- [ ] Install SQLite or PostgreSQL. Execute the DDL schema provided in Section 3.3.
- [ ] Author a migration script `scripts/migrate_json_to_db.py` reading `trips.json` and inserting relational records into the `trips` table.
- [ ] Refactor `server.js` (or rewrite in FastAPI) to query the SQL database using parametrized queries instead of reading flat JSON files into memory.

### Phase 3: Advanced Modeling Implementation (Weeks 2–3)
- [ ] Implement the Negative Binomial model (`Method 1`) and LightGBM Tweedie regressor (`Method 2`) in `scripts/train_demand.py`.
- [ ] Implement the two-stage Hurdle classifier (`Method 3`) to eliminate off-peak zero-demand prediction distortion.
- [ ] Compare holdout Test MAE against the existing Random Forest ($6.66$) and Historical Baseline ($3.59$). Record metric improvements in MLflow or an experiment tracking log.

### Phase 4: Production MLOps Deployment (Month 1)
- [ ] Configure GitHub Actions CI workflow executing `npm run build`, Python test cases, and JMeter smoke test headlessly on every pull request.
- [ ] Set up a weekly automated cron job retraining the model on newly added booking logs, evaluating against the champion model, and updating model weights seamlessly.

---

### CONCLUSION & SUMMARY TABLE

| Topic | Current Implementation | Target Production State |
|---|---|---|
| **Data Storage** | Static JSON (`trips.json`, `predictions.json`) | Relational PostgreSQL / TimescaleDB with connection pooling |
| **Model Engine** | Scikit-Learn Random Forest Regressor ($N=100$) | LightGBM Tweedie + Two-Stage Hurdle Poisson Count Model |
| **Validation** | 80/20 Chronological Split (No Leakage) | Expanding Window Walk-Forward Backtesting over 52 weeks |
| **Uncertainty** | Fixed Residual Standard Error Margin ($\pm 6.7$ seats) | Quantile Regression Gradient Boosting (p10, p50, p90 predictions) |
| **API Server** | Node.js Express on Port 5000 | FastAPI with Asyncpg + Redis Caching Layer |
| **Testing** | 15 Manual Tests + 5 JMeter JMX Plans | Automated Pytest + Playwright End-to-End + JMeter CI Pipeline |

*By following this engineering blueprint, any engineer can understand the operational domain, maintain model integrity without data leakage, and systematically advance SmartBus into an enterprise-grade transit allocation system.*
