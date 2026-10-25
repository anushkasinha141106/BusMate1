import { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import SimulatedBadge from '../../components/ui/SimulatedBadge.jsx';
import { DEFAULT_WEIGHTS, generateSyntheticPassengers, runAllocation } from '../../services/allocationService.js';
import { useSettings } from '../../context/SettingsContext.jsx';

export default function AllocationPage() {
  const { settings } = useSettings();
  const [capacity] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = () => {
    setLoading(true);
    setTimeout(() => {
      const passengers = generateSyntheticPassengers(73, 12345);
      setResult(
        runAllocation({
          capacity,
          passengers,
          weights: settings.policyWeights || DEFAULT_WEIGHTS,
        }),
      );
      setLoading(false);
    }, 400);
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-main">Run Fair Allocation</h1>
      <SimulatedBadge className="mb-6">Synthetic passenger requests — anonymous IDs only.</SimulatedBadge>
      <Card>
        <p className="text-lg">
          Available seats: <strong>{capacity}</strong> · Passenger requests: <strong>73</strong>
        </p>
        <p className="mt-2 text-muted">
          Allocation score = w₁×constraint + w₂×schedule disruption + w₃×previous denials + w₄×preference match (weights
          calibrated via experiments, not assumed optimal).
        </p>
        <p className="mt-2 text-sm">
          Hard constraints: capacity limit, one seat per passenger, route/time compatibility, legitimate priority — no
          protected demographics as ranking factors.
        </p>
        <Button className="mt-4" onClick={run} disabled={loading}>
          {loading ? 'Running allocation…' : 'Run allocation'}
        </Button>
      </Card>
      {result && (
        <Card title="Results" className="mt-6">
          <p>
            Allocated: {result.allocated.length} · Waitlisted: {result.waitlisted.length} · Seat utilization:{' '}
            {Math.round(result.seatUtilization)}%
          </p>
          <div className="mt-4 max-h-96 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2">Passenger</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Factors</th>
                </tr>
              </thead>
              <tbody>
                {[...result.allocated.slice(0, 8), ...result.waitlisted.slice(0, 5)].map((p) => (
                  <tr key={p.id} className="border-b border-border">
                    <td className="p-2">{p.displayName}</td>
                    <td className="p-2 capitalize">{p.status}</td>
                    <td className="p-2">{p.reasons?.[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
