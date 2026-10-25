import React, { useState } from 'react';
import { simulatePolicyTradeoffs, evaluateCustomPolicyWeights } from '../../services/calibrationService';
import { DEFAULT_WEIGHTS } from '../../services/allocationService';
import { Sliders, Save, RefreshCw, CheckCircle2, Scale, Activity } from 'lucide-react';

export const PolicyCalibrationPage = () => {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [savedPolicy, setSavedPolicy] = useState(() => {
    return localStorage.getItem('smartbus_saved_policy') || 'Baseline Default';
  });
  const [notification, setNotification] = useState('');

  const customEval = evaluateCustomPolicyWeights(weights);

  const handleSliderChange = (key, val) => {
    setWeights(prev => ({
      ...prev,
      [key]: parseFloat(val)
    }));
  };

  const handleSavePolicy = () => {
    localStorage.setItem('smartbus_custom_weights', JSON.stringify(weights));
    localStorage.setItem('smartbus_saved_policy', 'Custom Calibrated Policy');
    setSavedPolicy('Custom Calibrated Policy');
    setNotification('Custom policy weight configuration saved to LocalStorage successfully!');
    setTimeout(() => setNotification(''), 4000);
  };

  const handleResetBaseline = () => {
    setWeights(DEFAULT_WEIGHTS);
    setSavedPolicy('Baseline Default');
    setNotification('Reset to baseline default policy weights.');
    setTimeout(() => setNotification(''), 4000);
  };

  const handleSelectRecommended = () => {
    const recommended = { w1_constraint: 0.35, w2_disruption: 0.25, w3_denials: 0.25, w4_preference: 0.15 };
    setWeights(recommended);
    setSavedPolicy('SmartBus Recommended Calibrated Policy');
    localStorage.setItem('smartbus_custom_weights', JSON.stringify(recommended));
    setNotification('Selected SmartBus Recommended Calibrated Policy (Pareto Knee Point).');
    setTimeout(() => setNotification(''), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-6 h-6 text-sky-800" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Policy Weight Calibration</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 mt-1">
            Dynamic weight tuning and multi-measure policy simulation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectRecommended}
            className="px-4 py-2 bg-emerald-700 text-white font-extrabold text-xs rounded-xl hover:bg-emerald-800 shadow"
          >
            ★ Select Recommended Policy
          </button>
          <button
            onClick={handleResetBaseline}
            className="px-3.5 py-2 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-200"
          >
            Reset Baseline
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-100 text-emerald-900 border-2 border-emerald-300 rounded-xl text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Weight Tuning Sliders */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-3">
            Allocation Factor Weights Slider
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              $w_1$: Constraint Level ({weights.w1_constraint})
            </label>
            <input
              type="range"
              min="0.0"
              max="0.6"
              step="0.05"
              value={weights.w1_constraint}
              onChange={(e) => handleSliderChange('w1_constraint', e.target.value)}
              className="w-full accent-sky-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              $w_2$: Schedule Disruption ({weights.w2_disruption})
            </label>
            <input
              type="range"
              min="0.0"
              max="0.5"
              step="0.05"
              value={weights.w2_disruption}
              onChange={(e) => handleSliderChange('w2_disruption', e.target.value)}
              className="w-full accent-sky-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              $w_3$: Previous Denials ({weights.w3_denials})
            </label>
            <input
              type="range"
              min="0.0"
              max="0.5"
              step="0.05"
              value={weights.w3_denials}
              onChange={(e) => handleSliderChange('w3_denials', e.target.value)}
              className="w-full accent-sky-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              $w_4$: Preference Match ({weights.w4_preference})
            </label>
            <input
              type="range"
              min="0.0"
              max="0.5"
              step="0.05"
              value={weights.w4_preference}
              onChange={(e) => handleSliderChange('w4_preference', e.target.value)}
              className="w-full accent-sky-800"
            />
          </div>

          <button
            onClick={handleSavePolicy}
            className="w-full py-3 bg-sky-800 text-white font-extrabold text-sm rounded-xl hover:bg-sky-900 transition-colors shadow flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Policy Configuration</span>
          </button>
        </div>

        {/* Right: Simulation Evaluation Metrics */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-900 text-white p-5 rounded-2xl shadow space-y-1">
              <span className="text-xs text-emerald-300 font-bold uppercase">Fairness Index Score</span>
              <div className="text-4xl font-black">{customEval.fairnessScore} / 100</div>
              <p className="text-xs text-emerald-200">High constraint & denial mitigation score</p>
            </div>

            <div className="bg-sky-900 text-white p-5 rounded-2xl shadow space-y-1">
              <span className="text-xs text-sky-200 font-bold uppercase">Efficiency Index Score</span>
              <div className="text-4xl font-black">{customEval.efficiencyScore} / 100</div>
              <p className="text-xs text-sky-200">Seat utilization & schedule alignment</p>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-900">Multi-Measure Simulation Breakdown</h3>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-slate-500 font-bold">Seat Utilization Rate:</span>
                <div className="text-lg font-extrabold text-slate-900">{customEval.occupancyRate}%</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-slate-500 font-bold">Unfulfilled Priority Requests:</span>
                <div className="text-lg font-extrabold text-red-700">{customEval.unfulfilledPriority} requests</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-slate-500 font-bold">Total Requests Served:</span>
                <div className="text-lg font-extrabold text-slate-900">{customEval.allocatedCount} seats</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-slate-500 font-bold">Waitlisted Passengers:</span>
                <div className="text-lg font-extrabold text-amber-800">{customEval.waitlistedCount} passengers</div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
