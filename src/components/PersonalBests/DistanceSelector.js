import React from 'react';
import { Filter, Columns } from 'lucide-react';

const DistanceSelector = ({ 
  selectedDistance, 
  setSelectedDistance, 
  distances, 
  isFilterOpen, 
  setIsFilterOpen,
  isColumnSelectorOpen,
  setIsColumnSelectorOpen,
  customDistance,
  setCustomDistance,
  visibleColumns,
  setVisibleColumns
}) => {
  return (
    <div className="athletic-card-gradient p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>PBs</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
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
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center space-x-2 px-3 py-2 athletic-button-secondary text-slate-300 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Date Filter</span>
              <span className="text-sm font-medium sm:hidden">Filter</span>
            </button>
            <button 
              onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
              className="flex items-center space-x-2 px-3 py-2 athletic-button-secondary text-slate-300 rounded-lg transition-colors"
            >
              <Columns className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Columns</span>
              <span className="text-sm font-medium sm:hidden">Cols</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistanceSelector;