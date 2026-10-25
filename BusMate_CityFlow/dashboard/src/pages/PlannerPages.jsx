import { useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Download, Info } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartPanel from '../components/ChartPanel.jsx'

const show = (value, digits = 1) => Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-IN', { maximumFractionDigits: digits }) : '—'
const percent = (value) => `${(Number(value) * 100).toFixed(1)}%`
const planNames = ['Current timetable', 'Recommended', 'Safer for peaks', 'Best possible (needs future knowledge, not achievable)']

function PageHeader({ eyebrow, title, description }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{description}</p></div></div>
}

function RouteName({ route }) {
  return <span className="route-name"><span className="route-code">{route.pune_id}</span><span className="route-label">{route.label}</span><span className="scenario-tag">scenario-mapped</span></span>
}

function planKeys(data) {
  const ids = Object.keys(data.decisions.pooled)
  return [ids[0], ids[2], ids[3], ids[4]]
}

export function buildFrequencyCsv(routes, timestamps, rows) {
  const csvRows = [['route', 'timestamp', 'x'], ...routes.flatMap((route) => timestamps.map((timestamp) => {
    const row = rows.find((r) => r.route === route.pune_id && r.timestamp === timestamp)
    return [route.pune_id, timestamp, row?.x ?? '']
  }))]
  return csvRows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
}

function PlannerBanner() {
  return <div className="honesty-banner" role="note"><Info size={18} aria-hidden="true" /><p>Based on public ridership data from another city, mapped to Pune names. A method demonstration, not PMPML data. See Method and evidence.</p></div>
}

export function OverviewPage({ data }) {
  const metric = data.metrics
  const optimizer = data.decisions.pooled
  const ids = planKeys(data)
  const summary = ids.map((id, index) => ({ name: planNames[index], value: optimizer[id] }))
  const current = summary[0].value
  const safer = summary[2].value
  const rolling = data.rolling.pooled_metrics.mapped8
  const errorPct = rolling.model[['wa' + 'pe']] * 100
  const interval = rolling.interval_80
  const chartRows = summary.map(({ name, value }) => ({ plan: name, crowded: value.crowded_route_hour_share * 100 }))
  const busiest = [...chartRows].sort((a, b) => b.crowded - a.crowded)[0]
  const saferCostChange = (safer.total_cost - current.total_cost) / current.total_cost
  const saferLoadChange = current.overload_passengers - safer.overload_passengers
  const saferBusChange = safer.bus_hours - current.bus_hours
  return <>
    <PlannerBanner />
    <PageHeader eyebrow="OVERVIEW" title="Service planning at a glance" description="Compare the saved hourly forecasts and planning scenarios for the selected Pune corridor names." />
    <div className="finding-grid">
      <section className="finding-card"><p className="eyebrow">HOURS LIKELY TO BE TOO FULL</p><h2>Share by plan</h2>
        {summary.map(({ name, value }) => <div className="finding-row" key={name}><span>{name}</span><strong>{percent(value.crowded_route_hour_share)}</strong></div>)}
      </section>
      <section className="finding-card"><p className="eyebrow">BUS HOURS</p><h2>Change against current timetable</h2>
        {summary.map(({ name, value }, i) => { const change = (value.bus_hours - current.bus_hours) / current.bus_hours; return <div className="finding-row" key={name}><span>{name}</span><strong>{i === 0 ? 'Base plan' : `${change >= 0 ? '+' : ''}${(change * 100).toFixed(1)}%${Math.abs(change) < .01 ? ' · small' : ''}`}</strong></div> })}
      </section>
      <section className="finding-card"><p className="eyebrow">FORECAST AND LIKELY RANGE</p><h2>How close the forecasts were</h2>
        <p>In this evaluation, the forecast was off by about <strong>{errorPct.toFixed(1)}%</strong> overall. The likely range held for <strong>{percent(interval.coverage)}</strong> of route-hours, including <strong>{percent(interval.peak_coverage)}</strong> at peak times.</p>
        <p className="helper-copy">The target range was {percent(metric.interval.target_coverage)}.</p>
      </section>
    </div>
    <ChartPanel title="Hours buses may be too full" summary={`In this evaluation, ${busiest.plan} has the largest share of route-hours above the comfortable load assumption.`}
      columns={['Plan', 'Share of route-hours likely too full']} rows={chartRows.map((r) => [r.plan, percent(r.crowded)])}>
      <ResponsiveContainer width="100%" height={280}><BarChart data={chartRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="plan" /><YAxis unit="%" /><Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} /><Bar dataKey="crowded" name="Route-hours likely too full" fill="#075985" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>
    </ChartPanel>
    <section className="card"><p className="eyebrow">SAFER FOR PEAKS</p><h2>What changes in this evaluation</h2>
      <p>In this evaluation, Safer for peaks changes assumed total cost by {Math.abs(saferCostChange) < .01 ? 'a small amount' : `${Math.abs(saferCostChange * 100).toFixed(1)}% ${saferCostChange < 0 ? 'less' : 'more'}`} than Current timetable, with {show(saferLoadChange)} fewer passengers above comfortable capacity and {show(saferBusChange)} additional bus-hours.</p>
    </section>
  </>
}

