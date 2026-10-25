import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertCircle, 
  Award, 
  HeartPulse, 
  Accessibility, 
  Sparkles, 
  Check, 
  X,
  Info,
  ArrowRight
} from 'lucide-react';
import { isReservedPrioritySeat, calculatePriorityScore, TRIP_PURPOSES } from '../../utils/priorityScoring';

export const SeatDeckMap = ({
  rows = [],
  selectedSeats = [],
  onSeatToggle = () => {},
  passengerAge = 24,
  tripPurpose = 'GENERAL_LEISURE',
  isDivyang = false,
  onProfileUpdate = null
}) => {
  // Modal state for rejected priority seat clicks
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [attemptedSeat, setAttemptedSeat] = useState(null);

  // Quick edit mode inside advisory modal
  const [modalPurpose, setModalPurpose] = useState(tripPurpose);
  const [modalDivyang, setModalDivyang] = useState(isDivyang);
  const [modalAge, setModalAge] = useState(passengerAge);

  // Calculate live priority score
  const priorityStatus = calculatePriorityScore({
    age: passengerAge,
    tripPurpose,
    isDivyang
  });

  const handleSeatClick = (seat) => {
    if (seat.booked) return;

    const isPriority = isReservedPrioritySeat(seat.id);

    // If it's a reserved priority seat, user must qualify with score >= 70 OR Medical / Senior 60+ / Divyang
    if (isPriority && !priorityStatus.isHighPriority && priorityStatus.score < 70) {
      setAttemptedSeat(seat);
      setModalPurpose(tripPurpose);
      setModalDivyang(isDivyang);
      setModalAge(passengerAge);
      setPriorityModalOpen(true);
      return;
    }

    // Otherwise, allow selection
    onSeatToggle(seat);
  };

  const handleApplyModalUpdate = () => {
    if (onProfileUpdate) {
      onProfileUpdate({
        age: modalAge,
        tripPurpose: modalPurpose,
        isDivyang: modalDivyang
      });
    }

    const updatedScore = calculatePriorityScore({
      age: modalAge,
      tripPurpose: modalPurpose,
      isDivyang: modalDivyang
    });

    if (updatedScore.isHighPriority || updatedScore.score >= 70) {
      if (attemptedSeat) {
        onSeatToggle(attemptedSeat);
      }
      setPriorityModalOpen(false);
    }
  };

  return (
    <div className="space-y-6" id="seat-deck-map-container">
      
      {/* Priority Seating Legend & Guidance Banner */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black text-white block">
              Front Row Reserved Seating Policy (Seats 1–6)
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Priority access strictly reserved for Medical Patients, Seniors (60+), and Divyang commuters.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
            priorityStatus.isHighPriority
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-950 border-slate-700 text-slate-300'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            <span>Your Score: {priorityStatus.score} pts ({priorityStatus.isHighPriority ? 'Priority Qualified' : 'Standard General'})</span>
          </span>
        </div>
      </div>

      {/* Seat Rows Matrix */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4 max-w-lg mx-auto">
        
        {/* Bus Front Direction Indicator */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-widest">
          <span>Driver Cabin / Front</span>
          <span className="text-amber-400 flex items-center gap-1">
            <Award className="w-3 h-3" />
            Reserved Priority Rows 1–2
          </span>
        </div>

        {rows.map((rowObj) => (
          <div key={rowObj.row} className="space-y-1">
            {rowObj.row === 1 && (
              <div className="text-[10px] font-mono font-bold uppercase text-amber-400/90 pl-1">
                ⭐ Front Reserved Priority Zone (Seats 1 to 6)
              </div>
            )}

            <div className="flex justify-between items-center gap-2">
              {/* Left Side (A, B) */}
              <div className="flex gap-2">
                {rowObj.seats.slice(0, 2).map((seat) => {
                  const isSelected = selectedSeats.some(s => s.id === seat.id);
                  const isPriority = isReservedPrioritySeat(seat.id);

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={seat.booked}
                      onClick={() => handleSeatClick(seat)}
                      title={
                        seat.booked
                          ? 'Seat already booked'
                          : (isPriority ? `Reserved Priority Seat ${seat.id} (Medical / Senior / Divyang)` : `General Seat ${seat.id}`)
                      }
                      id={`seat-btn-${seat.id}`}
                      className={`relative w-12 h-14 rounded-2xl flex flex-col items-center justify-center font-bold text-xs transition-all ${
                        seat.booked
                          ? 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
                          : (isSelected
                              ? 'bg-sky-500 border-2 border-white text-slate-950 shadow-lg scale-105'
                              : (isPriority
                                  ? 'bg-amber-950/40 border-2 border-amber-500/70 text-amber-300 hover:bg-amber-900/50 hover:border-amber-400'
                                  : 'bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-sky-500'))
                      }`}
                    >
                      {isPriority && !seat.booked && (
                        <span className="absolute -top-1.5 -right-1 text-[9px] bg-amber-500 text-slate-950 rounded-full px-1 font-black">
                          ★
                        </span>
                      )}
                      <span>{seat.id}</span>
                      <span className="text-[9px] font-normal opacity-80">
                        {seat.booked ? 'Sold' : (isPriority ? 'Priority' : '₹25')}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Central Gangway */}
              <div className="w-8 flex items-center justify-center text-[10px] text-slate-600 font-mono">
                | |
              </div>

              {/* Right Side (C, D) */}
              <div className="flex gap-2">
                {rowObj.seats.slice(2, 4).map((seat) => {
                  const isSelected = selectedSeats.some(s => s.id === seat.id);
                  const isPriority = isReservedPrioritySeat(seat.id);

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={seat.booked}
                      onClick={() => handleSeatClick(seat)}
                      title={
                        seat.booked
                          ? 'Seat already booked'
                          : (isPriority ? `Reserved Priority Seat ${seat.id} (Medical / Senior / Divyang)` : `General Seat ${seat.id}`)
                      }
                      id={`seat-btn-${seat.id}`}
                      className={`relative w-12 h-14 rounded-2xl flex flex-col items-center justify-center font-bold text-xs transition-all ${
                        seat.booked
                          ? 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
                          : (isSelected
                              ? 'bg-sky-500 border-2 border-white text-slate-950 shadow-lg scale-105'
                              : (isPriority
                                  ? 'bg-amber-950/40 border-2 border-amber-500/70 text-amber-300 hover:bg-amber-900/50 hover:border-amber-400'
                                  : 'bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-sky-500'))
                      }`}
                    >
                      {isPriority && !seat.booked && (
                        <span className="absolute -top-1.5 -right-1 text-[9px] bg-amber-500 text-slate-950 rounded-full px-1 font-black">
                          ★
                        </span>
                      )}
                      <span>{seat.id}</span>
                      <span className="text-[9px] font-normal opacity-80">
                        {seat.booked ? 'Sold' : (isPriority ? 'Priority' : '₹25')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        <div className="text-center pt-2 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
          Bus Rear / Exit Doors
        </div>
      </div>

      {/* Informative Non-Blocking Advisory Modal for Under-Score Passengers */}
      {priorityModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          id="priority-advisory-modal"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-white">
                  Reserved Priority Seating Notice
                </h3>
                <span className="text-xs font-semibold text-amber-400 font-mono">
                  Seat {attemptedSeat?.id} requires Priority Eligibility
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPriorityModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Exact required advisory text */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-200 leading-relaxed font-medium">
              "This seat is reserved for passengers traveling for medical needs, senior citizens (60+), or persons with reduced mobility. Please select a general seat or update your travel details if traveling for an emergency."
            </div>

            <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-800/40 text-[11px] text-amber-300 font-semibold space-y-1">
              <div>Your Current Priority Score: <strong className="text-white font-mono">{priorityStatus.score} pts</strong> (Required: 70+ pts)</div>
              <div>Current Profile: Age {passengerAge} • {TRIP_PURPOSES[tripPurpose]?.label || tripPurpose}</div>
            </div>

            {/* Quick Profile Update Controls in Modal */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-white block">
                Update Travel Details if Traveling for an Emergency:
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  id="modal-select-medical-btn"
                  onClick={() => setModalPurpose('MEDICAL')}
                  className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                    modalPurpose === 'MEDICAL'
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block">🏥 Medical / Doctor Visit</span>
                  <span className="text-[10px] text-emerald-400 block font-normal">+50 priority pts</span>
                </button>

                <button
                  type="button"
                  id="modal-select-divyang-btn"
                  onClick={() => setModalDivyang(!modalDivyang)}
                  className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                    modalDivyang
                      ? 'bg-sky-950 border-sky-500 text-sky-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block">♿ Mobility / Divyang</span>
                  <span className="text-[10px] text-sky-400 block font-normal">+50 accessibility pts</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 font-semibold">Change Age:</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={modalAge}
                  onChange={(e) => setModalAge(parseInt(e.target.value, 10) || 25)}
                  className="w-20 bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5 text-xs font-bold font-mono"
                />
                {modalAge >= 60 && (
                  <span className="text-[10px] text-emerald-400 font-bold">Senior Citizen (60+)</span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                id="modal-update-details-btn"
                onClick={handleApplyModalUpdate}
                className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black uppercase tracking-wider transition-colors"
              >
                Update Details & Unlock Seat
              </button>

              <button
                type="button"
                onClick={() => setPriorityModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                Select a General Seat Instead
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
