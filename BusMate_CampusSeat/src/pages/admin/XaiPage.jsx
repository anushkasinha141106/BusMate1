import { useMemo, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import ExplanationPanel from '../../components/explanations/ExplanationPanel.jsx';
import { getOvercrowdingExplanation } from '../../services/shapExplanationService.js';

export default function XaiPage() {
  const [busId, setBusId] = useState('SB-04');
  const explanation = useMemo(() => getOvercrowdingExplanation({
    busId,
    dayOfWeek: 'Friday',
    campusEvent: true,
    recentDemandLevel: 'elevated',
  }), [busId]);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-main">XAI Explanations</h1>
      <Card>
        <label>
          Bus context
          <select className="mt-1 block rounded-lg border border-border px-3 py-2" value={busId} onChange={(e) => setBusId(e.target.value)}>
            <option value="SB-04">SB-04 Friday stadium run</option>
            <option value="SB-02">SB-02 Morning campus</option>
          </select>
        </label>
        <div className="mt-6">
          <ExplanationPanel explanation={explanation} />
        </div>
      </Card>
    </div>
  );
}
