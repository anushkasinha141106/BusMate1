import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Info, ShieldCheck, X } from 'lucide-react';

export const ServiceAlertsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const alerts = [
    {
      id: 'alt-1',
      severity: 'warning',
      title: 'Swargate Flyover Construction — Minor Delays on Route 8 & 21',
      affectedRoutes: ['Route 8', 'Route 21', 'Katraj Corridors'],
      updated: '12 mins ago',
      message: 'Due to metro pillar girder installation near Swargate Flyover, expect 6-9 minute transit delays during peak evening hours (17:00 - 19:30). All buses remain operational.'
    },
    {
      id: 'alt-2',
      severity: 'info',
      title: 'Extra Low-Floor EV Buses Deployed on Talegaon Route',
      affectedRoutes: ['Route 2', 'Route 3 (Talegaon Express)'],
      updated: '45 mins ago',
      message: 'To mitigate high predicted commuter demand (78% overcrowding probability), two 52-seat electric low-floor shuttle buses have been dispatched from Kothrud Depot.'
    },
    {
      id: 'alt-3',
      severity: 'success',
      title: 'Hinjawadi IT Park Dedicated BRTS Lane Cleared',
      affectedRoutes: ['Route 102', 'Route 104'],
      updated: '1 hour ago',
      message: 'BRTS dedicated bus corridor is running smoothly with 0 reported congestion bottlenecks.'
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="serviceAlertsTitle"
    >
      <div 
        className="bg-white rounded-3xl border-2 border-slate-300 max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 id="serviceAlertsTitle" className="text-2xl font-black text-slate-900">
                Transit Service Alerts
              </h2>
              <p className="text-xs font-bold text-slate-500">Live Pune transit line disruptions & fleet notices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500"
            aria-label="Close alerts modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* System Health Summary */}
        <div className="flex items-center justify-between p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-900 text-sm font-bold">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>96.4% of Pune transit network is currently operating on regular schedule.</span>
          </div>
          <span className="hidden sm:inline-block text-xs font-mono font-black bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-lg">
            OPTIMAL
          </span>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div 
              key={alert.id}
              className={`p-5 rounded-2xl border-2 space-y-2.5 ${
                alert.severity === 'warning' 
                  ? 'bg-amber-50/70 border-amber-300' 
                  : alert.severity === 'info'
                    ? 'bg-sky-50/70 border-sky-300'
                    : 'bg-emerald-50/70 border-emerald-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-black text-slate-900 text-base leading-snug">
                  {alert.title}
                </h3>
                <span className="text-[11px] font-mono font-bold text-slate-500 shrink-0">
                  {alert.updated}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                {alert.message}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {alert.affectedRoutes.map((r, i) => (
                  <span key={i} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-800">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-sm transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
