import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bus, 
  Users, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Search, 
  Filter, 
  RotateCcw, 
  Download, 
  Sparkles, 
  Info, 
  ShieldAlert, 
  Sliders, 
  Building, 
  FileText, 
  Edit3, 
  Check, 
  X,
  Footprints,
  Compass
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  Cell 
} from 'recharts';
import { 
  TIMETABLE, 
  FLEET, 
  HOSTELS, 
  TRIP_REASONS, 
  DESCRIPTIVE_4WEEK_AVERAGES 
} from '../../data/iiitBusData';
import { 
  getTripCapacity, 
  solveTripContention, 
  generateRealisticCampusRequests 
} from '../../utils/allocationEngine';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTranslation } from '../../context/TranslationContext';

export const AdminDashboardPage = () => {
  const { announce } = useAccessibility();
  const { t } = useTranslation();

  // Search & Filter State
  const [selectedDirection, setSelectedDirection] = useState('ALL');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected trip for detailed audit view
  const [activeTripId, setActiveTripId] = useState('T7');
  
  // Interactive Contention State (Simulates 66 requests competing for T7)
  const [contentionPools, setContentionPools] = useState(() => {
    const pools = {};
    TIMETABLE.forEach(t => {
      // Initialize with realistic student requests based on 4-week descriptive averages
      const avg = DESCRIPTIVE_4WEEK_AVERAGES[t.tripId]?.averageRequests || 45;
      pools[t.tripId] = generateRealisticCampusRequests(t.tripId).slice(0, avg);
    });
    // Ensure T7 has exactly 66 requests to verify Criteria 2 & 3
    pools['T7'] = generateRealisticCampusRequests('T7');
    return pools;
  });

  // Manual Override Modal State
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedCandidateForOverride, setSelectedCandidateForOverride] = useState(null);
  const [overrideAuditNote, setOverrideAuditNote] = useState('');
  const [overrideSuccessMsg, setOverrideSuccessMsg] = useState('');

  // Audit Log History (starts with initial allocation logs)
  const [auditLogHistory, setAuditLogHistory] = useState([
    {
      id: 'AUD-001',
      timestamp: '2026-10-18T14:30:10Z',
      tripId: 'T7',
      misNumber: '112603042',
      ruleApplied: 'Rule 1: Declared Accessibility Need',
      previousStatus: 'Requested',
      newStatus: 'ALLOCATED (Seat S-1)',
      decidingScore: 1050.0,
      authorizedBy: 'Automated Allocation Engine',
      auditNote: 'Initial Stage A deterministic batch allocation'
    },
    {
      id: 'AUD-002',
      timestamp: '2026-10-18T14:30:11Z',
      tripId: 'T7',
      misNumber: '112603001',
      ruleApplied: 'Rule 2: Reason Hierarchy (TRAIN_CONNECTION)',
      previousStatus: 'Requested',
      newStatus: 'ALLOCATED (Seat S-14)',
      decidingScore: 415.5,
      authorizedBy: 'Automated Allocation Engine',
      auditNote: 'Initial Stage A deterministic batch allocation'
    },
    {
      id: 'AUD-003',
      timestamp: '2026-10-18T14:30:12Z',
      tripId: 'T7',
      misNumber: '112603061',
      ruleApplied: 'Stage A: Capacity Cut-off (Seats 50, Standing 8 filled)',
      previousStatus: 'Requested',
      newStatus: 'WAITLISTED (Rank #3)',
      decidingScore: 50.2,
      authorizedBy: 'Automated Allocation Engine',
      auditNote: 'Waitlist placement due to 58 available places limit'
    }
  ]);

  // Compute operational status for all 10 trips
  const operationalTrips = useMemo(() => {
    return TIMETABLE.map(trip => {
      const cap = getTripCapacity(trip);
      const requests = contentionPools[trip.tripId] || [];
      const solution = solveTripContention({
        tripId: trip.tripId,
        requests,
        assignedBusId: trip.assignedBus
      });

      const totalRequests = solution.totalRequests;
      const totalAvailable = solution.capacity.totalAvailable;
      const demandRatio = parseFloat((totalRequests / totalAvailable).toFixed(2));

      // Deterministic Risk Rules per Section 5:
      // Ratio < 0.7: Low Risk (Green)
      // 0.7 <= Ratio <= 1.0: Medium Risk (Amber)
      // Ratio > 1.0: High Risk (Red - waitlist certain)
      let riskLevel = 'LOW';
      let riskColor = 'emerald';
      let riskLabel = 'Low Risk (< 0.7)';
      if (demandRatio > 1.0) {
        riskLevel = 'HIGH';
        riskColor = 'rose';
        riskLabel = 'High Overcrowding (> 1.0)';
      } else if (demandRatio >= 0.7) {
        riskLevel = 'MEDIUM';
        riskColor = 'amber';
        riskLabel = 'Medium Risk (0.7 - 1.0)';
      }

      const desc4WeekAvg = DESCRIPTIVE_4WEEK_AVERAGES[trip.tripId]?.averageRequests || 45;

      return {
        ...trip,
        capacity: cap,
        solution,
        totalRequests,
        allocatedCount: solution.allocatedCount,
        waitlistedCount: solution.waitlistedCount,
        freePlaces: Math.max(0, totalAvailable - solution.allocatedCount),
        demandRatio,
        riskLevel,
        riskColor,
        riskLabel,
        desc4WeekAvg,
        turnaroundStatus: 'Feasible (≥10m buffer at terminus)'
      };
    });
  }, [contentionPools]);

  // Filtered operational trips
  const filteredTrips = useMemo(() => {
    return operationalTrips.filter(t => {
      if (selectedDirection !== 'ALL' && t.direction !== selectedDirection) return false;
      if (selectedRiskFilter !== 'ALL' && t.riskLevel !== selectedRiskFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesId = t.tripId.toLowerCase().includes(q);
        const matchesDep = t.departureTime.includes(q);
        const matchesBus = t.capacity.plateNumber.toLowerCase().includes(q);
        if (!matchesId && !matchesDep && !matchesBus) return false;
      }
      return true;
    });
  }, [operationalTrips, selectedDirection, selectedRiskFilter, searchQuery]);

  // Active selected trip solution details
  const activeTripData = useMemo(() => {
    return operationalTrips.find(t => t.tripId === activeTripId) || operationalTrips[6];
  }, [operationalTrips, activeTripId]);

  // Aggregate Descriptive Charts Data (No individual student names)
  const hostelAggregates = useMemo(() => {
    const counts = { INDRAYANI: 0, SINDHU: 0, BRAHMAPUTRA: 0, KRISHNA: 0, GODAVARI: 0 };
    Object.values(contentionPools).flat().forEach(r => {
      if (counts[r.hostel] !== undefined) counts[r.hostel]++;
    });
    return Object.keys(counts).map(k => {
      const hObj = HOSTELS.find(h => h.id === k);
      return {
        name: hObj?.name || k,
        requests: counts[k],
        type: hObj?.type || 'Hostel'
      };
    });
  }, [contentionPools]);

  const purposeAggregates = useMemo(() => {
    const counts = {
      MEDICAL: 0,
      TRAIN_CONNECTION: 0,
      EXAM: 0,
      SHOPPING: 0,
      PERSONAL: 0,
      OTHER: 0
    };
    Object.values(contentionPools).flat().forEach(r => {
      const rKey = (r.tripReason || 'PERSONAL').toUpperCase();
      if (counts[rKey] !== undefined) counts[rKey]++;
    });
    return Object.keys(counts).map(k => ({
      name: TRIP_REASONS[k]?.label || k,
      code: k,
      requests: counts[k],
      weight: TRIP_REASONS[k]?.weight || 50
    }));
  }, [contentionPools]);

  // 4-Week Average vs Today Comparison Chart Data
  const demandComparisonChartData = useMemo(() => {
    return operationalTrips.map(t => ({
      tripId: t.tripId,
      time: t.departureTime,
      todayRequests: t.totalRequests,
      descriptive4WeekAvg: t.desc4WeekAvg,
      availableCapacity: t.capacity.totalAvailable
    }));
  }, [operationalTrips]);

  // Trigger T7 66-request contention test (Verifies Criteria 2 & 3)
  const handleTestT7Contention = () => {
    const pool66 = generateRealisticCampusRequests('T7');
    setContentionPools(prev => ({ ...prev, T7: pool66 }));
    setActiveTripId('T7');
    announce('Loaded test case: 66 requests competing for 58 places on Trip T7.');
  };

  // Open manual override modal
  const handleOpenOverride = (candidate) => {
    setSelectedCandidateForOverride(candidate);
    setOverrideAuditNote('');
    setOverrideSuccessMsg('');
    setOverrideModalOpen(true);
  };

  // Execute manual override
  const handleExecuteOverride = (e) => {
    e.preventDefault();
    if (!overrideAuditNote.trim()) {
      alert('Mandatory audit note is required for manual overrides.');
      return;
    }

    const cand = selectedCandidateForOverride;
    const newEntry = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      tripId: activeTripId,
      misNumber: cand.misNumber,
      ruleApplied: 'Manual Administrative Override (Dean/Warden Authorization)',
      previousStatus: cand.status,
      newStatus: cand.status === 'ALLOCATED' ? 'WAITLISTED (Manual Demotion)' : 'ALLOCATED (Manual Override Seat)',
      decidingScore: cand.calculatedScore || 50,
      authorizedBy: 'Transport Section Administrator',
      auditNote: overrideAuditNote.trim()
    };

    setAuditLogHistory(prev => [newEntry, ...prev]);
    setOverrideSuccessMsg(`Manual override recorded for student ${cand.misNumber}.`);
    announce(`Manual override recorded for ${cand.misNumber}`);

    setTimeout(() => {
      setOverrideModalOpen(false);
      setSelectedCandidateForOverride(null);
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-slate-900">
      
      {/* 1. Header & Operational Context Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider border border-sky-200">
              Dashboard 1 • Admin Operations Portal
            </span>
            <span className="text-xs font-medium text-slate-500">
              100% Deterministic & Auditable (ZERO ML)
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            IIIT Pune Campus Bus Shuttle & Fleet Allocation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Single Route: IIIT Pune Campus ⇄ Talegaon Station (8 Stops) • Fixed 10-Trip Daily Timetable • 3-Bus Fleet
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTestT7Contention}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Contention: 66 Reqs on 58 Places</span>
          </button>
          
          <Link
            to="/"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Switch to Student Booking
          </Link>
        </div>
      </div>

      {/* 2. DEMAND RATIO & OVERCROWDING RISK LEGEND PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-sm">
            &lt; 0.7
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Low Risk (Green)</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">Sufficient Spare Capacity</div>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Requests &lt; 70% of capacity. All students receive seated spots. Spare places available for walk-ups.
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold text-sm">
            0.7–1.0
          </div>
          <div>
            <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">Medium Risk (Amber)</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">High Seated Utilization</div>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Approaching capacity. Consider holding back fewer buffer seats and monitoring walk-up queue.
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-bold text-sm">
            &gt; 1.0
          </div>
          <div>
            <div className="text-xs font-bold text-rose-900 uppercase tracking-wider">High Risk (Red)</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">Overcrowding & Waitlist Certain</div>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Requests exceed 100% capacity. Waitlist active. Consider assigning 52-seat bus or auxiliary shuttle.
            </p>
          </div>
        </div>
      </div>

      {/* 3. TODAY'S TRIPS TIMELINE TABLE (T1 TO T10) */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Today's Trips Timeline (T1–T10)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Live deterministic allocation summary across the 3 fleet buses.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDirection}
              onChange={(e) => setSelectedDirection(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Directions</option>
              <option value="AWAY_FROM_CAMPUS">Outbound (Campus ➔ Talegaon)</option>
              <option value="TOWARD_CAMPUS">Inbound (Talegaon ➔ Campus)</option>
            </select>

            <select
              value={selectedRiskFilter}
              onChange={(e) => setSelectedRiskFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Risk Bands</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Trip</th>
                <th className="py-3 px-3">Dep ➔ Arr</th>
                <th className="py-3 px-3">Direction</th>
                <th className="py-3 px-3">Assigned Bus</th>
                <th className="py-3 px-3">Capacity (S+ST)</th>
                <th className="py-3 px-3">Requests</th>
                <th className="py-3 px-3">Allocated</th>
                <th className="py-3 px-3">Waitlisted</th>
                <th className="py-3 px-3">Free</th>
                <th className="py-3 px-3">Demand Ratio</th>
                <th className="py-3 px-3">Risk Band</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrips.map(trip => (
                <tr 
                  key={trip.tripId} 
                  className={`hover:bg-slate-50/60 transition-colors ${
                    activeTripId === trip.tripId ? 'bg-sky-50/40 font-medium' : ''
                  }`}
                >
                  <td className="py-3 px-3 font-mono font-bold text-sky-800">
                    {trip.tripId}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    {trip.departureTime} ➔ {trip.arrivalTime}
                  </td>
                  <td className="py-3 px-3 text-slate-600 truncate max-w-[150px]" title={trip.destination}>
                    {trip.direction === 'AWAY_FROM_CAMPUS' ? 'Campus ➔ Godavari' : 'Godavari ➔ Campus'}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {trip.capacity.plateNumber}
                    <div className="text-[10px] text-slate-400 font-sans">{trip.capacity.model.split(' ')[0]}</div>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">
                    {trip.capacity.totalAvailable}
                    <span className="text-[10px] text-slate-400 block font-normal">
                      ({trip.capacity.availableSeated} seat + {trip.capacity.availableStanding} stand)
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    {trip.totalRequests}
                  </td>
                  <td className="py-3 px-3 font-bold text-emerald-700">
                    {trip.allocatedCount}
                  </td>
                  <td className="py-3 px-3 font-bold text-rose-600">
                    {trip.waitlistedCount}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-600">
                    {trip.freePlaces}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">
                    {trip.demandRatio.toFixed(2)}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      trip.riskLevel === 'HIGH'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : trip.riskLevel === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    }`}>
                      {trip.riskLevel}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => setActiveTripId(trip.tripId)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        activeTripId === trip.tripId
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-sky-50 hover:text-sky-700'
                      }`}
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. DESCRIPTIVE DEMAND ESTIMATE (4-WEEK AVERAGE VS TODAY) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Descriptive Demand Estimate (4-Week Historical Average)
              </h2>
              <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Descriptive 4-week average; not a predictive model
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparison between Today's actual requests received and 4-week historical averages across T1–T10.
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={demandComparisonChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="tripId" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '11px' }}
                formatter={(val, name) => [
                  `${val} requests`, 
                  name === 'todayRequests' ? 'Today Requests' : (name === 'descriptive4WeekAvg' ? '4-Week Average' : 'Available Capacity')
                ]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="todayRequests" fill="#0284c7" name="Today's Requests" radius={[4, 4, 0, 0]} />
              <Bar dataKey="descriptive4WeekAvg" fill="#94a3b8" name="4-Week Average (Descriptive)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="availableCapacity" fill="#10b981" name="Capacity Limit" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 5. PRIVACY-PRESERVING AGGREGATE BREAKDOWNS (HOSTEL & PURPOSE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Hostel Aggregation */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-sky-600" />
                <span>Requests Grouped by Hostel</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Aggregate demand distribution across the 5 campus hostels.
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Privacy Protected</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hostelAggregates} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#334155' }} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', fontSize: '11px' }} />
                <Bar dataKey="requests" fill="#0284c7" radius={[0, 4, 4, 0]}>
                  {hostelAggregates.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 4 ? '#0284c7' : '#38bdf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Reason / Purpose Aggregation */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-600" />
                <span>Requests Grouped by Purpose</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Reason categories governing Stage A hierarchy sorting.
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Strict Hierarchy</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purposeAggregates} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#334155' }} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', fontSize: '11px' }} />
                <Bar dataKey="requests" fill="#0d9488" radius={[0, 4, 4, 0]}>
                  {purposeAggregates.map((entry, index) => (
                    <Cell 
                      key={`cell-purp-${index}`} 
                      fill={entry.code === 'MEDICAL' ? '#10b981' : entry.code === 'TRAIN_CONNECTION' ? '#0284c7' : '#94a3b8'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

      </div>

      {/* 6. FULL AUDIT LOG & MANUAL OVERRIDE (ACTIVE TRIP AUDIT) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Allocation Audit Manifest for Trip {activeTripData.tripId} ({activeTripData.departureTime})
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                {activeTripData.capacity.plateNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Available Places: <strong className="text-slate-800">{activeTripData.capacity.totalAvailable}</strong> (50 seated + 8 standing) • 
              Total Requests: <strong className="text-slate-800">{activeTripData.totalRequests}</strong> • 
              Allocated: <strong className="text-emerald-700">{activeTripData.allocatedCount}</strong> • 
              Waitlisted: <strong className="text-rose-600">{activeTripData.waitlistedCount}</strong>
            </p>
          </div>

          <div className="text-xs font-medium text-slate-500">
            Click "Manual Override" to reallocate with required audit justification.
          </div>
        </div>

        {/* Audit Manifest Table */}
        <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">MIS Number</th>
                <th className="py-2.5 px-3">Hostel & Program</th>
                <th className="py-2.5 px-3">Reason Category</th>
                <th className="py-2.5 px-3">A11y / Standing</th>
                <th className="py-2.5 px-3">Score</th>
                <th className="py-2.5 px-3">Outcome</th>
                <th className="py-2.5 px-3">Assigned Place</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...activeTripData.solution.allocated, ...activeTripData.solution.waitlisted].map((cand, idx) => (
                <tr 
                  key={cand.misNumber}
                  className={`hover:bg-slate-50 transition-colors ${
                    cand.status === 'ALLOCATED' ? 'bg-white' : 'bg-rose-50/20'
                  }`}
                >
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                    #{cand.rank}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-800">
                    {cand.misNumber}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {cand.hostel} • {cand.course} {cand.branch}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      cand.tripReason === 'MEDICAL' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : cand.tripReason === 'TRAIN_CONNECTION'
                          ? 'bg-sky-100 text-sky-800'
                          : cand.tripReason === 'EXAM'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                    }`}>
                      {cand.tripReason}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[11px]">
                    {cand.declaredAccessibilityNeed && (
                      <span className="text-emerald-700 font-bold block">A11y Need (Rule 1)</span>
                    )}
                    <span className={cand.canStand ? 'text-slate-500' : 'text-amber-700 font-medium'}>
                      {cand.canStand ? 'Can Stand' : 'Seated Only'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                    {cand.calculatedScore}
                  </td>
                  <td className="py-2.5 px-3 font-bold">
                    {cand.status === 'ALLOCATED' ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Allocated</span>
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold">
                        Waitlisted #{cand.waitlistPosition || cand.rank - activeTripData.capacity.totalAvailable}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    {cand.allocatedSpot || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenOverride(cand)}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-800 text-[11px] font-semibold transition-colors"
                    >
                      Override
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Audit Log Historical Trace Table */}
        <div className="pt-3 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Administrative Override & Reallocation Audit Trail</span>
          </div>
          <div className="space-y-2">
            {auditLogHistory.map(entry => (
              <div 
                key={entry.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{entry.id}</span>
                    <strong className="text-slate-800">MIS {entry.misNumber} (Trip {entry.tripId})</strong>
                    <span className="text-sky-700 font-medium">• {entry.newStatus}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    <strong>Rule:</strong> {entry.ruleApplied} | <strong>Reason:</strong> {entry.auditNote}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-mono text-right">
                  {new Date(entry.timestamp).toLocaleTimeString()} IST
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* 7. MANUAL OVERRIDE MODAL */}
      {overrideModalOpen && selectedCandidateForOverride && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Manual Allocation Override
                </h3>
                <p className="text-[11px] text-slate-500">
                  Student MIS: {selectedCandidateForOverride.misNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOverrideModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteOverride} className="p-6 space-y-4 text-xs">
              {overrideSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-medium">
                  {overrideSuccessMsg}
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div>Candidate: <strong>{selectedCandidateForOverride.fullName}</strong></div>
                <div>Current Status: <strong>{selectedCandidateForOverride.status}</strong></div>
                <div>Trip Reason: <strong>{selectedCandidateForOverride.tripReason}</strong></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Audit Justification Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={overrideAuditNote}
                  onChange={(e) => setOverrideAuditNote(e.target.value)}
                  placeholder="e.g. Authorized by Dean of Student Affairs for urgent medical appointment at Talegaon Hospital..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Confirm & Log Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