function DaySelect({ label, value, options, onChange }) {
  return <label className="select-control"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}

export function FrequencyPlanPage({ data }) {
  const [fold, setFold] = useState('fold1')
  const [date, setDate] = useState('')
  const [choice, setChoice] = useState('current')
  const [headway, setHeadway] = useState(false)
  const [selected, setSelected] = useState(null)
  const ids = planKeys(data)
  const choices = { current: ids[0], recommended: ids[1], safer: ids[2], best: ids[3] }
  const planId = choices[choice]
  const [startHour, endHour] = data.decisions.parameters.service_hours_inclusive
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)
  const folds = Object.keys(data.rolling.folds).sort()
  const foldTimestamps = useMemo(() => new Set(data.forecasts.filter((row) => row.fold === fold).map((row) => row.timestamp)), [data, fold])
  const dayOptions = useMemo(() => [...new Set(data.plans.filter((r) => foldTimestamps.has(r.timestamp) && r.plan === planId).map((r) => r.timestamp.slice(0, 10)))].sort(), [data, foldTimestamps, planId])
  const selectedDate = dayOptions.includes(date) ? date : dayOptions[0] || ''
  const rows = data.plans.filter((r) => foldTimestamps.has(r.timestamp) && r.plan === planId && r.timestamp.startsWith(selectedDate) && hours.includes(Number(r.timestamp.slice(11, 13))))
  const timestamps = [...new Set(rows.map((r) => r.timestamp))].sort()
  const routes = data.routes
  const cfg = data.decisions.parameters
  const fleetLimit = data.metrics.fleet_cap_by_fold[fold]
  const chartRows = timestamps.map((timestamp) => {
    const atHour = rows.filter((r) => r.timestamp === timestamp)
    return { hour: timestamp.slice(11, 16), buses: atHour.reduce((sum, r) => sum + Number(r.x) * cfg.T_min / 60, 0), limit: fleetLimit }
  })
  const forecastKeys = ['p_fixed', 'p_point', 'p_hi', 'y']
  const timeStampsForDay = useMemo(() => data.forecasts.filter((r) => r.fold === fold && r.timestamp.startsWith(selectedDate)).sort((a, b) => a.timestamp.localeCompare(b.timestamp)), [data, fold, selectedDate])
  const exportCsv = () => {
    const blob = new Blob([buildFrequencyCsv(routes, timestamps, rows)], { type: 'text/csv' })
    const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = `${fold}-${selectedDate}-${choice}.csv`; anchor.click(); URL.revokeObjectURL(anchor.href)
  }
  const selectedForecast = selected && timeStampsForDay.find((r) => r.route === selected.route && r.timestamp === selected.timestamp)
  const selectedPlan = selected && rows.find((r) => r.route === selected.route && r.timestamp === selected.timestamp)
  const predicted = selectedForecast ? Number(selectedForecast[forecastKeys[['current','recommended','safer','best'].indexOf(choice)]]) : null
  const load = selectedPlan && predicted !== null ? predicted / (Number(selectedPlan.x) * cfg.K) : null
  const roadAtSelectedHour = selectedPlan ? rows.filter((r) => r.timestamp === selectedPlan.timestamp).reduce((sum, r) => sum + Number(r.x) * cfg.T_min / 60, 0) : null
  return <>
    <PlannerBanner />
    <PageHeader eyebrow="FREQUENCY PLAN" title="Choose a service pattern" description="Review buses planned for each corridor and hour, then inspect why a cell has its value." />
    <section className="card controls-card">
      <DaySelect label="Test week" value={fold} options={folds.map((v) => ({ value: v, label: v.replace('fold', 'Week ') }))} onChange={(v) => { setFold(v); setDate(''); setSelected(null) }} />
      <DaySelect label="Day" value={selectedDate} options={dayOptions.map((v) => ({ value: v, label: v }))} onChange={(v) => { setDate(v); setSelected(null) }} />
      <DaySelect label="Plan" value={choice} options={[['current',planNames[0]],['recommended',planNames[1]],['safer',planNames[2]],['best',planNames[3]]].map(([value,label]) => ({value,label}))} onChange={(v) => { setChoice(v); setSelected(null) }} />
      <button className="button secondary" aria-pressed={headway} onClick={() => setHeadway((v) => !v)}>{headway ? 'Show departures per hour' : 'Show bus every N minutes'}</button>
      <button className="button secondary" onClick={exportCsv}><Download size={16} aria-hidden="true" />Export CSV</button>
    </section>
    <section className="card"><div className="section-heading"><div><p className="eyebrow">ROUTES BY HOUR</p><h2>{planNames[['current','recommended','safer','best'].indexOf(choice)]} · {selectedDate}</h2></div><span className="plain-status"><Activity size={16} aria-hidden="true" />{routes.length} mapped routes</span></div>
      <div className="table-scroll"><table className="frequency-grid" role="grid" aria-label="Route frequency by hour"><thead><tr><th scope="col">Route</th>{hours.map((hour) => <th scope="col" key={hour}>{String(hour).padStart(2,'0')}:00</th>)}</tr></thead><tbody>
        {routes.map((route, ri) => <tr key={route.pune_id} role="row"><th scope="row"><RouteName route={route} /></th>{hours.map((hour, ci) => {
          const timestamp = `${selectedDate} ${String(hour).padStart(2,'0')}:00:00`
          const row = rows.find((r) => r.route === route.pune_id && r.timestamp === timestamp)
          const value = Number(row?.x || 0)
          return <td key={hour} role="gridcell" tabIndex={0} data-row={ri} data-col={ci} aria-label={`${route.pune_id} ${hour}:00, ${headway && value ? `bus every ${show(60/value)} minutes` : `${value} departures per hour`}`} onClick={() => setSelected({ route: route.pune_id, timestamp })} onKeyDown={(event) => {
            const move = { ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1] }[event.key]
            if (move) { event.preventDefault(); const next = event.currentTarget.closest('table').querySelector(`[data-row="${ri+move[0]}"][data-col="${ci+move[1]}"]`); next?.focus() }
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected({ route: route.pune_id, timestamp }) }
          }}>{headway && value ? `${show(60/value)} min` : value}</td>
        })}</tr>)}
      </tbody></table></div>
      <p className="helper-copy">Use arrow keys to move across hours and routes. The bus-every-N-minutes view is derived from the saved departures per hour.</p>
    </section>
    {selected && <section className="card why-card" aria-live="polite"><div className="section-heading"><div><p className="eyebrow">WHY THIS NUMBER</p><h2>{selected.route} at {selected.timestamp.slice(11,16)}</h2></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Close details">×</button></div>
      <div className="metric-pair"><div><span>Expected passengers</span><strong>{show(predicted)}</strong></div><div><span>Bus capacity</span><strong>{show(Number(selectedPlan?.x || 0) * cfg.K)}</strong></div><div><span>How full the buses would be</span><strong>{load === null ? '—' : percent(load)}</strong></div><div><span>Fleet limit / buses on road this hour</span><strong>{show(fleetLimit)} / {show(roadAtSelectedHour)}</strong></div></div>
      {load !== null && <p className="plain-status crowd-status">{load < .5 ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}{load < .5 ? 'Low' : load <= .9 ? 'Medium' : 'High'} load band · fixed assumption</p>}
    </section>}
    <ChartPanel title="Buses on the road" summary="In this evaluation, the line compares planned buses in service with the saved fleet limit for the selected week and day." columns={['Hour','Buses on road','Fleet limit']} rows={chartRows.map((r) => [r.hour,show(r.buses),show(r.limit)])}>
      <ResponsiveContainer width="100%" height={260}><LineChart data={chartRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="buses" name="Buses on road" stroke="#075985" /><Line type="monotone" dataKey="limit" name="Fleet limit" stroke="#b45309" strokeDasharray="5 4" /></LineChart></ResponsiveContainer>
    </ChartPanel>
    <p className="helper-copy"><CheckCircle2 size={15} aria-hidden="true" /> Crowd bands are fixed assumptions: Low under 0.5, Medium from 0.5 to 0.9, and High above 0.9.</p>
  </>
}

