import React, { useState } from 'react';
import { predictOvercrowdingProbability } from '../../services/overcrowdingService';
import { RiskBadge } from '../../components/common/RiskBadge';
import { SimulationNotice } from '../../components/common/SimulationNotice';
import { ShieldAlert, Activity, AlertTriangle, Layers, Clock, CloudRain } from 'lucide-react';

export const OvercrowdingRiskPage = () => {
  const [demandRatio, setDemandRatio] = useState(1.26);
  const [delayMinutes, setDelayMinutes] = useState(5);
  const [previousOccupancy, setPreviousOccupancy] = useState(90);
  const [campusEventActive, setCampusEventActive] = useState(true);
  const [dayOfWeek, setDayOfWeek] = useState('Friday');

  const riskResult = predictOvercrowdingProbability({
    demandRatio,
    delayMinutes: Number(delayMinutes),
    previousTripOccupancy: Number(previousOccupancy),
    campusEventActive,
    dayOfWeek
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-700" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overcrowding Risk Classifier</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 mt-1">
            Simulate multi-factor overcrowding probability predictions distinct from simple demand/capacity ratios.
          </p>
        </div>

        <SimulationNotice text={riskResult.simulationTag} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Input Variables */}
        <div className="lg:col-span-6 bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-3">
            Classifier Feature Factors
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Demand-to-Capacity Ratio: {Math.round(demandRatio * 100)}%
            </label>
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.05"
              value={demandRatio}
              onChange={(e) => setDemandRatio(parseFloat(e.target.value))}
              className="w-full accent-sky-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Previous Bus Occupancy Rate: {previousOccupancy}%
            </label>
            <input
              type="range"
              min="30"
              max="100"
              value={previousOccupancy}
              onChange={(e) => setPreviousOccupancy(e.target.value)}
              className="w-full accent-sky-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Route Delay History: {delayMinutes} minutes
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(e.target.value)}
              className="w-full accent-amber-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Day of Week</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
              >
                <option value="Friday">Friday (Peak)</option>
                <option value="Monday">Monday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={campusEventActive}
                  onChange={(e) => setCampusEventActive(e.target.checked)}
                  className="w-5 h-5 accent-sky-800 rounded"
                />
                <span className="text-xs font-bold text-slate-800">Campus Event Active</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Risk Model Outputs */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="bg-slate-900 text-white rounded-2xl p-8 border-2 border-slate-800 shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-teal-400 font-bold uppercase">Overcrowding Classifier Output</span>
              <RiskBadge riskLevel={riskResult.riskLevel} />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-400 font-bold uppercase">Overcrowding Probability Score</div>
              <div className="text-5xl font-black text-white">{riskResult.overcrowdingProbability}%</div>
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase">Component Influence Breakdown:</div>
              <ul className="space-y-2 text-xs">
                {riskResult.factors.map((f, i) => (
                  <li key={i} className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded border border-slate-700">
                    <span className="font-medium text-slate-200">{f.name}</span>
                    <span className="font-mono font-bold text-teal-300">{f.impact}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
