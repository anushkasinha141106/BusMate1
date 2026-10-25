import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopAccessibilityBar } from '../components/layout/TopAccessibilityBar';
import { PassengerNavbar } from '../components/layout/PassengerNavbar';
import { PassengerFooter } from '../components/layout/PassengerFooter';
import { A11yModal } from '../components/accessibility/A11yModal';
import { A11yFloatingBadge } from '../components/accessibility/A11yFloatingBadge';
import { AdhdReadingMask } from '../components/accessibility/AdhdReadingMask';
import { AuthModal } from '../components/auth/AuthModal';
import { useAccessibility } from '../context/AccessibilityContext';

export const PassengerLayout = () => {
  const { a11yState } = useAccessibility();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#172033] selection:bg-sky-200 selection:text-sky-900 relative">
      {/* Skip link for screen readers */}
      <TopAccessibilityBar />

      {/* Public Passenger Navigation */}
      <PassengerNavbar />

      {/* Main Passenger Workspace View */}
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      {/* Public Passenger Footer */}
      <PassengerFooter />

      {/* Non-Intrusive Auth Modal (Login / Sign Up) */}
      <AuthModal />

      {/* Accessibility Active Engine Components */}
      <AdhdReadingMask active={a11yState.adhdMask} />
      <A11yFloatingBadge />
      <A11yModal />
    </div>
  );
};