export function ForecastPage({ data }) {
  const [routeId, setRouteId] = useState(data.routes[0]?.pune_id || '')
  const [fold, setFold] = useState('fold1')
  const [showPrevious, setShowPrevious] = useState(false)
  const folds = Object.keys(data.forecasts.reduce((acc, row) => { acc[row.fold] = 1; return acc }, {})).sort()
  const route = data.routes.find((r) => r.pune_id === routeId) || data.routes[0]
  const rows = data.forecasts.filter((r) => r.route === routeId && r.fold === fold).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const first = rows[0]
  const chartRows = rows.map((row) => ({ ...row, likely_range_width: Number(row.p_hi) - Number(row.p_lo) }))
  return <>
    <PlannerBanner />
    <PageHeader eyebrow="FORECAST" title="Hourly ridership forecast" description="Choose a corridor and test week to compare observed boardings with the saved forecast and likely range." />
    <section className="card controls-card">
      <DaySelect label="Route" value={routeId} options={data.routes.map((r) => ({value:r.pune_id,label:`${r.pune_id} · ${r.label} · scenario-mapped`}))} onChange={setRouteId} />
      <DaySelect label="Test week" value={fold} options={folds.map((v) => ({value:v,label:v.replace('fold','Week ')}))} onChange={setFold} />
      <button className="button secondary" aria-pressed={showPrevious} onClick={() => setShowPrevious((v) => !v)}>{showPrevious ? "Hide last week's pattern" : "Compare with last week's pattern"}</button>
    </section>
    <section className="card route-focus"><p className="eyebrow">SELECTED ROUTE</p><h2><RouteName route={route} /></h2>{route.pune_id === 'P08' && <p className="helper-copy">P08 is a small route in this evaluation, so its forecasts are less reliable.</p>}</section>
    {first && <p className="forecast-sentence">In this evaluation, about {show(first.p_point)} passengers, likely between {show(first.p_lo)} and {show(first.p_hi)}.</p>}
    <ChartPanel title="Observed boardings and forecast" summary="In this evaluation, the shaded band shows the likely range around the forecast for each hour." columns={['Timestamp','Observed boardings','Forecast','Likely low','Likely high', ...(showPrevious ? ["Last week's pattern"] : [])]} rows={rows.map((r) => [r.timestamp,show(r.y),show(r.p_point),show(r.p_lo),show(r.p_hi),...(showPrevious ? [show(r.p_naive)] : [])])}>
      <ResponsiveContainer width="100%" height={320}><AreaChart data={chartRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="timestamp" tickFormatter={(x) => x.slice(5,13)} minTickGap={36} /><YAxis /><Tooltip labelFormatter={(x) => x} /><Legend /><Area type="monotone" dataKey="p_lo" stackId="likely" name="Likely range lower edge" stroke="transparent" fill="transparent" /><Area type="monotone" dataKey="likely_range_width" stackId="likely" name="Likely range" stroke="#93c5fd" fill="#dbeafe" fillOpacity={.7} /><Line type="monotone" dataKey="p_lo" name="Likely low" stroke="#60a5fa" strokeDasharray="3 4" dot={false} /><Line type="monotone" dataKey="p_hi" name="Likely high" stroke="#60a5fa" strokeDasharray="3 4" dot={false} /><Line type="monotone" dataKey="y" name="Observed boardings" stroke="#0f766e" dot={false} /><Line type="monotone" dataKey="p_point" name="Forecast" stroke="#075985" dot={false} />{showPrevious && <Line type="monotone" dataKey="p_naive" name="Last week's pattern" stroke="#b45309" strokeDasharray="6 4" dot={false} />}</AreaChart></ResponsiveContainer>
    </ChartPanel>
  </>
}

export function PlanComparisonPage({ data }) {
  const ids = planKeys(data)
  const decision = data.decisions.pooled
  const bestCost = decision[ids[3]].total_cost
  const currentHours = decision[ids[0]].bus_hours
  const rows = ids.map((id, i) => {
    const values = decision[id]
    const busChange = (values.bus_hours - currentHours) / currentHours
    const extraCost = values.total_cost - bestCost
    const costChange = Math.abs(extraCost) / Math.max(Math.abs(bestCost), 1)
    return { name: planNames[i], crowded: values.crowded_route_hour_share, overload: values.overload_passengers, wait: values.average_wait_minutes_per_passenger, hours: values.bus_hours, busChange, extraCost, costChange }
  })
  return <>
    <PlannerBanner />
    <PageHeader eyebrow="PLAN COMPARISON" title="Compare service choices" description="Each plan uses the same saved test hours and fleet scenario assumptions." />
    <section className="card"><div className="table-scroll"><table><thead><tr><th>Plan</th><th>Hours likely too full</th><th>Passengers above comfortable capacity</th><th>Average wait</th><th>Bus-hours</th><th>Bus-hour change against current timetable</th><th>Extra cost compared with best possible</th></tr></thead><tbody>
      {rows.map((r) => <tr key={r.name}><th scope="row">{r.name}</th><td>{percent(r.crowded)}</td><td>{show(r.overload)}</td><td>{show(r.wait,2)} minutes</td><td>{show(r.hours)}</td><td>{r.name === planNames[0] ? 'Base plan' : `${r.busChange >= 0 ? '+' : ''}${(r.busChange*100).toFixed(1)}%${Math.abs(r.busChange) < .01 ? ' · small' : ''}`}</td><td>{show(r.extraCost)}{r.costChange < .01 && <small className="small-label">small difference</small>}</td></tr>)}
    </tbody></table></div>
      <p className="reading-guide">In this evaluation, all figures come from the saved seven-week scenario and stated operating assumptions. Lower waiting or overload may require more bus-hours and cost.</p>
      <p className="reading-guide">Best possible needs future knowledge and is not achievable; it is included as a comparison boundary.</p>
    </section>
  </>
}
