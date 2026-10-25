import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from './TranslationContext';

const AccessibilityContext = createContext();

const DEFAULT_A11Y_STATE = {
  fontScale: 1.0,        // 0.8 to 1.5 (+/- 0.1)
  textSpacing: false,    // letter-spacing & word-spacing
  lineHeight: '1.6',     // '1.6', '1.8', '2.2'
  dyslexiaFont: false,   // OpenDyslexic / Dyslexia mode
  adhdMask: false,       // Reading mask
  saturation: 'normal',  // 'normal', 'high', 'monochrome'
  highContrast: false,   // Dark high-contrast (#121212 / #FFFFFF)
  invertColors: false,   // Inverted colors with counter-inversion
  linkHighlight: false,  // Yellow anchor background & underline
  screenReader: false,   // Text-to-speech engine
  bigCursor: false,      // High-visibility cursor
  freezeAnimations: false,// Pauses animations
  hideImages: false,     // Image suppressor
  leftHandMode: false,   // Ergonomic left-hand thumb reach & layout inversion
};

export const AccessibilityProvider = ({ children }) => {
  const { language, setLanguage } = useTranslation();
  const [a11yState, setA11yState] = useState(() => {
    let initialLeftHand = false;
    try {
      const explicitLeftHand = localStorage.getItem('smartbus_left_hand_mode');
      if (explicitLeftHand !== null) {
        initialLeftHand = explicitLeftHand === 'true';
      }
      const saved = localStorage.getItem('app_a11y_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { 
          ...DEFAULT_A11Y_STATE, 
          ...parsed,
          leftHandMode: explicitLeftHand !== null ? initialLeftHand : (parsed.leftHandMode ?? false)
        };
      }
    } catch (e) {
      console.error('Failed to load a11y state:', e);
    }
    return { ...DEFAULT_A11Y_STATE, leftHandMode: initialLeftHand };
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // Audio announcer
  const announce = useCallback((message) => {
    setAnnouncement(message);
    if ('speechSynthesis' in window && a11yState.screenReader) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
    setTimeout(() => setAnnouncement(''), 3000);
  }, [a11yState.screenReader]);

  // Apply DOM & CSS changes immediately whenever a11yState changes
  useEffect(() => {
    localStorage.setItem('app_a11y_state', JSON.stringify(a11yState));
    const html = document.documentElement;

    // 1. Text Size Scaling: --a11y-font-scale
    html.style.setProperty('--a11y-font-scale', a11yState.fontScale);

    // 2. Text Spacing: A ↔
    if (a11yState.textSpacing) html.classList.add('a11y-text-spacing');
    else html.classList.remove('a11y-text-spacing');

    // 3. Line Height: ↕ ☰
    html.style.setProperty('--a11y-line-height', a11yState.lineHeight);

    // 4. Dyslexia Friendly: Df
    if (a11yState.dyslexiaFont) html.classList.add('a11y-dyslexia');
    else html.classList.remove('a11y-dyslexia');

    // 6. Saturation: 💧
    html.classList.remove('a11y-high-saturation', 'a11y-monochrome');
    if (a11yState.saturation === 'high') html.classList.add('a11y-high-saturation');
    else if (a11yState.saturation === 'monochrome') html.classList.add('a11y-monochrome');

    // 7. High Contrast Mode: 🌙
    if (a11yState.highContrast) html.classList.add('a11y-high-contrast');
    else html.classList.remove('a11y-high-contrast');

    // 8. Invert Colors: 🌓
    if (a11yState.invertColors) html.classList.add('a11y-inverted');
    else html.classList.remove('a11y-inverted');

    // 9. Link Highlighter: 🔗
    if (a11yState.linkHighlight) html.classList.add('a11y-link-highlight');
    else html.classList.remove('a11y-link-highlight');

    // 11. High-Visibility Cursor: ⟲ ↗
    if (a11yState.bigCursor) html.classList.add('a11y-big-cursor');
    else html.classList.remove('a11y-big-cursor');

    // 12. Animation Freeze: ⏸
    if (a11yState.freezeAnimations) html.classList.add('a11y-freeze-animations');
    else html.classList.remove('a11y-freeze-animations');

    // 13. Image Suppressor: ⧄
    if (a11yState.hideImages) html.classList.add('a11y-hide-images');
    else html.classList.remove('a11y-hide-images');

    // 14. Left-Hand Ergonomic Reach Mode: 🫲 (.a11y-left-hand on <html> and <body>)
    if (a11yState.leftHandMode) {
      html.classList.add('a11y-left-hand');
      document.body?.classList.add('a11y-left-hand');
    } else {
      html.classList.remove('a11y-left-hand');
      document.body?.classList.remove('a11y-left-hand');
    }
    localStorage.setItem('smartbus_left_hand_mode', String(!!a11yState.leftHandMode));

  }, [a11yState]);

  // 10. Screen Reader / TTS Listener: Speaks hovered or focused text elements
  useEffect(() => {
    if (!a11yState.screenReader || !('speechSynthesis' in window)) return;

    const handleHoverOrFocus = (e) => {
      const target = e.target;
      if (!target) return;
      const text = target.innerText || target.getAttribute('aria-label') || target.getAttribute('alt') || target.value;
      if (text && text.trim().length > 0 && text.trim().length < 200) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.trim());
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    };

    document.addEventListener('focusin', handleHoverOrFocus);
    document.addEventListener('mouseover', handleHoverOrFocus);
    return () => {
      document.removeEventListener('focusin', handleHoverOrFocus);
      document.removeEventListener('mouseover', handleHoverOrFocus);
      window.speechSynthesis.cancel();
    };
  }, [a11yState.screenReader]);

  // Global Hotkey: Ctrl + F2 and Alt + A to toggle A11y Modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && e.key === 'F2') || (e.altKey && (e.key === 'a' || e.key === 'A'))) {
        e.preventDefault();
        setIsModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Individual Actions
  // 1. Text Size Scaling (+/- 10% between 0.8x and 1.5x)
  const adjustFontScale = (delta) => {
    setA11yState(prev => {
      const next = Math.min(1.5, Math.max(0.8, Number((prev.fontScale + delta).toFixed(1))));
      announce(`Text size scaled to ${Math.round(next * 100)} percent`);
      return { ...prev, fontScale: next };
    });
  };

  // 2. Text Spacing
  const toggleTextSpacing = () => {
    setA11yState(prev => {
      const next = !prev.textSpacing;
      announce(next ? 'Text and word spacing expanded' : 'Default text spacing restored');
      return { ...prev, textSpacing: next };
    });
  };

  // 3. Line Height Cycling
  const cycleLineHeight = () => {
    setA11yState(prev => {
      const next = prev.lineHeight === '1.6' ? '1.8' : prev.lineHeight === '1.8' ? '2.2' : '1.6';
      announce(`Line spacing set to ${next}x`);
      return { ...prev, lineHeight: next };
    });
  };

  // 4. Dyslexia Font
  const toggleDyslexiaFont = () => {
    setA11yState(prev => {
      const next = !prev.dyslexiaFont;
      announce(next ? 'Dyslexia friendly font enabled' : 'Dyslexia font disabled');
      return { ...prev, dyslexiaFont: next };
    });
  };

  // 5. ADHD Reading Mask
  const toggleAdhdMask = () => {
    setA11yState(prev => {
      const next = !prev.adhdMask;
      announce(next ? 'ADHD reading focus mask enabled' : 'Reading mask disabled');
      return { ...prev, adhdMask: next };
    });
  };

  // 6. Saturation Adjuster
  const cycleSaturation = () => {
    setA11yState(prev => {
      const next = prev.saturation === 'normal' ? 'high' : prev.saturation === 'high' ? 'monochrome' : 'normal';
      announce(`Saturation set to ${next}`);
      return { ...prev, saturation: next };
    });
  };

  // 7. High Contrast Mode
  const toggleHighContrast = () => {
    setA11yState(prev => {
      const next = !prev.highContrast;
      announce(next ? 'High Contrast Mode enabled' : 'High Contrast Mode disabled');
      return { ...prev, highContrast: next };
    });
  };

  // 8. Invert Colors
  const toggleInvertColors = () => {
    setA11yState(prev => {
      const next = !prev.invertColors;
      announce(next ? 'Color inversion active' : 'Color inversion disabled');
      return { ...prev, invertColors: next };
    });
  };

  // 9. Link Highlighter
  const toggleLinkHighlight = () => {
    setA11yState(prev => {
      const next = !prev.linkHighlight;
      announce(next ? 'All links highlighted' : 'Link highlight disabled');
      return { ...prev, linkHighlight: next };
    });
  };

  // 10. Screen Reader
  const toggleScreenReader = () => {
    setA11yState(prev => {
      const next = !prev.screenReader;
      announce(next ? 'Interactive screen reader speech active' : 'Screen reader voice stopped');
      return { ...prev, screenReader: next };
    });
  };

  // 11. High-Visibility Cursor
  const toggleBigCursor = () => {
    setA11yState(prev => {
      const next = !prev.bigCursor;
      announce(next ? 'Large high-contrast cursor active' : 'Default cursor restored');
      return { ...prev, bigCursor: next };
    });
  };

  // 12. Animation Freeze
  const toggleFreezeAnimations = () => {
    setA11yState(prev => {
      const next = !prev.freezeAnimations;
      announce(next ? 'All page animations frozen' : 'Animations restored');
      return { ...prev, freezeAnimations: next };
    });
  };

  // 13. Image Suppressor
  const toggleHideImages = () => {
    setA11yState(prev => {
      const next = !prev.hideImages;
      announce(next ? 'Images hidden for clutter reduction' : 'Images visible');
      return { ...prev, hideImages: next };
    });
  };

  // 14. Left-Hand Mode Toggle (Ergonomic Thumb Reach & Layout Inversion)
  const toggleLeftHandMode = () => {
    setA11yState(prev => {
      const next = !prev.leftHandMode;
      localStorage.setItem('smartbus_left_hand_mode', String(next));
      announce(next ? 'Left Hand Mode enabled: Buttons and primary actions adapted for left-hand thumb reach' : 'Left Hand Mode disabled: Standard layout restored');
      return { ...prev, leftHandMode: next };
    });
  };

  // 15. Reset All
  const resetAll = () => {
    setA11yState(DEFAULT_A11Y_STATE);
    localStorage.removeItem('app_a11y_state');
    localStorage.setItem('smartbus_left_hand_mode', 'false');
    document.documentElement.classList.remove('a11y-left-hand');
    document.body?.classList.remove('a11y-left-hand');
    announce('All accessibility settings reset to default');
  };

  return (
    <AccessibilityContext.Provider
      value={{
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
        leftHandMode: a11yState.leftHandMode,
        resetAll,
        isModalOpen,
        setIsModalOpen,
        announce,
        language,
        setLanguage,
        // Backward compatibility
        highContrast: a11yState.highContrast,
        reducedMotion: a11yState.freezeAnimations,
        toggleReducedMotion: toggleFreezeAnimations,
        isA11yDrawerOpen: isModalOpen,
        setIsA11yDrawerOpen: setIsModalOpen,
      }}
    >
      {/* Screen Reader ARIA Live Status */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => useContext(AccessibilityContext);
