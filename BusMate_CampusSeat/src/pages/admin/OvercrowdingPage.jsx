import { useMemo, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import SimulatedBadge from '../../components/ui/SimulatedBadge.jsx';
import RiskIndicator from '../../components/ui/RiskIndicator.jsx';
import { predictDemand } from '../../services/demandPredictionService.js';
import { predictOvercrowding } from '../../services/overcrowdingService.js';
import buses from '../../data/buses.json';

export default function OvercrowdingPage() {
  const [busId, setBusId] = useState('SB-04');
  const bus = buses.find((b) => b.id === busId);

  const output = useMemo(() => {
    const demand = predictDemand({
      busId,
      routeId: bus?.routeId,
      dayOfWeek: 'Friday',
      timeSlot: bus?.departureTime,
      campusEvent: true,
      recentDemandLevel: 'elevated',
    });
    return predictOvercrowding({
      busId,
      capacity: bus?.capacity || 50,
      predictedDemand: demand.predictedDemand,
      dayOfWeek: 'Friday',
      timeSlot: bus?.departureTime,
      campusEvent: true,
      recentDemandLevel: 'elevated',
      previousOccupancy: 0.82,
      delayHistory: 'moderate',
    });
  }, [busId, bus]);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-main">Overcrowding Risk</h1>
      <SimulatedBadge className="mb-6">{output.label}</SimulatedBadge>
      <Card>
        <label>
          Select bus
          <select className="mt-1 block w-full max-w-xs rounded-lg border border-border px-3 py-2" value={busId} onChange={(e) => setBusId(e.target.value)}>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id} — {b.departureTime}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-6 text-lg text-muted">How likely is this trip to become overcrowded?</p>
        <div className="mt-4">
          <RiskIndicator level={output.riskLevel} probability={output.probability} />
        </div>
        <p className="mt-4">
          Overcrowding probability: <strong>{output.probability}%</strong> · Risk level: <strong>{output.riskLevel}</strong>
        </p>
        <p className="mt-2 text-sm text-muted">
          This model uses demand plus route, weather, events, prior occupancy, delays, and capacity — not demand ÷ capacity alone.
        </p>
      </Card>
    </div>
  );
}
