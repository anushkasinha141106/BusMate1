import React, { useState } from 'react';
import { Tag, Copy, Check } from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';

export const OffersStrip = () => {
  const { announce } = useAccessibility();
  const [copiedCode, setCopiedCode] = useState(null);

  const offers = [
    {
      id: 'FIRST',
      title: 'Save up to ₹250 on first booking',
      subtitle: 'Valid for new commuters on Pune city & campus routes',
      code: 'FIRST',
      validity: 'Valid till 31 Oct 2026',
      badge: 'FIRST RIDE',
      badgeColor: 'bg-sky-100 text-[#075985] border-sky-300'
    },
    {
      id: 'SMARTCAMPUS',
      title: 'Flat 20% OFF on Campus Shuttles',
      subtitle: 'Applicable on IIIT Pune & Talegaon direct routes',
      code: 'SMARTCAMPUS',
      validity: 'Daily Commuter Pass',
      badge: 'CAMPUS SPECIAL',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300'
    },
    {
      id: 'UPIPASS',
      title: 'Cashback up to ₹150 with UPI',
      subtitle: 'Instant discount on GPay, PhonePe, Paytm payments',
      code: 'UPIPASS',
      validity: 'Min. booking ₹50',
      badge: 'BANK OFFER',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300'
    },
    {
      id: 'PASS30',
      title: 'Student & Senior Pass: 30% OFF',
      subtitle: 'Subsidized equitable transit passes across Pune',
      code: 'PASS30',
      validity: 'Monthly passes',
      badge: 'CONCESSION',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
    }
  ];

  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    announce(`Coupon code ${code} copied to clipboard`);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  return (
    <section className="w-full max-w-6xl mx-auto space-y-4" aria-label="Active Transit Passes and Offers">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-[#075985]" />
          <h2 className="text-xl sm:text-2xl font-semibold font-heading text-slate-900 tracking-[-0.015em]">
            ACTIVE COMMUTER OFFERS
          </h2>
        </div>
        <span className="text-xs font-semibold text-[#075985] hover:underline cursor-pointer">
          View All Offers
        </span>
      </div>

      {/* Clean Horizontal Offers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {offers.map((offer) => {
          const isCopied = copiedCode === offer.code;
          return (
            <div
              key={offer.id}
              className="bg-white rounded-2xl p-4 border-2 border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border uppercase tracking-[0.05em] ${offer.badgeColor}`}>
                  {offer.badge}
                </span>
                <h3 className="font-semibold text-sm text-slate-900 leading-snug">
                  {offer.title}
                </h3>
                <p className="text-xs text-slate-500 font-normal line-clamp-2">
                  {offer.subtitle}
                </p>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Use Code</span>
                  <span className="text-xs font-mono font-bold text-[#075985] bg-sky-50 px-2 py-0.5 rounded border border-sky-200 tabular-nums">
                    {offer.code}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode(offer.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isCopied 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  aria-label={`Copy coupon code ${offer.code}`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
