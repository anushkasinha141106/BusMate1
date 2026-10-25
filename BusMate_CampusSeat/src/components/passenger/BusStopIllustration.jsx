import React from 'react';

export const BusStopIllustration = () => {
  return (
    <div className="relative w-full h-80 sm:h-96 bg-gradient-to-b from-sky-100 to-emerald-50 rounded-3xl overflow-hidden border border-slate-200 shadow-md flex items-end justify-center p-4">
      
      {/* Background City Skyline SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 450" fill="none">
        {/* Soft Sky & Clouds */}
        <rect width="800" height="450" fill="#E0F2FE" />
        <circle cx="120" cy="80" r="45" fill="#FFFFFF" fillOpacity="0.7" />
        <circle cx="160" cy="70" r="35" fill="#FFFFFF" fillOpacity="0.7" />
        <circle cx="680" cy="90" r="50" fill="#FFFFFF" fillOpacity="0.6" />

        {/* City Buildings Silhouette */}
        <path d="M40 320 L40 180 L110 180 L110 320 Z" fill="#93C5FD" fillOpacity="0.5" />
        <path d="M120 320 L120 140 L190 140 L190 320 Z" fill="#BFDBFE" fillOpacity="0.6" />
        <path d="M210 320 L210 220 L270 220 L270 320 Z" fill="#93C5FD" fillOpacity="0.4" />
        <path d="M520 320 L520 160 L590 160 L590 320 Z" fill="#BFDBFE" fillOpacity="0.5" />
        <path d="M600 320 L600 200 L670 200 L670 320 Z" fill="#93C5FD" fillOpacity="0.4" />

        {/* Trees & Greenery Background */}
        <circle cx="70" cy="300" r="40" fill="#86EFAC" />
        <circle cx="280" cy="290" r="55" fill="#4ADE80" />
        <circle cx="480" cy="300" r="45" fill="#86EFAC" />

        {/* Asphalt Road & Sidewalk */}
        <rect x="0" y="320" width="800" height="130" fill="#64748B" />
        <line x1="0" y1="380" x2="800" y2="380" stroke="#FFFFFF" strokeWidth="6" strokeDasharray="25 20" />
        <rect x="0" y="310" width="800" height="15" fill="#CBD5E1" />

        {/* Blue SmartBus Vehicle */}
        <g transform="translate(180, 110)">
          {/* Bus Body */}
          <rect x="0" y="0" width="310" height="190" rx="30" fill="#0284C7" />
          <path d="M0 120 L310 120 L310 165 C310 178 300 190 285 190 L25 190 C10 190 0 178 0 165 Z" fill="#0369A1" />
          
          {/* Windshield & Side Windows */}
          <rect x="20" y="25" width="270" height="75" rx="12" fill="#1E293B" stroke="#0284C7" strokeWidth="4" />
          <rect x="30" y="32" width="115" height="60" rx="6" fill="#38BDF8" fillOpacity="0.8" />
          <rect x="155" y="32" width="125" height="60" rx="6" fill="#38BDF8" fillOpacity="0.8" />

          {/* LED Destination Board */}
          <rect x="60" y="5" width="190" height="18" rx="4" fill="#0F172A" />
          <text x="155" y="17" fill="#FDE047" fontSize="10" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
            Better Journeys • Brighter Communities
          </text>

          {/* Bus Grill Logo */}
          <rect x="90" y="130" width="130" height="24" rx="12" fill="#FFFFFF" />
          <text x="155" y="146" fill="#0284C7" fontSize="13" fontFamily="sans-serif" fontWeight="900" textAnchor="middle">
            SmartBus
          </text>

          {/* Headlights */}
          <circle cx="35" cy="140" r="10" fill="#FEF08A" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="275" cy="140" r="10" fill="#FEF08A" stroke="#FFFFFF" strokeWidth="2" />

          {/* Wheels */}
          <circle cx="65" cy="190" r="22" fill="#0F172A" />
          <circle cx="65" cy="190" r="10" fill="#94A3B8" />
          <circle cx="245" cy="190" r="22" fill="#0F172A" />
          <circle cx="245" cy="190" r="10" fill="#94A3B8" />
        </g>

        {/* Bus Stop Shelter & Passengers (Right Side) */}
        <g transform="translate(540, 130)">
          {/* Glass Bus Shelter Structure */}
          <rect x="60" y="15" width="170" height="180" rx="8" fill="#F1F5F9" fillOpacity="0.85" stroke="#475569" strokeWidth="4" />
          <rect x="50" y="0" width="190" height="18" rx="6" fill="#1E293B" />
          <rect x="220" y="15" width="12" height="180" fill="#334155" />

          {/* Shelter Poster Sign */}
          <rect x="180" y="40" width="45" height="130" rx="4" fill="#0284C7" />
          <text x="202" y="65" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">Safe</text>
          <text x="202" y="80" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">Inclusive</text>
          <text x="202" y="95" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">Greener</text>
          <text x="202" y="110" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">Together</text>
          <text x="202" y="135" fill="#4ADE80" fontSize="14" textAnchor="middle">🍃</text>

          {/* Passengers Artwork */}
          {/* 1. School Child with Backpack */}
          <g transform="translate(10, 110)">
            <circle cx="20" cy="12" r="10" fill="#FCA5A5" />
            <path d="M12 24 C12 24 20 20 28 24 L28 65 L12 65 Z" fill="#0284C7" />
            {/* Backpack */}
            <rect x="5" y="26" width="10" height="22" rx="3" fill="#F59E0B" />
            {/* Legs */}
            <rect x="14" y="65" width="5" height="20" fill="#1E293B" />
            <rect x="22" y="65" width="5" height="20" fill="#1E293B" />
          </g>

          {/* 2. Adult Woman */}
          <g transform="translate(45, 80)">
            <circle cx="20" cy="14" r="11" fill="#FED7AA" />
            <path d="M10 28 C10 25 30 25 30 28 L34 95 L6 95 Z" fill="#0D9488" />
            <rect x="13" y="95" width="6" height="20" fill="#1E293B" />
            <rect x="21" y="95" width="6" height="20" fill="#1E293B" />
          </g>

          {/* 3. Elderly Senior Citizen with Cane */}
          <g transform="translate(90, 65)">
            <circle cx="20" cy="14" r="12" fill="#FDE68A" />
            {/* Glasses */}
            <circle cx="16" cy="14" r="4" stroke="#1E293B" strokeWidth="1.5" fill="none" />
            <circle cx="24" cy="14" r="4" stroke="#1E293B" strokeWidth="1.5" fill="none" />
            {/* Coat */}
            <path d="M6 30 C6 26 34 26 34 30 L32 110 L8 110 Z" fill="#0F766E" />
            {/* Walking Stick / Cane */}
            <path d="M38 45 L38 110 C38 112 36 114 34 114" stroke="#B45309" strokeWidth="4" fill="none" />
            <rect x="12" y="110" width="6" height="20" fill="#1E293B" />
            <rect x="22" y="110" width="6" height="20" fill="#1E293B" />
          </g>
        </g>
      </svg>
    </div>
  );
};
