import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Filter, 
  Users, 
  BarChart3, 
  Sparkles, 
  ArrowUpRight, 
  Eye, 
  EyeOff, 
  Bus, 
  HelpCircle,
  Clock,
  ExternalLink,
  Sliders,
  CalendarClock,
  ArrowRightLeft,
  Check,
  RotateCcw,
  Cpu,
  Layers,
  Sparkles as SparklesIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { fetchEvaluationsWithMetrics } from '../../services/userEvaluationService';
import { 
  generateExtremeContentionRequests, 
  resolveSeatContention, 
  calculateDynamicContentionScore 
} from '../../utils/allocationEngine';

export const PassengerABEvaluationDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState('ALL'); // 'ALL' | 'B' | 'A'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'CONFIRMED' | 'REALLOCATED'
  const [flexFilter, setFlexFilter] = useState('ALL'); // 'ALL' | 'FLEXIBLE' | 'INFLEXIBLE'
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());

  // Contention Solver & LLM Reasoner Workbench State
  const [solverResult, setSolverResult] = useState(null);
  const [isSolving, setIsSolving] = useState(false);
  const [selectedCommuter, setSelectedCommuter] = useState(null);
  const [commuterExplanation, setCommuterExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationModel, setExplanationModel] = useState('');

  const handleSolveContention = async () => {
    setIsSolving(true);
    const requests = generateExtremeContentionRequests();
    try {
      const res = await fetch('/ml/allocation/contention-solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_bus: {
            bus_id: 'sb-05-1730',
            time: '17:30',
            name: 'Route 5 Primary Express (17:30)',
            available_seats: 2,
            capacity: 32
          },
          candidate_buses: [
            { bus_id: 'sb-05-1720', time: '17:20', name: 'Route 5 Preceding Shuttle (17:20)', available_seats: 4 },
            { bus_id: 'sb-05-1738', time: '17:38', name: 'Route 5 Next Shuttle (17:38)', available_seats: 6 },
            { bus_id: 'sb-05-1740', time: '17:40', name: 'Route 5 Adjacent Shuttle (17:40)', available_seats: 8 },
            { bus_id: 'sb-05-1745', time: '17:45', name: 'Route 5 Relief Shuttle (17:45)', available_seats: 16 }
          ],
          requests: requests.map(r => ({
            id: r.id,
            passenger_name: r.passengerName,
            age: r.age,
            trip_purpose: r.tripPurpose,
            is_divyang: r.isDivyang,
            is_flexible: r.isFlexible,
            flexible_window_minutes: r.flexibleWindowMinutes,
            flexibility_direction: 'ANY',
            request_timestamp: r.requestTimestamp
          }))
        })
      });

      if (res.ok) {
        const solved = await res.json();
        setSolverResult(solved);
        const list = solved.all_allocations || solved.allAllocations || [];
        if (list.length) {
          handleExplainCommuter(list[0]);
        }
      } else {
        throw new Error('Fallback to JS solver');
      }
    } catch (e) {
      const localSolved = resolveSeatContention({
        originalBus: { time: '17:30', name: 'Route 5 Primary Express (17:30)', availableSeats: 2, capacity: 32 },
        requests
      });
      setSolverResult(localSolved);
      const localList = localSolved.all_allocations || localSolved.allAllocations || [];
      if (localList.length) {
        handleExplainCommuter(localList[0]);
      }
    } finally {
      setIsSolving(false);
    }
  };

  const handleExplainCommuter = async (commuter) => {
    setSelectedCommuter(commuter);
    setIsExplaining(true);
    setCommuterExplanation('');
    try {
      const payload = {
        passenger_name: commuter.passengerName || commuter.passenger_name,
        age: commuter.age,
        trip_purpose: commuter.tripPurpose || commuter.trip_purpose,
        is_flexible: commuter.is_flexible !== undefined ? commuter.is_flexible : commuter.isFlexible,
        flexible_window_minutes: commuter.flexible_window_minutes || commuter.flexibleWindowMinutes || 0,
        original_bus_time: '17:30',
        assigned_bus_time: commuter.assigned_bus_time || commuter.assignedBusTime || '17:30',
        status: commuter.status,
        allocated_seat: commuter.allocated_seat || commuter.seat,
        waitlist_position: commuter.waitlist_position || commuter.waitlistPosition,
        contention_context: {
          total_competing_requests: 20,
          available_seats_on_original: 2,
          higher_priority_passengers_served: 2,
          reasons_ahead: ['1 Emergency Medical Visit (Sunita Patil, 68)', '1 Mobility Impaired Senior (Abdul Shaikh, 72)']
        }
      };

      const res = await fetch('/ml/explain/allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setCommuterExplanation(data.explanation);
        setExplanationModel(data.model || data.engine || 'Gemini 1.5 Flash');
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      const name = commuter.passengerName || commuter.passenger_name;
      const status = commuter.status;
      if (status === 'SEATED_ORIGINAL') {
        setCommuterExplanation(`Your requested 17:30 departure is confirmed (${commuter.seat}) under Priority Access for your urgent transit needs.`);
      } else if (status === 'REALLOCATED_ADJACENT') {
        setCommuterExplanation(`Due to high demand (only 2 seats for 20 passengers), priority was given to medical and senior commuters. Because you permitted a ±30 min window, you have been confirmed on the ${commuter.assignedBusTime || '17:45'} bus without delay.`);
      } else {
        setCommuterExplanation(`Only 2 seats were available on the 17:30 shuttle for 20 competing requests, prioritized for medical/senior commuters. Because your schedule was strictly fixed, you are on standby waitlist #${commuter.waitlistPosition || 1}. You can enable schedule flexibility to be confirmed immediately.`);
      }
      setExplanationModel('Deterministic Transit Logic (Edge Fallback)');
    } finally {
      setIsExplaining(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchEvaluationsWithMetrics();
      setData(res);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Error fetching evaluation metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const metrics = data?.metrics || {
    total_evaluations: 0,
    group_A_count: 0,
    group_B_count: 0,
    group_A_fairness_rate_pct: 0,
    group_B_fairness_rate_pct: 0,
    fairness_lift_pct: 0,
    group_A_acceptance_rate_pct: 0,
    group_B_acceptance_rate_pct: 0,
    acceptance_lift_pct: 0,
    group_A_avg_understanding: 0,
    group_B_avg_understanding: 0,
    group_A_avg_fairness: 0,
    group_B_avg_fairness: 0,
    // Flexibility
    flexibility_adoption_rate_pct: 0,
    flexible_count: 0,
    avg_window_minutes: 30,
    window_distribution: { pct15: 0, pct30: 0, pct60: 0, count15: 0, count30: 0, count60: 0 },
    flexible_reallocation_acceptance_rate_pct: 0,
    flexible_reallocated_count: 0,
    flexible_accepted_count: 0
  };

  const evaluations = data?.evaluations || [];

  const filteredEvaluations = evaluations.filter((e) => {
    if (groupFilter !== 'ALL' && e.group !== groupFilter) return false;
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
    if (flexFilter === 'FLEXIBLE' && !e.isFlexible) return false;
    if (flexFilter === 'INFLEXIBLE' && e.isFlexible) return false;
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Scale className="w-5 h-5" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
              HCI Research & User Study Telemetry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white">
            Passenger Allocation Explanations & Schedule Flexibility Study
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            Evaluating the real-world impact of causal plain-language explanations and opt-in schedule flexibility windows on passenger trust, perceived fairness, and surge reallocation acceptance.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            id="refresh-eval-metrics-btn"
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>

          <span className="text-[11px] font-mono text-slate-400 self-center">
            Updated: {lastRefreshed}
          </span>
        </div>
      </div>

      {/* 2. Key A/B Comparative Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Perceived Fairness Rate */}
        <div 
          id="metric-fairness-rate-card"
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md space-y-4 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Perceived Fairness Rate</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              +{metrics.fairness_lift_pct}% Lift
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Group B (With Explanations) */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Group B (With Explanations):</span>
                </span>
                <span className="font-mono font-black text-emerald-400 text-lg tabular-nums">
                  {metrics.group_B_fairness_rate_pct}%
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, metrics.group_B_fairness_rate_pct)}%` }}
                ></div>
              </div>
            </div>

            {/* Group A (Without Explanations / Control) */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>Group A (Control / Opaque):</span>
                </span>
                <span className="font-mono font-bold text-slate-300 text-sm tabular-nums">
                  {metrics.group_A_fairness_rate_pct}%
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-slate-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, metrics.group_A_fairness_rate_pct)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-1 leading-relaxed border-t border-slate-800/80">
            Commuters receiving plain-language medical/senior priority rationales perceive allocations as fair at a significantly higher rate.
          </p>
        </div>

        {/* Card 2: Passenger Acceptance Rate (Standby / Next Shuttle) */}
        <div 
          id="metric-acceptance-rate-card"
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md space-y-4 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Bus className="w-4 h-4 text-sky-400" />
              <span>Overall Acceptance Rate</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
              +{metrics.acceptance_lift_pct}% Lift
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Group B Acceptance */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>Group B (With Explanations):</span>
                </span>
                <span className="font-mono font-black text-sky-400 text-lg tabular-nums">
                  {metrics.group_B_acceptance_rate_pct}%
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-sky-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, metrics.group_B_acceptance_rate_pct)}%` }}
                ></div>
              </div>
            </div>

            {/* Group A Acceptance */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>Group A (Control / Opaque):</span>
                </span>
                <span className="font-mono font-bold text-slate-300 text-sm tabular-nums">
                  {metrics.group_A_acceptance_rate_pct}%
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-slate-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, metrics.group_A_acceptance_rate_pct)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-1 leading-relaxed border-t border-slate-800/80">
            % of commuters who accepted being moved to the adjacent bus without abandoning transit or filing complaints.
          </p>
        </div>

        {/* Card 3: Understanding & Study Demographics */}
        <div 
          id="metric-demographics-card"
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Comprehension & Sample</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              N = {metrics.total_evaluations}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Understanding (B)</span>
              <span className="text-xl font-black text-emerald-400 font-mono tabular-nums">
                {metrics.group_B_avg_understanding} / 3.0
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Very Clear</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Understanding (A)</span>
              <span className="text-xl font-bold text-amber-400 font-mono tabular-nums">
                {metrics.group_A_avg_understanding} / 3.0
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Somewhat Clear</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Group B (Treatment): <strong>{metrics.group_B_count}</strong></span>
            <span>Group A (Control): <strong>{metrics.group_A_count}</strong></span>
          </div>
        </div>

      </div>

      {/* 3. SCHEDULE FLEXIBILITY & RESCHEDULING ANALYTICS (HCI Decision Science) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Clock className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Commuter Schedule Flexibility Preference & Rescheduling Analytics
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Measuring opt-in adoption of flexible travel windows (±15m, ±30m, ±60m) and passenger satisfaction when shifted to adjacent shuttles.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800 self-start sm:self-auto">
            Decision Science Telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Flexibility Metric 1: Flexibility Adoption Rate */}
          <div 
            id="metric-flexibility-adoption-card"
            className="p-5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Flexibility Adoption Rate</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300">
                {metrics.flexible_count} / {metrics.total_evaluations} Commuters
              </span>
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl font-black font-heading text-sky-400 font-mono tabular-nums">
                {metrics.flexibility_adoption_rate_pct}%
              </span>
              <span className="text-xs text-slate-400">opted into flexible time</span>
            </div>

            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="bg-sky-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, metrics.flexibility_adoption_rate_pct)}%` }}
              ></div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              Percentage of commuters in the booking flow who agreed: <em>"Yes, I have a flexible travel schedule"</em> to assist medical/elderly travelers.
            </p>
          </div>

          {/* Flexibility Metric 2: Average Acceptable Window & Distribution */}
          <div 
            id="metric-window-distribution-card"
            className="p-5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-purple-400" />
                <span>Average Acceptable Window</span>
              </span>
              <span className="text-xs font-mono font-black text-purple-300">
                Avg: ±{metrics.avg_window_minutes} mins
              </span>
            </div>

            {/* Distribution of Windows: 15m vs 30m vs 60m */}
            <div className="space-y-2 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 font-semibold">±10–15 mins window</span>
                  <span className="text-purple-300 font-mono font-bold">{metrics.window_distribution?.pct15 || 0}% ({metrics.window_distribution?.count15 || 0})</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-400 h-full rounded-full" style={{ width: `${metrics.window_distribution?.pct15 || 0}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 font-semibold">±30 mins window (Default)</span>
                  <span className="text-sky-300 font-mono font-bold">{metrics.window_distribution?.pct30 || 0}% ({metrics.window_distribution?.count30 || 0})</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-sky-400 h-full rounded-full" style={{ width: `${metrics.window_distribution?.pct30 || 0}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 font-semibold">±45–60 mins window</span>
                  <span className="text-emerald-300 font-mono font-bold">{metrics.window_distribution?.pct60 || 0}% ({metrics.window_distribution?.count60 || 0})</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${metrics.window_distribution?.pct60 || 0}%` }}></div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-800/60">
              Distribution of commuter tolerance. ±30 mins represents the majority mode across urban transit corridors.
            </p>
          </div>

          {/* Flexibility Metric 3: Reallocation Acceptance Rate */}
          <div 
            id="metric-reallocation-acceptance-card"
            className="p-5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                <span>Reallocation Acceptance Rate</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                {metrics.flexible_accepted_count} / {metrics.flexible_reallocated_count || 1} Flexible
              </span>
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl font-black font-heading text-emerald-400 font-mono tabular-nums">
                {metrics.flexible_reallocation_acceptance_rate_pct}%
              </span>
              <span className="text-xs text-slate-400">accepted reassigned bus</span>
            </div>

            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, metrics.flexible_reallocation_acceptance_rate_pct)}%` }}
              ></div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              % of flexible commuters who accepted their assigned adjacent shuttle (e.g. 17:40 bus) rather than reverting to waitlist.
            </p>
          </div>

        </div>
      </div>

      {/* ========================================================
          3.5 LIVE SEAT CONTENTION RESOLUTION & REASONING LLM INSPECTOR
          Interactive Dispatcher Test Bench: 20 Requests for 2 Seats
          ======================================================== */}
      <div 
        id="contention-solver-workbench"
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6"
      >
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Cpu className="w-5 h-5 text-sky-400" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Live Contention Resolution Engine & Reasoning LLM Inspector
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic Constrained Priority Queue ($N_{'{'}requests{'}'} &gt; N_{'{'}available{'}'}$) with multi-bus reassignment and contextually grounded LLM explanations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-run-contention-solve"
              onClick={handleSolveContention}
              disabled={isSolving}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Cpu className={`w-4 h-4 ${isSolving ? 'animate-spin' : ''}`} />
              <span>{isSolving ? 'Solving Pipeline...' : 'Run Extreme Contention Solver (20 Reqs / 2 Seats)'}</span>
            </button>
          </div>
        </div>

        {/* Priority Score Formulation Guide */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">1. Purpose (W_purpose)</span>
            <div className="text-slate-300">Medical: <strong className="text-emerald-400">+50</strong></div>
            <div className="text-slate-400">Exam: +35 | Work: +20 | Gen: +5</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">2. Vulnerability</span>
            <div className="text-slate-300">Divyang: <strong className="text-emerald-400">+50</strong> | Senior 60+: <strong className="text-emerald-400">+40</strong></div>
            <div className="text-slate-400">Child &le;10: +25 | Adult: +10</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">3. Flexibility Buffer</span>
            <div className="text-slate-300">isFlexible = true: <strong className="text-amber-400">-15 pts</strong></div>
            <div className="text-slate-400">Favors adjacent bus reassignment</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">4. Fairness Tie-Breaker</span>
            <div className="text-slate-300">FCFS: <strong className="text-sky-400">0.001 &times; &Delta;t_wait</strong></div>
            <div className="text-slate-400">Deterministic millisecond order</div>
          </div>
        </div>

        {/* Results View */}
        {solverResult ? (
          <div className="space-y-6">
            
            {/* KPI Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">Total Competing Requests</span>
                <span className="text-2xl font-black text-white font-mono">{solverResult.summary?.totalRequests || 20}</span>
                <span className="text-[10px] text-rose-400 block mt-0.5">High Peak Contention</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">Original 17:30 Seats Filled</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">2 / 2</span>
                <span className="text-[10px] text-emerald-300 block mt-0.5">Medical & Mobility Impaired</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">Flexible Reallocated Seats</span>
                <span className="text-2xl font-black text-sky-400 font-mono">{solverResult.reallocatedAdjacent?.length || 8}</span>
                <span className="text-[10px] text-sky-300 block mt-0.5">Confirmed on 17:38/17:40/17:45</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">Inflexible Waitlisted</span>
                <span className="text-2xl font-black text-amber-400 font-mono">{solverResult.waitlisted?.length || 10}</span>
                <span className="text-[10px] text-amber-300 block mt-0.5">Standby Waitlist #1 to #10</span>
              </div>
            </div>

            {/* Split View: 20 Candidate Queue Table + Interactive LLM Reasoning Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Candidate Queue Table (7 cols) */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    <span>Constrained Priority Queue (Sorted by Dynamic Score)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Click a row to generate LLM rationale</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-slate-900/80 text-slate-400 text-[10px] sticky top-0">
                      <tr>
                        <th className="p-2.5">Rank</th>
                        <th className="p-2.5">Passenger</th>
                        <th className="p-2.5">Purpose & Vuln</th>
                        <th className="p-2.5">Flex</th>
                        <th className="p-2.5 text-right">Score</th>
                        <th className="p-2.5 text-right">Allocation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {(solverResult.all_allocations || solverResult.allAllocations || []).map((item, idx) => {
                        const isSelected = (selectedCommuter?.passengerName || selectedCommuter?.passenger_name) === (item.passengerName || item.passenger_name);
                        const isTop2 = idx < 2;
                        const isFlex = item.is_flexible !== undefined ? item.is_flexible : item.isFlexible;
                        const seatName = item.seat || item.allocated_seat || `Seat ${idx + 1}`;
                        const busTime = item.assigned_bus_time || item.assignedBusTime || '17:45';
                        const waitPos = item.waitlist_position || item.waitlistPosition || (idx - 1);

                        return (
                          <tr 
                            key={idx}
                            onClick={() => handleExplainCommuter(item)}
                            className={`cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-sky-950/60 border-l-4 border-sky-400' 
                                : isTop2 
                                  ? 'bg-emerald-950/10 hover:bg-emerald-950/30' 
                                  : isFlex 
                                    ? 'bg-sky-950/10 hover:bg-sky-950/30' 
                                    : 'bg-amber-950/10 hover:bg-amber-950/30'
                            }`}
                          >
                            <td className="p-2.5 font-bold text-slate-400">#{idx + 1}</td>
                            <td className="p-2.5 font-sans font-bold text-white">
                              {item.passengerName || item.passenger_name}
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {item.age}y{(item.isDivyang || item.is_divyang) ? ' • Divyang' : ''}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-300">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                                {item.tripPurpose || item.trip_purpose}
                              </span>
                            </td>
                            <td className="p-2.5">
                              {isFlex ? (
                                <span className="text-emerald-400 font-bold">±{item.flexibleWindowMinutes || item.flexible_window_minutes || 30}m</span>
                              ) : (
                                <span className="text-slate-500">Fixed</span>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-bold text-amber-300 tabular-nums">
                              {item.score} pts
                            </td>
                            <td className="p-2.5 text-right">
                              {(item.status === 'SEATED_ORIGINAL' || item.status === 'CONFIRMED_ORIGINAL' || isTop2) ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                                  17:30 ({seatName})
                                </span>
                              ) : isFlex ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300">
                                  {busTime} ({seatName})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                                  Waitlist #{waitPos}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reasoning LLM Explanation Inspector (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl border border-sky-500/40 bg-gradient-to-br from-sky-950/40 via-slate-900 to-slate-950 shadow-lg space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-sky-600 text-white">
                        <SparklesIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                          Reasoning LLM Explanation
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          {explanationModel || 'Gemini 1.5 Flash Transit Reasoner'}
                        </span>
                      </div>
                    </div>

                    {isExplaining && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-sky-400">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Generating...
                      </span>
                    )}
                  </div>

                  {selectedCommuter ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-slate-400 text-[10px] block">SELECTED PASSENGER</span>
                          <span className="font-bold text-white">
                            {selectedCommuter.passengerName || selectedCommuter.passenger_name} ({selectedCommuter.age} yrs)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 text-[10px] block">OUTCOME</span>
                          <span className={`font-mono font-bold text-xs ${
                            selectedCommuter.status === 'SEATED_ORIGINAL' ? 'text-emerald-400' :
                            selectedCommuter.status === 'REALLOCATED_ADJACENT' ? 'text-sky-400' : 'text-amber-400'
                          }`}>
                            {selectedCommuter.status}
                          </span>
                        </div>
                      </div>

                      {/* Generated Explanation */}
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-normal">
                        {isExplaining ? (
                          <div className="py-4 text-center text-slate-400 space-y-2">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-400" />
                            <p className="text-xs font-mono">Synthesizing personalized operational rationale...</p>
                          </div>
                        ) : (
                          <p id="inspector-llm-explanation" className="leading-relaxed">
                            {commuterExplanation || 'Select a commuter from the table to see their personalized explanation.'}
                          </p>
                        )}
                      </div>

                      <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/60 text-[10px] text-slate-400 font-mono space-y-1">
                        <div>System Instruction: Empathetic, transparent PMPML transit dispatcher.</div>
                        <div>Rules: Grounded in trip purpose & age tier, cite exact contention ({solverResult.summary?.totalRequests} reqs / {solverResult.summary?.seatsAvailableOnOriginal} seats), guarantee zero delay risk on adjacent bus.</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-8">
                      Click any row in the Constrained Priority Queue to inspect the LLM rationale.
                    </p>
                  )}
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-3">
            <Cpu className="w-8 h-8 text-sky-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Contention Resolution Engine Ready</h4>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Simulate 20 simultaneous commuter requests competing for only 2 seats on the 17:30 Swargate-Pune Station route to evaluate the deterministic priority queue and reasoning LLM explanations.
            </p>
            <button
              type="button"
              onClick={handleSolveContention}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
            >
              Simulate 20 Requests vs 2 Seats
            </button>
          </div>
        )}
      </div>

      {/* 4. Live Evaluation Telemetry Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span>Live Telemetry Log (`smartbus_user_evaluations`)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time audit stream of commuter evaluations, schedule flexibility choices, and reallocation decisions.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Condition Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 px-2 font-bold text-[10px]">GROUP:</span>
              {['ALL', 'B', 'A'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroupFilter(g)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    groupFilter === g ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {g === 'ALL' ? 'All' : `Group ${g}`}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 px-2 font-bold text-[10px]">STATUS:</span>
              {['ALL', 'CONFIRMED', 'REALLOCATED'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    statusFilter === s ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s.slice(0, 7)}
                </button>
              ))}
            </div>

            {/* Flexibility Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 px-2 font-bold text-[10px]">FLEX:</span>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'FLEXIBLE', label: 'Flexible' },
                { id: 'INFLEXIBLE', label: 'Fixed' }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFlexFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    flexFilter === f.id ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] font-bold border-b border-slate-800">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">A/B Condition</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Travel Purpose</th>
                <th className="py-3 px-4">Schedule Flexibility</th>
                <th className="py-3 px-4">Time Shift</th>
                <th className="py-3 px-4 text-center">Understanding</th>
                <th className="py-3 px-4 text-center">Perceived Fairness</th>
                <th className="py-3 px-4 text-right">Acceptance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-medium">
              {filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-500">
                    No evaluations match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEvaluations.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-200">
                      {item.userId}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] font-mono border ${
                        item.group === 'B' 
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        Group {item.group} ({item.group === 'B' ? 'Explainable' : 'Control'})
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        item.status === 'CONFIRMED' 
                          ? 'bg-emerald-500/20 text-emerald-300' 
                          : item.status === 'WAITLISTED'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-sky-500/20 text-sky-300'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-semibold">
                      {item.tripPurpose}
                    </td>
                    
                    {/* Schedule Flexibility Column */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.isFlexible ? (
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-sky-950 text-sky-300 border border-sky-800 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-sky-400" />
                          <span>Flexible ±{item.windowMinutes || 30}m</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-950 text-slate-400 border border-slate-800">
                          Fixed Schedule
                        </span>
                      )}
                    </td>

                    {/* Time Shift Column */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-300">
                      {item.wasReallocated && item.assignedBusTime !== item.originalBusTime ? (
                        <span className="text-amber-300 flex items-center gap-1">
                          <span>{item.originalBusTime || '17:30'}</span>
                          <span className="text-slate-500">➔</span>
                          <span className="font-bold text-emerald-300">{item.assignedBusTime || '17:40'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">{item.originalBusTime || '17:30'} Exact</span>
                      )}
                    </td>

                    {/* Understanding */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        item.understandingScore === 3 
                          ? 'bg-emerald-950 text-emerald-300' 
                          : item.understandingScore === 2 
                            ? 'bg-amber-950 text-amber-300' 
                            : 'bg-rose-950 text-rose-300'
                      }`}>
                        {item.understandingText || (item.understandingScore === 3 ? '👍 Very Clear' : 'Somewhat')}
                      </span>
                    </td>

                    {/* Perceived Fairness */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                        item.isFair 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {item.isFair ? '⚖️ Fair' : '⚠️ Unfair'} ({item.fairnessScore}★)
                      </span>
                    </td>

                    {/* Acceptance */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-[11px]">
                      {item.status === 'REALLOCATED' || item.wasReallocated ? (
                        item.acceptedReallocation ? (
                          <span className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Accepted</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold flex items-center justify-end gap-1">
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reverted Waitlist</span>
                          </span>
                        )
                      ) : (
                        <span className="text-slate-500">N/A (Original)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
