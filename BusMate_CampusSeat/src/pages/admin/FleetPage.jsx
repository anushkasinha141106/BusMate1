import { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import buses from '../../data/buses.json';

export default function FleetPage() {
  const [fleet, setFleet] = useState(buses);
  const [message, setMessage] = useState('');

  const updateCapacity = (id, delta) => {
    setFleet((prev) =>
      prev.map((b) => (b.id === id ? { ...b, capacity: Math.max(20, b.capacity + delta) } : b)),
    );
    setMessage(`Updated capacity for ${id} (session only — mock fleet).`);
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-main">Fleet Management</h1>
      {message && (
        <p className="mb-4 rounded-lg bg-green-50 p-3 text-success" role="status">
          {message}
        </p>
      )}
      <ul className="space-y-4">
        {fleet.map((bus) => (
          <li key={bus.id}>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{bus.id}</h2>
                  <p className="text-muted">{bus.routeName}</p>
                  <p>
                    Departs {bus.departureTime} · Capacity {bus.capacity}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => updateCapacity(bus.id, -2)}>
                    −2 seats
                  </Button>
                  <Button variant="outline" onClick={() => updateCapacity(bus.id, 2)}>
                    +2 seats
                  </Button>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
