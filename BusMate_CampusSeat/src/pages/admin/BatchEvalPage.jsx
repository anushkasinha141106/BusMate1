import React, { useState } from 'react';
import { runBatchCounterfactualEval } from '../../services/counterfactualService';
import { SimulationNotice } from '../../components/common/SimulationNotice';
import { Activity, Layers, Users, BarChart2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export const BatchEvalPage = () => {
  const [scenarioCount, setScenarioCount] = useState(2500);
  const [seed, setSeed] = useState(42);

  const evalResult = runBatchCounterfactualEval(scenarioCount, undefined, seed);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-sky-800" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Batch Counterfactual Fairness Evaluation</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 mt-1">
            Seeded, deterministic evaluation over {scenarioCount.toLocaleString()} synthetic passenger scenarios.
          </p>
        </div>

        <SimulationNotice text={evalResult.simulationTag} />
      </div>

      {/* Control Bar */}
      <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700">Synthetic Scenario Count:</label>
          <select
            value={scenarioCount}
            onChange={(e) => setScenarioCount(Number(e.target.value))}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
          >
            <option value={1000}>1,000 Scenarios</option>
            <option value={2500}>2,500 Scenarios</option>
            <option value={5000}>5,000 Scenarios</option>
          </select>
        </div>

        <div className="text-xs font-mono font-bold text-slate-600">
          PRNG Seed: {seed} (Deterministic Reproducible Output)
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-sky-900 text-white p-5 rounded-2xl shadow">
          <div className="text-xs text-sky-200 font-bold uppercase">Scenarios Evaluated</div>
          <div className="text-3xl font-black">{evalResult.scenariosTested.toLocaleString()}</div>
          <div className="text-[11px] text-sky-300">synthetic requests</div>
        </div>

        <div className="bg-emerald-800 text-white p-5 rounded-2xl shadow">
          <div className="text-xs text-emerald-200 font-bold uppercase">Denial Reduction</div>
          <div className="text-3xl font-black">{evalResult.repeatedDenialReduction}%</div>
          <div className="text-[11px] text-emerald-200">fewer repeated waitlists</div>
        </div>

        <div className="bg-amber-700 text-white p-5 rounded-2xl shadow">
          <div className="text-xs text-amber-200 font-bold uppercase">Outcome Sensitivity</div>
          <div className="text-3xl font-black">{evalResult.outcomeChangePercent}%</div>
          <div className="text-[11px] text-amber-200">single-attribute flips</div>
        </div>

        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow">
          <div className="text-xs text-slate-400 font-bold uppercase">Avg Wait Time</div>
          <div className="text-3xl font-black text-teal-400">{evalResult.avgWaitTimeMins} mins</div>
          <div className="text-[11px] text-slate-400">across waitlists</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Most Influential Allocation Factors Bar Chart */}
        <div className="lg:col-span-7 bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-sky-800" />
            <span>Most Influential Allocation Factors</span>
          </h2>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evalResult.mostInfluentialFactors} margin={{ top: 10, right: 30, left: 20, bottom: 25 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} interval={0} />
                <YAxis label={{ value: 'Sensitivity Impact Score', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="impactScore" fill="#075985" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation Rate by Need Group */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-700" />
            <span>Allocation Rate by Need Group</span>
          </h2>

          <div className="space-y-4 pt-2">
            {evalResult.needGroupAllocationRates.map((g, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>{g.group}</span>
                  <span className="font-extrabold" style={{ color: g.color }}>{g.rate}% allocated</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className="h-full rounded-full" style={{ width: `${g.rate}%`, backgroundColor: g.color }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium leading-relaxed">
            Demonstrates high prioritization for accessibility and urgent schedule constraints while retaining balanced access for general commuters.
          </div>
        </div>

      </div>

    </div>
  );
};
