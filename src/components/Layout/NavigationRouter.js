import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Star, Timer, Settings, BarChart3, TrendingUp, Calendar } from 'lucide-react';

const NavigationRouter = () => {
  const location = useLocation();
  
  // Helper function to determine if a route is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Debug for production (temporary)
  const handleNavDebug = (path) => {
    console.log(`Navigating to: ${path}, Current: ${location.pathname}`);
  };

  // Navigation items configuration
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/personal-bests', label: 'Personal Bests', icon: Star },
    { path: '/recent-runs', label: 'Recent Runs', icon: Timer },
    { path: '/graphs', label: 'Graphs', icon: BarChart3 },
    { path: '/predictions', label: 'Predictions', icon: TrendingUp },
    { path: '/training-plan', label: 'Plan', icon: Calendar },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  // Mobile navigation items with short labels
  const mobileNavItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/personal-bests', label: 'PBs', icon: Star },
    { path: '/recent-runs', label: 'Recent', icon: Timer },
    { path: '/graphs', label: 'Graphs', icon: BarChart3 },
    { path: '/predictions', label: 'Predict', icon: TrendingUp },
    { path: '/training-plan', label: 'Plan', icon: Calendar },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

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
              onClick={() => handleNavDebug(item.path)}
              className={`flex-1 flex items-center justify-center px-6 py-3 rounded-md font-medium transition-all ${
                active
                  ? 'athletic-button-primary text-white shadow-lg'
                  : 'text-slate-300 hover:text-white athletic-button-secondary'
              }`}
            >
              <Icon className="w-5 h-5 mr-2" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 athletic-card-gradient border-t border-blue-500/20 z-50">
        <div className="grid grid-cols-7">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => handleNavDebug(item.path)}
                className={`flex flex-col items-center py-2 px-1 ${
                  active ? 'text-orange-400' : 'text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default NavigationRouter;