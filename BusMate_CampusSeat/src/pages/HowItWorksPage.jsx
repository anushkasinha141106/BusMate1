import PipelineDiagram from '../components/pipeline/PipelineDiagram.jsx';
import Card from '../components/ui/Card.jsx';

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 text-3xl font-bold text-main">How SmartBus Works</h1>
      <p className="mb-8 max-w-3xl text-lg text-muted">
        SmartBus integrates overcrowding prediction and explainable ML with counterfactual fairness analysis to
        dynamically evaluate and calibrate capacity-allocation policies under hard transportation constraints.
      </p>
      <Card title="System pipeline">
        <PipelineDiagram />
      </Card>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="For passengers">
          <ul className="list-disc space-y-2 pl-6 text-main">
            <li>Search trips and see demand and overcrowding risk separately.</li>
            <li>Read plain-language explanations of crowding — not raw charts alone.</li>
            <li>Request seats, view allocation results, alternatives, and feedback options.</li>
          </ul>
        </Card>
        <Card title="For administrators & researchers">
          <ul className="list-disc space-y-2 pl-6 text-main">
            <li>Inspect simulated demand and overcrowding models and SHAP-style explanations.</li>
            <li>Run fair allocation, counterfactual labs, and policy calibration.</li>
            <li>Compare fairness–efficiency trade-offs and HCI study conditions.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
