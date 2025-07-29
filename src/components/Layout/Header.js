import React from 'react';
import { Timer } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Timer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-medium text-gray-900">
                Running Analytics
              </h1>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;