import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

const adminLink = ({ isActive }) =>
  `block rounded-lg px-3 py-2 text-muted hover:bg-slate-100 hover:text-primary ${isActive ? 'bg-slate-100 font-semibold text-primary' : ''}`;

const links = [
  { to: '/admin', end: true, label: 'Dashboard' },
  { to: '/admin/demand', label: 'Demand Prediction' },
  { to: '/admin/overcrowding', label: 'Overcrowding Risk' },
  { to: '/admin/xai', label: 'XAI Explanations' },
  { to: '/admin/allocation', label: 'Run Allocation' },
  { to: '/admin/counterfactual', label: 'Counterfactual Lab' },
  { to: '/admin/policy', label: 'Policy Calibration' },
  { to: '/admin/fleet', label: 'Fleet Management' },
  { to: '/admin/hci', label: 'HCI Evaluation' },
];

export default function AdminLayout() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row sm:px-6">
      <aside className="lg:w-64 shrink-0">
        <div className="sticky top-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-4 flex items-center gap-2 font-bold text-primary">
            <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
            Admin & Research
          </p>
          <nav className="flex flex-col gap-1" aria-label="Admin navigation">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={adminLink}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
