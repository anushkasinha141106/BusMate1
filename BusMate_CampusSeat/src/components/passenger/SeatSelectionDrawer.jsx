import React, { useState } from 'react';
import { X, Check, ArrowRight, Disc } from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';

export const SeatSelectionDrawer = ({ bus, isOpen, onClose, onConfirmBooking }) => {
  const { announce } = useAccessibility();
  const [selectedSeats, setSelectedSeats] = useState(['12', '13']);
  const [boardingPoint, setBoardingPoint] = useState(bus?.origin || 'Swargate Stand');
  const [droppingPoint, setDroppingPoint] = useState(bus?.destination || 'Pune Railway Station');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !bus) return null;

  // Seat cabin rows (2 on left, aisle, 2 on right)
  const rows = [
    { row: 1, seats: [{ id: '1', booked: true }, { id: '2', booked: false }, { id: '3', booked: false }, { id: '4', booked: true }] },
    { row: 2, seats: [{ id: '5', booked: false }, { id: '6', booked: false }, { id: '7', booked: true }, { id: '8', booked: false }] },
    { row: 3, seats: [{ id: '9', booked: false }, { id: '10', booked: true }, { id: '11', booked: false }, { id: '12', booked: false }] },
    { row: 4, seats: [{ id: '13', booked: false }, { id: '14', booked: false }, { id: '15', booked: true }, { id: '16', booked: false }] },
    { row: 5, seats: [{ id: '17', booked: true }, { id: '18', booked: false }, { id: '19', booked: false }, { id: '20', booked: false }] },
  ];

  const farePerSeat = bus.fare.includes('Free') ? 0 : 25;
  const totalPrice = selectedSeats.length * farePerSeat;

  const toggleSeat = (seatId) => {
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(prev => prev.filter(s => s !== seatId));
      announce(`Deselected seat ${seatId}`);
    } else {
      setSelectedSeats(prev => [...prev, seatId]);
      announce(`Selected seat ${seatId}`);
    }
  };

  const handleBooking = () => {
    if (selectedSeats.length === 0) return;
    setIsSuccess(true);
    announce(`Booking confirmed for seats ${selectedSeats.join(', ')} on ${bus.routeNumber}`);
    setTimeout(() => {
      if (onConfirmBooking) {
        onConfirmBooking({
          busId: bus.id,
          routeNumber: bus.routeNumber,
          seats: selectedSeats,
          totalPrice,
          boardingPoint,
          droppingPoint
        });
      }
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seatSelectionTitle"
    >
      <div className="bg-white rounded-3xl border-2 border-slate-300 max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 id="seatSelectionTitle" className="text-xl font-black text-slate-900">
              Select Your Seats
            </h3>
            <p className="text-xs font-bold text-slate-500">
              {bus.routeNumber} • {bus.origin} ➔ {bus.destination}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-xl"
            aria-label="Close seat selection"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <Check className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-black text-slate-900">Booking Confirmed!</h4>
            <p className="text-xs font-bold text-slate-600">
              Seats {selectedSeats.join(', ')} reserved successfully for {bus.routeNumber}.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Seat Layout Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-600 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-md border-2 border-slate-300 bg-white inline-block"></span>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-md bg-[#075985] inline-block"></span>
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-md bg-slate-300 inline-block"></span>
                <span>Booked</span>
              </div>
            </div>

            {/* Bus Cabin Graphic */}
            <div className="max-w-xs mx-auto p-5 bg-slate-50 rounded-3xl border-2 border-slate-200">
              {/* Driver wheel */}
              <div className="flex justify-end pb-3 mb-3 border-b border-slate-200">
                <div className="px-3 py-1 bg-slate-200 text-slate-700 text-[10px] font-black rounded-lg uppercase flex items-center gap-1">
                  <Disc className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
                  <span>Driver</span>
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-3">
                {rows.map((r) => (
                  <div key={r.row} className="flex items-center justify-between">
                    {/* Left 2 seats */}
                    <div className="flex gap-2">
                      {r.seats.slice(0, 2).map((seat) => {
                        const isSelected = selectedSeats.includes(seat.id);
                        return (
                          <button
                            key={seat.id}
                            type="button"
                            disabled={seat.booked}
                            onClick={() => toggleSeat(seat.id)}
                            className={`w-9 h-9 rounded-xl text-xs font-black transition-all flex items-center justify-center ${
                              seat.booked
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-[#075985] text-white shadow-sm ring-2 ring-sky-300'
                                  : 'bg-white border-2 border-slate-300 hover:border-[#075985] text-slate-800'
                            }`}
                            aria-label={`Seat ${seat.id} ${seat.booked ? 'Booked' : isSelected ? 'Selected' : 'Available'}`}
                          >
                            {seat.id}
                          </button>
                        );
                      })}
                    </div>

                    {/* Aisle */}
                    <span className="text-[10px] text-slate-300 font-black uppercase">Aisle</span>

                    {/* Right 2 seats */}
                    <div className="flex gap-2">
                      {r.seats.slice(2, 4).map((seat) => {
                        const isSelected = selectedSeats.includes(seat.id);
                        return (
                          <button
                            key={seat.id}
                            type="button"
                            disabled={seat.booked}
                            onClick={() => toggleSeat(seat.id)}
                            className={`w-9 h-9 rounded-xl text-xs font-black transition-all flex items-center justify-center ${
                              seat.booked
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-[#075985] text-white shadow-sm ring-2 ring-sky-300'
                                  : 'bg-white border-2 border-slate-300 hover:border-[#075985] text-slate-800'
                            }`}
                            aria-label={`Seat ${seat.id} ${seat.booked ? 'Booked' : isSelected ? 'Selected' : 'Available'}`}
                          >
                            {seat.id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary & Price Checkout */}
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-black text-slate-400 block uppercase">Selected Seats</span>
                <span className="text-sm font-black text-slate-900">
                  {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None selected'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-black text-slate-400 block uppercase">Total Fare</span>
                <span className="text-xl font-black text-[#075985]">
                  {farePerSeat === 0 ? 'FREE' : `₹${totalPrice}`}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={selectedSeats.length === 0}
              onClick={handleBooking}
              className={`w-full py-4 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 ${
                selectedSeats.length === 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-[#075985] hover:bg-[#0C4A6E] active:bg-[#082f49]'
              }`}
            >
              <span>PROCEED TO BOOK SEATS</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
