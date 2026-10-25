import React, { useState } from 'react';
import { runSingleCounterfactual } from '../../services/counterfactualService';
import { FlaskConical, RefreshCw, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SimulationNotice } from '../../components/common/SimulationNotice';

export const CounterfactualLabPage = () => {
  const [targetPassengerId, setTargetPassengerId] = useState('Pass-014');
  const [modifiedField, setModifiedField] = useState('previousDenials');
  const [newValue, setNewValue] = useState(3);
  const [seed, setSeed] = useState(42);

  const experiment = runSingleCounterfactual(
    targetPassengerId,
    modifiedField,
    Number(newValue),
    undefined,
    seed
  );

  const handleReset = () => {
    setTargetPassengerId('Pass-014');
    setModifiedField('previousDenials');
    setNewValue(3);
    setSeed(42);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-sky-800" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Counterfactual Fairness Lab</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 mt-1">
            Inspired by C11: Perturb exactly ONE attribute while holding all other passenger scenarios strictly constant.
          </p>
        </div>

        <SimulationNotice text="Counterfactual single-attribute sensitivity experiment." />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Experiment Setup Panel */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <h2 className="text-lg font-black text-slate-900">Configure Perturbation</h2>
            <button
              onClick={handleReset}
              className="text-xs font-bold text-sky-800 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Scenario</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Passenger ID</label>
            <select
              value={targetPassengerId}
              onChange={(e) => setTargetPassengerId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
            >
              <option value="Pass-014">Pass-014 (Waitlisted Student)</option>
              <option value="Pass-022">Pass-022 (Waitlisted Commuter)</option>
              <option value="Pass-005">Pass-005 (Allocated Passenger)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Single Factor to Modify ($x_i \to x_i'$)</label>
            <select
              value={modifiedField}
              onChange={(e) => setModifiedField(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
            >
              <option value="previousDenials">Previous Denials (e.g. 0 → 3)</option>
              <option value="constraintLevel">Constraint Level (e.g. 1 → 3)</option>
              <option value="scheduleDisruption">Expected Schedule Disruption (1 → 5)</option>
              <option value="preferenceMatch">Trip Preference Match (2 → 5)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              New Value ($x_i'$): {newValue}
            </label>
            <input
              type="range"
              min="0"
              max="5"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full accent-sky-800"
            />
          </div>
        </div>

        {/* Right: Counterfactual Experiment Result Diff */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-slate-900 text-white rounded-2xl p-8 border-2 border-slate-800 shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-teal-400 font-bold uppercase">Counterfactual Outcome Comparison</span>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                experiment.outcomeChanged
                  ? 'bg-amber-400 text-slate-900 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {experiment.outcomeChanged ? 'Outcome Changed (Flipped!)' : 'No Outcome Change'}
              </span>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-400 block uppercase">Original Scenario</span>
                <div className="text-2xl font-black text-white">{experiment.originalOutcome}</div>
                <div className="text-xs text-slate-300 font-mono">
                  {experiment.modifiedField}: {experiment.originalValue}
                </div>
                <div className="text-xs text-slate-400">Score: {experiment.originalScore}/100</div>
              </div>

              <div className="bg-sky-950 p-4 rounded-xl border border-sky-600 space-y-2">
                <span className="text-xs font-bold text-sky-400 block uppercase">Counterfactual Scenario</span>
                <div className="text-2xl font-black text-emerald-400">{experiment.counterfactualOutcome}</div>
                <div className="text-xs text-sky-200 font-mono">
                  {experiment.modifiedField}: <span className="text-emerald-300 font-bold">{experiment.newValue}</span>
                </div>
                <div className="text-xs text-sky-300">Score: {experiment.counterfactualScore}/100</div>
              </div>
            </div>

            {/* Explanation box */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-2">
              <span className="text-xs font-bold text-teal-400 uppercase block">C11 Counterfactual Explanation:</span>
              <p className="text-sm font-medium text-slate-200 leading-relaxed">
                {experiment.explanation}
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
