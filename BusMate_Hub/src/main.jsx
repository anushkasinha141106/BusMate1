import React from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowUpRight, BusFront, ChartNoAxesCombined, Contrast, Accessibility, ExternalLink } from 'lucide-react'
import './style.css'

const destinations = [
  {
    name: 'CampusSeat',
    kind: 'Campus shuttle booking',
    description: 'Campus shuttle booking and fair seat allocation. For IIIT Pune students and staff.',
    detail: 'Sign in or create a student account on the next page.',
    href: import.meta.env.VITE_CAMPUSSEAT_URL || 'http://127.0.0.1:5173',
    icon: BusFront,
    tone: 'campus',
    action: 'Open CampusSeat',
  },
  {
    name: 'CityFlow',
    kind: 'City bus demand planning',
    description: 'City bus demand forecasting and fleet planning. For authorised bus planners only.',
    detail: 'Access is granted by an administrator. There is no public signup.',
    href: import.meta.env.VITE_CITYFLOW_URL || 'http://127.0.0.1:5174',
    icon: ChartNoAxesCombined,
    tone: 'city',
    action: 'Open CityFlow',
  },
]

function App() {
  const [large, setLarge] = React.useState(false)
  const [contrast, setContrast] = React.useState(false)
  React.useEffect(() => {
    document.documentElement.dataset.large = String(large)
    document.documentElement.dataset.contrast = String(contrast)
  }, [large, contrast])

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to main content</a>
    <header className="topbar">
      <a className="brand" href="#main" aria-label="BusMate home">
        <span className="brand-mark"><BusFront aria-hidden="true" size={23} /></span>
        <span><strong>BusMate</strong><small>TRANSPORT TOOLS</small></span>
      </a>
      <div className="access-tools" aria-label="Accessibility controls">
        <button type="button" onClick={() => setLarge(v => !v)} aria-pressed={large}>
          <Accessibility size={17} aria-hidden="true" /> <span>Text size</span>
        </button>
        <button type="button" onClick={() => setContrast(v => !v)} aria-pressed={contrast}>
          <Contrast size={17} aria-hidden="true" /> <span>Contrast</span>
        </button>
      </div>
    </header>
    <main id="main" className="content">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">Your transport workspace</p>
        <h1 id="page-title">Choose where to go</h1>
        <p className="subtitle">Two tools, one project: campus shuttle booking and city bus demand planning</p>
      </section>
      <section className="tool-grid" aria-label="BusMate tools">
        {destinations.map(({ name, kind, description, detail, href, icon: Icon, tone, action }) =>
          <article className={`tool-card ${tone}`} key={name}>
            <div className="card-top">
              <span className="tool-icon"><Icon size={25} aria-hidden="true" /></span>
              <span className="plain-status"><span className="status-dot" aria-hidden="true">●</span> Separate app</span>
            </div>
            <p className="eyebrow">{kind}</p>
            <h2>{name}</h2>
            <p className="description">{description}</p>
            <p className="detail">{detail}</p>
            <a className="launch-link" href={href} aria-label={`${action}, opens in a new tab`} target="_blank" rel="noreferrer">
              <span>{action}</span><ArrowUpRight size={19} aria-hidden="true" />
            </a>
          </article>
        )}
      </section>
      <p className="origin-note"><ExternalLink size={15} aria-hidden="true" /> Each tool opens in its own app and keeps its own sign-in and settings.</p>
    </main>
    <footer className="footer">
      <span className="footer-mark"><BusFront size={19} aria-hidden="true" /></span>
      <p>CityFlow uses observed public ridership from another city, mapped to Pune corridor names. CampusSeat is rule-based and uses no machine learning.</p>
    </footer>
  </div>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)

