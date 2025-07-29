import React from 'react';
import { Timer } from 'lucide-react';

const Header = () => {
  return (
    <header className="athletic-card sticky top-0 z-50 mx-4 mt-4 rounded-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}>
              <Timer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Athletic Performance Hub
              </h1>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;