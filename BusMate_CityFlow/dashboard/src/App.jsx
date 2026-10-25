import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Accessibility, ArrowUpRight, BusFront, CheckCircle2, ChevronDown, Globe2, LogOut, Menu, UserRound, X } from 'lucide-react'
import { usePreferences } from './context/PreferencesContext.jsx'
import { translate } from './i18n/translations.js'
import { ModelAndData, ModelComparison, FleetTradeoff, StatisticalTestsPage } from './pages/MethodPages.jsx'
import { OverviewPage, FrequencyPlanPage, ForecastPage, PlanComparisonPage } from './pages/PlannerPages.jsx'

const URLS = {
  metrics: '/api/d2/metrics.json',
  forecasts: '/api/d2/forecast_sample.json',
  plans: '/api/d2/plans.json',
  routes: '/api/d2/routes.json',
  tradeoff: '/api/d2/tradeoff.json',
  decisions: '/api/d2/decision_metrics.json',
  rolling: '/api/d2/rolling_metrics.json',
}
const NUM = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
const PCT = (v) => `${(Number(v) * 100).toFixed(2)}%`
const fmt = (v) => Number.isFinite(Number(v)) ? NUM.format(Number(v)) : '—'

function useDashboardData() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let live = true
    Promise.all(Object.entries(URLS).map(async ([key, url]) => {
      const response = await fetch(url)
      if (response.status === 401) window.dispatchEvent(new Event('cityflow-unauthorized'))
      if (!response.ok) throw new Error(`${url}: ${response.status}`)
      return [key, await response.json()]
    })).then((entries) => { if (live) setData(Object.fromEntries(entries)) })
      .catch(() => { if (live) setError(true) })
    return () => { live = false }
  }, [])
  return { data, error }
}

function AccessPanel({ open, onClose }) {
  const { prefs, setPrefs } = usePreferences()
  useEffect(() => {
    if (!open) return undefined
    const handle = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [open, onClose])
  if (!open) return null
  const update = (key, value) => setPrefs((current) => ({ ...current, [key]: value }))
  return <div className="drawer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <aside className="access-drawer" role="dialog" aria-modal="true" aria-labelledby="access-title">
      <div className="drawer-head"><div><span className="eyebrow">DISPLAY PREFERENCES</span><h2 id="access-title">Accessibility controls</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close accessibility controls"><X size={19} /></button></div>
      <div className="control-block"><div className="control-title">Font scale</div>
        <div className="control-row"><button className="button secondary" onClick={() => update('fontScale', Math.max(.8, Number((prefs.fontScale - .1).toFixed(1))))} disabled={prefs.fontScale <= .8}>Smaller text</button>
          <button className="button secondary" onClick={() => update('fontScale', Math.min(1.5, Number((prefs.fontScale + .1).toFixed(1))))} disabled={prefs.fontScale >= 1.5}>Larger text</button></div>
      </div>
      <Toggle label="Expanded text spacing" checked={prefs.textSpacing} onChange={(v) => update('textSpacing', v)} />
      <Toggle label="Dyslexia-friendly font" checked={prefs.dyslexiaFont} onChange={(v) => update('dyslexiaFont', v)} />
      <Toggle label="High contrast" checked={prefs.highContrast} onChange={(v) => update('highContrast', v)} />
      <p className="helper-copy">Preferences are stored in this browser. Cross-dashboard persistence depends on both dashboards sharing an origin.</p>
      <button className="button primary full-width" onClick={onClose}>Done / Close panel</button>
    </aside>
  </div>
}

function Toggle({ label, checked, onChange }) {
  return <label className="toggle-row"><span>{label}</span><input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} /></label>
}

