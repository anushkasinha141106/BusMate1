import React, { useEffect } from 'react';
import { 
  Accessibility, 
  X, 
  RotateCcw, 
  Eye, 
  Sparkles, 
  Type, 
  Link as LinkIcon, 
  Volume2, 
  MousePointer, 
  Pause, 
  ImageOff, 
  Check, 
  Info,
  Droplet,
  Split,
  Maximize2
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';

export const A11yModal = () => {
  const {
    a11yState,
    adjustFontScale,
    toggleTextSpacing,
    cycleLineHeight,
    toggleDyslexiaFont,
    toggleAdhdMask,
    cycleSaturation,
    toggleHighContrast,
    toggleInvertColors,
    toggleLinkHighlight,
    toggleScreenReader,
    toggleBigCursor,
    toggleFreezeAnimations,
    toggleHideImages,
    toggleLeftHandMode,
    resetAll,
    isModalOpen,
    setIsModalOpen
  } = useAccessibility();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, setIsModalOpen]);

  if (!isModalOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11yModalTitle"
    >
      <div 
        className="bg-white rounded-3xl border-2 border-slate-300 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#075985] text-white flex items-center justify-center font-black shadow-xs">
              <Accessibility className="w-6 h-6" />
            </div>
            <div>
              <h2 id="a11yModalTitle" className="text-2xl font-black text-slate-900 tracking-tight">
                Accessibility Suite (a11y)
              </h2>
              <p className="text-xs font-bold text-slate-500">
                WCAG 2.1 AA Compliant • Instant DOM & CSS Controls
              </p>
            </div>
          </div>

          <button
            type="button"
            data-a11y-engine="true"
            onClick={() => setIsModalOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
            aria-label="Close accessibility controls (Escape)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 15 Active Tool Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          
          {/* 1. Text Size Scaling: Tᵀ / Tₜ */}
          <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl border-2 border-slate-200 bg-slate-50 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800">1. Text Size</span>
              <span className="text-[11px] font-mono font-bold text-[#075985]">
                {Math.round(a11yState.fontScale * 100)}%
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                data-a11y-engine="true"
                onClick={() => adjustFontScale(-0.1)}
                disabled={a11yState.fontScale <= 0.8}
                className="flex-1 py-1.5 bg-white border border-slate-300 rounded-lg font-black text-sm hover:bg-slate-100 disabled:opacity-40"
                title="Decrease font size (-10%)"
              >
                Tₜ -
              </button>
              <button
                type="button"
                data-a11y-engine="true"
                onClick={() => adjustFontScale(0.1)}
                disabled={a11yState.fontScale >= 1.5}
                className="flex-1 py-1.5 bg-[#075985] text-white rounded-lg font-black text-sm hover:bg-[#0C4A6E] disabled:opacity-40"
                title="Increase font size (+10%)"
              >
                Tᵀ +
              </button>
            </div>
          </div>

          {/* 2. Text Spacing: A ↔ */}
          <button
            type="button"
            data-a11y-engine="true"
            onClick={toggleTextSpacing}
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
              a11yState.textSpacing
                ? 'bg-sky-50 border-[#075985] text-[#075985]'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="text-base font-black">A ↔</span>
              {a11yState.textSpacing && <Check className="w-4 h-4 text-[#075985]" />}
            </div>
            <div>
              <span className="text-xs font-black block">2. Text Spacing</span>
              <span className="text-[10px] text-slate-400 font-semibold">Expanded kerning</span>
            </div>
          </button>

          {/* 3. Line Height: ↕ ☰ */}
          <button
            type="button"
            data-a11y-engine="true"
            onClick={cycleLineHeight}
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
              a11yState.lineHeight !== '1.6'
                ? 'bg-sky-50 border-[#075985] text-[#075985]'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="text-base font-black">↕ ☰</span>
              <span className="text-xs font-mono font-bold text-[#075985]">{a11yState.lineHeight}x</span>
            </div>
            <div>
              <span className="text-xs font-black block">3. Line Height</span>
              <span className="text-[10px] text-slate-400 font-semibold">1.6x, 1.8x, 2.2x</span>
            </div>
          </button>

          {/* 4. Dyslexia Friendly: Df */}
          <button
            type="button"
            data-a11y-engine="true"
            onClick={toggleDyslexiaFont}
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
              a11yState.dyslexiaFont
                ? 'bg-sky-50 border-[#075985] text-[#075985]'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="text-base font-black font-serif">Df</span>
              {a11yState.dyslexiaFont && <Check className="w-4 h-4 text-[#075985]" />}
            </div>
            <div>
              <span className="text-xs font-black block">4. Dyslexia Friendly</span>
              <span className="text-[10px] text-slate-400 font-semibold">Legibility font</span>
            </div>
          </button>

          {/* 5. ADHD Reading Mask: 〰 */}
          <button
            type="button"
            data-a11y-engine="true"
            onClick={toggleAdhdMask}
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
              a11yState.adhdMask
                ? 'bg-sky-50 border-[#075985] text-[#075985]'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="text-base font-black">〰</span>
              {a11yState.adhdMask && <Check className="w-4 h-4 text-[#075985]" />}
            </div>
            <div>
              <span className="text-xs font-black block">5. ADHD Reading Mask</span>
              <span className="text-[10px] text-slate-400 font-semibold">Focus viewport slit</span>
            </div>
          </button>

          {/* 6. Saturation Adjuster: 💧 */}
          <button
            type="button"
            data-a11y-engine="true"
            onClick={cycleSaturation}
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
              a11yState.saturation !== 'normal'
                ? 'bg-sky-50 border-[#075985] text-[#075985]'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="text-base font-black">💧</span>
              <span className="text-xs font-mono font-bold capitalize text-[#075985]">{a11yState.saturation}</span>
            </div>
            <div>
              <span className="text-xs font-black block">6. Saturation</span>
              <span className="text-[10px] text-slate-400 font-semibold">Normal/High/Mono</span>
            </div>
          </button>

          {/* 7. High Contrast Mode: 🌙 */}
          <button
            type="button"
            data-a11y-engine="true"
            onClick={toggleHighContrast}
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
              a11yState.highContrast
                ? 'bg-slate-900 border-amber-400 text-amber-300'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="text-base font-black">🌙</span>
              {a11yState.highContrast && <Check className="w-4 h-4 text-amber-300" />}
            </div>
            <div>
              <span className="text-xs font-black block">7. High Contrast</span>
              <span className="text-[10px] text-slate-400 font-semibold">#121212 Dark theme</span>
            </div>
          </button>

          {/* 8. Invert Colors: 🌓 */}
          <button
            type="button"
            data-a11y-engine="true"
            onClick={toggleInvertColors}
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
              a11yState.invertColors
                ? 'bg-sky-50 border-[#075985] text-[#075985]'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="text-base font-black">🌓</span>
              {a11yState.invertColors && <Check className="w-4 h-4 text-[#075985]" />}
            </div>
            <div>
              <span className="text-xs font-black block">8. Invert Colors</span>
              <span className="text-[10px] text-slate-400 font-semibold">Root 180° invert</span>
            </div>
          </button>

          {/* 9. Link Highlighter: 🔗 */}
          <button
            type="button"
            data-a11y-engine="true"
            onClick={toggleLinkHighlight}
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
              a11yState.linkHighlight
                ? 'bg-amber-100 border-amber-400 text-amber-900'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="text-base font-black">🔗</span>
              {a11yState.linkHighlight && <Check className="w-4 h-4 text-amber-900" />}
            </div>
            <div>
              <span className="text-xs font-black block">9. Highlight Links</span>
              <span className="text-[10px] text-slate-400 font-semibold">Yellow underline</span>
            </div>
          </button>

          {/* 10. Screen Reader / TTS: ||| */}
          <button
            type="button"
            data-a11y-engine="true"
            onClick={toggleScreenReader}
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
              a11yState.screenReader
                ? 'bg-sky-50 border-[#075985] text-[#075985]'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="text-base font-black">|||</span>
              {a11yState.screenReader && <Check className="w-4 h-4 text-[#075985]" />}
            </div>
            <div>
              <span className="text-xs font-black block">10. Screen Reader</span>
              <span className="text-[10px] text-slate-400 font-semibold">Hover text speech</span>
            </div>
          </button>

          {/* 11. High-Visibility Cursor: ⟲ ↗ */}
          <button
            type="button"
            data-a11y-engine="true"
            onClick={toggleBigCursor}
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
              a11yState.bigCursor
                ? 'bg-sky-50 border-[#075985] text-[#075985]'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="text-base font-black">⟲ ↗</span>
              {a11yState.bigCursor && <Check className="w-4 h-4 text-[#075985]" />}
            </div>
            <div>
              <span className="text-xs font-black block">11. Large Cursor</span>
              <span className="text-[10px] text-slate-400 font-semibold">High contrast pointer</span>
            </div>
          </button>

          {/* 12. Animation Freeze: ⏸ */}
          <button
            type="button"
            data-a11y-engine="true"
            onClick={toggleFreezeAnimations}
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
              a11yState.freezeAnimations
                ? 'bg-sky-50 border-[#075985] text-[#075985]'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="text-base font-black">⏸</span>
              {a11yState.freezeAnimations && <Check className="w-4 h-4 text-[#075985]" />}
            </div>
            <div>
              <span className="text-xs font-black block">12. Freeze Animations</span>
              <span className="text-[10px] text-slate-400 font-semibold">Stop all motion</span>
            </div>
          </button>

          {/* 13. Image Suppressor: ⧄ */}
          <button
            type="button"
            data-a11y-engine="true"
            onClick={toggleHideImages}
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
              a11yState.hideImages
                ? 'bg-sky-50 border-[#075985] text-[#075985]'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="text-base font-black">⧄</span>
              {a11yState.hideImages && <Check className="w-4 h-4 text-[#075985]" />}
            </div>
            <div>
              <span className="text-xs font-black block">13. Suppress Images</span>
              <span className="text-[10px] text-slate-400 font-semibold">Hide visual clutter</span>
            </div>
          </button>

          {/* 14. Left Hand Mode: 🫲 */}
          <button
            type="button"
            id="a11y-left-hand-toggle"
            data-a11y-engine="true"
            onClick={toggleLeftHandMode}
            role="switch"
            aria-checked={a11yState.leftHandMode}
            title="Optimizes buttons and primary actions for left-hand thumb reach"
            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
              a11yState.leftHandMode
                ? 'bg-purple-50/90 border-purple-600 text-purple-900 ring-2 ring-purple-300 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="text-xl leading-none" aria-hidden="true">🫲</span>
              {a11yState.leftHandMode && <Check className="w-4 h-4 text-purple-600" />}
            </div>
            <div>
              <span className="text-xs font-black block">Left Hand Mode</span>
              <span className="text-[10px] text-slate-500 font-semibold leading-tight block mt-0.5">
                Optimizes buttons and primary actions for left-hand thumb reach
              </span>
            </div>
          </button>

        </div>

        {/* Footer Actions: 14. Reset All & 15. Persistence status */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-bold">
            <Info className="w-4 h-4 text-[#075985]" />
            <span>Shortcut: <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono">Ctrl + F2</kbd> • Auto-saved to browser</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* 14. Reset All */}
            <button
              type="button"
              data-a11y-engine="true"
              onClick={resetAll}
              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>

            <button
              type="button"
              data-a11y-engine="true"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 sm:flex-initial px-6 py-2 bg-[#075985] hover:bg-[#0C4A6E] text-white font-black rounded-xl transition-colors shadow-xs"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
