import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function ChartPanel({ title, summary, children, columns = [], rows = [] }) {
  const [show, setShow] = useState(false)
  return (
    <section className="card chart-panel" aria-labelledby={`chart-${title.replace(/\W+/g, '-').toLowerCase()}`}>
      <div className="section-heading">
        <div><p className="eyebrow">VISUAL SUMMARY</p><h2 id={`chart-${title.replace(/\W+/g, '-').toLowerCase()}`}>{title}</h2></div>
      </div>
      <p className="chart-summary">{summary}</p>
      <div className="chart-area">{children}</div>
      <button className="text-button" type="button" aria-expanded={show} onClick={() => setShow((value) => !value)}>
        {show ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        {show ? 'Hide data table' : 'Show data table'}
      </button>
      {show && <div className="table-scroll"><table><thead><tr>{columns.map((col) => <th key={col}>{col}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}
    </section>
  )
}