function Navbar({ onAccess, session, onLogout }) {
  const { language, setLanguage } = usePreferences()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState(null)
  const t = (key) => translate(language, key)
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') { setOpenMenu(null); setMobileOpen(false) } }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])
  const links = [['/overview', 'overview'], ['/frequency', 'frequencyPlan'], ['/forecast', 'forecast'], ['/compare', 'planComparison']]
  const switchLinks = [
    [import.meta.env.VITE_HUB_URL || 'http://127.0.0.1:5170', 'BusMate home'],
    [import.meta.env.VITE_CAMPUSSEAT_URL || 'http://127.0.0.1:5173', 'CampusSeat'],
  ]
  const methodLinks = [['/method/model', 'Model and data'], ['/method/comparison', 'Model comparison'], ['/method/current', 'Fleet trade-off'], ['/method/tests', 'Statistical tests and rankings']]
  const toggleMenu = (name) => setOpenMenu((current) => current === name ? null : name)
  return <header className="site-header" role="banner"><div className="nav-inner">
    <Link to="/overview" className="brand" aria-label="BusMate CityFlow overview"><span className="brand-mark"><BusFront size={23} aria-hidden="true" /></span>
      <span className="brand-copy"><strong>BusMate · CityFlow</strong></span></Link>
    <button className="icon-button mobile-menu-button" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="cityflow-primary-nav" onClick={() => setMobileOpen((v) => !v)}>{mobileOpen ? <X /> : <Menu />}</button>
    <div className={`nav-content ${mobileOpen ? 'nav-open' : ''}`}>
    <nav id="cityflow-primary-nav" className="main-nav" aria-label="CityFlow navigation">
      {links.map(([to, key]) => <NavLink key={to} to={to} onClick={() => { setMobileOpen(false); setOpenMenu(null) }} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>{t(key)}</NavLink>)}
    </nav>
    <div className="nav-actions">
      <div className="nav-popover"><button className="nav-link dropdown-trigger" aria-expanded={openMenu === 'method'} aria-haspopup="menu" onClick={() => toggleMenu('method')}>Method and evidence <ChevronDown size={15} aria-hidden="true" /></button>
        {openMenu === 'method' && <div className="dropdown-menu" role="menu">{methodLinks.map(([to, label]) => <NavLink role="menuitem" key={to} to={to} onClick={() => { setOpenMenu(null); setMobileOpen(false) }}>{label}</NavLink>)}</div>}</div>
      <div className="nav-popover"><button className="access-button" aria-expanded={openMenu === 'switch'} aria-haspopup="menu" onClick={() => toggleMenu('switch')}><ArrowUpRight size={16} aria-hidden="true" />Switch <ChevronDown size={14} aria-hidden="true" /></button>
        {openMenu === 'switch' && <div className="dropdown-menu align-right" role="menu">{switchLinks.map(([href, label]) => <a role="menuitem" key={label} href={href} onClick={() => setOpenMenu(null)}>{label}</a>)}</div>}</div>
      <button className="access-button" onClick={onAccess}><Accessibility size={17} aria-hidden="true" /><span>Accessibility</span></button>
      <label className="language-control"><Globe2 size={16} aria-hidden="true" /><span className="sr-only">Language</span>
        <select aria-label="Language" value={language} onChange={(e) => setLanguage(e.target.value)}><option value="en">English</option><option value="hi">Hindi</option><option value="mr">Marathi</option></select></label>
      <div className="nav-popover"><button className="access-button user-trigger" aria-expanded={openMenu === 'user'} aria-haspopup="menu" onClick={() => toggleMenu('user')}><UserRound size={16} aria-hidden="true" /><span>{session.username}</span><ChevronDown size={14} aria-hidden="true" /></button>
        {openMenu === 'user' && <div className="dropdown-menu align-right" role="menu"><button role="menuitem" onClick={() => { setOpenMenu(null); onLogout() }}><LogOut size={15} aria-hidden="true" />Logout</button></div>}</div>
    </div></div>
  </div></header>
}

function Footer() {
  return <footer className="site-footer" role="contentinfo"><div className="footer-inner">
    <div className="footer-brand"><span className="brand-mark"><BusFront size={20} /></span><div><strong>CityFlow</strong></div></div>
    <p>Scenario planning prototype · assumptions shown with results</p>
    <div className="footer-status"><CheckCircle2 size={16} aria-hidden="true" /><span>Static evaluation data loaded</span></div>
  </div><div className="footer-bottom">Observed UrbanBus data, scenario-mapped to Pune corridor names.</div></footer>
}

