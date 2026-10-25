import React, { useEffect } from 'react';
import { 
  Accessibility, 
  X, 
  Eye, 
  Sparkles, 
  Type, 
  BookOpen, 
  Volume2, 
  Check, 
  RotateCcw,
  Sliders,
  ShieldCheck
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';

export const A11yDrawer = () => {
  const { 
    isA11yDrawerOpen, 
    setIsA11yDrawerOpen, 
    highContrast, 
    toggleHighContrast, 
    reducedMotion, 
    toggleReducedMotion, 
    fontScale, 
    setFontSize, 
    dyslexiaMode, 
    toggleDyslexiaMode,
    announce
  } = useAccessibility();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isA11yDrawerOpen) {
        setIsA11yDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isA11yDrawerOpen, setIsA11yDrawerOpen]);

  if (!isA11yDrawerOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11yDrawerHeading"
    >
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l-2 border-slate-300 shadow-2xl flex flex-col justify-between p-6 sm:p-8 animate-in slide-in-from-right duration-200 overflow-y-auto">
          
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#075985] flex items-center justify-center font-black">
                  <Accessibility className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="a11yDrawerHeading" className="text-xl font-black text-slate-900">
                    Accessibility Engine
                  </h2>
                  <p className="text-xs font-bold text-slate-500">WCAG 2.1 AA Compliant Controls</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsA11yDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#075985]"
                aria-label="Close Accessibility Controls (Escape)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls List */}
            <div className="space-y-4">
              
              {/* 1. High Contrast Mode */}
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#075985]" />
                    <span className="text-sm font-black text-slate-900">High Contrast Mode</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleHighContrast}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#075985] ${
                      highContrast ? 'bg-[#075985]' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={highContrast}
                    aria-label="Toggle High Contrast Mode"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        highContrast ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Enhances color separation beyond 7:1 (WCAG AAA) for low-vision and sunlight readability.
                </p>
              </div>

              {/* 2. Scalable Typography Scale */}
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-[#075985]" />
                  <span className="text-sm font-black text-slate-900">Scalable Text Size</span>
                </div>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="Font scale preferences">
                  {[
                    { id: '100', label: '100%', sub: 'Default' },
                    { id: '115', label: '115%', sub: 'Medium' },
                    { id: '130', label: '130%', sub: 'Large' },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setFontSize(btn.id)}
                      className={`py-2 px-2.5 rounded-xl border-2 text-xs font-black transition-all ${
                        fontScale === btn.id
                          ? 'bg-[#075985] text-white border-[#075985] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                      aria-pressed={fontScale === btn.id}
                    >
                      <span className="block">{btn.label}</span>
                      <span className="text-[10px] font-bold opacity-80">{btn.sub}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 font-semibold">
                  Scales all text using fluid rem typography without breaking layouts or truncating buttons.
                </p>
              </div>

              {/* 3. Reduced Motion */}
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#075985]" />
                    <span className="text-sm font-black text-slate-900">Reduced Motion</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleReducedMotion}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#075985] ${
                      reducedMotion ? 'bg-[#075985]' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={reducedMotion}
                    aria-label="Toggle Reduced Motion"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        reducedMotion ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Stops animations, transitions, and pulsing effects for users with vestibular or neurodivergent needs.
                </p>
              </div>

              {/* 4. Dyslexia / Legibility Mode */}
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#075985]" />
                    <span className="text-sm font-black text-slate-900">Reading Legibility Mode</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleDyslexiaMode}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#075985] ${
                      dyslexiaMode ? 'bg-[#075985]' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={dyslexiaMode}
                    aria-label="Toggle Reading Legibility Mode"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        dyslexiaMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Expands letter spacing and line heights for smoother reading.
                </p>
              </div>

            </div>

            {/* Keyboard Shortcuts Notice */}
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 font-bold space-y-1">
              <div className="flex items-center gap-1.5 font-black text-[#075985]">
                <ShieldCheck className="w-4 h-4" />
                <span>Accessibility Keyboard Shortcut:</span>
              </div>
              <p className="font-semibold text-slate-600">
                Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800 font-mono text-[11px]">Alt</kbd> + <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800 font-mono text-[11px]">A</kbd> anywhere to quickly toggle this accessibility panel.
              </p>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                announce('Accessibility preferences saved');
                setIsA11yDrawerOpen(false);
              }}
              className="w-full py-3.5 bg-[#075985] hover:bg-[#0C4A6E] text-white font-black text-sm rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#075985]"
            >
              Done / Close Panel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
