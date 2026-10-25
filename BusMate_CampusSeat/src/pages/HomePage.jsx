import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, Megaphone, Accessibility } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import BusStopIllustration from '../components/bus/BusStopIllustration.jsx';
import RiskIndicator from '../components/ui/RiskIndicator.jsx';
import announcements from '../data/announcements.json';
import { getNearbyBuses } from '../services/busSearchService.js';
import { useAccessibility } from '../context/AccessibilityContext.jsx';

export default function HomePage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState('Main Campus Gate');
  const [to, setTo] = useState('Central Station');
  const [date, setDate] = useState('2026-09-13');
  const [time, setTime] = useState('17:00');
  const nearby = getNearbyBuses();
  const { setTextSize } = useAccessibility();

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({ from, to, date, time });
    navigate(`/find-bus?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="mb-10 grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="text-3xl font-bold text-main sm:text-4xl">Where do you want to go?</h1>
          <p className="mt-2 text-lg text-muted">Reliable buses. Fairer journeys for everyone.</p>
          <form onSubmit={handleSearch} className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div>
              <label htmlFor="from" className="mb-1 flex items-center gap-2 font-medium text-main">
                <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
                From location
              </label>
              <input
                id="from"
                type="text"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-3 text-main"
                required
              />
            </div>
            <div>
              <label htmlFor="to" className="mb-1 flex items-center gap-2 font-medium text-main">
                <MapPin className="h-5 w-5 text-secondary" aria-hidden="true" />
                To location
              </label>
              <input
                id="to"
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-3 text-main"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="date" className="mb-1 flex items-center gap-2 font-medium text-main">
                  <Calendar className="h-5 w-5" aria-hidden="true" />
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-border px-4 py-3"
                />
              </div>
              <div>
                <label htmlFor="time" className="mb-1 flex items-center gap-2 font-medium text-main">
                  <Clock className="h-5 w-5" aria-hidden="true" />
                  Preferred time
                </label>
                <input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg border border-border px-4 py-3"
                />
              </div>
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              Search Buses
            </Button>
          </form>
        </div>
        <BusStopIllustration />
      </section>

      <section className="mb-10 grid gap-6 lg:grid-cols-3">
        <Card title="Nearby buses" className="lg:col-span-2">
          <ul className="divide-y divide-border">
            {nearby.map((bus) => (
              <li key={bus.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-semibold text-main">
                    {bus.id} · {bus.routeName}
                  </p>
                  <p className="text-muted">
                    {bus.departureTime} · {bus.from} → {bus.to}
                  </p>
                </div>
                <RiskIndicator level={bus.riskLevel} probability={bus.overcrowdingProbability} />
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Accessibility controls" icon={Accessibility}>
          <p className="mb-4 text-muted">Choose a comfortable reading size. Minimum 16px body text at Normal.</p>
          <div className="flex flex-col gap-2">
            {['normal', 'large', 'xlarge'].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setTextSize(size)}
                className="min-h-[44px] rounded-lg border border-border px-4 py-2 text-left capitalize hover:border-primary"
              >
                {size === 'normal' ? 'Normal' : size === 'large' ? 'Large' : 'Extra Large'}
              </button>
            ))}
          </div>
        </Card>
      </section>

      <Card title="Service announcements" icon={Megaphone}>
        <ul className="space-y-4">
          {announcements.map((a) => (
            <li key={a.id} className="rounded-lg border border-border bg-background p-4">
              <p className="font-semibold text-main">{a.title}</p>
              <p className="mt-1 text-muted">{a.message}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
