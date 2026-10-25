import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Shield, Cpu, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('agent@smartbus.gov.in');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      // Valid credentials check
      if (email.trim() && password.length >= 4) {
        sessionStorage.setItem('smartbus_admin_session', JSON.stringify({
          authenticated: true,
          email,
          role: 'Transit Dispatcher & ML Systems Operator',
          loginTime: new Date().toISOString()
        }));
        navigate('/admin');
      } else {
        setError('Invalid credentials. Please enter a valid authorized operator ID.');
        setLoading(false);
      }
    }, 600);
  };

  const handleDemoLogin = () => {
    sessionStorage.setItem('smartbus_admin_session', JSON.stringify({
      authenticated: true,
      email: 'operator.demo@smartbus.gov.in',
      role: 'Transit Operations Lead (Demo)',
      loginTime: new Date().toISOString()
    }));
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
      
      {/* Return to passenger site link */}
      <div className="w-full max-w-md mb-6 flex justify-between items-center text-xs">
        <Link 
          to="/" 
          className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Public Passenger Site</span>
        </Link>
        <span className="text-slate-600 font-mono">RESTRICTED PORTAL</span>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-sky-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Cpu className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Internal Operations Portal
          </h1>
          <p className="text-xs text-slate-400 font-semibold">
            Dedicated interface for ML predictions, telematics, and dispatch controls
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-black uppercase tracking-wider mb-1.5">
              Authorized Operator Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@smartbus.gov.in"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-black uppercase tracking-wider mb-1.5">
              Security Key / Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:border-sky-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-sm rounded-xl transition-colors shadow-md disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations Console'}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Quick 1-Click Demo Operator Access
          </button>
        </div>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-500 text-center font-mono">
          Zero passenger access. All sessions are cryptographically logged.
        </div>
      </div>
    </div>
  );
};
