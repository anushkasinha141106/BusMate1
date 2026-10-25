import React from 'react';
import hciStudyData from '../../data/hciStudyData.json';
import { SimulationNotice } from '../../components/common/SimulationNotice';
import { Users, ShieldCheck, Clock, Award, CheckCircle2, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export const HCIEvaluationPage = () => {
  const chartData = hciStudyData.conditions.map(c => ({
    name: `Cond ${c.code}`,
    fullName: c.name,
    Trust: c.trustScore,
    Fairness: c.perceivedFairness,
    Acceptance: c.acceptanceRate / 10, // Scale down to 10 for side-by-side view
    Satisfaction: c.satisfaction
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-800" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">HCI 2×2 Factorial Study Evaluation</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 mt-1">
            Empirical user trust, perceived fairness, and agency evaluation across 4 experimental conditions.
          </p>
        </div>

        <SimulationNotice text={hciStudyData.studyInfo.simulationNotice} />
      </div>

      {/* 2x2 Factorial Study Grid Matrix */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-black text-slate-900">2×2 Factorial Experimental Design Matrix</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hciStudyData.conditions.map(cond => (
            <div 
              key={cond.id}
              className={`p-5 rounded-2xl border-2 space-y-3 ${
                cond.code === 'D'
                  ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500 shadow-md'
                  : 'bg-slate-50 border-slate-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-sm flex items-center justify-center">
                  {cond.code}
                </span>
                <div className="flex gap-2 text-xs font-bold">
                  <span className={`px-2 py-0.5 rounded ${cond.explanation === 'On' ? 'bg-sky-200 text-sky-900' : 'bg-slate-200 text-slate-700'}`}>
                    XAI Explanation: {cond.explanation}
                  </span>
                  <span className={`px-2 py-0.5 rounded ${cond.userControl === 'On' ? 'bg-teal-200 text-teal-900' : 'bg-slate-200 text-slate-700'}`}>
                    User Control: {cond.userControl}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-black text-slate-900">{cond.name}</h3>
              <p className="text-xs text-slate-600 font-medium">{cond.summary}</p>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs font-bold">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Trust Score</span>
                  <span className="text-sm font-black text-sky-900">{cond.trustScore} / 7.0</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Perceived Fairness</span>
                  <span className="text-sm font-black text-teal-800">{cond.perceivedFairness} / 7.0</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Acceptance Rate</span>
                  <span className="text-sm font-black text-emerald-800">{cond.acceptanceRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recharts Comparative Visual */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-sky-800" />
          <span>Comparative User Metrics Across 2×2 Conditions</span>
        </h2>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Trust" fill="#075985" name="Trust Score (1-7)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Fairness" fill="#0F766E" name="Perceived Fairness (1-7)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Satisfaction" fill="#15803D" name="User Satisfaction (1-7)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
