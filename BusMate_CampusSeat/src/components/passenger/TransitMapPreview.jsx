import React, { useState, useEffect } from 'react';
import { 
  Bus, 
  MapPin, 
  Navigation, 
  Compass, 
  Layers, 
  RotateCw, 
  Clock, 
  Users, 
  Crosshair, 
  CheckCircle2, 
  AlertTriangle,
  Radio,
  ChevronRight,
  Info
} from 'lucide-react';

export const TransitMapPreview = ({ onSelectStop }) => {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showStops, setShowStops] = useState(true);
  const [trafficLayer, setTrafficLayer] = useState(false);
  const [isLiveSimulating, setIsLiveSimulating] = useState(true);
  const [timeOffset, setTimeOffset] = useState(0);

  // Simulated animated bus movement clock
  useEffect(() => {
    if (!isLiveSimulating) return;
    const interval = setInterval(() => {
      setTimeOffset(prev => (prev + 1) % 360);
    }, 1200);
    return () => clearInterval(interval);
  }, [isLiveSimulating]);

  // Stops located in Pune & surrounding network
  const transitStops = [
    { id: 'stop-swargate', name: 'Swargate Stand', x: 280, y: 260, distance: '350m', walkTime: '4 min', type: 'Major Hub', nextBus: 'Route 21 in 4m' },
    { id: 'stop-pune-stn', name: 'Pune Railway Station', x: 440, y: 150, distance: '2.4km', walkTime: '12 min', type: 'Rail Interchange', nextBus: 'Route 1 in 8m' },
    { id: 'stop-shivajinagar', name: 'Shivajinagar Station', x: 310, y: 160, distance: '1.8km', walkTime: '8 min', type: 'Metro Hub', nextBus: 'Route 8 in 6m' },
    { id: 'stop-katraj', name: 'Katraj Bus Stand', x: 260, y: 390, distance: '3.1km', walkTime: '16 min', type: 'South Terminal', nextBus: 'Route 8 in 10m' },
    { id: 'stop-hinjawadi', name: 'Hinjawadi IT Park', x: 100, y: 110, distance: '8.5km', walkTime: 'Direct', type: 'Tech Hub', nextBus: 'Route 102 in 14m' },
    { id: 'stop-iiit', name: 'IIIT Pune Campus', x: 80, y: 220, distance: '14km', walkTime: 'Express', type: 'Academic Hub', nextBus: 'Route 2 in 12m' },
    { id: 'stop-hadapsar', name: 'Hadapsar Gadital', x: 490, y: 310, distance: '4.2km', walkTime: '20 min', type: 'East Terminal', nextBus: 'Route 15 in 9m' }
  ];

  // Dynamic moving buses calculated using smooth sine/cosine waves along corridors
  const buses = [
    {
      id: 'SB-01',
      routeNumber: 'Route 21',
      destination: 'Pune Railway Station',
      x: 320 + Math.sin((timeOffset * Math.PI) / 180) * 45,
      y: 220 - Math.cos((timeOffset * Math.PI) / 180) * 35,
      occupancy: 62,
      occupancyLabel: 'Moderate (32/52)',
      speed: '32 km/h',
      status: 'On Time',
      etaNextStop: '2 mins',
      color: '#0284C7' // Sky Blue
    },
    {
      id: 'SB-02',
      routeNumber: 'Route 8',
      destination: 'Shivajinagar',
      x: 290 + Math.cos((timeOffset * 0.8 * Math.PI) / 180) * 30,
      y: 330 - Math.sin((timeOffset * 0.8 * Math.PI) / 180) * 50,
      occupancy: 44,
      occupancyLabel: 'Low (23/52)',
      speed: '28 km/h',
      status: 'On Time',
      etaNextStop: '5 mins',
      color: '#0D9488' // Teal
    },
    {
      id: 'SB-03',
      routeNumber: 'Route 2 (Talegaon Direct)',
      destination: 'IIIT Pune Academic Quad',
      x: 130 + Math.sin((timeOffset * 0.6 * Math.PI) / 180) * 35,
      y: 190 + Math.cos((timeOffset * 0.6 * Math.PI) / 180) * 20,
      occupancy: 78,
      occupancyLabel: 'Crowded (41/52)',
      speed: '40 km/h',
      status: 'High Demand',
      etaNextStop: '3 mins',
      color: '#D97706' // Amber
    },
    {
      id: 'PMT-104',
      routeNumber: 'Route 104',
      destination: 'Hadapsar Express',
      x: 410 + Math.sin((timeOffset * 0.7 * Math.PI) / 180) * 40,
      y: 260 + Math.cos((timeOffset * 0.7 * Math.PI) / 180) * 25,
      occupancy: 35,
      occupancyLabel: 'Seats Available (18/52)',
      speed: '34 km/h',
      status: 'On Time',
      etaNextStop: '4 mins',
      color: '#059669' // Emerald
    }
  ];

  return (
    <div 
      className="relative w-full h-[540px] md:h-[580px] bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-700/80 shadow-2xl flex flex-col focus-within:ring-4 focus-within:ring-sky-500"
      role="region"
      aria-label="Interactive Transit Map and Live Fleet Telemetry"
    >
      {/* Top Map Telemetry Bar */}
      <div className="absolute top-0 inset-x-0 z-20 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>LIVE GPS FEED</span>
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline text-slate-300 font-semibold">Hub: Swargate Stand</span>
        </div>

        {/* Map View Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowVehicles(!showVehicles)}
            aria-pressed={showVehicles}
            className={`px-2.5 py-1 rounded-md text-[11px] font-sans font-bold transition-colors ${
              showVehicles ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle live vehicles"
          >
            Buses
          </button>
          <button
            onClick={() => setShowStops(!showStops)}
            aria-pressed={showStops}
            className={`px-2.5 py-1 rounded-md text-[11px] font-sans font-bold transition-colors ${
              showStops ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle transit stops"
          >
            Stops
          </button>
          <button
            onClick={() => setIsLiveSimulating(!isLiveSimulating)}
            aria-label={isLiveSimulating ? "Pause live simulation" : "Resume live simulation"}
            className="p-1.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md ml-1"
            title={isLiveSimulating ? "Pause Simulation" : "Resume Simulation"}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLiveSimulating ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          </button>
        </div>
      </div>

      {/* SVG Canvas Map Graphic */}
      <div className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden">
        <svg 
          viewBox="0 0 580 440" 
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {/* Map Background Grids */}
          <defs>
            <pattern id="transitGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="0.8" strokeOpacity="0.7" />
            </pattern>
            <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0E7490" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0891B2" stopOpacity="0.3" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width="100%" height="100%" fill="#090E17" />
          <rect width="100%" height="100%" fill="url(#transitGrid)" />

          {/* Mula-Mutha River Ribbon */}
          <path
            d="M -20,180 C 120,200 220,140 330,170 C 440,200 520,150 620,180"
            fill="none"
            stroke="url(#riverGradient)"
            strokeWidth="28"
            strokeLinecap="round"
          />
          <text x="210" y="155" fill="#38BDF8" opacity="0.4" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
            MULA-MUTHA CORRIDOR
          </text>

          {/* Transit Corridor Lines (Polylines) */}
          {/* Blue Line: Hinjawadi -> Shivajinagar -> Swargate */}
          <path
            d="M 100,110 L 220,140 L 310,160 L 280,260 L 260,390"
            fill="none"
            stroke="#0284C7"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
            filter="url(#glow)"
          />
          {/* Orange/Amber Line: Swargate -> Pune Station -> Airport */}
          <path
            d="M 280,260 L 380,210 L 440,150 L 530,90"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="4"
            strokeDasharray="6,4"
            strokeLinecap="round"
            opacity="0.8"
          />
          {/* Green Line: Hadapsar -> Swargate -> IIIT Pune */}
          <path
            d="M 490,310 L 380,280 L 280,260 L 180,240 L 80,220"
            fill="none"
            stroke="#10B981"
            strokeWidth="4.5"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Radius Range around Current Location (Swargate) */}
          <circle cx="280" cy="260" r="60" fill="#0284C7" fillOpacity="0.08" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3,3" />
          <circle cx="280" cy="260" r="110" fill="#0284C7" fillOpacity="0.04" stroke="#38BDF8" strokeWidth="0.8" strokeDasharray="4,4" />

          {/* Transit Stops */}
          {showStops && transitStops.map((stop) => {
            const isSwargate = stop.id === 'stop-swargate';
            return (
              <g 
                key={stop.id} 
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => {
                  setSelectedEntity({ type: 'stop', data: stop });
                  if (onSelectStop) onSelectStop(stop.name);
                }}
              >
                {/* Outer halo */}
                <circle
                  cx={stop.x}
                  cy={stop.y}
                  r={isSwargate ? "10" : "7"}
                  fill={isSwargate ? "#0284C7" : "#0F172A"}
                  stroke={isSwargate ? "#38BDF8" : "#94A3B8"}
                  strokeWidth="2.5"
                />
                {isSwargate && (
                  <circle cx={stop.x} cy={stop.y} r="4" fill="#FFFFFF" />
                )}
                {/* Stop Label */}
                <text
                  x={stop.x + 12}
                  y={stop.y + 4}
                  fill={isSwargate ? "#F0F9FF" : "#CBD5E1"}
                  fontSize={isSwargate ? "11.5" : "10"}
                  fontWeight={isSwargate ? "800" : "600"}
                  fontFamily="sans-serif"
                >
                  {stop.name}
                </text>
                <text
                  x={stop.x + 12}
                  y={stop.y + 16}
                  fill="#94A3B8"
                  fontSize="8.5"
                  fontFamily="sans-serif"
                >
                  {stop.distance} • {stop.walkTime}
                </text>
              </g>
            );
          })}

          {/* Live Simulated Buses with Pulse Halo */}
          {showVehicles && buses.map((bus) => (
            <g 
              key={bus.id} 
              className="cursor-pointer"
              onClick={() => setSelectedEntity({ type: 'bus', data: bus })}
            >
              {/* Animated pulse ring */}
              <circle
                cx={bus.x}
                cy={bus.y}
                r="16"
                fill={bus.color}
                fillOpacity="0.25"
                className="animate-ping"
                style={{ animationDuration: '2.5s' }}
              />
              {/* Bus Pin Core */}
              <circle
                cx={bus.x}
                cy={bus.y}
                r="11"
                fill={bus.color}
                stroke="#FFFFFF"
                strokeWidth="2"
                filter="url(#glow)"
              />
              {/* Bus Badge text */}
              <text
                x={bus.x}
                y={bus.y + 3.5}
                fill="#FFFFFF"
                fontSize="7.5"
                fontWeight="900"
                fontFamily="sans-serif"
                textAnchor="middle"
              >
                BUS
              </text>
              {/* Bus Label Floating Tag */}
              <rect
                x={bus.x - 36}
                y={bus.y - 26}
                width="72"
                height="15"
                rx="4"
                fill="#0F172A"
                fillOpacity="0.9"
                stroke={bus.color}
                strokeWidth="1"
              />
              <text
                x={bus.x}
                y={bus.y - 16}
                fill="#FFFFFF"
                fontSize="8.5"
                fontWeight="bold"
                fontFamily="sans-serif"
                textAnchor="middle"
              >
                {bus.routeNumber}
              </text>
            </g>
          ))}
        </svg>

        {/* Selected Entity Tooltip / Drawer */}
        {selectedEntity && (
          <div className="absolute top-14 left-4 right-4 sm:right-auto sm:w-72 bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border-2 border-sky-500/80 text-white shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-sky-400 font-bold">
                {selectedEntity.type === 'bus' ? 'Live Telemetry' : 'Station Landmark'}
              </span>
              <button 
                onClick={() => setSelectedEntity(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-1"
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            {selectedEntity.type === 'bus' ? (
              <div className="space-y-2 text-xs">
                <div className="font-black text-sm text-white flex items-center justify-between">
                  <span>{selectedEntity.data.routeNumber}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono">
                    {selectedEntity.data.id}
                  </span>
                </div>
                <p className="text-slate-300 font-medium">To: {selectedEntity.data.destination}</p>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-slate-300">
                  <div className="bg-slate-800/80 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">ETA Next</span>
                    <span className="font-bold text-emerald-400">{selectedEntity.data.etaNextStop}</span>
                  </div>
                  <div className="bg-slate-800/80 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Occupancy</span>
                    <span className="font-bold text-amber-300">{selectedEntity.data.occupancyLabel}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="font-black text-sm text-white">{selectedEntity.data.name}</div>
                <p className="text-slate-300">{selectedEntity.data.type} • {selectedEntity.data.distance} from your location</p>
                <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 space-y-1">
                  <span className="text-[10px] font-bold text-sky-400 block uppercase">Next Departure</span>
                  <span className="font-bold text-white text-sm">{selectedEntity.data.nextBus}</span>
                </div>
                {onSelectStop && (
                  <button
                    onClick={() => {
                      onSelectStop(selectedEntity.data.name);
                      setSelectedEntity(null);
                    }}
                    className="w-full mt-2 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-center text-xs transition-colors"
                  >
                    Set as Journey Origin
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Floating Mini-Card on the Map (Requirement 2 Spec) */}
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white/95 backdrop-blur-md text-slate-900 rounded-2xl p-4 border-2 border-slate-200/90 shadow-2xl z-20">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black text-slate-900 uppercase tracking-tight">Nearest Major Hub</span>
            </div>
            <span className="text-[11px] font-bold text-slate-500">350m walk</span>
          </div>

          <div className="mt-2.5 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-black text-base text-slate-900 leading-tight">Swargate Stand</h4>
                <p className="text-xs font-extrabold text-[#075985] mt-0.5">Next bus arriving in 4 mins</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-[#065F46] font-black text-xs rounded-lg border border-emerald-300">
                On Time
              </span>
            </div>

            {/* Departure count queue */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 font-semibold border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                  <span className="font-bold text-slate-800">Route 21 (Pune Stn)</span>
                </div>
                <span className="font-black text-slate-900">4 mins</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 font-semibold border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                  <span className="font-bold text-slate-800">Route 8 (Shivajinagar)</span>
                </div>
                <span className="font-black text-slate-900">9 mins</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Legend & Recenter CTA */}
        <div className="absolute top-14 right-4 flex flex-col gap-2 z-10">
          <button
            onClick={() => {
              if (onSelectStop) onSelectStop('Swargate Stand');
            }}
            className="p-2.5 bg-slate-900/90 text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-700 shadow-md backdrop-blur-sm transition-colors"
            title="Center on My Location (Swargate)"
            aria-label="Center on My Location"
          >
            <Crosshair className="w-4 h-4 text-sky-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
