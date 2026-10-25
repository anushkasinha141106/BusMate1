import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBookings } from '../context/BookingsContext.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import RiskIndicator from '../components/ui/RiskIndicator.jsx';

export default function MyTripsPage() {
  const { bookings, submitFeedback, cancelBooking } = useBookings();
  const [feedbackId, setFeedbackId] = useState(null);
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState('');

  const sendFeedback = (id) => {
    submitFeedback(id, { rating, comment });
    setFeedbackId(null);
    setComment('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold text-main">My Trips</h1>
      {bookings.length === 0 ? (
        <Card>
          <p className="text-muted">You have no bookings yet.</p>
          <Link to="/find-bus" className="mt-4 inline-block">
            <Button>Find a bus</Button>
          </Link>
        </Card>
      ) : (
        <ul className="space-y-6">
          {bookings.map((b) => (
            <li key={b.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      {b.busId} · {b.route}
                    </h2>
                    <p className="text-muted">
                      {b.date} at {b.departureTime} · {b.from} → {b.to}
                    </p>
                  </div>
                  <p
                    className={`rounded-lg px-3 py-1 font-semibold ${
                      b.status === 'allocated' ? 'bg-green-50 text-success' : 'bg-amber-50 text-warning'
                    }`}
                    role="status"
                  >
                    {b.status === 'allocated' ? `Allocated · Seat ${b.seat}` : 'Waitlisted'}
                  </p>
                </div>
                {b.riskLevel && (
                  <div className="mt-3">
                    <RiskIndicator level={b.riskLevel} probability={b.overcrowdingProbability} />
                  </div>
                )}
                <div className="mt-4">
                  <h3 className="font-semibold">
                    {b.status === 'allocated' ? 'Allocated because:' : 'Waitlisted because:'}
                  </h3>
                  <ul className="mt-2 list-disc pl-6">
                    {b.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
                {b.alternatives?.length > 0 && (
                  <div className="mt-4 rounded-lg bg-background p-4">
                    <h3 className="font-semibold">Alternative trips</h3>
                    <ul className="mt-2 list-disc pl-6">
                      {b.alternatives.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                    <Link to="/find-bus?from=Student&to=Stadium" className="mt-3 inline-block">
                      <Button variant="outline">Explore alternatives</Button>
                    </Link>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => setFeedbackId(b.id)}>
                    Request review / Feedback
                  </Button>
                  <Button variant="ghost" onClick={() => cancelBooking(b.id)}>
                    Remove booking
                  </Button>
                </div>
                {b.feedback && (
                  <p className="mt-3 text-sm text-muted">Feedback submitted — thank you.</p>
                )}
                {feedbackId === b.id && (
                  <form
                    className="mt-4 space-y-3 rounded-lg border border-border p-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendFeedback(b.id);
                    }}
                  >
                    <label className="block">
                      Satisfaction (1–5)
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        className="w-full"
                      />
                      <span>{rating}</span>
                    </label>
                    <label className="block">
                      Comments
                      <textarea
                        className="mt-1 w-full rounded-lg border border-border p-2"
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                    </label>
                    <Button type="submit">Submit feedback</Button>
                  </form>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
