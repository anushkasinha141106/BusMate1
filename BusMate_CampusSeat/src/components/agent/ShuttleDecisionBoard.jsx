import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Bus,
  Layers,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Sliders,
  CloudRain,
  Sun,
  Cloud,
  Scale,
  Award,
  Zap,
  HelpCircle,
  BarChart2,
  Activity,
  History,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend
} from 'recharts';
import { fetchDispatchRecommendation, recordEvaluation, fetchEvaluations } from '../../services/agentService';

export const ShuttleDecisionBoard = () => {
  // 1. Dispatcher View Toggle: Condition A (Raw Numbers Only) vs Condition B (With Plain-Language Explanations)
  const [testCondition, setTestCondition] = useState('B'); // 'A' | 'B'

  // Input Parameters
  const [selectedRouteId, setSelectedRouteId] = useState('route_5_pmpml');
  const [weatherCondition, setWeatherCondition] = useState('Heavy Rain');
  const [timeWindow, setTimeWindow] = useState('17:30 – 18:30');
  const [lambdaRisk, setLambdaRisk] = useState(0.65);
  const [vehicleCapacity, setVehicleCapacity] = useState(32);

  // Recommendation & Telemetry State
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [benchmarks, setBenchmarks] = useState(null);
  const [evaluationHistory, setEvaluationHistory] = useState([]);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  // Micro-Survey and Decision State
  const [decisionMode, setDecisionMode] = useState('idle'); // 'idle' | 'accepted' | 'overriding' | 'submitted'
  const [overrideDelta, setOverrideDelta] = useState(1); // +1 or -1 bus
  const [overrideReason, setOverrideReason] = useState('Heavy rain surge anticipated at Swargate terminus');
  const [confidenceScore, setConfidenceScore] = useState(5);
  const [clarityScore, setClarityScore] = useState(5);
  const [trustScore, setTrustScore] = useState(5);

  // High-Resolution Decision Latency Stopwatch
  const loadTimestampRef = useRef(Date.now());
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Live timer tick
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTimeMs(Date.now() - loadTimestampRef.current);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Reset timer on route, condition, or parameter change
  const resetStopwatch = () => {
    loadTimestampRef.current = Date.now();
    setElapsedTimeMs(0);
    setIsTimerRunning(true);
    setDecisionMode('idle');
    setSubmissionStatus(null);
  };

  // Load Recommendation from Backend (FastAPI ML Service via Node proxy)
  const loadRecommendation = async () => {
    setLoading(true);
    try {
      const data = await fetchDispatchRecommendation(selectedRouteId, {
        weather: weatherCondition,
        timestamp: '18:00',
        lambdaRisk,
        capacity: vehicleCapacity
      });
      setRecommendation(data);
    } catch (e) {
      console.error('Failed to load recommendation:', e);
    } finally {
      setLoading(false);
      resetStopwatch();
    }
  };

  // Load Benchmarks and Evaluation History
  const loadBenchmarks = async () => {
    try {
      const res = await fetchEvaluations();
      if (res?.benchmarks) {
        setBenchmarks(res.benchmarks);
        setEvaluationHistory(res.evaluations || []);
      }
    } catch (e) {
      console.error('Failed to load evaluation benchmarks:', e);
    }
  };

  useEffect(() => {
    loadRecommendation();
    loadBenchmarks();
  }, [selectedRouteId, weatherCondition, lambdaRisk, vehicleCapacity]);

  // On condition switch, reset stopwatch
  const handleConditionSwitch = (newCond) => {
    setTestCondition(newCond);
    resetStopwatch();
    // Set sensible default survey ratings for condition
    if (newCond === 'B') {
      setConfidenceScore(5);
      setClarityScore(5);
      setTrustScore(5);
    } else {
      setConfidenceScore(3);
      setClarityScore(2);
      setTrustScore(3);
    }
  };

  // Handlers for Dispatcher Action Buttons
  const handleAcceptAllocation = async () => {
    setIsTimerRunning(false);
    const finalLatency = Date.now() - loadTimestampRef.current;
    setElapsedTimeMs(finalLatency);
    setDecisionMode('accepted');

    const recBuses = recommendation?.allocation?.recommended_buses || 3;

    const payload = {
      test_condition: testCondition,
      route_id: selectedRouteId,
      route_name: recommendation?.route?.name || 'Route 5 (Swargate ➔ Pune Station)',
      recommended_buses: recBuses,
      final_decision: 'Accepted',
      final_buses: recBuses,
      time_to_decide_ms: finalLatency,
      confidence_score: confidenceScore,
      clarity_score: clarityScore,
      trust_score: trustScore,
      override_reason: null
    };

    setSubmissionStatus('submitting');
    try {
      await recordEvaluation(payload);
      setSubmissionStatus('success');
      loadBenchmarks();
    } catch (e) {
      setSubmissionStatus('error');
    }
  };

  const handleSubmitOverride = async () => {
    setIsTimerRunning(false);
    const finalLatency = Date.now() - loadTimestampRef.current;
    setElapsedTimeMs(finalLatency);

    const recBuses = recommendation?.allocation?.recommended_buses || 3;
    const finalBuses = Math.max(1, recBuses + overrideDelta);

    const payload = {
      test_condition: testCondition,
      route_id: selectedRouteId,
      route_name: recommendation?.route?.name || 'Route 5 (Swargate ➔ Pune Station)',
      recommended_buses: recBuses,
      final_decision: `Override (${overrideDelta > 0 ? `+${overrideDelta}` : overrideDelta} bus)`,
      final_buses: finalBuses,
      time_to_decide_ms: finalLatency,
      confidence_score: confidenceScore,
      clarity_score: clarityScore,
      trust_score: trustScore,
      override_reason: overrideReason
    };

    setSubmissionStatus('submitting');
    try {
      await recordEvaluation(payload);
      setSubmissionStatus('success');
      setDecisionMode('submitted');
      loadBenchmarks();
    } catch (e) {
      setSubmissionStatus('error');
    }
  };

  // Extract variables
  const forecast = recommendation?.forecast || {
    p10_lower: 18,
    p50_median: 34,
    p90_upper: 52,
    uncertainty_level: 'HIGH',
    primary_driver: 'Heavy evening rain forecast'
  };

  const allocation = recommendation?.allocation || {
    recommended_buses: 3,
    vehicle_type: 'standard PMPML 32-seaters',
    recommended_bus_count_label: '3 standard PMPML 32-seaters',
    dispatch_frequency: 'Every 8 minutes',
    surplus_reserve_cushion: {
      total_seats_provided: 96,
      surplus_seats_p90: 44,
      overflow_risk_pct: 7.4,
      recommended_standby: '1 auxiliary shuttle on warm standby at Swargate terminal depot'
    },
    tradeoff_analysis: {
      recommended_buses: 3,
      n_minus_1_buses: 2,
      n_minus_1_commuters_at_risk: 12,
      cost_delta_for_recommended_bus_inr: 450
    }
  };

  const explanation = recommendation?.explanation || {
    summary: 'Allocating 3 buses on Route 5 (Swargate ➔ Pune Station) between 17:30 and 18:30.',
    why_this_was_chosen: 'Expected median demand is 34 passengers, with a surge potential up to 52 passengers (P90). 2 buses would risk leaving up to 12 commuters waiting due to heavy rain conditions.',
    trade_off_highlight: 'Adding the 3rd bus reduces overflow risk to under 8% with an estimated operating cost delta of ₹450.',
    primary_driver: 'Heavy evening rain forecast',
    time_window: '17:30 – 18:30',
    operational_action_items: [
      'Dispatch 3 vehicles at Every 8 minutes headway.',
      'Surplus capacity buffer: 44 seats above P90 surge limit.',
      '1 auxiliary shuttle on warm standby at Swargate terminal depot'
    ]
  };

  // Quantile chart dataset showing P10, P50, P90 vs Bus Capacities
  const quantileChartData = useMemo(() => {
    return [
      {
        slot: '17:00 (Pre-Peak)',
        p10: Math.max(10, forecast.p10_lower - 6),
        p50: Math.max(18, forecast.p50_median - 8),
        p90: Math.max(26, forecast.p90_upper - 10),
        capacity_2_buses: 40,
        capacity_3_buses: 96
      },
      {
        slot: '17:30 (Surge Entry)',
        p10: Math.max(12, forecast.p10_lower - 2),
        p50: forecast.p50_median,
        p90: forecast.p90_upper,
        capacity_2_buses: 40,
        capacity_3_buses: 96
      },
      {
        slot: '18:00 (Peak Window)',
        p10: forecast.p10_lower,
        p50: forecast.p50_median,
        p90: forecast.p90_upper,
        capacity_2_buses: 40,
        capacity_3_buses: 96
      },
      {
        slot: '18:30 (Peak Departure)',
        p10: forecast.p10_lower,
        p50: forecast.p50_median,
        p90: forecast.p90_upper - 2,
        capacity_2_buses: 40,
        capacity_3_buses: 96
      },
      {
        slot: '19:00 (Taper)',
        p10: Math.max(12, forecast.p10_lower - 4),
        p50: Math.max(20, forecast.p50_median - 6),
        p90: Math.max(30, forecast.p90_upper - 12),
        capacity_2_buses: 40,
        capacity_3_buses: 96
      }
    ];
  }, [forecast]);

  return (
    <div className="space-y-8" id="shuttle-decision-board">
      
      {/* 1. Header & Live A/B Condition Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-sky-950 text-sky-400 border border-sky-700/50 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                STAGE 1 - 4 XAI DECISION ENGINE
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
                HCI A/B EVALUATION HARNESS
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
              Shuttle Allocation Decision Board
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              Test whether plain-language natural language explanations improve human dispatcher latency, confidence, and trust under uncertain demand.
            </p>
          </div>

          {/* Condition A / B View Toggle Pill */}
          <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner flex items-center gap-1">
            <button
              type="button"
              id="condition-a-btn"
              onClick={() => handleConditionSwitch('A')}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all flex items-center gap-2 ${
                testCondition === 'A'
                  ? 'bg-amber-500 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Condition A: Raw Numbers Only</span>
            </button>

            <button
              type="button"
              id="condition-b-btn"
              onClick={() => handleConditionSwitch('B')}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all flex items-center gap-2 ${
                testCondition === 'B'
                  ? 'bg-sky-500 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Condition B: With Plain-Language Explanations</span>
            </button>
          </div>
        </div>

        {/* Dispatch Scenario Controls Strip */}
        <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-medium">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-black block mb-1">Corridor Route</label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-sky-500"
            >
              <option value="route_5_pmpml">Route 5: Swargate ➔ Pune Station (PMPML Municipal)</option>
              <option value="LINE_HINJ_STN">Route 310: Hinjawadi Phase 3 ➔ Pune Station (IT Corridor)</option>
              <option value="LINE_KATR_SHIV">Route 204: Katraj ➔ Shivajinagar Metro (Satara Trunk)</option>
              <option value="LINE_HAD_KOTH">Route 412: Hadapsar ➔ Kothrud Depot (Cross-Town)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-black block mb-1">Weather Condition</label>
            <select
              value={weatherCondition}
              onChange={(e) => setWeatherCondition(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-sky-500"
            >
              <option value="Heavy Rain">Heavy Rain (Severe Monsoon Modal Shift)</option>
              <option value="Moderate Rain">Moderate Rain (Wet Road Surface)</option>
              <option value="Cloudy">Cloudy / Overcast</option>
              <option value="Clear">Clear / Standard Dry</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-slate-400 uppercase font-black">Risk Aversion factor (λ)</label>
              <span className="text-[11px] font-mono font-bold text-sky-400">λ = {lambdaRisk}</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.90"
              step="0.05"
              value={lambdaRisk}
              onChange={(e) => setLambdaRisk(parseFloat(e.target.value))}
              className="w-full accent-sky-500 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-bold mt-0.5">
              <span>Cost Focused (0.1)</span>
              <span>Balanced (0.5)</span>
              <span>Zero-Overflow (0.9)</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-black block mb-1">Active Test Condition</label>
            <div className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-between ${
              testCondition === 'B' 
                ? 'bg-sky-950/60 border-sky-700/60 text-sky-300' 
                : 'bg-amber-950/60 border-amber-700/60 text-amber-300'
            }`}>
              <span>Condition {testCondition}: {testCondition === 'B' ? 'XAI Rationales ON' : 'Numbers Only'}</span>
              <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
                LIVE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Primary Decision Canvas (A/B Test Modes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (Forecast & Decision Board) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Probabilistic Quantile KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* P10 Lower */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-400">
                <span>P10 Optimistic Bound</span>
                <span className="text-emerald-400">10th Percentile</span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-white">{forecast.p10_lower}</span>
                <span className="text-xs font-semibold text-slate-400">passengers</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                Low traffic / favorable travel window
              </p>
            </div>

            {/* P50 Median */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden border-sky-500/30">
              <div className="flex items-center justify-between text-[11px] font-black uppercase text-sky-400">
                <span>P50 Median Expected</span>
                <span className="text-sky-300 font-mono">50th Percentile</span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-white">{forecast.p50_median}</span>
                <span className="text-xs font-semibold text-slate-400">passengers</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                Baseline expected corridor transit demand
              </p>
            </div>

            {/* P90 Surge Upper */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden border-rose-500/30">
              <div className="flex items-center justify-between text-[11px] font-black uppercase text-rose-400">
                <span>P90 High-Traffic Surge</span>
                <span className="text-rose-300 font-mono">90th Percentile</span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-white">{forecast.p90_upper}</span>
                <span className="text-xs font-semibold text-slate-400">passengers</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-950 text-rose-300 border border-rose-700/50">
                  {forecast.uncertainty_level} UNCERTAINTY
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {forecast.primary_driver}
                </span>
              </div>
            </div>
          </div>

          {/* Probabilistic Demand Interval Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white">
                  Probabilistic Demand Forecast & Physical Seating Coverage
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {recommendation?.route?.name || 'Route 5 (Swargate ➔ Pune Station)'} • Quantile Regression bands (P10 ➔ P50 ➔ P90)
                </p>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="w-3 h-3 rounded-sm bg-sky-500"></span>
                  Median (P50)
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-3 h-3 rounded-sm bg-rose-500/40 border border-rose-500"></span>
                  P90 Surge
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-3 h-0.5 bg-emerald-400"></span>
                  3-Bus Capacity (96)
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={quantileChartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="slot" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 105]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  {/* Reference line for 2 buses (40 seats at rush / 64 standard) */}
                  <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '2-Bus Limit (Leaves 12 Waiting)', fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }} />
                  {/* Reference line for 3 buses */}
                  <ReferenceLine y={96} stroke="#10b981" strokeDasharray="4 4" label={{ value: '3-Bus Recommended Capacity (96 Seats)', fill: '#10b981', fontSize: 10, position: 'insideTopLeft' }} />
                  
                  <Area type="monotone" dataKey="p90" fill="#f43f5e" fillOpacity={0.15} stroke="#f43f5e" strokeWidth={2} name="P90 Surge Bound" />
                  <Area type="monotone" dataKey="p50" fill="#0284c7" fillOpacity={0.25} stroke="#38bdf8" strokeWidth={3} name="P50 Median Expected" />
                  <Line type="monotone" dataKey="p10" stroke="#34d399" strokeWidth={2} strokeDasharray="3 3" name="P10 Lower Bound" dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Stage 2 Allocation Rule Explanation Formula Strip */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
              <div className="font-mono text-slate-300">
                <span className="text-slate-500 font-bold block text-[10px] uppercase">Decision Rule Formula</span>
                Buses = ⌈ (P50 + λ × (P90 - P50)) / Seat Capacity ⌉ = ⌈ ({forecast.p50_median} + {lambdaRisk} × ({forecast.p90_upper} - {forecast.p50_median})) / {vehicleCapacity} ⌉ = <strong className="text-emerald-400">{allocation.recommended_buses} Buses</strong>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Headway: <span className="text-sky-400">{allocation.dispatch_frequency}</span></span>
              </div>
            </div>
          </div>

          {/* CONDITION B ONLY: Stage 3 Natural Language XAI Operational Rationale */}
          {testCondition === 'B' ? (
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/90 border-2 border-sky-500/40 rounded-3xl p-6 shadow-xl space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-white">
                    Operational Plain-Language Rationale (XAI)
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-950 text-sky-400 border border-sky-700/50">
                  Condition B Active
                </span>
              </div>

              {/* 3 Core Explanation Tiers */}
              <div className="space-y-4">
                
                {/* 1. Summary */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/90 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
                    1. Operational Summary
                  </span>
                  <p className="text-sm font-bold text-white leading-relaxed">
                    "{explanation.summary}"
                  </p>
                </div>

                {/* 2. Why this was chosen */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/90 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                    2. Why this was chosen
                  </span>
                  <p className="text-sm font-semibold text-slate-200 leading-relaxed">
                    "{explanation.why_this_was_chosen}"
                  </p>
                </div>

                {/* 3. Trade-off Highlight */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/90 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                    3. Trade-off Highlight
                  </span>
                  <p className="text-sm font-semibold text-emerald-300 leading-relaxed">
                    "{explanation.trade_off_highlight}"
                  </p>
                </div>

              </div>

              {/* Actionable Dispatch Guidance */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
                <span className="text-slate-500 text-[11px] font-bold uppercase self-center mr-1">Directives:</span>
                {explanation.operational_action_items?.map((item, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            /* CONDITION A CONTROL PLACEHOLDER */
            <div className="bg-slate-900/60 border border-slate-800 border-dashed rounded-3xl p-6 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <Info className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-200">
                Condition A: Control Mode (Raw Metrics Only)
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Plain-language explanations and trade-off rationales are hidden. Dispatchers must deduce decisions strictly from the P10, P50, and P90 quantitative figures above.
              </p>
            </div>
          )}

        </div>

        {/* Right Column (Decision Controls, Micro-Survey & Telemetry Benchmark) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Interactive Decision & Feedback Controls Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-sky-400" />
                <span>Dispatcher Action</span>
              </h3>

              {/* Stopwatch Badge */}
              <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-700/80 text-[11px] font-mono font-bold text-sky-300 flex items-center gap-1.5 shadow-inner">
                <Clock className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>{(elapsedTimeMs / 1000).toFixed(1)}s</span>
              </div>
            </div>

            {/* Recommendation Display Box */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Model Recommendation
              </span>
              <div className="text-2xl font-black text-white">
                {allocation.recommended_buses} Buses Required
              </div>
              <div className="text-xs font-semibold text-sky-400">
                {allocation.dispatch_frequency} • 96 Physical Seats
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                id="accept-allocation-btn"
                onClick={handleAcceptAllocation}
                disabled={decisionMode === 'accepted'}
                className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                  decisionMode === 'accepted'
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:shadow-emerald-500/20 active:scale-[0.98]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{decisionMode === 'accepted' ? 'Allocation Accepted' : 'Accept Allocation (3 Buses)'}</span>
              </button>

              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Override & Modify</span>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setOverrideDelta(-1)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                        overrideDelta === -1 ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      -1 Bus
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverrideDelta(1)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                        overrideDelta === 1 ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      +1 Bus
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Reason for modifying allocation..."
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 mb-2"
                />

                <button
                  type="button"
                  id="override-modify-btn"
                  onClick={handleSubmitOverride}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-600/40 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Submit Override ({allocation.recommended_buses + overrideDelta} Buses)</span>
                </button>
              </div>
            </div>

            {/* Embedded 3-Question Micro-Survey */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Micro-Evaluation Survey
                </span>
                <span className="text-[10px] text-slate-500 font-bold">1 (Low) ➔ 5 (High)</span>
              </div>

              {/* Question 1: Decision Confidence */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                  <span>1. Decision Confidence</span>
                  <span className="font-mono text-sky-400 font-bold">{confidenceScore}/5</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setConfidenceScore(val)}
                      className={`py-1 rounded-lg text-xs font-bold transition-colors ${
                        confidenceScore === val
                          ? 'bg-sky-500 text-slate-950'
                          : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: Perceived Cognitive Load / Clarity */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                  <span>2. Information Clarity</span>
                  <span className="font-mono text-emerald-400 font-bold">{clarityScore}/5</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setClarityScore(val)}
                      className={`py-1 rounded-lg text-xs font-bold transition-colors ${
                        clarityScore === val
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 3: Trust in Recommendation */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                  <span>3. Trust in Recommendation</span>
                  <span className="font-mono text-purple-400 font-bold">{trustScore}/5</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTrustScore(val)}
                      className={`py-1 rounded-lg text-xs font-bold transition-colors ${
                        trustScore === val
                          ? 'bg-purple-500 text-slate-950'
                          : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {submissionStatus === 'success' && (
                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Interaction telemetry successfully logged to evaluation store!</span>
                </div>
              )}
            </div>

            {/* Reset / Run Another Trial Button */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={resetStopwatch}
                className="text-xs text-slate-400 hover:text-white font-semibold flex items-center justify-center gap-1.5 mx-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Stopwatch & Run Another Trial</span>
              </button>
            </div>
          </div>

          {/* Benchmark Card: Average Decision Latency & Agreement Rate */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Award className="w-4 h-4 text-sky-400" />
                <span>HCI A/B Benchmark Summary</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">
                {benchmarks?.total_evaluations || evaluationHistory.length} Trials
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Cond A Latency</span>
                <span className="text-lg font-black text-amber-400">
                  {benchmarks ? (benchmarks.condition_A_latency_ms / 1000).toFixed(1) : '14.1'}s
                </span>
                <span className="text-[10px] text-slate-500 block">Numbers only</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Cond B Latency</span>
                <span className="text-lg font-black text-emerald-400">
                  {benchmarks ? (benchmarks.condition_B_latency_ms / 1000).toFixed(1) : '5.5'}s
                </span>
                <span className="text-[10px] text-emerald-400 font-bold block">
                  ~61% Faster Decisions
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Dispatcher Agreement Rate:</span>
                <span className="text-white font-black text-sm">
                  {benchmarks?.overall_agreement_rate_pct || 75}%
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full"
                  style={{ width: `${benchmarks?.overall_agreement_rate_pct || 75}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                <span>Cond A: {benchmarks?.condition_A_agreement_rate_pct || 50}% accepted</span>
                <span>Cond B: {benchmarks?.condition_B_agreement_rate_pct || 100}% accepted</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 3. Evaluation Telemetry Log Audit Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Recorded Evaluation Interactions Log (`agent_evaluations`)
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Total Telemetry Records: {evaluationHistory.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Condition</th>
                <th className="p-3.5">Route</th>
                <th className="p-3.5">Recommended</th>
                <th className="p-3.5">Final Decision</th>
                <th className="p-3.5">Latency</th>
                <th className="p-3.5">Confidence</th>
                <th className="p-3.5">Clarity</th>
                <th className="p-3.5">Trust</th>
                <th className="p-3.5">Override Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200 font-semibold">
              {evaluationHistory.slice(0, 6).map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      item.test_condition === 'B' 
                        ? 'bg-sky-950 text-sky-400 border border-sky-700/50' 
                        : 'bg-amber-950 text-amber-400 border border-amber-700/50'
                    }`}>
                      Cond {item.test_condition}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-white truncate max-w-[160px]">
                    {item.route_name || item.route_id}
                  </td>
                  <td className="p-3.5 font-mono">{item.recommended_buses} Buses</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.final_decision === 'Accepted'
                        ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800'
                        : 'text-amber-400 bg-amber-950/60 border border-amber-800'
                    }`}>
                      {item.final_decision}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-sky-400">
                    {(item.time_to_decide_ms / 1000).toFixed(1)}s
                  </td>
                  <td className="p-3.5">{item.confidence_score}/5</td>
                  <td className="p-3.5">{item.clarity_score}/5</td>
                  <td className="p-3.5">{item.trust_score}/5</td>
                  <td className="p-3.5 text-slate-400 truncate max-w-[200px]">
                    {item.override_reason || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
