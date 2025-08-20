import React from 'react';
import { Home, Star, Timer, Settings, BarChart3, TrendingUp, Calendar } from 'lucide-react';

const Navigation = ({ activeTab, setActiveTab }) => {
  // Debug function to test if clicks are working
  const handleTabClick = (tabName) => {
    // Force visible debug output
    const debugMsg = `NAV DEBUG: Clicked ${tabName}, Current: ${activeTab}`;
    console.log(debugMsg);
    
    // Also show in UI for production debugging
    const debugDiv = document.createElement('div');
    debugDiv.textContent = debugMsg;
    debugDiv.style.cssText = 'position:fixed;top:10px;right:10px;background:red;color:white;padding:10px;z-index:9999';
    document.body.appendChild(debugDiv);
    setTimeout(() => debugDiv.remove(), 2000);
    
    if (setActiveTab && typeof setActiveTab === 'function') {
      try {
        setActiveTab(tabName);
        console.log('setActiveTab called successfully');
      } catch (err) {
        console.error('Error in setActiveTab:', err);
        alert(`Navigation Error: ${err.message}`);
      }
    } else {
      console.error('setActiveTab is not a function:', setActiveTab);
      alert('Navigation Error: setActiveTab is not a function');
    }
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex athletic-card-gradient mt-6 p-2 mx-4">
        <button 
          onClick={() => handleTabClick('homepage')}
          className={`flex-1 flex items-center justify-center px-6 py-3 rounded-md font-medium transition-all ${
            activeTab === 'homepage' 
              ? 'athletic-button-primary text-white shadow-lg' 
              : 'text-slate-300 hover:text-white athletic-button-secondary'
          }`}
        >
          <Home className="w-5 h-5 mr-2" />
          Home
        </button>
        <button 
          onClick={() => handleTabClick('personal-bests')}
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
          onClick={() => handleTabClick('recent-runs')}
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
          onClick={() => handleTabClick('graphs')}
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
          onClick={() => handleTabClick('predictions')}
          className={`flex-1 flex items-center justify-center px-6 py-3 rounded-md font-medium transition-all ${
            activeTab === 'predictions' 
              ? 'athletic-button-primary text-white shadow-lg' 
              : 'text-slate-300 hover:text-white athletic-button-secondary'
          }`}
        >
          <TrendingUp className="w-5 h-5 mr-2" />
          Predictions
        </button>
        <button 
          onClick={() => handleTabClick('training-plan')}
          className={`flex-1 flex items-center justify-center px-6 py-3 rounded-md font-medium transition-all ${
            activeTab === 'training-plan' 
              ? 'athletic-button-primary text-white shadow-lg' 
              : 'text-slate-300 hover:text-white athletic-button-secondary'
          }`}
        >
          <Calendar className="w-5 h-5 mr-2" />
          Plan
        </button>
        <button 
          onClick={() => handleTabClick('settings')}
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
        <div className="grid grid-cols-7">
          <button 
            onClick={() => handleTabClick('homepage')}
            className={`flex flex-col items-center py-2 px-1 ${
              activeTab === 'homepage' ? 'text-orange-400' : 'text-slate-400'
            }`}
          >
            <Home className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button 
            onClick={() => handleTabClick('personal-bests')}
            className={`flex flex-col items-center py-2 px-1 ${
              activeTab === 'personal-bests' ? 'text-orange-400' : 'text-slate-400'
            }`}
          >
            <Star className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">PBs</span>
          </button>
          <button 
            onClick={() => handleTabClick('recent-runs')}
            className={`flex flex-col items-center py-2 px-1 ${
              activeTab === 'recent-runs' ? 'text-orange-400' : 'text-slate-400'
            }`}
          >
            <Timer className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Recent</span>
          </button>
          <button 
            onClick={() => handleTabClick('graphs')}
            className={`flex flex-col items-center py-2 px-1 ${
              activeTab === 'graphs' ? 'text-orange-400' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Graphs</span>
          </button>
          <button 
            onClick={() => handleTabClick('predictions')}
            className={`flex flex-col items-center py-2 px-1 ${
              activeTab === 'predictions' ? 'text-orange-400' : 'text-slate-400'
            }`}
          >
            <TrendingUp className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Predict</span>
          </button>
          <button 
            onClick={() => handleTabClick('training-plan')}
            className={`flex flex-col items-center py-2 px-1 ${
              activeTab === 'training-plan' ? 'text-orange-400' : 'text-slate-400'
            }`}
          >
            <Calendar className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Plan</span>
          </button>
          <button 
            onClick={() => handleTabClick('settings')}
            className={`flex flex-col items-center py-2 px-1 ${
              activeTab === 'settings' ? 'text-orange-400' : 'text-slate-400'
            }`}
          >
            <Settings className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navigation;