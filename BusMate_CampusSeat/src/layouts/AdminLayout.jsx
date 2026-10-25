import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  LineChart, 
  ShieldAlert, 
  FileCode2, 
  Scale, 
  FlaskConical, 
  Sliders, 
  BarChart2, 
  Award, 
  Sparkles, 
  BookOpen, 
  ArrowLeft, 
  Activity, 
  Cpu, 
  Menu, 
  X,
  LogOut,
  UserCheck
} from 'lucide-react';
import { AdminAuthGuard } from '../components/admin/AdminAuthGuard';
import { A11yModal } from '../components/accessibility/A11yModal';
import { A11yFloatingBadge } from '../components/accessibility/A11yFloatingBadge';
import { AdhdReadingMask } from '../components/accessibility/AdhdReadingMask';
import { useAccessibility } from '../context/AccessibilityContext';

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { a11yState, setIsModalOpen } = useAccessibility();

  // Retrieve authenticated operator session
  let operatorSession = null;
  try {
    const raw = sessionStorage.getItem('smartbus_admin_session');
    if (raw) operatorSession = JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }

  const handleLogout = () => {
    sessionStorage.removeItem('smartbus_admin_session');
    navigate('/admin/login');
  };

  const navSections = [
    {
      group: 'Operations & Monitoring',
      items: [
        { path: '/admin', label: 'Dashboard Overview', icon: LayoutDashboard },
        { path: '/admin/recommendations', label: 'Fleet Optimization', icon: Award },
      ]
    },
    {
      group: 'ML Intelligence & Predictions',
      items: [
        { path: '/admin/demand', label: 'Demand Forecasting', icon: LineChart },
        { path: '/admin/overcrowding', label: 'Overcrowding Risk', icon: ShieldAlert },
      ]
    },
    {
      group: 'Explainability & Transparency',
      items: [
        { path: '/admin/xai', label: 'SHAP Explainable AI', icon: FileCode2 },
      ]
    },
    {
      group: 'Algorithmic Fairness & Policy',
      items: [
        { path: '/admin/allocation', label: 'Fair Capacity Allocation', icon: Scale },
        { path: '/admin/counterfactual', label: 'Counterfactual Lab', icon: FlaskConical },
        { path: '/admin/calibration', label: 'Policy Calibration', icon: Sliders },
        { path: '/admin/tradeoff', label: 'Fairness Tradeoffs', icon: Activity },
      ]
    },
    {
      group: 'Evaluation & Benchmarks',
      items: [
        { path: '/admin/batch-eval', label: 'Batch Simulation', icon: BarChart2 },
        { path: '/admin/baselines', label: 'Model Baselines', icon: Cpu },
        { path: '/admin/hci-eval', label: 'HCI Empirical Studies', icon: BookOpen },
      ]
    }
  ];

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname === path;
  };

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
        
        {/* Top Admin Telemetry Bar */}
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              aria-label="Toggle admin sidebar"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-sm text-white tracking-tight block leading-tight">
                  BusMate Operator & ML Portal
                </span>
                <span className="text-[10px] font-mono text-teal-400 font-bold">
                  TRANSIT INTELLIGENCE CONSOLE
                </span>
              </div>
            </div>
          </div>

          {/* Live System Diagnostics Badges */}
          <div className="hidden md:flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>MODEL: RF Regressor (R²=0.932)</span>
            </div>
            <div className="px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700 text-sky-400">
              DATA: 4 KAGGLE DATASETS
            </div>
            <div className="px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700 text-slate-300">
              RECORDS: 7,650 TS
            </div>
          </div>

          {/* Actions: Return to Passenger Site & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#075985] hover:bg-[#0C4A6E] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Passenger View</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
              title="Log out of operator session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </header>

        {/* Main Admin Workspace Container */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Admin Navigation Sidebar (Desktop + Mobile Drawer) */}
          <aside 
            className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 p-4 space-y-6 overflow-y-auto transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            aria-label="Admin Navigation Sidebar"
          >
            {/* Operator Session Info */}
            {operatorSession && (
              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-teal-400 font-bold">
                  <UserCheck className="w-4 h-4" />
                  <span>Authenticated Session</span>
                </div>
                <p className="text-[11px] font-mono text-slate-300 truncate">{operatorSession.email}</p>
                <p className="text-[10px] text-slate-400">{operatorSession.role}</p>
              </div>
            )}

            <div className="space-y-6">
              {navSections.map((section, idx) => (
                <div key={idx} className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-3 block">
                    {section.group}
                  </span>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = isActive(item.path);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            active
                              ? 'bg-sky-600 text-white font-black shadow-xs'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                          aria-current={active ? 'page' : undefined}
                        >
                          <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 font-mono space-y-1">
              <p>BusMate Architecture C14 + C11</p>
              <p>Pune Transit Intelligence v1.0.0</p>
            </div>
          </aside>

          {/* Admin Page Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
            <Outlet />
          </main>
        </div>

        {/* Accessibility Engine Controls available inside Admin too */}
        <AdhdReadingMask active={a11yState.adhdMask} />
        <A11yFloatingBadge />
        <A11yModal />
      </div>
    </AdminAuthGuard>
  );
};
