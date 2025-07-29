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
    <div className="athletic-card-gradient p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Personal Bests</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <select 
              value={selectedDistance}
              onChange={(e) => setSelectedDistance(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm font-medium text-white"
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
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm w-32 text-white placeholder-slate-400"
              />
            )}
          </div>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center space-x-2 px-3 py-2 athletic-button-secondary text-slate-300 rounded-lg transition-colors"
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