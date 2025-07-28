import React from 'react';
import { Filter } from 'lucide-react';
import ColumnSelector from './ColumnSelector';

const DistanceSelector = ({ 
  selectedDistance, 
  setSelectedDistance, 
  distances, 
  isFilterOpen, 
  setIsFilterOpen,
  customDistance,
  setCustomDistance,
  visibleColumns,
  setVisibleColumns
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Personal Bests</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <select 
              value={selectedDistance}
              onChange={(e) => setSelectedDistance(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
            >
              {distances.map(distance => (
                <option key={distance} value={distance}>{distance}</option>
              ))}
            </select>
            {selectedDistance === 'Custom' && (
              <input
                type="text"
                placeholder="e.g., 7.5K, 3000m"
                value={customDistance}
                onChange={(e) => setCustomDistance(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-32"
              />
            )}
          </div>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Date Filter</span>
          </button>
          <ColumnSelector
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
          />
        </div>
      </div>
    </div>
  );
};

export default DistanceSelector;