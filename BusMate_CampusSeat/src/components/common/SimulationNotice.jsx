import React from 'react';
import { Info } from 'lucide-react';

export const SimulationNotice = ({ text = 'Simulated ML prediction for prototype demonstration.', className = '' }) => {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 bg-sky-50 text-sky-900 border border-sky-200 rounded-md text-xs font-medium ${className}`}>
      <Info className="w-4 h-4 text-sky-700 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
};
