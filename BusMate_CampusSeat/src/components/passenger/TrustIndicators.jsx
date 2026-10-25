import React from 'react';
import { Headphones, RotateCcw, Award, ShieldCheck } from 'lucide-react';

export const TrustIndicators = () => {
  const trustItems = [
    {
      icon: Headphones,
      title: '24/7 Commuter Care',
      desc: 'Dedicated helpline for route queries, ticketing and accessibility assistance',
      accent: 'text-[#075985] bg-sky-50'
    },
    {
      icon: RotateCcw,
      title: 'Instant Refund & Cancellation',
      desc: 'One-click cancellation with direct digital refund into your bank/UPI',
      accent: 'text-teal-800 bg-teal-50'
    },
    {
      icon: Award,
      title: 'Verified Transit Operators',
      desc: 'PMPML & University certified drivers with real-time on-time monitoring',
      accent: 'text-blue-800 bg-blue-50'
    },
    {
      icon: ShieldCheck,
      title: '100% Sanitized & Safe Travel',
      desc: 'Strict vehicle inspection, wheelchair safety ramps & CCTV coverage',
      accent: 'text-emerald-800 bg-emerald-50'
    }
  ];

  return (
    <section className="w-full max-w-6xl mx-auto py-4" aria-label="Trust and Reliability Guarantees">
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {trustItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-start gap-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${item.accent}`}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-slate-900 leading-tight">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
