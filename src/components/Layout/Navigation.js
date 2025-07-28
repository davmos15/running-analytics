import React from 'react';
import { Star, Timer, Settings } from 'lucide-react';

const Navigation = ({ activeTab, setActiveTab }) => {
  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex bg-white rounded-lg shadow-sm mt-6 p-1">
        <button 
          onClick={() => setActiveTab('personal-bests')}
          className={`flex-1 flex items-center justify-center px-6 py-3 rounded-md font-medium transition-all ${
            activeTab === 'personal-bests' 
              ? 'bg-blue-50 text-blue-700 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Star className="w-5 h-5 mr-2" />
          Personal Bests
        </button>
        <button 
          onClick={() => setActiveTab('recent-runs')}
          className={`flex-1 flex items-center justify-center px-6 py-3 rounded-md font-medium transition-all ${
            activeTab === 'recent-runs' 
              ? 'bg-blue-50 text-blue-700 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Timer className="w-5 h-5 mr-2" />
          Recent Runs
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex items-center justify-center px-6 py-3 rounded-md font-medium transition-all ${
            activeTab === 'settings' 
              ? 'bg-blue-50 text-blue-700 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Settings className="w-5 h-5 mr-2" />
          Settings
        </button>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-3">
          <button 
            onClick={() => setActiveTab('personal-bests')}
            className={`flex flex-col items-center py-3 px-2 ${
              activeTab === 'personal-bests' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <Star className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Personal Bests</span>
          </button>
          <button 
            onClick={() => setActiveTab('recent-runs')}
            className={`flex flex-col items-center py-3 px-2 ${
              activeTab === 'recent-runs' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <Timer className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Recent Runs</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center py-3 px-2 ${
              activeTab === 'settings' ? 'text-blue-600' : 'text-gray-400'
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