import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';

export const AdminAuthGuard = ({ children }) => {
  const location = useLocation();
  const session = sessionStorage.getItem('smartbus_admin_session');

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 text-center space-y-6">
        <div className="w-16 h-16 bg-red-950/80 text-red-400 border-2 border-red-500/40 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="max-w-md space-y-2">
          <span className="text-xs font-mono font-black text-red-400 uppercase tracking-widest block">
            HTTP 403 • FORBIDDEN
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Restricted Operator Access
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed font-semibold">
            The SmartBus ML Prediction & Operations Portal is restricted to authorized transit dispatchers and researchers. Unauthenticated public access is blocked.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/admin/login"
            className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Operator Sign In</span>
          </Link>
          <Link
            to="/"
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Public Passenger Site</span>
          </Link>
        </div>
      </div>
    );
  }

  return children;
};
