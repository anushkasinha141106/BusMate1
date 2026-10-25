import React, { useState } from 'react';
import { generateSyntheticRequests, runFairAllocation, DEFAULT_WEIGHTS } from '../../services/allocationService';
import { Scale, Users, ShieldCheck, Sliders, CheckCircle2, AlertCircle } from 'lucide-react';

export const AllocationManagerPage = () => {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [requestCount, setRequestCount] = useState(73);
  const [busCapacity, setBusCapacity] = useState(50);
  const [seed, setSeed] = useState(42);

  const requests = generateSyntheticRequests(requestCount, seed);
  const allocationResult = runFairAllocation(requests, busCapacity, weights);

  const handleWeightChange = (key, val) => {
    setWeights(prev => ({
      ...prev,
      [key]: parseFloat(val)
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-sky-800" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fair Capacity Allocation Manager</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 mt-1">
            Priority-weighted allocation under hard vehicle capacity limits ($N \le {busCapacity}$).
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-300 px-3.5 py-2 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Zero Demographic Bias Enforced</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Score Weight Configuration Sliders */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-800" />
            <span>Allocation Score Factors ($w_i$)</span>
          </h2>

          <div className="bg-sky-50 border border-sky-200 p-3 rounded-lg text-xs text-sky-900 leading-relaxed">
            Note: Weights are not arbitrarily chosen. They are evaluated and calibrated through counterfactual sensitivity experiments.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              $w_1$: Constraint Level Weight ({weights.w1_constraint})
            </label>
            <input
              type="range"
              min="0.0"
              max="0.6"
              step="0.05"
              value={weights.w1_constraint}
              onChange={(e) => handleWeightChange('w1_constraint', e.target.value)}
              className="w-full accent-sky-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              $w_2$: Schedule Disruption Weight ({weights.w2_disruption})
            </label>
            <input
              type="range"
              min="0.0"
              max="0.5"
              step="0.05"
              value={weights.w2_disruption}
              onChange={(e) => handleWeightChange('w2_disruption', e.target.value)}
              className="w-full accent-sky-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              $w_3$: Previous Denials Weight ({weights.w3_denials})
            </label>
            <input
              type="range"
              min="0.0"
              max="0.5"
              step="0.05"
              value={weights.w3_denials}
              onChange={(e) => handleWeightChange('w3_denials', e.target.value)}
              className="w-full accent-sky-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              $w_4$: Time Preference Match Weight ({weights.w4_preference})
            </label>
            <input
              type="range"
              min="0.0"
              max="0.4"
              step="0.05"
              value={weights.w4_preference}
              onChange={(e) => handleWeightChange('w4_preference', e.target.value)}
              className="w-full accent-sky-800"
            />
          </div>

          <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vehicle Seats</label>
              <input
                type="number"
                value={busCapacity}
                onChange={(e) => setBusCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Requests</label>
              <input
                type="number"
                value={requestCount}
                onChange={(e) => setRequestCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Right: Allocation Results List */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-sky-900 text-white p-4 rounded-xl shadow">
              <div className="text-xs text-sky-200 font-bold uppercase">Total Requests</div>
              <div className="text-3xl font-black">{allocationResult.totalRequests}</div>
            </div>
            <div className="bg-emerald-800 text-white p-4 rounded-xl shadow">
              <div className="text-xs text-emerald-200 font-bold uppercase">Allocated Seats</div>
              <div className="text-3xl font-black">{allocationResult.allocatedCount}</div>
            </div>
            <div className="bg-amber-700 text-white p-4 rounded-xl shadow">
              <div className="text-xs text-amber-200 font-bold uppercase">Waitlisted</div>
              <div className="text-3xl font-black">{allocationResult.waitlistedCount}</div>
            </div>
          </div>

          {/* Passenger Table */}
          <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-100 p-4 border-b border-slate-300 font-bold text-xs text-slate-700 flex justify-between">
              <span>Passenger Allocation Results ({allocationResult.results.length} Scenarios)</span>
              <span>Bus Capacity Limit: {busCapacity} Seats</span>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-slate-200">
              {allocationResult.results.slice(0, 15).map((p, idx) => (
                <div key={p.passengerId} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-500 w-16">{p.passengerId}</span>
                    <div>
                      <span className="font-extrabold text-slate-900 block">
                        Constraint Lvl {p.constraintLevel} • Denials: {p.previousDenials}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Score: {p.allocationScore}/100 {p.isAccessibilityRequired ? '• Accessibility Override' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded font-bold ${
                      p.status === 'Allocated' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {p.status} {p.assignedSeat ? `(${p.assignedSeat})` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
