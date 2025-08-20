import React, { useState } from 'react';
import { Home, Star, Timer } from 'lucide-react';

const NavigationTest = () => {
  const [currentTab, setCurrentTab] = useState('home');

  const handleClick = (tab) => {
    console.log('NavigationTest: Button clicked for tab:', tab);
    setCurrentTab(tab);
    alert(`Clicked: ${tab}`);
  };

  return (
    <div className="p-4">
      <h2 className="text-white mb-4">Navigation Test - Current Tab: {currentTab}</h2>
      
      {/* Simple test buttons */}
      <div className="space-x-4 mb-6">
        <button 
          onClick={() => handleClick('home')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <Home className="w-4 h-4 inline mr-2" />
          Home
        </button>
        
        <button 
          onClick={() => handleClick('personal-bests')}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          <Star className="w-4 h-4 inline mr-2" />
          Personal Bests
        </button>
        
        <button 
          onClick={() => handleClick('recent-runs')}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          <Timer className="w-4 h-4 inline mr-2" />
          Recent Runs
        </button>
      </div>

      {/* Athletic styled buttons */}
      <div className="space-x-2">
        <button 
          onClick={() => handleClick('athletic-home')}
          className="px-6 py-3 athletic-button-primary text-white rounded-md"
        >
          Athletic Home
        </button>
        
        <button 
          onClick={() => handleClick('athletic-pb')}
          className="px-6 py-3 athletic-button-secondary text-white rounded-md"
        >
          Athletic PB
        </button>
      </div>

      <div className="mt-4 text-slate-300">
        <p>If these buttons work but navigation doesn't, it's a prop passing issue.</p>
        <p>If these buttons don't work, it's a fundamental CSS/event issue.</p>
      </div>
    </div>
  );
};

export default NavigationTest;