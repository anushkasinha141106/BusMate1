import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const PreferenceContext = createContext(null)
const DEFAULT = { fontScale: 1, textSpacing: false, dyslexiaFont: false, highContrast: false }

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem('app_a11y_state') || '{}') } }
    catch { return DEFAULT }
  })
  const [language, setLanguageState] = useState(() => {
    try { return ['en', 'hi', 'mr'].includes(localStorage.getItem('smartbus_language')) ? localStorage.getItem('smartbus_language') : 'en' }
    catch { return 'en' }
  })

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--a11y-font-scale', String(prefs.fontScale))
    root.classList.toggle('a11y-text-spacing', prefs.textSpacing)
    root.classList.toggle('a11y-dyslexia', prefs.dyslexiaFont)
    root.classList.toggle('a11y-high-contrast', prefs.highContrast)
    try { localStorage.setItem('app_a11y_state', JSON.stringify(prefs)) } catch { /* storage may be disabled */ }
  }, [prefs])

  const setLanguage = useCallback((next) => {
    setLanguageState(next)
    document.documentElement.lang = next
    try { localStorage.setItem('smartbus_language', next) } catch { /* storage may be disabled */ }
  }, [])
  const value = useMemo(() => ({ prefs, setPrefs, language, setLanguage }), [prefs, language, setLanguage])
  return <PreferenceContext.Provider value={value}>{children}</PreferenceContext.Provider>
}

export function usePreferences() {
  const value = useContext(PreferenceContext)
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider')
  return value
}
