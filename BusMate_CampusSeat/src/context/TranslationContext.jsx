import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, t as translateResolver } from '../i18n/translations';

const TranslationContext = createContext();

export const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' }
];

export const TranslationProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('smartbus_lang') || localStorage.getItem('smartbus_language');
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'mr')) {
        return saved;
      }
    } catch (e) {
      console.warn('Storage read error for i18n:', e);
    }
    return 'en';
  });

  // Client-side DOM translation scanner for data-i18n attributes
  const updateDOMTranslations = useCallback((langCode) => {
    const activeLang = langCode || language;
    if (typeof document === 'undefined') return;

    // Update document HTML lang attribute
    document.documentElement.setAttribute('lang', activeLang);
    document.documentElement.lang = activeLang;

    // 1. Text elements: data-i18n="key"
    const textNodes = document.querySelectorAll('[data-i18n]');
    textNodes.forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        if (!el.hasAttribute('data-i18n-original')) {
          el.setAttribute('data-i18n-original', el.textContent.trim());
        }
        const fallback = el.getAttribute('data-i18n-original') || '';
        el.textContent = translateResolver(activeLang, key, fallback);
      }
    });

    // 2. Input Placeholders: data-i18n-placeholder="key"
    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        if (!el.hasAttribute('data-i18n-original-placeholder')) {
          el.setAttribute('data-i18n-original-placeholder', el.placeholder || '');
        }
        const fallback = el.getAttribute('data-i18n-original-placeholder') || '';
        el.placeholder = translateResolver(activeLang, key, fallback);
      }
    });

    // 3. Tooltips / Titles: data-i18n-title="key"
    const titles = document.querySelectorAll('[data-i18n-title]');
    titles.forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        if (!el.hasAttribute('data-i18n-original-title')) {
          el.setAttribute('data-i18n-original-title', el.title || '');
        }
        const fallback = el.getAttribute('data-i18n-original-title') || '';
        el.title = translateResolver(activeLang, key, fallback);
      }
    });

    // 4. Accessible ARIA Labels: data-i18n-aria="key"
    const ariaLabels = document.querySelectorAll('[data-i18n-aria]');
    ariaLabels.forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      if (key) {
        if (!el.hasAttribute('data-i18n-original-aria')) {
          el.setAttribute('data-i18n-original-aria', el.getAttribute('aria-label') || '');
        }
        const fallback = el.getAttribute('data-i18n-original-aria') || '';
        el.setAttribute('aria-label', translateResolver(activeLang, key, fallback));
      }
    });
  }, [language]);

  // Set language with persistence and DOM synchronization
  const setLanguage = useCallback((newLang) => {
    const validLang = (newLang === 'hi' || newLang === 'mr' || newLang === 'en') ? newLang : 'en';
    setLanguageState(validLang);
    try {
      localStorage.setItem('smartbus_lang', validLang);
      localStorage.setItem('smartbus_language', validLang);
    } catch (e) {
      console.error('Storage write error for i18n:', e);
    }
    updateDOMTranslations(validLang);

    // Notify window listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('languagechange', { detail: { language: validLang } }));
      window.dispatchEvent(new CustomEvent('busmate_languagechange', { detail: { language: validLang } }));
    }
  }, [updateDOMTranslations]);

  // Translate helper bound to active language
  const t = useCallback((key, fallback = '') => {
    return translateResolver(language, key, fallback);
  }, [language]);

  // Run DOM translations whenever active language updates
  useEffect(() => {
    updateDOMTranslations(language);
  }, [language, updateDOMTranslations]);

  // Run DOM translations on dynamic page mutations
  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return;

    let timeoutId = null;
    const observer = new MutationObserver(() => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateDOMTranslations(language);
      }, 50);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [language, updateDOMTranslations]);

  const value = {
    language,
    lang: language,
    setLanguage,
    changeLanguage: setLanguage,
    t,
    translations,
    updateDOMTranslations,
    languages: AVAILABLE_LANGUAGES,
    currentLang: AVAILABLE_LANGUAGES.find(l => l.code === language) || AVAILABLE_LANGUAGES[0]
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    return {
      language: 'en',
      lang: 'en',
      setLanguage: () => {},
      changeLanguage: () => {},
      t: (key, fallback = '') => translateResolver('en', key, fallback),
      languages: AVAILABLE_LANGUAGES,
      currentLang: AVAILABLE_LANGUAGES[0],
      updateDOMTranslations: () => {}
    };
  }
  return context;
};

// Aliases for user specification compatibility
export const LanguageContext = TranslationContext;
export const LanguageProvider = TranslationProvider;
export const useLanguage = useTranslation;

export default TranslationContext;
