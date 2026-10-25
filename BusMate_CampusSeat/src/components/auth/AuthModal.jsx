import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Lock, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck, 
  Sparkles,
  Info,
  Building,
  GraduationCap,
  BookOpen,
  Footprints,
  Calendar,
  Accessibility
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTranslation } from '../../context/TranslationContext';
import { 
  DEMO_STUDENTS, 
  HOSTELS, 
  COURSES, 
  BATCHES, 
  getAvailableBranches 
} from '../../data/iiitBusData';

/**
 * Modern Accessible IIIT Pune MIS Authentication & Student Registration Modal
 * Built with full WCAG 2.1 AA semantics, reactive dependent branch logic, and clean light-theme styling.
 */
export const AuthModal = () => {
  const { 
    user,
    isAuthenticated,
    isAuthModalOpen, 
    authModalMode, 
    authPromptMessage, 
    closeAuthModal, 
    setAuthModalMode, 
    login, 
    signup,
    switchDemoStudent 
  } = useAuth();

  const { announce } = useAccessibility();
  const { t } = useTranslation();
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  // Form State
  const [misInput, setMisInput] = useState('112603001');
  const [password, setPassword] = useState('••••••••');

  // Registration Fields (Student Profile Schema)
  const [regMis, setRegMis] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regHostel, setRegHostel] = useState('GODAVARI');
  const [regRoom, setRegRoom] = useState('');
  const [regCourse, setRegCourse] = useState('B.Tech');
  const [regBatch, setRegBatch] = useState('2026-2030');
  const [regBranch, setRegBranch] = useState('AIDS');
  const [regCanStand, setRegCanStand] = useState(true);
  const [regA11yNeed, setRegA11yNeed] = useState(false);

  // UI status
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reactive available branches dependent on course and batch
  const availableBranches = getAvailableBranches(regCourse, regBatch);

  // Auto-adjust selected branch if it's no longer allowed
  useEffect(() => {
    if (!availableBranches.includes(regBranch)) {
      setRegBranch(availableBranches[0] || 'CSE');
    }
  }, [regCourse, regBatch, availableBranches, regBranch]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    if (isAuthModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!misInput.trim()) {
      setErrorMsg('Please enter your 9-digit MIS Number.');
      announce('Error: Please enter your 9-digit MIS Number.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ identifier: misInput.trim(), password });
      setSuccessMsg('Signed in successfully.');
      announce('Signed in successfully.');
    } catch (err) {
      setErrorMsg('Sign-in failed. Please verify your MIS Number.');
      announce('Sign-in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Registration Submit
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regMis.trim()) {
      setErrorMsg('MIS Number is mandatory.');
      announce('Error: MIS Number is mandatory.');
      return;
    }
    if (!regFullName.trim()) {
      setErrorMsg('Full Name is mandatory.');
      announce('Error: Full Name is mandatory.');
      return;
    }
    if (!regRoom.trim()) {
      setErrorMsg('Room Number is mandatory.');
      announce('Error: Room Number is mandatory.');
      return;
    }

    try {
      setIsSubmitting(true);
      await signup({
        misNumber: regMis.trim(),
        fullName: regFullName.trim(),
        hostel: regHostel,
        roomNumber: regRoom.trim(),
        course: regCourse,
        batch: regBatch,
        branch: regBranch,
        canTravelStanding: regCanStand,
        declaredAccessibilityNeed: regA11yNeed
      });
      setSuccessMsg('Student profile registered & logged in!');
      announce('Student profile registered & logged in!');
    } catch (err) {
      setErrorMsg('Registration failed. Please check inputs.');
      announce('Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick switch demo student
  const handleSelectDemo = (student) => {
    setMisInput(student.misNumber);
    switchDemoStudent(student.misNumber);
    announce(`Switched to demo student: ${student.fullName}`);
    closeAuthModal();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              IIIT
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-bold text-slate-900">
                {authModalMode === 'signup' ? 'New Student Registration' : 'Student MIS Authentication'}
              </h2>
              <p className="text-xs text-slate-500">
                IIIT Pune Campus Bus Shuttle & Seat Allocation
              </p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors focus:ring-2 focus:ring-sky-500"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5">
          {authPromptMessage && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-start gap-2.5 text-xs text-sky-800">
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <span>{authPromptMessage}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Demo Switcher Strip */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Quick Test Demo Profiles (Click to Switch):</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_STUDENTS.map((st) => (
                <button
                  key={st.misNumber}
                  type="button"
                  onClick={() => handleSelectDemo(st)}
                  className={`text-left p-2 rounded-lg border text-xs transition-all ${
                    user?.misNumber === st.misNumber
                      ? 'bg-sky-100/70 border-sky-400 text-sky-900 font-medium'
                      : 'bg-white border-slate-200 hover:border-sky-300 text-slate-700'
                  }`}
                >
                  <div className="font-semibold truncate">{st.fullName}</div>
                  <div className="text-[10px] text-slate-500 flex justify-between mt-0.5">
                    <span>MIS {st.misNumber}</span>
                    <span className="font-mono">{st.branch}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => { setAuthModalMode('login'); setErrorMsg(''); }}
              className={`flex-1 pb-2.5 text-sm font-semibold border-b-2 transition-all ${
                authModalMode === 'login'
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In (MIS)
            </button>
            <button
              type="button"
              onClick={() => { setAuthModalMode('signup'); setErrorMsg(''); }}
              className={`flex-1 pb-2.5 text-sm font-semibold border-b-2 transition-all ${
                authModalMode === 'signup'
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              New Student Profile
            </button>
          </div>

          {/* SIGN IN FORM */}
          {authModalMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  MIS Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={misInput}
                    onChange={(e) => setMisInput(e.target.value)}
                    placeholder="e.g. 112603001"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Unique student identifier issued by Academic Section.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Campus Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-sky-400 focus:outline-none"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In with MIS'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* REGISTRATION FORM (STUDENT PROFILE SCHEMA & DEPENDENT BRANCHES) */}
          {authModalMode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    MIS Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={regMis}
                    onChange={(e) => setRegMis(e.target.value)}
                    placeholder="112603099"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Tanvi Patil"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hostel <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={regHostel}
                    onChange={(e) => setRegHostel(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-800"
                  >
                    {HOSTELS.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Room Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={regRoom}
                    onChange={(e) => setRegRoom(e.target.value)}
                    placeholder="IN-204"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              {/* Dependent Course & Batch Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={regCourse}
                    onChange={(e) => setRegCourse(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 font-semibold"
                  >
                    {COURSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={regBatch}
                    onChange={(e) => setRegBatch(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono"
                  >
                    {BATCHES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Branch Selection (Strictly Dependent) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={regBranch}
                    onChange={(e) => setRegBranch(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 font-semibold text-sky-800"
                  >
                    {availableBranches.map((br) => (
                      <option key={br} value={br}>{br}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Informative banner on dependent branch logic */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                <span className="font-semibold text-slate-800">Branch Eligibility Rule: </span>
                {regCourse === 'B.Tech' && regBatch === '2026-2030' ? (
                  <span className="text-sky-700 font-medium">
                    Batch 2026-2030 offers CSE, ECE, VLSI, Cybersecurity, and AIDS.
                  </span>
                ) : (
                  <span className="text-slate-600">
                    Restricted to CSE and ECE for {regCourse} / {regBatch}.
                  </span>
                )}
              </div>

              {/* Standing & Accessibility Flags */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regCanStand}
                    onChange={(e) => setRegCanStand(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                  />
                  <span className="text-xs text-slate-700">
                    <span className="font-semibold">Can Travel Standing?</span> (If unticked, student is never assigned standing places).
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regA11yNeed}
                    onChange={(e) => setRegA11yNeed(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                  />
                  <span className="text-xs text-slate-700">
                    <span className="font-semibold">Accessibility Need</span> (Declared reduced-mobility or medical requirement).
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-sky-400 focus:outline-none"
              >
                {isSubmitting ? 'Registering...' : 'Register Profile & Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>IIIT Pune Transport Audit Section</span>
          </div>
          <span className="font-mono text-[11px]">v1.0 Rule-Based</span>
        </div>
      </div>
    </div>
  );
};
