import React, { useState, useEffect } from 'react';
import { X, HelpCircle, FileText, Activity } from 'lucide-react';
import { getShapExplanations } from '../../services/xaiService';
import { SimulationNotice } from './SimulationNotice';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const ExplanationModal = ({ bus, isOpen, onClose }) => {
  const [mode, setMode] = useState('passenger');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !bus) return null;

  const shapData = getShapExplanations(bus.id);

  const chartData = shapData.features.map(f => ({
    name: f.featureName,
    value: f.shapValue,
    color: f.shapValue > 0 ? '#991B1B' : '#065F46'
  }));

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="modal-explanation-title"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full border-2 border-slate-400 shadow-2xl overflow-hidden my-8 space-y-0">
        
        {/* Header */}
        <div className="bg-[#075985] text-white px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white text-[#075985] rounded-xl flex items-center justify-center font-black">
              <HelpCircle className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-explanation-title" className="text-xl font-black text-white leading-tight">
                Why is Bus {bus.id} Crowded?
              </h2>
              <p className="text-xs font-bold text-sky-100 mt-0.5">
                Explainable AI (SHAP) feature attribution breakdown for departure at {bus.departureTime}.
              </p>
            </div>
          </div>

          {/* Fitts's Law: 44x44px minimum close touch target */}
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-sky-100 hover:text-white hover:bg-[#0C4A6E] rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-300 transition-colors"
            aria-label="Close explanation modal"
          >
            <X className="w-7 h-7" aria-hidden="true" />
          </button>
        </div>

        {/* View Toggle - Hick's Law: 2 Clean Digestible Views */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-300 flex justify-between items-center flex-wrap gap-3">
          <span className="text-xs font-black text-slate-800 uppercase">Select Explanation View:</span>
          
          <div className="flex rounded-xl border border-slate-300 bg-white p-1 gap-1">
            <button
              onClick={() => setMode('passenger')}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all focus:outline-none focus:ring-4 focus:ring-sky-600 ${
                mode === 'passenger' ? 'bg-[#075985] text-white shadow' : 'text-slate-800 hover:bg-slate-100'
              }`}
              aria-pressed={mode === 'passenger'}
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
              <span>Simple Passenger View</span>
            </button>
            
            <button
              onClick={() => setMode('technical')}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all focus:outline-none focus:ring-4 focus:ring-sky-600 ${
                mode === 'technical' ? 'bg-[#0F766E] text-white shadow' : 'text-slate-800 hover:bg-slate-100'
              }`}
              aria-pressed={mode === 'technical'}
            >
              <Activity className="w-4 h-4" aria-hidden="true" />
              <span>Technical Researcher View</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6">
          <SimulationNotice text={shapData.simulationNotice} />

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-300 text-center">
            <div>
              <div className="text-xs text-slate-600 font-extrabold">Base Probability</div>
              <div className="text-xl font-black text-slate-900">{shapData.baseValue}%</div>
            </div>
            <div>
              <div className="text-xs text-slate-600 font-extrabold">SHAP Impact Vector</div>
              <div className="text-xl font-black text-[#991B1B]">+47%</div>
            </div>
            <div>
              <div className="text-xs text-slate-600 font-extrabold">Predicted Overcrowding</div>
              <div className="text-xl font-black text-[#075985]">{bus.overcrowdingProbability}%</div>
            </div>
          </div>

          {/* Mode 1: Passenger View */}
          {mode === 'passenger' && (
            <div className="space-y-4">
              <h3 className="text-base font-black text-slate-900">Key Reasons for High Overcrowding Risk:</h3>
              <ul className="space-y-3">
                {shapData.passengerSimpleText.map((text, idx) => (
                  <li key={idx} className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-300 text-sm font-extrabold text-slate-900">
                    <span className="w-7 h-7 rounded-full bg-[#075985] text-white text-xs font-black flex items-center justify-center shrink-0" aria-hidden="true">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mode 2: Technical View */}
          {mode === 'technical' && (
            <div className="space-y-4">
              <h3 className="text-base font-black text-slate-900">SHAP Feature Attribution ($\phi_i$ Values):</h3>
              <p className="text-xs font-bold text-slate-700 leading-relaxed">
                Additive SHAP values quantify feature contributions pushing overcrowding risk above the baseline rate ($E[f(x)] = 35\%$).
              </p>

              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 30, left: 110, bottom: 5 }}>
                    <XAxis type="number" domain={[-0.15, 0.4]} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                    <Tooltip formatter={(value) => [`${value > 0 ? '+' : ''}${value}`, 'SHAP Value']} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-2">
                <div className="text-xs font-black text-slate-900">Feature Details Breakdown:</div>
                {shapData.features.map(f => (
                  <div key={f.id} className="text-xs font-mono bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-teal-400 font-bold">{f.featureName}:</span> {f.technicalDetails}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fitts's Law 44px+ Touch Target */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-300 flex justify-end">
          <button
            onClick={onClose}
            className="min-h-[44px] px-6 py-2.5 bg-[#075985] text-white font-black text-sm rounded-xl hover:bg-[#0C4A6E] focus:outline-none focus:ring-4 focus:ring-sky-300 transition-colors shadow"
          >
            Close Explanation
          </button>
        </div>

      </div>
    </div>
  );
};