function Layout({ children, session, onLogout }) {
  const [accessOpen, setAccessOpen] = useState(false)
  return <><a className="skip-link" href="#main-content">Skip to content</a><Navbar session={session} onLogout={onLogout} onAccess={() => setAccessOpen(true)} />
    <div className="page-wrap"><main id="main-content" tabIndex="-1">{children}</main></div><Footer /><AccessPanel open={accessOpen} onClose={() => setAccessOpen(false)} /></>
}

function DashboardApp({ session, onLogout }) {
  const { data, error } = useDashboardData()
  const { language } = usePreferences()
  const title = useMemo(() => translate(language, 'appName'), [language])
  if (error) return <Layout session={session} onLogout={onLogout}><div className="loading-card" role="alert">{translate(language,'dataError')}</div></Layout>
  if (!data) return <Layout session={session} onLogout={onLogout}><div className="loading-card" role="status"><span className="spinner" />{translate(language,'loading')}</div></Layout>
  return <Layout session={session} onLogout={onLogout}><Routes><Route path="/" element={<Navigate to="/overview" replace />} />
    <Route path="/overview" element={<OverviewPage data={data} />} />
    <Route path="/frequency" element={<FrequencyPlanPage data={data} />} />
    <Route path="/forecast" element={<ForecastPage data={data} />} />
    <Route path="/compare" element={<PlanComparisonPage data={data} />} />
    <Route path="/method" element={<Navigate to="/method/model" replace />} />
    <Route path="/method/model" element={<ModelAndData data={data} />} />
    <Route path="/method/comparison" element={<ModelComparison data={data} />} />
    <Route path="/method/current" element={<FleetTradeoff data={data} />} />
    <Route path="/method/tests" element={<StatisticalTestsPage data={data} />} />
    <Route path="/model" element={<Navigate to="/method/model" replace />} />
    <Route path="/comparison" element={<Navigate to="/method/comparison" replace />} />
    <Route path="/current" element={<Navigate to="/compare" replace />} />
    <Route path="*" element={<Navigate to="/model" replace />} />
  </Routes><p className="language-note">{translate(language,'languageNote')}</p><span className="sr-only">{title}</span></Layout>
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ username, password }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Invalid username or password')
      onLogin(body)
    } catch (err) { setError(err.message || 'Unable to sign in') }
    finally { setBusy(false) }
  }
  return <main className="login-page" id="main-content"><section className="login-card" aria-labelledby="login-title">
    <div className="brand-mark"><BusFront size={24} aria-hidden="true" /></div><p className="eyebrow">BUSMATE · CITYFLOW</p>
    <h1 id="login-title">Authorised access</h1><p>CityFlow is for authorised bus planners only.</p>
    <form onSubmit={submit}><label>Username<input autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} /></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="button primary full-width" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form></section></main>
}

function SessionApp() {
  const [session, setSession] = useState(undefined)
  const location = useLocation()
  useEffect(() => {
    const unauthorized = () => setSession(null)
    window.addEventListener('cityflow-unauthorized', unauthorized)
    fetch('/api/auth/me', { credentials: 'same-origin' }).then((r) => r.ok ? r.json() : null).then(setSession).catch(() => setSession(null))
    return () => window.removeEventListener('cityflow-unauthorized', unauthorized)
  }, [])
  if (session === undefined) return <main className="login-page" role="status">Checking access…</main>
  if (!session) return location.pathname === '/login' ? <LoginPage onLogin={setSession} /> : <Navigate to="/login" replace />
  if (location.pathname === '/login') return <Navigate to="/overview" replace />
  async function logout() { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); setSession(null) }
  return <DashboardApp session={session} onLogout={logout} />
}

export default SessionApp
