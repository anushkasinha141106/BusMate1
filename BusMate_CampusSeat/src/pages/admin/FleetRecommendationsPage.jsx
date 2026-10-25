import React, { useState } from 'react';
import { getFleetRecommendations, updateRecommendationStatus, resetRecommendations } from '../../services/fleetService';
import { Bus, CheckCircle2, XCircle, RefreshCw, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';

export const FleetRecommendationsPage = () => {
  const [recommendations, setRecommendations] = useState(getFleetRecommendations());

  const handleStatusChange = (id, newStatus) => {
    const updated = updateRecommendationStatus(id, newStatus);
    setRecommendations(updated);
  };

  const handleReset = () => {
    const reset = resetRecommendations();
    setRecommendations(reset);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-white border-2 border-slate-300 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#075985] text-white rounded-xl flex items-center justify-center font-black">
              <Bus className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-black text-[#172033] tracking-tight">Intelligent Bus-Allocation Recommendations</h1>
          </div>
          <p className="text-sm font-extrabold text-slate-700 mt-1">
            Automated operational actions derived from demand predictions and overcrowding risk classifiers.
          </p>
        </div>

        {/* Fitts's Law 44px Touch Target Button */}
        <button
          onClick={handleReset}
          className="min-h-[44px] px-4 py-2.5 bg-slate-100 text-slate-900 font-extrabold text-xs rounded-xl hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-sky-600 flex items-center gap-2 border border-slate-300"
        >
          <RefreshCw className="w-4 h-4 text-[#075985]" aria-hidden="true" />
          <span>Reset Recommendations State</span>
        </button>
      </div>

      {/* Recommendations Cards Grid - Miller's Law Chunking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recommendations.map(rec => (
          <article 
            key={rec.id} 
            className="bg-white border-2 border-slate-300 rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between"
            aria-labelledby={`rec-title-${rec.id}`}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <span className="text-xs font-mono font-black text-[#075985] bg-sky-50 px-3 py-1 rounded-md border border-sky-200">
                  {rec.routeNumber} • {rec.busId}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                  rec.status === 'Accepted'
                    ? 'bg-emerald-100 text-[#065F46] border-emerald-400'
                    : rec.status === 'Rejected'
                    ? 'bg-red-100 text-[#991B1B] border-red-400'
                    : 'bg-amber-100 text-[#92400E] border-amber-400'
                }`}>
                  {rec.status}
                </span>
              </div>

              <h2 id={`rec-title-${rec.id}`} className="text-xl font-black text-slate-900">{rec.title}</h2>

              {/* Data metrics chunking */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-300 text-xs">
                <div>
                  <span className="text-slate-600 font-extrabold block">Predicted Demand:</span>
                  <span className="text-sm font-black text-slate-900">{rec.predictedDemand} passengers</span>
                </div>
                <div>
                  <span className="text-slate-600 font-extrabold block">Overcrowding Risk:</span>
                  <span className="text-sm font-black text-[#991B1B]">{rec.overcrowdingRisk}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-extrabold block">Capacity Bound:</span>
                  <span className="text-sm font-black text-slate-900">{rec.existingCapacity} → {rec.requiredCapacity} seats</span>
                </div>
                <div>
                  <span className="text-slate-600 font-extrabold block">Time Slot:</span>
                  <span className="text-sm font-black text-[#0F766E]">{rec.timeSlot}</span>
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-300 p-4 rounded-xl space-y-1">
                <span className="text-xs font-black text-[#075985] block uppercase">Recommended Action:</span>
                <p className="text-xs font-extrabold text-slate-900 leading-relaxed">{rec.recommendedAction}</p>
                <p className="text-[11px] text-[#0F766E] font-black mt-1">Impact: {rec.expectedWaitReduction}</p>
              </div>
            </div>

            {/* Accept and Reject Functional Buttons - Fitts's Law 44px+ Touch Targets */}
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => handleStatusChange(rec.id, 'Rejected')}
                disabled={rec.status === 'Rejected'}
                className="min-h-[44px] px-5 py-2.5 bg-red-100 text-[#991B1B] border-2 border-red-300 font-black text-xs rounded-xl hover:bg-red-200 focus:outline-none focus:ring-4 focus:ring-red-400 disabled:opacity-40 flex items-center gap-2 transition-colors"
                aria-label={`Reject recommendation ${rec.title}`}
              >
                <XCircle className="w-5 h-5" aria-hidden="true" />
                <span>Reject</span>
              </button>
              
              <button
                onClick={() => handleStatusChange(rec.id, 'Accepted')}
                disabled={rec.status === 'Accepted'}
                className="min-h-[44px] px-6 py-2.5 bg-[#065F46] text-white font-black text-xs rounded-xl hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-400 disabled:opacity-40 shadow flex items-center gap-2 transition-colors"
                aria-label={`Accept and deploy recommendation ${rec.title}`}
              >
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                <span>Accept & Deploy</span>
              </button>
            </div>
          </article>
        ))}
      </div>

    </div>
  );
};
