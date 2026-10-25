import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

export const RiskBadge = ({ riskLevel = 'Low', probability = null, className = '' }) => {
  const level = riskLevel.toLowerCase();

  let bgClass = 'bg-emerald-100 text-[#065F46] border-emerald-400';
  let icon = <CheckCircle2 className="w-5 h-5 text-[#065F46] mr-2 shrink-0" aria-hidden="true" />;
  let labelText = 'Low Overcrowding Risk';

  if (level === 'medium') {
    bgClass = 'bg-amber-100 text-[#92400E] border-amber-400';
    icon = <AlertTriangle className="w-5 h-5 text-[#92400E] mr-2 shrink-0" aria-hidden="true" />;
    labelText = 'Medium Overcrowding Risk';
  } else if (level === 'high') {
    bgClass = 'bg-red-100 text-[#991B1B] border-red-400';
    icon = <ShieldAlert className="w-5 h-5 text-[#991B1B] mr-2 shrink-0" aria-hidden="true" />;
    labelText = 'High Overcrowding Risk';
  }

  return (
    <div 
      className={`inline-flex items-center px-3.5 py-2 rounded-xl text-sm font-extrabold border-2 shadow-sm ${bgClass} ${className}`}
      role="status"
      aria-label={`Status Indicator: ${labelText} ${probability !== null ? `(${probability} percent probability)` : ''}`}
    >
      {icon}
      <span className="leading-tight">
        {labelText}
        {probability !== null && <span className="ml-1.5 font-black">({probability}%)</span>}
      </span>
    </div>
  );
};
