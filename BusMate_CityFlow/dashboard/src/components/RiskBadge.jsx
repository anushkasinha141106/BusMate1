import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

const styles = {
  info: { cls: 'risk-info', Icon: Info },
  warning: { cls: 'risk-warning', Icon: AlertTriangle },
  success: { cls: 'risk-success', Icon: CheckCircle2 },
}

export default function RiskBadge({ children, tone = 'info' }) {
  const { cls, Icon } = styles[tone] || styles.info
  return <span className={`risk-badge ${cls}`} role="status"><Icon size={16} aria-hidden="true" /><span>{children}</span></span>
}
