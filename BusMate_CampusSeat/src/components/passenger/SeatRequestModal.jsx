import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Calendar, ArrowRight, ShieldCheck, Ticket, RefreshCw } from 'lucide-react';
import { runFairAllocation, DEFAULT_WEIGHTS } from '../../services/allocationService';

export const SeatRequestModal = ({ bus, isOpen, onClose, onBookingSuccess }) => {
  const [passengerName, setPassengerName] = useState('Alex Rivera');
  const [constraintLevel, setConstraintLevel] = useState(2);
  const [scheduleDisruption, setScheduleDisruption] = useState(4);
  const [previousDenials, setPreviousDenials] = useState(1);
  const [isAccessibilityRequired, setIsAccessibilityRequired] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !bus) return null;

  const handleProcessRequest = (e) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const userRequest = {
        passengerId: 'Pass-User-' + Math.floor(Math.random() * 899 + 100),
        passengerName,
        constraintLevel: Number(constraintLevel),
        scheduleDisruption: Number(scheduleDisruption),
        previousDenials: Number(previousDenials),
        preferenceMatch: 5,
        isAccessibilityRequired,
        requestTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        preferredTrip: `${bus.id} (${bus.departureTime})`,
        alternativeTrip: 'SB-05 (05:20 PM)'
      };

      const otherRequests = Array.from({ length: 55 }, (_, i) => ({
        passengerId: `Pass-${i + 10}`,
        constraintLevel: (i % 3) + 1,
        scheduleDisruption: (i % 5) + 1,
        previousDenials: i % 3,
        preferenceMatch: 4,
        isAccessibilityRequired: i % 10 === 0
      }));

      const allRequests = [userRequest, ...otherRequests];
      const allocationOutcome = runFairAllocation(allRequests, bus.capacity, DEFAULT_WEIGHTS);
      const userResult = allocationOutcome.results.find(r => r.passengerId === userRequest.passengerId);

      setResult(userResult);
      setLoading(false);

      const existingBookings = JSON.parse(localStorage.getItem('smartbus_my_trips') || '[]');
      const newBooking = {
        id: 'BKG-' + Date.now().toString().slice(-6),
        busId: bus.id,
        routeNumber: bus.routeNumber,
        origin: bus.origin,
        destination: bus.destination,
        departureTime: bus.departureTime,
        status: userResult.status,
        assignedSeat: userResult.assignedSeat,
        explanationText: userResult.explanationText,
        bookingDate: new Date().toLocaleDateString()
      };
      localStorage.setItem('smartbus_my_trips', JSON.stringify([newBooking, ...existingBookings]));

      if (onBookingSuccess) onBookingSuccess(newBooking);
    }, 600);
  };

  const handleResetModal = () => {
    setResult(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" 
      role="dialog" 
      aria-modal="true"
      aria-labelledby="modal-seat-title"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full border-2 border-slate-400 shadow-2xl overflow-hidden my-8 space-y-0">
        
        {/* Header */}
        <div className="bg-[#075985] text-white px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white text-[#075985] rounded-xl flex items-center justify-center font-black">
              <Ticket className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-seat-title" className="text-xl font-black text-white leading-tight">Seat Allocation Request</h2>
              <p className="text-xs font-bold text-sky-100 mt-0.5">Bus {bus.id} • {bus.routeNumber} ({bus.departureTime})</p>
            </div>
          </div>

          {/* Fitts's Law 44px+ touch target close button */}
          <button
            onClick={() => { handleResetModal(); onClose(); }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-sky-100 hover:text-white hover:bg-[#0C4A6E] rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-300 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-7 h-7" aria-hidden="true" />
          </button>
        </div>

        {/* Form view */}
        {!result && !loading && (
          <form onSubmit={handleProcessRequest} className="p-6 space-y-5">
            <div>
              <label htmlFor="passengerNameInput" className="block text-xs font-black text-slate-800 uppercase mb-1.5">
                Passenger Name / Identifier
              </label>
              <input
                id="passengerNameInput"
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                required
                className="w-full min-h-[44px] px-4 py-3 border-2 border-slate-300 rounded-xl font-extrabold text-slate-900 focus:border-[#075985] focus:ring-4 focus:ring-sky-200 focus:outline-none"
              />
            </div>

            {/* Chunking: 2-column layout for urgency & past denials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="constraintLevelSelect" className="block text-xs font-black text-slate-800 uppercase mb-1.5">
                  Schedule Urgency / Constraint
                </label>
                <select
                  id="constraintLevelSelect"
                  value={constraintLevel}
                  onChange={(e) => setConstraintLevel(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-3 border-2 border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 focus:border-[#075985] focus:ring-4 focus:ring-sky-200 focus:outline-none"
                >
                  <option value={3}>High (Medical / Exam / Shift)</option>
                  <option value={2}>Medium (Standard Shift / Class)</option>
                  <option value={1}>Low (Flexible Trip)</option>
                </select>
              </div>

              <div>
                <label htmlFor="previousDenialsInput" className="block text-xs font-black text-slate-800 uppercase mb-1.5">
                  Previous Trip Denials
                </label>
                <input
                  id="previousDenialsInput"
                  type="number"
                  min="0"
                  max="5"
                  value={previousDenials}
                  onChange={(e) => setPreviousDenials(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-3 border-2 border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 focus:border-[#075985] focus:ring-4 focus:ring-sky-200 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="disruptionRangeInput" className="block text-xs font-black text-slate-800 uppercase mb-1.5">
                Expected Disruption Level if Denied (1 to 5)
              </label>
              <input
                id="disruptionRangeInput"
                type="range"
                min="1"
                max="5"
                value={scheduleDisruption}
                onChange={(e) => setScheduleDisruption(e.target.value)}
                className="w-full accent-[#075985] h-3 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-600 font-extrabold mt-1.5">
                <span>1 (Minor Delay)</span>
                <span>3 (Moderate Disruption)</span>
                <span>5 (Missed Appointment)</span>
              </div>
            </div>

            {/* Accessibility Checkbox Container with 44px+ Touch Target */}
            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-300">
              <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={isAccessibilityRequired}
                  onChange={(e) => setIsAccessibilityRequired(e.target.checked)}
                  className="w-6 h-6 accent-[#075985] rounded-md focus:ring-4 focus:ring-sky-300 shrink-0"
                />
                <div>
                  <span className="text-sm font-black text-slate-900 block">Require Wheelchair / Priority Accessibility Seat</span>
                  <span className="text-xs text-slate-700 font-extrabold">Enforces mandatory accessible seating allocation under transport policy.</span>
                </div>
              </label>
            </div>

            {/* Action Buttons - Fitts's Law 44px+ Touch Targets */}
            <div className="pt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-5 py-2.5 bg-slate-100 text-slate-800 font-extrabold text-sm rounded-xl hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-sky-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-6 py-2.5 bg-[#075985] text-white font-black text-sm rounded-xl hover:bg-[#0C4A6E] focus:outline-none focus:ring-4 focus:ring-sky-300 transition-colors shadow"
              >
                Submit & Evaluate Allocation
              </button>
            </div>
          </form>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="p-12 text-center space-y-4">
            <RefreshCw className="w-12 h-12 text-[#075985] animate-spin mx-auto" aria-hidden="true" />
            <div className="text-lg font-black text-slate-900">Evaluating Fair Capacity Allocation...</div>
            <p className="text-xs text-slate-700 font-extrabold">Calculating priority scores and verifying vehicle capacity bounds.</p>
          </div>
        )}

        {/* Result view */}
        {result && (
          <div className="p-6 space-y-6">
            {/* Multi-channel Result Card: Color + Icon + Text */}
            <div className={`p-5 rounded-2xl border-2 flex items-start gap-4 ${
              result.status === 'Allocated'
                ? 'bg-emerald-50 border-emerald-400 text-[#065F46]'
                : 'bg-amber-50 border-amber-400 text-[#92400E]'
            }`}>
              {result.status === 'Allocated' ? (
                <CheckCircle2 className="w-8 h-8 text-[#065F46] shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-8 h-8 text-[#92400E] shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div>
                <span className="text-xs font-black uppercase tracking-wide">Allocation Outcome Status</span>
                <h3 className="text-2xl font-black">{result.status === 'Allocated' ? 'Seat Reserved Successfully!' : 'Trip Waitlisted'}</h3>
                <p className="text-sm mt-1 font-extrabold leading-relaxed">{result.explanationText}</p>
              </div>
            </div>

            {/* Assigned Seat or Alternative Trip */}
            {result.status === 'Allocated' ? (
              <div className="bg-slate-900 text-white p-6 rounded-2xl flex justify-between items-center shadow-inner">
                <div>
                  <span className="text-xs text-teal-300 font-black uppercase block">Assigned Vehicle Seat</span>
                  <span className="text-3xl font-black text-white">{result.assignedSeat}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Boarding Status</span>
                  <span className="text-sm font-black text-emerald-400">Confirmed (Valid)</span>
                </div>
              </div>
            ) : (
              <div className="bg-sky-50 border-2 border-sky-300 p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-sky-900 uppercase">Recommended Alternative Departure</span>
                  <span className="text-xs font-black bg-sky-200 text-sky-900 px-2.5 py-1 rounded-md">Seats Available</span>
                </div>
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-sky-200">
                  <div>
                    <div className="text-sm font-black text-slate-900">Bus SB-05 • Route 15</div>
                    <div className="text-xs text-slate-700 font-extrabold">Departure: 5:20 PM (20 mins later) • Low risk (24%)</div>
                  </div>
                  <button
                    onClick={() => {
                      alert('Alternative trip SB-05 booked successfully!');
                      onClose();
                    }}
                    className="min-h-[44px] px-4 py-2 bg-[#075985] text-white text-xs font-black rounded-xl hover:bg-[#0C4A6E] focus:outline-none focus:ring-4 focus:ring-sky-300"
                  >
                    Switch to 5:20 PM
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-between items-center border-t border-slate-200">
              <button
                onClick={handleResetModal}
                className="min-h-[44px] px-3 text-xs font-black text-[#075985] hover:underline flex items-center"
              >
                ← Test Another Request
              </button>
              <button
                onClick={onClose}
                className="min-h-[44px] px-6 py-2.5 bg-slate-900 text-white font-black text-sm rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-sky-300"
              >
                Close & View My Saved Trips
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
