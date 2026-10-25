import React, { useState } from 'react';
import { User, Lock, Mail, ShieldCheck, X, Check } from 'lucide-react';

export const SignInModal = ({ isOpen, onClose }) => {
  const [authMode, setAuthMode] = useState('commuter'); // 'commuter' | 'student'
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e) => {
    e.preventDefault();
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signInModalTitle"
    >
      <div 
        className="bg-white rounded-3xl border-2 border-slate-300 max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-[#075985] flex items-center justify-center font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 id="signInModalTitle" className="text-xl sm:text-2xl font-semibold font-heading text-slate-900 tracking-[-0.015em]">
                Rider Account
              </h2>
              <p className="text-xs font-normal text-slate-500">Access saved trips, transit passes & alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500"
            aria-label="Close sign in modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-300">
          <button
            type="button"
            onClick={() => setAuthMode('commuter')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              authMode === 'commuter' ? 'bg-white text-[#075985] shadow-xs' : 'text-slate-600'
            }`}
          >
            City Transit Pass
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('student')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              authMode === 'student' ? 'bg-white text-[#075985] shadow-xs' : 'text-slate-600'
            }`}
          >
            Campus / Student ID
          </button>
        </div>

        {isSuccess ? (
          <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg text-emerald-900">Welcome Back!</h3>
            <p className="text-xs font-normal text-emerald-700">Connecting your real-time transit telemetry...</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="riderIdentifier" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {authMode === 'commuter' ? 'Mobile Number / Smart Card No.' : 'Student / Staff Roll ID'}
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  id="riderIdentifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={authMode === 'commuter' ? '+91 98765 43210' : 'e.g. 2024BCS0042'}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-sm font-normal text-slate-900 focus:bg-white focus:border-[#075985] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="riderPin" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Security PIN / Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  id="riderPin"
                  type="password"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-sm font-normal text-slate-900 focus:bg-white focus:border-[#075985] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#075985] hover:bg-[#0C4A6E] text-white font-semibold text-sm uppercase tracking-wide rounded-2xl transition-all shadow-md focus:outline-none focus:ring-4 focus:ring-sky-200"
            >
              Sign In to SmartBus
            </button>
          </form>
        )}

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
          <p className="text-xs text-slate-500 font-normal">
            Protected under strict privacy and zero individual tracking protocols.
          </p>
        </div>
      </div>
    </div>
  );
};
