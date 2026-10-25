import React, { useState } from 'react';
import { PipelineStepper, PIPELINE_STAGES } from '../../components/layout/PipelineStepper';
import { BookOpen, ShieldCheck, Cpu, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HowItWorksPage = () => {
  const [activeStageId, setActiveStageId] = useState(1);
  const currentStage = PIPELINE_STAGES.find(s => s.id === activeStageId) || PIPELINE_STAGES[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      
      {/* Page Title */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-8 shadow-sm text-center max-w-4xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-sky-100 text-sky-900 border border-sky-300 rounded-full text-xs font-extrabold">
          <Cpu className="w-4 h-4 text-sky-800" />
          <span>System Pipeline & Research Framework</span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">How BusMate Works</h1>
        <p className="text-base text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto">
          Explore the 9-stage pipeline connecting Machine Learning predictions, Explainable AI, Counterfactual Fairness, and User Controls.
        </p>
      </div>

      {/* 9-Stage Pipeline Stepper */}
      <PipelineStepper
        activeStage={activeStageId}
        onStageClick={(id) => setActiveStageId(id)}
      />

      {/* Selected Stage Detail Inspector */}
      <div className="bg-white border-2 border-sky-800 rounded-2xl p-8 shadow-md space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-900 text-white font-black text-xl flex items-center justify-center">
              {currentStage.id}
            </div>
            <div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Pipeline Stage {currentStage.id} of 9</span>
              <h2 className="text-2xl font-black text-slate-900">{currentStage.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStageId(prev => Math.max(1, prev - 1))}
              disabled={activeStageId === 1}
              className="px-3 py-1.5 bg-slate-100 text-slate-800 font-bold text-xs rounded-lg disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              onClick={() => setActiveStageId(prev => Math.min(9, prev + 1))}
              disabled={activeStageId === 9}
              className="px-3 py-1.5 bg-sky-800 text-white font-bold text-xs rounded-lg disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <p className="text-base font-semibold text-slate-800 leading-relaxed">
              {currentStage.desc}
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm text-slate-700">
              <strong className="block text-slate-900">Technical Functionality:</strong>
              {currentStage.id === 1 && 'Ingests historical passenger boarding logs, route schedules, day of week vectors, campus events, and delay history.'}
              {currentStage.id === 2 && 'Applies regression ML model to estimate expected total passenger demand volume (e.g. 63 passengers for 50 seats).'}
              {currentStage.id === 3 && 'Runs multi-factor classifier incorporating delays and event spikes to predict overcrowding probability percentage (e.g. 82%).'}
              {currentStage.id === 4 && 'Computes additive SHAP feature contributions (+0.31 Friday peak, +0.18 campus event) to explain overcrowding drivers.'}
              {currentStage.id === 5 && 'Enforces hard capacity limits ($N \\le 50$) and computes linear priority scores using weight parameters.'}
              {currentStage.id === 6 && 'Performs single-attribute counterfactual experiments ($x_i \\to x_i\'; \\text{denials } 0 \\to 3$) to evaluate fairness sensitivity.'}
              {currentStage.id === 7 && 'Simulates candidate weight vectors to locate Pareto knee-point balancing group fairness and seat utilization.'}
              {currentStage.id === 8 && 'Confirms seat reservations, assigns seat numbers, and routes waitlisted passengers to alternative departures.'}
              {currentStage.id === 9 && 'Displays clear personalized decision reasons and collects user feedback for continuous policy calibration.'}
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-mono text-teal-400">STAGE LOG & STATUS</div>
            <div className="text-sm font-mono text-slate-200">
              [SYSTEM OK]: Pipeline Stage #{currentStage.id} executing synchronously.
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Module: {currentStage.id <= 4 ? 'Machine Learning Services' : currentStage.id <= 7 ? 'Software Engineering Allocator' : 'HCI Interface'}
            </div>
            <div className="pt-4">
              <Link to="/admin" className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 text-white font-bold text-xs rounded-lg hover:bg-teal-800">
                <span>Inspect in Admin Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* About the Research Section */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 md:p-10 border-4 border-sky-800 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-sky-400" />
          <h2 className="text-3xl font-black tracking-tight">About the Research</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-300">
          <div className="space-y-4 text-sm leading-relaxed">
            <h3 className="text-lg font-bold text-white">Research Foundation & Literature Inspiration</h3>
            <p>
              BusMate is directly inspired by foundational research in transportation machine learning and algorithmic fairness:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong>C14:</strong> Overcrowding prediction with Explainable AI (SHAP feature attribution).</li>
              <li><strong>C11:</strong> Counterfactual explainable fairness and analysis of the fairness–utility trade-off.</li>
            </ul>
            <p className="text-xs text-slate-400">
              Note: We do not claim that BusMate invented demand prediction, SHAP, XAI, or counterfactual fairness, nor do we describe C14 or C11 as our novel ML algorithms.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">The BusMate Contribution</h3>
            <blockquote className="bg-slate-800 border-l-4 border-teal-400 p-4 text-sm font-medium italic text-slate-100 rounded-r">
              "BusMate integrates overcrowding prediction and explainable ML with counterfactual fairness analysis to dynamically evaluate and calibrate capacity-allocation policies under hard transportation constraints."
            </blockquote>
            <p className="text-xs text-slate-300 leading-relaxed">
              The novelty is in how these existing methods are combined and applied to calibrate a practical capacity-constrained bus allocation policy—not in merely implementing two existing papers.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};
