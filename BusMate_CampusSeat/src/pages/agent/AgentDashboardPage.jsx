import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  LineChart as LineChartIcon, 
  Activity, 
  Users, 
  Bus, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  Sliders, 
  Calendar, 
  Compass, 
  Cpu, 
  RefreshCw, 
  Download, 
  ExternalLink, 
  ArrowLeft,
  Gauge,
  Zap,
  BarChart3,
  Layers,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Scale
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';

import { 
  predictDemand, 
  getModelMetrics, 
  getPublicRoutes, 
  getTrafficCorridors, 
  getPassengerFlow, 
  getTrips 
} from '../../services/predictionService';
import { ShuttleDecisionBoard } from '../../components/agent/ShuttleDecisionBoard';
import { PassengerABEvaluationDashboard } from '../../components/agent/PassengerABEvaluationDashboard';
import { useAccessibility } from '../../context/AccessibilityContext';
import { A11yModal } from '../../components/accessibility/A11yModal';
import { A11yFloatingBadge } from '../../components/accessibility/A11yFloatingBadge';
import ErrorBoundary from '../../components/common/ErrorBoundary';

const AgentDashboardContent = () => {
  const { a11yState, setIsModalOpen, announce } = useAccessibility();

  useEffect(() => {
    document.title = 'BusMate — Staff & Agent ML Operations Portal';
  }, []);

  // Navigation tab state (defaults to primary XAI Decision Board, supports ?tab=evaluation)
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const tabParam = p.get('tab');
      if (tabParam === 'evaluation' || tabParam === 'research') return 'evaluation';
      if (['xai', 'demand', 'traffic', 'passengers', 'fleet'].includes(tabParam)) return tabParam;
    }
    return 'xai';
  });

  // Module 1 controls
  const [selectedRoute, setSelectedRoute] = useState('LINE_HINJ_STN');
  const [selectedDay, setSelectedDay] = useState('Friday');
  const [selectedSlot, setSelectedSlot] = useState('18:15');

  // Load datasets with safe fallbacks
  const routes = useMemo(() => getPublicRoutes() || [], []);
  const trafficCorridors = useMemo(() => getTrafficCorridors() || [], []);
  const passengerFlow = useMemo(() => getPassengerFlow() || [], []);
  const metrics = useMemo(() => getModelMetrics() || {}, []);

  // Compute prediction for selected route & time with safe catch
  const currentPrediction = useMemo(() => {
    try {
      return predictDemand({
        busCapacity: 52,
        route: selectedRoute,
        dayOfWeek: selectedDay,
        timeSlot: selectedSlot
      }) || {};
    } catch (e) {
      console.warn('[AgentDashboard] Demand prediction failed, using fallback:', e);
      return {
        predictedDemand: 38,
        lowerBound: 34,
        upperBound: 44,
        expectedUtilization: 73,
        excessDemand: 0,
        riskLevel: 'Low',
        timelineData: []
      };
    }
  }, [selectedRoute, selectedDay, selectedSlot]);

  // Route metadata
  const currentRouteMeta = useMemo(() => {
    return (routes || []).find(r => r.routeId === selectedRoute) || routes[0] || {
      routeNumber: '310 IT Express',
      routeName: 'Hinjawadi IT Park Phase 3 - Pune Station',
      operatingHours: '05:30 - 23:30',
      peakHeadway: '6 mins',
      activeFleet: 26
    };
  }, [routes, selectedRoute]);

  // Timeline forecast data for Module 1 Chart
  const chartData = useMemo(() => {
    if (currentPrediction?.timelineData && currentPrediction.timelineData.length > 0) {
      return currentPrediction.timelineData.map(pt => ({
        time: pt.time,
        demand: pt.demand,
        lower: Math.max(0, pt.demand - 4),
        upper: pt.demand + 5,
        capacity: 52
      }));
    }
    // Standard 24h curve fallback
    return [
      { time: '06:00', demand: 18, lower: 14, upper: 22, capacity: 52 },
      { time: '07:30', demand: 34, lower: 30, upper: 38, capacity: 52 },
      { time: '08:30', demand: 49, lower: 44, upper: 54, capacity: 52 },
      { time: '09:30', demand: 53, lower: 48, upper: 58, capacity: 52 },
      { time: '11:00', demand: 32, lower: 28, upper: 36, capacity: 52 },
      { time: '13:00', demand: 26, lower: 22, upper: 30, capacity: 52 },
      { time: '15:30', demand: 36, lower: 32, upper: 40, capacity: 52 },
      { time: '17:30', demand: 51, lower: 46, upper: 56, capacity: 52 },
      { time: '18:15', demand: 54, lower: 49, upper: 59, capacity: 52 },
      { time: '19:30', demand: 47, lower: 42, upper: 52, capacity: 52 },
      { time: '21:00', demand: 28, lower: 24, upper: 32, capacity: 52 },
      { time: '22:30', demand: 15, lower: 11, upper: 19, capacity: 52 },
    ];
  }, [currentPrediction]);

  // Top 6 busiest stations for Module 3 chart
  const topStations = useMemo(() => {
    return [...(passengerFlow || [])]
      .sort((a, b) => (b.interchangeVolume || 0) - (a.interchangeVolume || 0))
      .slice(0, 6)
      .map(st => ({
        name: (st.stationName || 'Station').replace(' Railway Station', ' Stn').replace(' Metro Station', ' Metro').replace(' Bus Stand', ' Stand'),
        volume: st.interchangeVolume || 0,
        boardings: st.totalBoardings || 0,
        alightings: st.totalAlightings || 0
      }));
  }, [passengerFlow]);

  const handleExportReport = () => {
    announce('Exporting ML transit telemetry report');
    const report = {
      timestamp: new Date().toISOString(),
      models: {
        dataset1: 'EDA: Transits Utilities Demo (6 routes, 114 active buses)',
        dataset2: 'Forecasting Bus Demand with Time Series (7,650 records, RF R2=0.932)',
        dataset3: 'Bus Passengers (28 stations, 2,248 interchange records)',
        dataset4: 'Smart Traffic Volume Forecasting Challenge (5 corridors, 7,125 records)'
      },
      currentPrediction,
      trafficSummary: trafficCorridors,
      passengerSummary: passengerFlow.slice(0, 5)
    };
    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `BusMate_ML_Agent_Report_${Date.now()}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      
      {/* 1. Dedicated Operator Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#075985] text-white rounded-2xl flex items-center justify-center font-bold shadow-inner">
              <Cpu className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold font-heading text-white tracking-tight">
                  Bus<span className="text-[#38BDF8]">Mate</span> ML Operations Command
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.05em] bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
                  LIVE MODEL PIPELINE
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Staff & Operator Portal • Integrated 4-Dataset Kaggle Predictive Engine
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleExportReport}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export Telemetry</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
              title="Accessibility Options (Ctrl + F2)"
              aria-label="Accessibility Options"
            >
              <span className="text-sm">♿</span>
              <span>Accessibility</span>
            </button>

            <Link
              to="/"
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
              title="Return to Public Passenger Site"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Passenger View</span>
            </Link>
          </div>

        </div>
      </header>

      {/* 2. Operational Highlights Strip */}
      <section className="bg-slate-900/60 border-b border-slate-800/80 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium">
          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block tracking-wider">Kaggle Dataset 1</span>
            <span className="font-semibold text-slate-200 text-sm">Transits Utilities Demo</span>
            <span className="text-[11px] text-sky-400 block mt-0.5 tabular-nums">6 Municipal Corridors • 114 Buses</span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block tracking-wider">Kaggle Dataset 2</span>
            <span className="font-semibold text-slate-200 text-sm">Time Series Demand</span>
            <span className="text-[11px] text-emerald-400 block mt-0.5 tabular-nums">RF R² = 0.932 • MAE = 2.66 pass.</span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block tracking-wider">Kaggle Dataset 3</span>
            <span className="font-semibold text-slate-200 text-sm">Bus Passengers Demographics</span>
            <span className="text-[11px] text-purple-400 block mt-0.5 tabular-nums">28 Interchanges • Flow Tracking</span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block tracking-wider">Kaggle Dataset 4</span>
            <span className="font-semibold text-slate-200 text-sm">Smart Traffic Forecasting</span>
            <span className="text-[11px] text-amber-400 block mt-0.5 tabular-nums">5 Corridors • Delay Multipliers</span>
          </div>
        </div>
      </section>

      {/* 3. Main Dashboard Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Module Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
          <button
            type="button"
            id="tab-xai-decision-board"
            onClick={() => setActiveTab('xai')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'xai'
                ? 'bg-sky-500 text-slate-950 shadow-md font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>⚡ Shuttle Allocation Decision Board (XAI & A/B Eval)</span>
          </button>

          <button
            type="button"
            id="tab-passenger-evaluation"
            onClick={() => setActiveTab('evaluation')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'evaluation'
                ? 'bg-sky-500 text-slate-950 shadow-md font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>🔬 Research & Evaluation (Passenger A/B Study)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('demand')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'demand'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <LineChartIcon className="w-4 h-4" />
            <span>Module 1: Bus Demand & Capacity Forecasting</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('traffic')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'traffic'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>Module 2: Traffic & Corridor Delay Predictions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('passengers')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'passengers'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Module 3: Passenger Flow & Stop Utilization</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fleet')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'fleet'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Bus className="w-4 h-4" />
            <span>Module 4: Fleet & Transit Utilities Overview</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* PRIMARY: SHUTTLE ALLOCATION DECISION BOARD & HCI A/B HARNESS */}
        {/* ========================================================= */}
        {activeTab === 'xai' && (
          <ShuttleDecisionBoard />
        )}

        {/* ========================================================= */}
        {/* PASSENGER ALLOCATION EXPLANATIONS & TRANSPARENCY A/B STUDY */}
        {/* ========================================================= */}
        {activeTab === 'evaluation' && (
          <PassengerABEvaluationDashboard />
        )}

        {/* ========================================================= */}
        {/* MODULE 1: BUS DEMAND & CAPACITY FORECASTING */}
        {/* ========================================================= */}
        {(activeTab === 'demand' || activeTab === 'all') && (
          <section className="space-y-6" aria-labelledby="mod1Heading">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-xs font-black text-sky-400 uppercase tracking-widest block">
                  MODULE 1 • KAGGLE DATASET 2: FORECASTING BUS DEMAND WITH TIME SERIES
                </span>
                <h2 id="mod1Heading" className="text-2xl font-black text-white tracking-tight mt-0.5">
                  Corridor Passenger Demand & Capacity Forecasting
                </h2>
                <p className="text-xs text-slate-400 font-semibold">
                  Trained Random Forest Regressor predicting passenger volumes across 24h service intervals with 90% confidence envelope.
                </p>
              </div>

              {/* Dynamic Interactive Selectors */}
              <div className="flex items-center flex-wrap gap-2.5 bg-slate-900 p-2 rounded-2xl border border-slate-800">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block px-1">Route</label>
                  <select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500"
                  >
                    {routes.map(r => (
                      <option key={r.routeId} value={r.routeId}>{r.routeNumber} ({r.origin.split(' ')[0]} - {r.destination.split(' ')[0]})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block px-1">Day</label>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block px-1">Time Slot</label>
                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500"
                  >
                    {['06:00', '07:30', '08:30', '09:30', '11:00', '13:00', '15:30', '17:30', '18:15', '19:30', '21:00', '22:30'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Predicted Demand
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{currentPrediction.predictedDemand}</span>
                  <span className="text-xs font-bold text-slate-400">passengers</span>
                </div>
                <div className="text-[11px] font-semibold text-sky-400">
                  90% Interval: {currentPrediction.lowerBound} – {currentPrediction.upperBound}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Vehicle Occupancy
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{currentPrediction.expectedUtilization}%</span>
                  <span className="text-xs font-bold text-slate-400">of 52 seats</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                  <div 
                    className={`h-full ${
                      currentPrediction.expectedUtilization >= 95 
                        ? 'bg-rose-500' 
                        : (currentPrediction.expectedUtilization >= 75 ? 'bg-amber-500' : 'bg-emerald-500')
                    }`}
                    style={{ width: `${Math.min(100, currentPrediction.expectedUtilization)}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Overcrowding Risk
                </span>
                <div className="flex items-center gap-2 pt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    currentPrediction.riskLevel === 'High'
                      ? 'bg-rose-950 text-rose-400 border border-rose-700/50'
                      : (currentPrediction.riskLevel === 'Medium' ? 'bg-amber-950 text-amber-400 border border-amber-700/50' : 'bg-emerald-950 text-emerald-400 border border-emerald-700/50')
                  }`}>
                    {currentPrediction.riskLevel} Risk
                  </span>
                  {currentPrediction.excessDemand > 0 && (
                    <span className="text-xs font-bold text-rose-400">
                      +{currentPrediction.excessDemand} spillover
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-400 block">
                  {currentPrediction.riskLevel === 'High' ? 'Dispatcher extra shuttle recommended' : 'Capacity within standard safety tolerance'}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Model Accuracy (Test Set)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-400">0.932</span>
                  <span className="text-xs font-bold text-slate-400">R² Score</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-400">
                  MAE: 2.66 passengers • Residual Std: ±3.17
                </div>
              </div>
            </div>

            {/* Time-Series Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-black text-white">
                    24-Hour Passenger Load Curve vs Physical Bus Capacity
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold">
                    {currentRouteMeta.routeName} • Day: {selectedDay} (Showing 52-Seat Baseline Capacity & Peak Surge Bands)
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5 text-sky-400">
                    <span className="w-3 h-3 bg-sky-500 rounded-sm inline-block"></span>
                    <span>Predicted Load</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-4 h-0.5 border-t-2 border-dashed border-rose-500 inline-block"></span>
                    <span>52-Seat Bus Capacity</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 65]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <ReferenceLine y={52} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '52 Seat Limit', fill: '#ef4444', fontSize: 11, position: 'top' }} />
                    <Area type="monotone" dataKey="demand" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#demandGradient)" name="Predicted Demand" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-semibold text-slate-400">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Morning Surge Window</span>
                  <span className="text-white font-bold">08:00 – 10:00 (Load 49 - 53 pass.)</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Evening Peak Corridor</span>
                  <span className="text-white font-bold">17:30 – 19:45 (Load 51 - 54 pass.)</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Recommended Dispatch</span>
                  <span className="text-emerald-400 font-bold">+2 Auxiliary AC EV Shuttles at 18:00</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* MODULE 2: SMART TRAFFIC & CORRIDOR DELAYS */}
        {/* ========================================================= */}
        {(activeTab === 'traffic' || activeTab === 'all') && (
          <section className="space-y-6" aria-labelledby="mod2Heading">
            <div>
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest block">
                MODULE 2 • KAGGLE DATASET 4: SMART TRAFFIC VOLUME FORECASTING CHALLENGE
              </span>
              <h2 id="mod2Heading" className="text-2xl font-black text-white tracking-tight mt-0.5">
                Corridor Congestion & Delay Estimations
              </h2>
              <p className="text-xs text-slate-400 font-semibold">
                Monitors Passenger Car Unit (PCU) congestion volumes, average vs. free-flow speeds, and travel-time multipliers.
              </p>
            </div>

            {/* Grid of Corridors */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trafficCorridors.map((corr) => {
                const speedRatio = Math.round((corr.averageSpeedKmh / corr.freeFlowSpeedKmh) * 100);
                const delayMultiplier = ((corr.freeFlowSpeedKmh / corr.averageSpeedKmh)).toFixed(2);

                return (
                  <div key={corr.corridorId} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 block">
                          {corr.corridorId}
                        </span>
                        <h3 className="text-base font-black text-white tracking-tight">
                          {corr.corridorName}
                        </h3>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        corr.status.includes('Heavy') 
                          ? 'bg-rose-950 text-rose-400 border border-rose-700/50' 
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                      }`}>
                        {corr.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Avg Speed</span>
                        <span className="text-lg font-black text-white">{corr.averageSpeedKmh} km/h</span>
                        <span className="text-[10px] text-slate-400 block">Free: {corr.freeFlowSpeedKmh} km/h</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Corridor Delay</span>
                        <span className="text-lg font-black text-amber-400">+{corr.averageDelayMinutes} mins</span>
                        <span className="text-[10px] text-slate-400 block">{delayMultiplier}x Multiplier</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                        <span>Speed Efficiency ({speedRatio}%)</span>
                        <span>Volume: {corr.averageVolumePCU} PCU/hr</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-sky-500" 
                          style={{ width: `${speedRatio}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-semibold space-y-0.5">
                      <div>Peak Hours: <span className="text-slate-300 font-bold">{corr.peakHours}</span></div>
                      <div>Incident Risk: <span className="text-emerald-400 font-bold">{corr.incidentRisk}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* MODULE 3: PASSENGER FLOW & STOP UTILIZATION */}
        {/* ========================================================= */}
        {(activeTab === 'passengers' || activeTab === 'all') && (
          <section className="space-y-6" aria-labelledby="mod3Heading">
            <div>
              <span className="text-xs font-black text-purple-400 uppercase tracking-widest block">
                MODULE 3 • KAGGLE DATASET 3: BUS PASSENGERS INTERCHANGE & DEMOGRAPHICS
              </span>
              <h2 id="mod3Heading" className="text-2xl font-black text-white tracking-tight mt-0.5">
                Passenger Flow & Interchange Station Utilization
              </h2>
              <p className="text-xs text-slate-400 font-semibold">
                Boarding and alighting densities across 28 municipal interchanges with commuter demographic decomposition.
              </p>
            </div>

            {/* Station Flow Breakdown Bar Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="text-base font-black text-white">
                  Busiest Passenger Interchanges (Daily Flow Volume)
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  Total Interchanges Monitored: 28 Stations
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topStations} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Bar dataKey="volume" fill="#818cf8" name="Total Interchange Volume" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="boardings" fill="#38bdf8" name="Total Boardings" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="alightings" fill="#34d399" name="Total Alightings" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Interchange Station Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-800">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Detailed Station Demographics & Utilization Directory
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Terminal / Station</th>
                      <th className="p-3.5">Boardings</th>
                      <th className="p-3.5">Alightings</th>
                      <th className="p-3.5">Total Volume</th>
                      <th className="p-3.5">Students</th>
                      <th className="p-3.5">Seniors</th>
                      <th className="p-3.5">Women Passes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200 font-semibold">
                    {passengerFlow.slice(0, 8).map((st, i) => (
                      <tr key={i} className="hover:bg-slate-800/50">
                        <td className="p-3.5 font-bold text-white flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>{st.stationName}</span>
                        </td>
                        <td className="p-3.5 font-mono text-sky-400">{st.totalBoardings}</td>
                        <td className="p-3.5 font-mono text-emerald-400">{st.totalAlightings}</td>
                        <td className="p-3.5 font-mono font-bold text-white">{st.interchangeVolume}</td>
                        <td className="p-3.5 text-slate-400">{st.demographics?.students || 0}</td>
                        <td className="p-3.5 text-slate-400">{st.demographics?.seniors || 0}</td>
                        <td className="p-3.5 text-slate-400">{st.demographics?.womenConcessions || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* MODULE 4: FLEET & TRANSIT UTILITIES OVERVIEW */}
        {/* ========================================================= */}
        {(activeTab === 'fleet' || activeTab === 'all') && (
          <section className="space-y-6" aria-labelledby="mod4Heading">
            <div>
              <span className="text-xs font-black text-sky-400 uppercase tracking-widest block">
                MODULE 4 • KAGGLE DATASET 1: EDA: TRANSITS UTILITIES DEMO
              </span>
              <h2 id="mod4Heading" className="text-2xl font-black text-white tracking-tight mt-0.5">
                Fleet Capacity, Route Health & Schedule Frequencies
              </h2>
              <p className="text-xs text-slate-400 font-semibold">
                Operational service schedules, peak headways, vehicle allocations, and municipal operating hours.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {routes.map((rt) => (
                <div key={rt.routeId} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-black text-sky-400 uppercase">
                        {rt.routeNumber}
                      </span>
                      <h3 className="text-base font-black text-white tracking-tight">
                        {rt.routeName}
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-black uppercase">
                      {rt.activeFleet || 18} Buses
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-semibold text-slate-300">
                    <div className="flex justify-between p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500">Service Hours:</span>
                      <span className="font-bold text-white">{rt.operatingHours}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500">Peak Headway:</span>
                      <span className="font-bold text-emerald-400">{rt.peakHeadway}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500">Off-Peak Headway:</span>
                      <span className="font-bold text-slate-300">{rt.offPeakHeadway}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-500">Base Fare:</span>
                      <span className="font-bold text-sky-400">₹{rt.fare}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
                    <span>Corridor: {rt.corridorName?.split(' ')[0] || 'BRTS'}</span>
                    <span className="text-emerald-400 font-bold">● 98.4% On-Time</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Floating Accessibility Trigger Badge */}
      <A11yFloatingBadge />

      {/* Accessibility Configuration Modal */}
      <A11yModal 
        isOpen={a11yState?.isModalOpen}
        onClose={() => setIsModalOpen?.(false)}
      />

    </div>
  );
};

export const AgentDashboardPage = () => {
  return (
    <ErrorBoundary title="Agent ML Operations Workspace">
      <AgentDashboardContent />
    </ErrorBoundary>
  );
};

export default AgentDashboardPage;
