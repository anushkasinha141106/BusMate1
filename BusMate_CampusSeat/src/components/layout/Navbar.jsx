import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Bus, 
  Car, 
  Train, 
  HelpCircle, 
  Globe, 
  User, 
  Accessibility, 
  Menu, 
  X, 
  Check, 
  ChevronDown,
  Ticket,
  Calendar,
  PhoneCall,
  LogOut,
  Sliders
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { SignInModal } from '../common/SignInModal';
import { AccessibilitySettingsModal } from '../common/AccessibilitySettingsModal';

export const Navbar = ({ activeTab = 'bus', onTabChange }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, highContrast, toggleHighContrast } = useAccessibility();
  
  // Menus and Modals State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const languages = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' },
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  // redBus-style navigation tabs
  const navTabs = [
    { id: 'bus', label: 'Bus Tickets', icon: Bus, path: '/' },
    { id: 'cab', label: 'Cab Rental', icon: Car, path: '/#cab-rental' },
    { id: 'train', label: 'Train Tickets', icon: Train, path: '/#train-tickets' },
    { id: 'help', label: 'Help / Support', icon: HelpCircle, path: '/help' },
  ];

  const handleTabClick = (tab) => {
    if (onTabChange) {
      onTabChange(tab.id);
    }
    if (tab.id === 'help') {
      navigate('/help');
    } else if (tab.id === 'bus') {
      navigate('/');
    }
  };

  return (
    <>
      <header 
        className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 shadow-xs" 
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            
            {/* Left: Brand Logo & Navigation Tabs (redBus Style) */}
            <div className="flex items-center gap-6 lg:gap-10">
              {/* Logo */}
              <Link 
                to="/" 
                className="flex items-center gap-2.5 min-h-[48px] px-2 py-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D84E55] transition-transform active:scale-95"
                aria-label="SmartBus Home"
              >
                <div className="w-10 h-10 bg-[#D84E55] text-white rounded-xl flex items-center justify-center shadow-sm font-black shrink-0">
                  <Bus className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-[#1F2937] tracking-tight leading-none">
                    Smart<span className="text-[#D84E55]">Bus</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                    Online Bus Booking
                  </span>
                </div>
              </Link>

              {/* Navigation Tabs (redBus Horizontal Style) */}
              <nav className="hidden lg:flex items-center gap-1" aria-label="Main Services Navigation">
                {navTabs.map((tab) => {
                  const isCurrent = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabClick(tab)}
                      className={`relative min-h-[44px] flex items-center gap-2 px-4 py-2.5 font-bold text-sm transition-all rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D84E55] ${
                        isCurrent 
                          ? 'text-[#D84E55] bg-red-50/70 font-extrabold' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                      aria-current={isCurrent ? 'page' : undefined}
                    >
                      <Icon className={`w-4 h-4 ${isCurrent ? 'text-[#D84E55]' : 'text-slate-500'}`} aria-hidden="true" />
                      <span>{tab.label}</span>
                      {isCurrent && (
                        <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#D84E55] rounded-full" aria-hidden="true"></span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Right Action Items (Language, My Bookings / Account, Accessibility Trigger) */}
            <div className="hidden md:flex items-center gap-3">
              
              {/* Language Selector Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setLangMenuOpen(!langMenuOpen);
                    setAccountMenuOpen(false);
                  }}
                  className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[#D84E55]"
                  aria-expanded={langMenuOpen}
                  aria-haspopup="true"
                  aria-label="Select Language"
                >
                  <Globe className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  <span>{currentLang.native}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                </button>

                {langMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-40 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                    role="menu"
                    aria-label="Language selection"
                  >
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Language
                    </div>
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          setLanguage(l.code);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs font-bold hover:bg-red-50 flex items-center justify-between transition-colors ${
                          language === l.code ? 'text-[#D84E55] bg-red-50/50' : 'text-slate-700'
                        }`}
                        role="menuitem"
                      >
                        <div>
                          <span className="block font-bold">{l.native}</span>
                          <span className="text-[10px] text-slate-400">{l.label}</span>
                        </div>
                        {language === l.code && <Check className="w-4 h-4 text-[#D84E55]" aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* "My Bookings" / Account Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(!accountMenuOpen);
                    setLangMenuOpen(false);
                  }}
                  className="min-h-[40px] flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[#D84E55]"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="true"
                  aria-label="Account and bookings menu"
                >
                  <User className="w-4 h-4 text-slate-600" aria-hidden="true" />
                  <span>Account</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                </button>

                {accountMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-52 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                    role="menu"
                    aria-label="User Account Options"
                  >
                    <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Rider Services
                    </div>
                    <Link
                      to="/my-trips"
                      onClick={() => setAccountMenuOpen(false)}
                      className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#D84E55] flex items-center gap-2.5"
                      role="menuitem"
                    >
                      <Ticket className="w-4 h-4 text-slate-400" />
                      <span>My Bookings</span>
                    </Link>
                    <Link
                      to="/my-trips"
                      onClick={() => setAccountMenuOpen(false)}
                      className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#D84E55] flex items-center gap-2.5"
                      role="menuitem"
                    >
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Cancel / Reschedule</span>
                    </Link>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setSignInModalOpen(true);
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-xs font-black text-[#D84E55] hover:bg-red-50 flex items-center gap-2.5"
                      role="menuitem"
                    >
                      <User className="w-4 h-4 text-[#D84E55]" />
                      <span>Login / Sign Up</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Accessibility Trigger Button (Icon + "A11y") */}
              <button
                type="button"
                onClick={() => setSettingsModalOpen(true)}
                className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-[#D84E55]"
                title="Accessibility Preferences (A11y)"
                aria-label="Accessibility options"
              >
                <Accessibility className="w-4 h-4 text-slate-700" aria-hidden="true" />
                <span>A11y</span>
              </button>

            </div>

            {/* Mobile Drawer Toggle */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setSignInModalOpen(true)}
                className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                aria-label="Account Login"
              >
                <User className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D84E55]"
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle navigation drawer"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-6 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {navTabs.map((tab) => {
                const isCurrent = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      handleTabClick(tab);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold text-left ${
                      isCurrent ? 'bg-red-50 text-[#D84E55] border border-red-200' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSignInModalOpen(true);
                }}
                className="flex-1 py-2.5 bg-[#D84E55] text-white text-xs font-bold rounded-lg text-center"
              >
                Login / Sign Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSettingsModalOpen(true);
                }}
                className="px-3.5 py-2.5 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5"
              >
                <Accessibility className="w-4 h-4" />
                <span>A11y</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Global Modals */}
      <SignInModal 
        isOpen={signInModalOpen} 
        onClose={() => setSignInModalOpen(false)} 
      />
      <AccessibilitySettingsModal 
        isOpen={settingsModalOpen} 
        onClose={() => setSettingsModalOpen(false)} 
      />
    </>
  );
};
