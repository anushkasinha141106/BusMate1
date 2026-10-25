import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, CircleHelp } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { translate } from '../i18n/translations.js'
import ChartPanel from '../components/ChartPanel.jsx'
import RiskBadge from '../components/RiskBadge.jsx'

function PageHeader({ eyebrow, title, description }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{description}</p></div></div>
}

function RouteName({ route }) {
  return <span className="route-name"><span className="route-code">{route.pune_id}</span><span className="route-label">{route.label}</span><span className="scenario-tag">scenario-mapped</span></span>
}

function RouteTable({ routes, xMax }) {
  return <div className="table-scroll"><table><thead><tr><th>Pune ID</th><th>Corridor label</th><th>Source route ID</th><th>Type</th><th>x_max</th></tr></thead>
    <tbody>{routes.map((r) => <tr key={r.pune_id}><td><strong>{r.pune_id}</strong></td><td><span className="route-cell-label">{r.label}<span className="scenario-tag">scenario-mapped</span></span></td><td><code>{r.source_route}</code></td><td>{r.type}</td><td>{fmt(xMax[r.source_route])}</td></tr>)}</tbody></table></div>
}

export function ModelAndData({ data }) {
  const { language } = usePreferences()
  const m = data.metrics
  const routes = data.routes
  const folds = Object.entries(data.rolling.folds).filter(([k]) => /^fold\d+$/.test(k))
  const split = folds.map(([fold, f]) => `${fold.replace('fold', 'Fold ')} test ${f.test_start}–${f.test_end}`).join(' · ')
  const serviceHours = m.data.config.service_hours_inclusive.join('–')
  const firstTest = folds[0]?.[1]?.test_start
  const lastTest = folds.at(-1)?.[1]?.test_end
  const firstCalibration = folds[0]?.[1]?.calibration_start
  const lastCalibration = folds[0]?.[1]?.calibration_end
  const calibrationDays = firstCalibration && lastCalibration
    ? Math.round((Date.parse(`${lastCalibration}T00:00:00Z`) - Date.parse(`${firstCalibration}T00:00:00Z`)) / 86400000) + 1 : null
  return <>
    <div className="honesty-banner" role="note"><CircleHelp size={18} aria-hidden="true" /><p>{translate(language, 'honesty')}</p></div>
    <PageHeader eyebrow="MODEL & DATA" title="What CityFlow measures" description="A transparent view of the observed dataset, scenario mapping, evaluation split and operating assumptions." />
    <div className="grid-two">
      <section className="card"><p className="eyebrow">DATA SOURCE</p><h2>Observed data, scenario labels</h2>
        <p>{m.data.source}</p><p className="muted">UrbanBus licence and city: to be confirmed</p>
        <RiskBadge tone="warning">Scenario outputs use assumed capacity and weights</RiskBadge>
      </section>
      <section className="card"><p className="eyebrow">EVALUATION SPLIT</p><h2>{folds.length} rolling test weeks</h2>
        <p>Test dates run from {firstTest} through {lastTest}. Each fold uses the preceding {calibrationDays} days for calibration, with earlier dates for training.</p>
        <details className="inline-details"><summary>Fold dates</summary><p>{split}</p></details>
      </section>
    </div>
    <section className="card"><div className="section-heading"><div><p className="eyebrow">MAPPED CORRIDORS</p><h2>Scenario routes</h2></div><span className="plain-status"><CheckCircle2 size={16} aria-hidden="true" />{routes.length} routes in this evaluation</span></div>
      <RouteTable routes={routes} xMax={m.data.config.x_max_by_route} />
    </section>
    <div className="grid-two">
      <section className="card"><p className="eyebrow">FILTERING</p><h2>Bus-only scope</h2>
        <p><code>SER_9b2d</code> is a rail-transit record. It is excluded because this project covers buses.</p>
        <p>Scoring uses service hours {serviceHours}:00 inclusive. The fixed plan is a baseline assumption, not a measured timetable.</p>
      </section>
      <section className="card"><p className="eyebrow">LIMITS</p><h2>Claims not made</h2>
        <ul className="clean-list"><li>These values are not measured Pune ridership and do not establish observed Pune crowding.</li><li>They do not establish real PMPML improvement or emissions saved.</li><li>CityFlow does not claim WCAG compliance or that the fixed plan is the real timetable.</li><li>Settings persist between dashboards only when they share a browser origin.</li></ul>
      </section>
    </div>
    <section className="card"><p className="eyebrow">PLANNING PARAMETERS</p><h2>Capacity, cost and fleet assumptions</h2>
      <div className="parameter-grid">{[['K', m.data.config.K], ['L', m.data.config.L], ['T', `${m.data.config.T_min} min`], ['w_wait', m.data.config.w_wait], ['w_over', m.data.config.w_over], ['w_op', m.data.config.w_op]].map(([k,v]) => <div className="parameter" key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
      <div className="table-scroll compact-table"><table><thead><tr><th>Fold</th><th>Fleet cap F (buses)</th></tr></thead><tbody>{Object.entries(m.fleet_cap_by_fold).map(([fold, cap]) => <tr key={fold}><td>{fold}</td><td>{fmt(cap)}</td></tr>)}</tbody></table></div>
      <p className="helper-copy">x_max is route-specific and selected from training-period service-hour boardings. Capacity, cost weights and fleet settings are assumptions.</p>
    </section>
  </>
}

export function ModelComparison({ data }) {
  const rolling = data.rolling
  const folds = Object.entries(rolling.fold_metrics).filter(([k]) => /^fold\d+$/.test(k)).map(([fold, values]) => ({
    fold: fold.replace('fold', 'F'),
    Naive: values.mapped8.seasonal_naive.wape * 100,
    'Historical average': values.mapped8.historical_average.wape * 100,
    Model: values.mapped8.model.wape * 100,
  }))
  const pooled = rolling.pooled_metrics.mapped8
  const wins = rolling.fold_wape_differences.mapped8.folds_model_beats_naive
  const foldCount = folds.length
  const perRoute = rolling.per_mapped_route_wape
  const p08 = data.routes.find((r) => r.pune_id === 'P08')
  const p08Stats = perRoute[p08.source_route]
  const chartRows = [...folds, { fold: 'Pooled', Naive: pooled.seasonal_naive.wape*100, 'Historical average': pooled.historical_average.wape*100, Model: pooled.model.wape*100 }]
  const hours = data.metrics.data.config.service_hours_inclusive
  const hourLabel = `${String(hours[0]).padStart(2, '0')}:00–${String(hours[1]).padStart(2, '0')}:00`
  return <>
    <PageHeader eyebrow="MODEL COMPARISON" title="Forecast performance" description="Rolling test results compare three forecasting approaches against observed hourly boardings." />
    <div className="metric-strip"><div><span>Model folds won</span><strong>{wins} of {foldCount}</strong></div><div><span>Pooled mapped-route rows</span><strong>{fmt(pooled.n_service_rows)}</strong></div><div><span>Scoring hours</span><strong>{hourLabel}</strong></div></div>
    <ChartPanel title="WAPE by test fold" summary={`In this evaluation, the model beats the seasonal naive baseline in ${wins} of ${foldCount} test folds. Lower WAPE is better; 1 - WAPE is shown as a companion scale.`}
      columns={['Fold','Naive WAPE','Historical average WAPE','Model WAPE','Naive 1 - WAPE','Historical average 1 - WAPE','Model 1 - WAPE']}
      rows={chartRows.map((r) => [r.fold, `${r.Naive.toFixed(2)}%`, `${r['Historical average'].toFixed(2)}%`, `${r.Model.toFixed(2)}%`, `${(100-r.Naive).toFixed(2)}%`, `${(100-r['Historical average']).toFixed(2)}%`, `${(100-r.Model).toFixed(2)}%`])}>
      <ResponsiveContainer width="100%" height={310}><LineChart data={chartRows} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#dbe4ed" /><XAxis dataKey="fold" /><YAxis unit="%" /><Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} /><Legend /><Line type="monotone" dataKey="Naive" stroke="#075985" strokeWidth={2.5} /><Line type="monotone" dataKey="Historical average" stroke="#0F766E" strokeWidth={2.5} strokeDasharray="5 4" /><Line type="monotone" dataKey="Model" stroke="#D84E55" strokeWidth={2.5} /></LineChart></ResponsiveContainer>
    </ChartPanel>
    <div className="grid-two">
      <section className="card"><p className="eyebrow">POOLED MAPPED 8</p><h2>Overall forecast error</h2>
        <div className="table-scroll"><table><thead><tr><th>Method</th><th>WAPE</th><th>1 - WAPE</th><th>MAE</th><th>RMSE</th></tr></thead><tbody>
          {[['Naive',pooled.seasonal_naive],['Historical average',pooled.historical_average],['Model',pooled.model]].map(([name,v]) => <tr key={name}><td>{name}</td><td>{PCT(v.wape)}</td><td>{PCT(1-v.wape)}</td><td>{fmt(v.mae)}</td><td>{fmt(v.rmse)}</td></tr>)}
        </tbody></table></div>
        <p className="helper-copy">WAPE is total absolute error divided by total observed boardings. “1 - WAPE” is shown as a complement scale.</p>
      </section>
      <section className="card"><p className="eyebrow">INTERVAL CHECK</p><h2>Prediction interval coverage</h2>
        <p>In this evaluation, the pooled {PCT(data.metrics.interval.target_coverage)} target interval contains {PCT(pooled.interval_80.coverage)} of mapped route-hour observations overall and {PCT(pooled.interval_80.peak_coverage)} during peak hours.</p>
        <div className="metric-pair"><div><span>Overall coverage</span><strong>{PCT(pooled.interval_80.coverage)}</strong></div><div><span>Peak-hour coverage</span><strong>{PCT(pooled.interval_80.peak_coverage)}</strong></div></div>
      </section>
    </div>
    <section className="card p08-card"><div><p className="eyebrow">ROUTE SPOTLIGHT</p><h2><RouteName route={p08} /></h2><p>{p08.label} is shown separately because its source-route forecast error differs from the other mapped routes.</p></div>
      <div className="metric-pair"><div><span>Model WAPE</span><strong>{PCT(p08Stats.model_wape)}</strong></div><div><span>Naive WAPE</span><strong>{PCT(p08Stats.seasonal_naive_wape)}</strong></div></div></section>
  </>
}

export function FleetTradeoff({ data }) {
  const decision = data.decisions
  const plans = ['fixed','naive','point','robust','oracle']
  const labels = { fixed:'Fixed', naive:'Naive', point:'LGBM point', robust:'LGBM robust', oracle:'Oracle' }
  const fixedHours = decision.pooled.fixed.bus_hours
  const rows = plans.map((plan) => {
    const v = decision.pooled[plan]
    const change = (v.bus_hours-fixedHours)/fixedHours
    return { plan: labels[plan], raw: plan, Regret: v.regret_vs_oracle, Overload: v.overload_passengers,
      'Crowded route-hours': v.crowded_route_hours, 'Crowded share': v.crowded_route_hour_share,
      'Avg wait': v.average_wait_minutes_per_passenger, 'Bus-hours': v.bus_hours,
      'Bus-hour change': change, label: plan==='oracle'?'not achievable: uses the true demand':undefined }
  })
  const chart = rows.map((r) => ({ plan:r.plan, Regret:r.Regret }))
  const scoreRows = rows.map((r) => [r.plan, r.label || '', fmt(r.Regret), fmt(r.Overload), `${fmt(r['Crowded route-hours'])} (${PCT(r['Crowded share'])})`, `${fmt(r['Avg wait'])} min`, fmt(r['Bus-hours']), `${r['Bus-hour change'] >= 0 ? '+' : ''}${(r['Bus-hour change']*100).toFixed(2)}%${Math.abs(r['Bus-hour change'])<.01?' · small':''}`])
  const trade = data.tradeoff.runs
  return <>
    <PageHeader eyebrow="COMPARE WITH CURRENT" title="Decisions under the same fleet cap" description="Each forecast plan chooses service levels from its own demand estimate; actual boardings score the resulting plan." />
    <ChartPanel title="Pooled decision regret" summary="In this evaluation, the robust plan has the lowest forecast-plan regret among the non-oracle plans; the oracle is a reference that uses true demand and is not achievable."
      columns={['Plan','Regret']} rows={chart.map((r) => [r.plan,fmt(r.Regret)])}>
      <ResponsiveContainer width="100%" height={280}><BarChart data={chart} margin={{ top: 8, right: 18, left: 8, bottom: 10 }}><CartesianGrid strokeDasharray="3 3" stroke="#dbe4ed" /><XAxis dataKey="plan" /><YAxis /><Tooltip formatter={(v) => fmt(v)} /><Bar dataKey="Regret" fill="#075985" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer>
    </ChartPanel>
    <section className="card"><div className="section-heading"><div><p className="eyebrow">POOLED SCORECARD</p><h2>Five-plan comparison</h2></div><RiskBadge tone="info">Computed scenario metrics</RiskBadge></div>
      <div className="table-scroll"><table><thead><tr><th>Plan</th><th>Regret</th><th>Overload passengers</th><th>Crowded route-hours</th><th>Avg wait / passenger</th><th>Bus-hours</th><th>Change vs fixed</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.raw}><td><strong>{r.plan}</strong>{r.label && <small className="oracle-note">{r.label}</small>}</td><td>{fmt(r.Regret)}</td><td>{fmt(r.Overload)}</td><td>{fmt(r['Crowded route-hours'])} · {PCT(r['Crowded share'])}</td><td>{fmt(r['Avg wait'])} min</td><td>{fmt(r['Bus-hours'])}</td><td>{`${r['Bus-hour change'] >= 0 ? '+' : ''}${(r['Bus-hour change']*100).toFixed(2)}%`}{Math.abs(r['Bus-hour change'])<.01 && <small className="small-label">small difference</small>}</td></tr>)}
      </tbody></table></div>
      <p className="helper-copy">In this evaluation, “small” labels bus-hour changes below 1% relative to fixed.</p>
    </section>
    <section className="card"><p className="eyebrow">ONE-AT-A-TIME SENSITIVITY</p><h2>Regret ranking across settings</h2>
      <p>In this evaluation, the ranking stayed the same as the main run in every saved sensitivity setting.</p>
      <div className="table-scroll"><table><thead><tr><th>Setting</th><th>Best-to-worst regret ranking</th><th>Same as main</th></tr></thead><tbody>
        {Object.entries(trade).map(([key, run]) => <tr key={key}><td>{key}</td><td>{run.regret_ranking_best_to_worst.map((p) => labels[p]).join(' → ')}</td><td><span className="plain-status"><CheckCircle2 size={15} aria-hidden="true" />{run.ranking_identical_to_main ? 'Yes' : 'No'}</span></td></tr>)}
      </tbody></table></div>
    </section>
  </>
}

