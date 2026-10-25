import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Settings, 
  Eye, 
  Sparkles, 
  LayoutDashboard, 
  Sliders, 
  Volume2, 
  X, 
  Check, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';

export const AccessibilitySettingsModal = ({ isOpen, onClose }) => {
  const { highContrast, toggleHighContrast, reducedMotion, toggleReducedMotion } = useAccessibility();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibilitySettingsTitle"
    >
      <div 
        className="bg-white rounded-3xl border-2 border-slate-300 max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-[#075985] flex items-center justify-center font-black">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 id="accessibilitySettingsTitle" className="text-2xl font-black text-slate-900">
                System & Accessibility
              </h2>
              <p className="text-xs font-bold text-slate-500">WCAG 2.1 AA compliant personalized viewing options</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500"
            aria-label="Close settings modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Accessibility Toggles */}
        <div className="space-y-4">
          
          {/* High Contrast */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
            <div className="space-y-0.5 pr-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#075985]" />
                <span className="font-black text-sm text-slate-900">High Contrast Mode</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Enhances contrast ratios beyond 7:1 (WCAG AAA) and highlights borders for low-vision riders.
              </p>
            </div>
            <button
              onClick={toggleHighContrast}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600 ${
                highContrast ? 'bg-[#075985]' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={highContrast}
              aria-label="Toggle High Contrast Mode"
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  highContrast ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
            <div className="space-y-0.5 pr-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#075985]" />
                <span className="font-black text-sm text-slate-900">Reduced Motion</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Silences map animations and live pulsing vehicle rings for vestibular sensitivities.
              </p>
            </div>
            <button
              onClick={toggleReducedMotion}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600 ${
                reducedMotion ? 'bg-[#075985]' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={reducedMotion}
              aria-label="Toggle Reduced Motion"
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  reducedMotion ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Scalable Typography Info */}
          <div className="p-4 bg-sky-50/70 border-2 border-sky-200 rounded-2xl space-y-1">
            <span className="text-xs font-black text-[#075985] uppercase tracking-wider block">
              Fluid Rem Typography Active
            </span>
            <p className="text-xs text-slate-700 leading-relaxed font-semibold">
              Font size is automatically bound to your system and browser zoom preferences (Ctrl/Cmd +/–), maintaining layout integrity and zero overlapping text.
            </p>
          </div>

        </div>

        {/* Secondary Navigation: Admin & Researcher Portal Link */}
        <div className="pt-2 border-t border-slate-200">
          <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-widest">
                Transit Authority Tools
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded-md font-mono text-slate-400">
                Secondary Menu
              </span>
            </div>
            <h4 className="text-base font-black text-white">Admin & ML Research Console</h4>
            <p className="text-xs text-slate-300">
              Access demand forecasting, SHAP explainability, capacity allocation & counterfactual policy labs.
            </p>
            <div className="pt-2">
              <Link
                to="/admin"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#075985] hover:bg-[#0C4A6E] text-white rounded-xl text-xs font-black transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Launch Admin Console</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
              </Link>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-sm transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
