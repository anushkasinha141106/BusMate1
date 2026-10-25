import React, { useState } from 'react';
import { getShapExplanations } from '../../services/xaiService';
import { SimulationNotice } from '../../components/common/SimulationNotice';
import { FileCode2, Activity, FileText, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export const XAIExplanationPage = () => {
  const [selectedBusId, setSelectedBusId] = useState('SB-04');
  const [viewMode, setViewMode] = useState('technical');

  const shapData = getShapExplanations(selectedBusId);

  const chartData = shapData.features.map(f => ({
    name: f.featureName,
    value: f.shapValue,
    color: f.shapValue > 0 ? '#B91C1C' : '#15803D'
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCode2 className="w-6 h-6 text-sky-800" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">XAI & SHAP Feature Attribution Lab</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 mt-1">
            Inspired by C14: Quantifying feature contributions ($\phi_i$) pushing trip overcrowding probability above baseline.
          </p>
        </div>

        <SimulationNotice text={shapData.simulationNotice} />
      </div>

      {/* Control Bar */}
      <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700">Select Trip:</label>
          <select
            value={selectedBusId}
            onChange={(e) => setSelectedBusId(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
          >
            <option value="SB-04">Bus SB-04 (05:00 PM Peak)</option>
            <option value="SB-01">Bus SB-01 (08:15 AM Peak)</option>
            <option value="SB-06">Bus SB-06 (05:45 PM Peak)</option>
          </select>
        </div>

        <div className="flex rounded-lg border border-slate-300 bg-white p-1">
          <button
            onClick={() => setViewMode('passenger')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === 'passenger' ? 'bg-sky-800 text-white shadow' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Passenger View</span>
          </button>
          <button
            onClick={() => setViewMode('technical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === 'technical' ? 'bg-teal-700 text-white shadow' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Technical Researcher View</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-8 shadow-sm space-y-6">
        
        {viewMode === 'passenger' ? (
          <div className="space-y-4 max-w-3xl">
            <h2 className="text-xl font-black text-slate-900">Passenger-Facing Plain Language Explanation</h2>
            <p className="text-sm font-bold text-slate-600">
              Why Bus {selectedBusId} is predicted to experience high overcrowding risk:
            </p>
            <ul className="space-y-3">
              {shapData.passengerSimpleText.map((text, idx) => (
                <li key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-semibold text-slate-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-sky-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900">SHAP Feature Attribution Bar Chart</h2>
                <p className="text-xs text-slate-600 font-bold">
                  Base Probability $E[f(x)] = {shapData.baseValue}\% \implies$ Model Prediction $f(x) = {shapData.finalPredictionPercent}\%$.
                </p>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                  <XAxis type="number" domain={[-0.15, 0.4]} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                  <Tooltip formatter={(val) => [`${val > 0 ? '+' : ''}${val}`, 'SHAP Contribution']} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              {shapData.features.map(f => (
                <div key={f.id} className="bg-slate-900 text-white p-3.5 rounded-xl text-xs font-mono border border-slate-800 space-y-1">
                  <div className="text-teal-400 font-bold">{f.featureName}</div>
                  <div className="text-slate-300">{f.technicalDetails}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
