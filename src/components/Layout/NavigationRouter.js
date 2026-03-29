import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Star, Timer, Settings, BarChart3, TrendingUp, Calendar, Map, Menu, X } from 'lucide-react';

const NavigationRouter = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close menu on outside click
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [mobileMenuOpen]);

  // Prevent body scroll when menu open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/personal-bests', label: 'Personal Bests', icon: Star },
    { path: '/recent-runs', label: 'Recent Runs', icon: Timer },
    { path: '/graphs', label: 'Graphs', icon: BarChart3 },
    { path: '/predictions', label: 'Predictions', icon: TrendingUp },
    { path: '/training-plan', label: 'Training Plan', icon: Calendar },
    { path: '/road-coverage', label: 'Road Coverage', icon: Map },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  // Desktop: short labels to fit
  const desktopLabels = {
    '/': 'Home',
    '/personal-bests': 'PBs',
    '/recent-runs': 'Recent',
    '/graphs': 'Graphs',
    '/predictions': 'Predictions',
    '/training-plan': 'Plan',
    '/road-coverage': 'Roads',
    '/settings': 'Settings',
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex athletic-card-gradient mt-6 p-2 mx-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex-1 flex items-center justify-center px-3 lg:px-6 py-3 rounded-md font-medium transition-all text-sm lg:text-base ${
                active
                  ? 'athletic-button-primary text-white shadow-lg'
                  : 'text-slate-300 hover:text-white athletic-button-secondary'
              }`}
            >
              <Icon className="w-5 h-5 mr-1.5 lg:mr-2 flex-shrink-0" />
              <span className="truncate">{desktopLabels[item.path]}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Mobile: Fixed bottom bar with burger toggle */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Current page indicator + burger button */}
        <div className="athletic-card-gradient border-t border-blue-500/20 flex items-center justify-between px-4 py-3">
          {/* Show current page */}
          {(() => {
            const current = navItems.find((n) => isActive(n.path)) || navItems[0];
            const Icon = current.icon;
            return (
              <div className="flex items-center gap-2 text-orange-400">
                <Icon className="w-5 h-5" />
                <span className="font-semibold text-sm">{current.label}</span>
              </div>
            );
          })()}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-white hover:bg-slate-700/50 transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile: Slide-up drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Drawer */}
          <div
            ref={menuRef}
            className="absolute bottom-0 left-0 right-0 athletic-card-gradient border-t border-blue-500/30 rounded-t-2xl animate-slide-up"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-slate-500" />
            </div>

            <nav className="px-4 pb-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all ${
                      active
                        ? 'athletic-button-primary text-white shadow-lg'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default NavigationRouter;
