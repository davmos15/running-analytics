import React from 'react';
import { Filter } from 'lucide-react';

const DistanceSelector = ({ 
  selectedDistance, 
  setSelectedDistance, 
  distances, 
  isFilterOpen, 
  setIsFilterOpen 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Personal Bests</h2>
        <div className="flex items-center space-x-4">
          <select 
            value={selectedDistance}
            onChange={(e) => setSelectedDistance(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
          >
            {distances.map(distance => (
              <option key={distance} value={distance}>{distance}</option>
            ))}
          </select>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Date Filter</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DistanceSelector;