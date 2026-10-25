import Card from '../components/ui/Card.jsx';
import { Link } from 'react-router-dom';

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold text-main">Help</h1>
      <div className="space-y-6">
        <Card title="Searching for buses">
          <p>Use Home or Find Bus to enter locations, date, and time. Results show predicted demand and overcrowding risk as separate outputs.</p>
        </Card>
        <Card title="Understanding risk">
          <p>Risk is shown with colour, icon, and text. High risk means the trip is likely to become overcrowded — consider an alternative departure.</p>
        </Card>
        <Card title="Seat requests">
          <p>After requesting a seat, open My Trips to see allocated or waitlisted status and explanations. You can explore alternatives or submit feedback.</p>
        </Card>
        <Card title="Accessibility">
          <p>Use Text Size in the navigation bar or Accessibility controls on the homepage for Normal, Large, or Extra Large text.</p>
        </Card>
        <p>
          <Link to="/how-it-works" className="font-medium text-primary underline-offset-2 hover:underline">
            Learn how SmartBus works
          </Link>
        </p>
      </div>
    </div>
  );
}
