import { useMemo, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import SimulatedBadge from '../../components/ui/SimulatedBadge.jsx';
import {
  DEFAULT_WEIGHTS,
  generateSyntheticPassengers,
  runCounterfactual,
} from '../../services/allocationService.js';
import { runBatchCounterfactual } from '../../services/policyCalibrationService.js';
import { useSettings } from '../../context/SettingsContext.jsx';

const FACTORS = [
  { key: 'previousDenials', label: 'Previous denials', type: 'number', min: 0, max: 5 },
  { key: 'constraintLevel', label: 'Constraint level', type: 'number', min: 1, max: 5 },
  { key: 'scheduleDisruption', label: 'Schedule disruption', type: 'number', min: 1, max: 5 },
  { key: 'preferredTripMatch', label: 'Preferred trip match', type: 'boolean' },
];

export default function CounterfactualPage() {
  const { settings } = useSettings();
  const passengers = useMemo(() => generateSyntheticPassengers(73, 12345), []);
  const [selectedId, setSelectedId] = useState('P-0001');
  const [factor, setFactor] = useState('previousDenials');
  const [newValue, setNewValue] = useState(3);
  const [cfResult, setCfResult] = useState(null);
  const [batchSeed, setBatchSeed] = useState(5555);
  const [batchCount, setBatchCount] = useState(2000);
  const [batchResult, setBatchResult] = useState(null);
  const [loadingBatch, setLoadingBatch] = useState(false);

  const target = passengers.find((p) => p.id === selectedId) || passengers[0];

  const resetScenario = () => {
    setCfResult(null);
    setFactor('previousDenials');
    setNewValue(3);
  };

  const runCf = () => {
    const val = factor === 'preferredTripMatch' ? Boolean(newValue) : Number(newValue);
    const res = runCounterfactual(
      target,
      factor,
      val,
      50,
      passengers,
      settings.policyWeights || DEFAULT_WEIGHTS,
    );
    setCfResult(res);
  };

  const runBatch = () => {
    setLoadingBatch(true);
    setTimeout(() => {
      setBatchResult(runBatchCounterfactual(batchCount, batchSeed, settings.policyWeights || DEFAULT_WEIGHTS));
      setLoadingBatch(false);
    }, 500);
  };

  const originalVal = target?.[factor];

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-main">Counterfactual Fairness Lab</h1>
      <p className="mb-6 text-muted">Change one factor at a time and re-run the allocator.</p>
      <SimulatedBadge className="mb-6">Counterfactual fairness / policy-sensitivity evaluation — prototype only.</SimulatedBadge>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Single counterfactual experiment">
          <label className="block">
            Anonymous passenger
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setCfResult(null);
              }}
            >
              {passengers.slice(0, 15).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} ({p.id})
                </option>
              ))}
            </select>
          </label>
          {target && (
            <dl className="mt-4 space-y-1 text-sm">
              <div>
                <dt className="inline text-muted">Previous denials: </dt>
                <dd className="inline">{target.previousDenials}</dd>
              </div>
              <div>
                <dt className="inline text-muted">Constraint level: </dt>
                <dd className="inline">{target.constraintLevel}</dd>
              </div>
              <div>
                <dt className="inline text-muted">Preferred trip: </dt>
                <dd className="inline">{target.preferredTripMatch ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          )}
          <label className="mt-4 block">
            Change one factor
            <select className="mt-1 w-full rounded-lg border border-border px-3 py-2" value={factor} onChange={(e) => setFactor(e.target.value)}>
              {FACTORS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block">
            New value{' '}
            <span className="rounded bg-amber-100 px-2 py-0.5 text-warning">
              {String(originalVal)} → {String(factor === 'preferredTripMatch' ? Boolean(newValue) : newValue)}
            </span>
            {factor === 'preferredTripMatch' ? (
              <select className="mt-1 w-full rounded-lg border border-border px-3 py-2" value={newValue} onChange={(e) => setNewValue(Number(e.target.value))}>
                <option value={1}>Yes</option>
                <option value={0}>No</option>
              </select>
            ) : (
              <input
                type="number"
                min={FACTORS.find((f) => f.key === factor)?.min}
                max={FACTORS.find((f) => f.key === factor)?.max}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            )}
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={runCf}>Run counterfactual</Button>
            <Button variant="outline" onClick={resetScenario}>
              Reset scenario
            </Button>
          </div>
          {cfResult && (
            <div className="mt-6 rounded-lg border-2 border-primary bg-slate-50 p-4" role="status">
              <p>
                Original result: <strong className="capitalize">{cfResult.originalResult}</strong>
              </p>
              <p>
                Counterfactual result: <strong className="capitalize">{cfResult.counterfactualResult}</strong>
              </p>
              <p>
                Outcome changed: <strong>{cfResult.outcomeChanged ? 'Yes' : 'No'}</strong>
              </p>
              <p>
                Influential factor: <strong>{cfResult.influentialFactor}</strong>
              </p>
            </div>
          )}
        </Card>

        <Card title="Batch counterfactual evaluation">
          <label className="block">
            Scenarios (1,000 – 5,000)
            <input
              type="number"
              min={1000}
              max={5000}
              step={500}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={batchCount}
              onChange={(e) => setBatchCount(Number(e.target.value))}
            />
          </label>
          <label className="mt-3 block">
            Random seed (reproducibility)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={batchSeed}
              onChange={(e) => setBatchSeed(Number(e.target.value))}
            />
          </label>
          <Button className="mt-4" onClick={runBatch} disabled={loadingBatch}>
            {loadingBatch ? 'Running…' : 'Run batch evaluation'}
          </Button>
          {batchResult && (
            <dl className="mt-6 space-y-2 text-sm">
              <div>
                <dt className="text-muted">Scenarios tested</dt>
                <dd className="font-semibold">{batchResult.scenariosTested}</dd>
              </div>
              <div>
                <dt className="text-muted">Outcomes changed</dt>
                <dd className="font-semibold">{batchResult.percentOutcomesChanged}%</dd>
              </div>
              <div>
                <dt className="text-muted">Most influential factors</dt>
                <dd>
                  <ul>
                    {batchResult.mostInfluentialFactors.slice(0, 3).map((f) => (
                      <li key={f.factor}>
                        {f.factor}: {f.count}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt className="text-muted">Seat utilization (sim.)</dt>
                <dd>{batchResult.seatUtilization}%</dd>
              </div>
            </dl>
          )}
        </Card>
      </div>
    </div>
  );
}