export function StatisticalTestsPage({ data }) {
  const decision = data.decisions
  const tests = decision.wilcoxon_daily_route_level_regret
  const ranking = decision.forecast_error_vs_regret_ranking
  const labels = { fixed: 'Fixed', naive: 'Naive', point: 'LGBM point', robust: 'LGBM robust', oracle: 'Oracle' }
  return <>
    <PageHeader eyebrow="METHOD AND EVIDENCE" title="Statistical tests and rankings" description="Paired daily route-level tests and the saved forecast-error and planning-regret orderings." />
    <section className="card"><p className="eyebrow">PAIRED DAILY ROUTE COST</p><h2>Wilcoxon signed-rank</h2>
      <div className="table-scroll"><table><thead><tr><th>Comparison</th><th>p-value</th><th>Median paired cost difference</th><th>Paired observations</th></tr></thead><tbody>
        {[["Point vs fixed",tests.point_vs_fixed],["Robust vs fixed",tests.robust_vs_fixed],["Point vs naive",tests.point_vs_naive]].map(([name,v]) => <tr key={name}><td>{name}</td><td>{Number(v.p_value).toExponential(3)}</td><td>{fmt(v.median_paired_difference)}</td><td>{fmt(v.n_daily_route_pairs)}</td></tr>)}
      </tbody></table></div><p className="helper-copy">Negative paired differences mean the first method had lower daily route-level cost in this evaluation.</p>
    </section>
    <section className="card"><p className="eyebrow">TWO ORDERINGS</p><h2>Forecast error and planning regret</h2>
      <div className="rank-columns"><div><h3>Forecast error · best first</h3><ol>{ranking.forecast_error_order_best_to_worst.map((p) => <li key={p}>{labels[p]}</li>)}</ol></div><div><h3>Planning regret · lowest first</h3><ol>{ranking.regret_order_best_to_worst.map((p) => <li key={p}>{labels[p]}</li>)}</ol></div></div>
    </section>
  </>
}

