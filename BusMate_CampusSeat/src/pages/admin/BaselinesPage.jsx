import React from 'react';
import { simulatePolicyTradeoffs } from '../../services/calibrationService';
import { Scale, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export const BaselinesPage = () => {
  const { policies } = simulatePolicyTradeoffs();

  const comparisonChartData = policies.map(p => ({
    name: p.name.split(' ')[0],
    fullName: p.name,
    Efficiency: p.efficiency,
    Fairness: p.fairness,
    DenialReduction: p.denialReduction
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-sky-800" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Policy Baselines Comparison</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 mt-1">
            Evaluating FCFS, Random, Preference-Only, Fixed Manual Weights, and SmartBus Calibrated Policy.
          </p>
        </div>
      </div>

      {/* Side-by-Side Recharts Comparative Bar Chart */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900">Multi-Policy Metric Comparison</h2>
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonChartData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Efficiency" fill="#075985" name="Efficiency Score %" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Fairness" fill="#0F766E" name="Fairness Score %" radius={[4, 4, 0, 0]} />
              <Bar dataKey="DenialReduction" fill="#15803D" name="Repeated Denial Reduction %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-xs font-bold uppercase">
              <th className="p-4">Policy Strategy</th>
              <th className="p-4">Efficiency</th>
              <th className="p-4">Fairness</th>
              <th className="p-4">Denial Reduction</th>
              <th className="p-4">Avg Wait Time</th>
              <th className="p-4">Unfulfilled Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-800">
            {policies.map(p => (
              <tr key={p.id} className={p.id === 'smartbus_calibrated' ? 'bg-emerald-50/80 font-bold' : 'hover:bg-slate-50'}>
                <td className="p-4">
                  <div className="font-extrabold text-slate-900">{p.name}</div>
                  <div className="text-[11px] text-slate-500 font-normal">{p.description}</div>
                </td>
                <td className="p-4 font-bold text-sky-900">{p.efficiency}%</td>
                <td className="p-4 font-bold text-teal-800">{p.fairness}%</td>
                <td className="p-4 font-bold text-emerald-800">{p.denialReduction}%</td>
                <td className="p-4 font-mono font-bold text-slate-900">{p.avgWaitTime} mins</td>
                <td className="p-4 font-bold text-red-700">{p.unfulfilledPriority} requests</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
