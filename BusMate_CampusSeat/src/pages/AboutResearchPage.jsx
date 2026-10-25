import Card from '../components/ui/Card.jsx';

export default function AboutResearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold text-main">About the Research</h1>
      <div className="space-y-6">
        <Card title="Foundations">
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>C14</strong> provides the foundation for overcrowding prediction and explainable AI (XAI) in
              transportation contexts.
            </li>
            <li>
              <strong>C11</strong> motivates counterfactual fairness analysis and evaluation of the fairness–utility
              trade-off.
            </li>
          </ul>
          <p className="mt-4 text-muted">
            SmartBus does not claim to have invented demand prediction, SHAP, XAI, or counterfactual fairness. C14 and
            C11 are inspirations — not novel ML algorithms developed solely for this prototype.
          </p>
        </Card>
        <Card title="SmartBus contribution">
          <blockquote className="border-l-4 border-primary pl-4 italic text-main">
            SmartBus integrates overcrowding prediction and explainable ML with counterfactual fairness analysis to
            dynamically evaluate and calibrate capacity-allocation policies under hard transportation constraints.
          </blockquote>
          <p className="mt-4 text-muted">
            The novelty is in combining and applying these methods to calibrate a practical, capacity-constrained bus
            allocation policy — not in merely implementing two existing papers.
          </p>
        </Card>
        <Card title="Prototype transparency">
          <p>
            All predictions, SHAP values, passenger requests, and policy evaluations on this site are simulated for
            demonstration. Real-world validation will require actual transportation data and user studies.
          </p>
        </Card>
      </div>
    </div>
  );
}
