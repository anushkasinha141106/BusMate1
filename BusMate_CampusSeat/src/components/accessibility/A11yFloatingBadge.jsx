import React from 'react';
import { Accessibility } from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';

export const A11yFloatingBadge = () => {
  const { setIsModalOpen } = useAccessibility();

  return (
    <button
      type="button"
      id="a11y-floating-badge"
      data-a11y-engine="true"
      onClick={() => setIsModalOpen(true)}
      className="a11y-floating-badge fixed bottom-6 right-6 z-40 px-4 py-3 bg-[#075985] hover:bg-[#0C4A6E] active:scale-95 text-white font-black text-xs rounded-2xl shadow-2xl border-2 border-white/80 transition-all flex items-center gap-2.5 focus:outline-none focus:ring-4 focus:ring-sky-300"
      title="Accessibility Options (Ctrl + F2)"
      aria-label="Open Accessibility Options (Ctrl + F2)"
    >
      <span className="text-base leading-none" aria-hidden="true">♿</span>
      <span className="tracking-wide">Accessibility</span>
      <span className="hidden sm:inline-block text-[10px] bg-sky-950/60 px-1.5 py-0.5 rounded text-sky-200 border border-sky-400/40 font-mono">
        Ctrl+F2
      </span>
    </button>
  );
};
