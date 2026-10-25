import React from 'react';
import { 
  Database, LineChart, ShieldAlert, FileCode2, Scale, 
  FlaskConical, Sliders, CheckCircle, MessageSquare
} from 'lucide-react';

export const PIPELINE_STAGES = [
  { id: 1, title: 'Historical Transport Data', desc: 'Routes, trip occupancy, time slots, weather & events.', icon: Database },
  { id: 2, title: 'Demand Prediction', desc: 'ML regression model predicts passenger volume.', icon: LineChart },
  { id: 3, title: 'Overcrowding Risk', desc: 'Multi-factor model computes overcrowding probability %.', icon: ShieldAlert },
  { id: 4, title: 'XAI / SHAP Explanation', desc: 'SHAP feature attribution isolates overcrowding drivers.', icon: FileCode2 },
  { id: 5, title: 'Fair Capacity Allocation', desc: 'Linear priority scoring under hard seat capacity limits.', icon: Scale },
  { id: 6, title: 'Counterfactual Experiments', desc: 'Single-factor perturbation tests outcome sensitivity.', icon: FlaskConical },
  { id: 7, title: 'Fairness–Efficiency Calibration', desc: 'Pareto knee-point search balances fairness & utilization.', icon: Sliders },
  { id: 8, title: 'Final Seat Allocation', desc: 'Confirms seat reservations and manages waitlists.', icon: CheckCircle },
  { id: 9, title: 'Passenger Explanation & Feedback', desc: 'Transparent decision reasons & alternative recommendations.', icon: MessageSquare }
];

export const PipelineStepper = ({ activeStage = null, onStageClick = null }) => {
  return (
    <section className="w-full bg-white border-2 border-slate-300 rounded-3xl p-6 shadow-sm space-y-6" aria-label="9-Stage System Architecture Pipeline">
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-[#172033]">SmartBus Main System Pipeline</h2>
          <p className="text-sm text-slate-700 font-extrabold mt-0.5">
            End-to-end integration of Machine Learning, Software Engineering, and HCI evaluation.
          </p>
        </div>
        <span className="text-xs font-black px-3.5 py-1.5 bg-sky-100 text-[#075985] rounded-full border border-sky-300">
          9-Stage Pipeline Architecture
        </span>
      </div>

      {/* Grid of Stages with Fitts's Law 44px+ Touch Targets and Keyboard Accessibility */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-3">
        {PIPELINE_STAGES.map((stage) => {
          const IconComponent = stage.icon;
          const isActive = activeStage === stage.id;

          return (
            <div
              key={stage.id}
              onClick={() => onStageClick && onStageClick(stage.id)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && onStageClick) {
                  e.preventDefault();
                  onStageClick(stage.id);
                }
              }}
              className={`min-h-[44px] flex flex-col items-center p-3 rounded-2xl border-2 text-center transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-sky-600 ${
                isActive
                  ? 'bg-[#075985] text-white border-[#0C4A6E] shadow-md ring-2 ring-sky-300'
                  : 'bg-slate-50 text-slate-900 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
              }`}
              role="button"
              tabIndex={0}
              aria-label={`Pipeline Stage ${stage.id} of 9: ${stage.title}. ${stage.desc}`}
              aria-pressed={isActive}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs mb-2 shrink-0 ${
                isActive ? 'bg-white text-[#075985]' : 'bg-slate-200 text-slate-900'
              }`} aria-hidden="true">
                {stage.id}
              </div>
              
              <IconComponent className={`w-5 h-5 mb-1.5 shrink-0 ${isActive ? 'text-white' : 'text-[#075985]'}`} aria-hidden="true" />
              <h3 className={`text-xs font-black leading-tight mb-1 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                {stage.title}
              </h3>
              <p className={`text-[11px] font-extrabold leading-tight line-clamp-2 ${isActive ? 'text-sky-100' : 'text-slate-600'}`}>
                {stage.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
