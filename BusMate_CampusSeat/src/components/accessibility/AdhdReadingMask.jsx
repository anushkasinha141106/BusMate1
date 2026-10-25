import React, { useState, useEffect } from 'react';

export const AdhdReadingMask = ({ active = false }) => {
  const [mouseY, setMouseY] = useState(window.innerHeight / 2);

  useEffect(() => {
    if (!active) return;

    const handlePointerMove = (e) => {
      setMouseY(e.clientY);
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [active]);

  if (!active) return null;

  const maskHeight = 90; // Height of the focused horizontal slit in px
  const topCoverHeight = Math.max(0, mouseY - maskHeight / 2);

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-40 overflow-hidden" 
      aria-hidden="true"
    >
      {/* Top Dimmed Overlay */}
      <div 
        className="absolute top-0 inset-x-0 bg-slate-950/75 transition-all duration-75"
        style={{ height: `${topCoverHeight}px` }}
      />

      {/* Focused Reading Slit Border */}
      <div 
        className="absolute inset-x-0 border-y-2 border-amber-400/80 bg-transparent transition-all duration-75"
        style={{ 
          top: `${topCoverHeight}px`, 
          height: `${maskHeight}px` 
        }}
      />

      {/* Bottom Dimmed Overlay */}
      <div 
        className="absolute bottom-0 inset-x-0 bg-slate-950/75 transition-all duration-75"
        style={{ 
          top: `${topCoverHeight + maskHeight}px`,
          bottom: 0
        }}
      />
    </div>
  );
};
