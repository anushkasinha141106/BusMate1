import React, { useState } from 'react';
import { simulatePolicyTradeoffs } from '../../services/calibrationService';
import { BarChart2, CheckCircle2, Shield, Info, Sparkles } from 'lucide-react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export const TradeoffPage = () => {
  const tradeoffData = simulatePolicyTradeoffs();
  const [selectedPoint, setSelectedPoint] = useState(tradeoffData.policies.find(p => p.id === 'smartbus_calibrated'));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-sky-800" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fairness–Efficiency Trade-off Lab</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 mt-1">
            Inspired by C11: Pareto-optimal knee point identification across candidate allocation policies.
          </p>
        </div>
      </div>

      {/* Trade-off Explanation Banner */}
      <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-5 text-sky-950 flex items-start gap-4 shadow-sm">
        <Info className="w-6 h-6 text-sky-800 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h2 className="text-base font-extrabold">Understanding the Fairness vs. Efficiency Trade-off:</h2>
          <p className="text-xs font-medium leading-relaxed">
            Increasing fairness reduces repeated denials and improves access for highly constrained passengers, but some policies can increase average waiting time or move more passengers away from their preferred trip.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Recharts Scatter Plot */}
        <div className="lg:col-span-8 bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <h3 className="text-lg font-black text-slate-900">Fairness vs. Efficiency Scatter Plot</h3>
            <span className="text-xs font-bold text-slate-500">Click any policy node to inspect</span>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
                <XAxis 
                  type="number" 
                  dataKey="efficiency" 
                  name="Efficiency Score" 
                  unit="%" 
                  domain={[50, 100]} 
                  label={{ value: 'Efficiency Score (%)', position: 'bottom', offset: 5, fontSize: 12, fontWeight: 'bold' }} 
                />
                <YAxis 
                  type="number" 
                  dataKey="fairness" 
                  name="Fairness Score" 
                  unit="%" 
                  domain={[30, 100]} 
                  label={{ value: 'Fairness Score (%)', angle: -90, position: 'insideLeft', fontSize: 12, fontWeight: 'bold' }} 
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter 
                  name="Policy Weight Candidates" 
                  data={tradeoffData.scatterPoints} 
                  onClick={(node) => {
                    const matched = tradeoffData.policies.find(p => p.name === node.name);
                    if (matched) setSelectedPoint(matched);
                  }}
                >
                  {tradeoffData.scatterPoints.map((entry, index) => {
                    let fillColor = '#075985'; // default blue
                    if (entry.id === 'smartbus_calibrated') fillColor = '#15803D'; // Green recommended
                    else if (entry.id === 'fcfs') fillColor = '#B91C1C'; // Red FCFS
                    else if (entry.id === 'fairest') fillColor = '#0F766E'; // Teal
                    return <Cell key={`cell-${index}`} fill={fillColor} r={entry.id === 'smartbus_calibrated' ? 10 : 7} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-bold pt-2 justify-center">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-700"></span> Recommended Calibrated Policy</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-700"></span> FCFS Baseline</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-teal-700"></span> Max Fairness</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-700"></span> Other Policy Candidates</span>
          </div>
        </div>

        {/* Right: Selected Policy Detail Inspector */}
        <div className="lg:col-span-4 space-y-6">
          {selectedPoint ? (
            <div className="bg-slate-900 text-white rounded-2xl p-6 border-2 border-slate-800 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-teal-400 font-bold uppercase">{selectedPoint.type} POLICY</span>
                {selectedPoint.id === 'smartbus_calibrated' && (
                  <span className="px-2.5 py-0.5 bg-emerald-700 text-white text-[11px] font-black rounded-full">
                    ★ Recommended
                  </span>
                )}
              </div>

              <h3 className="text-xl font-black text-white">{selectedPoint.name}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedPoint.description}</p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-800 p-3 rounded-lg text-center">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Efficiency</span>
                  <div className="text-2xl font-black text-sky-400">{selectedPoint.efficiency}%</div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg text-center">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Fairness</span>
                  <div className="text-2xl font-black text-emerald-400">{selectedPoint.fairness}%</div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Repeated Denial Reduction:</span>
                  <strong className="text-white">{selectedPoint.denialReduction}%</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Avg Passenger Wait:</span>
                  <strong className="text-white">{selectedPoint.avgWaitTime} mins</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Seat Occupancy Rate:</span>
                  <strong className="text-white">{selectedPoint.utilization}%</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 text-center text-slate-600 font-bold">
              Click a scatter plot point to view policy details.
            </div>
          )}

          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 text-emerald-950 space-y-2">
            <h4 className="text-sm font-extrabold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Selection Rule Justification</span>
            </h4>
            <p className="text-xs leading-relaxed font-medium">
              {tradeoffData.kneePointJustification}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
