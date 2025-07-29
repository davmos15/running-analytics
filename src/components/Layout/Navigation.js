import React from 'react';
import { Star, Timer, Settings, BarChart3 } from 'lucide-react';

const Navigation = ({ activeTab, setActiveTab }) => {
  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex athletic-card-gradient mt-6 p-2 mx-4">
        <button 
          onClick={() => setActiveTab('personal-bests')}
          className={`flex-1 flex items-center justify-center px-6 py-3 rounded-md font-medium transition-all ${
            activeTab === 'personal-bests' 
              ? 'athletic-button-primary text-white shadow-lg' 
              : 'text-slate-300 hover:text-white athletic-button-secondary'
          }`}
        >
          <Star className="w-5 h-5 mr-2" />
          Personal Bests
        </button>
        <button 
          onClick={() => setActiveTab('recent-runs')}
          className={`flex-1 flex items-center justify-center px-6 py-3 rounded-md font-medium transition-all ${
            activeTab === 'recent-runs' 
              ? 'athletic-button-primary text-white shadow-lg' 
              : 'text-slate-300 hover:text-white athletic-button-secondary'
          }`}
        >
          <Timer className="w-5 h-5 mr-2" />
          Recent Runs
        </button>
        <button 
          onClick={() => setActiveTab('graphs')}
          className={`flex-1 flex items-center justify-center px-6 py-3 rounded-md font-medium transition-all ${
            activeTab === 'graphs' 
              ? 'athletic-button-primary text-white shadow-lg' 
              : 'text-slate-300 hover:text-white athletic-button-secondary'
          }`}
        >
          <BarChart3 className="w-5 h-5 mr-2" />
          Graphs
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex items-center justify-center px-6 py-3 rounded-md font-medium transition-all ${
            activeTab === 'settings' 
              ? 'athletic-button-primary text-white shadow-lg' 
              : 'text-slate-300 hover:text-white athletic-button-secondary'
          }`}
        >
          <Settings className="w-5 h-5 mr-2" />
          Settings
        </button>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 athletic-card-gradient border-t border-blue-500/20 z-50">
        <div className="grid grid-cols-4">
          <button 
            onClick={() => setActiveTab('personal-bests')}
            className={`flex flex-col items-center py-3 px-2 ${
              activeTab === 'personal-bests' ? 'text-orange-400' : 'text-slate-400'
            }`}
          >
            <Star className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Personal Bests</span>
          </button>
          <button 
            onClick={() => setActiveTab('recent-runs')}
            className={`flex flex-col items-center py-3 px-2 ${
              activeTab === 'recent-runs' ? 'text-orange-400' : 'text-slate-400'
            }`}
          >
            <Timer className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Recent Runs</span>
          </button>
          <button 
            onClick={() => setActiveTab('graphs')}
            className={`flex flex-col items-center py-3 px-2 ${
              activeTab === 'graphs' ? 'text-orange-400' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Graphs</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center py-3 px-2 ${
              activeTab === 'settings' ? 'text-orange-400' : 'text-slate-400'
            }`}
          >
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navigation;