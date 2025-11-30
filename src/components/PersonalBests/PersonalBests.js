import React, { useState, useEffect } from 'react';
import DistanceSelector from './DistanceSelector';
import DateFilter from './DateFilter';
import ResultsTable from './ResultsTable';
import ResultsCards from './ResultsCards';
import LoadingSpinner from '../common/LoadingSpinner';
import { usePersonalBests } from '../../hooks/usePersonalBests';
import { DISTANCES, AVAILABLE_COLUMNS, DISTANCE_METERS } from '../../utils/constants';

const PersonalBests = () => {
  const [selectedDistance, setSelectedDistance] = useState('5K');
  const [timeFilter, setTimeFilter] = useState('all-time');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [allDistances, setAllDistances] = useState(DISTANCES);
  const [showAllDistances, setShowAllDistances] = useState(false);
  const [viewMode, setViewMode] = useState('top10'); // 'top10' or 'progression'
  const [homepageSettings, setHomepageSettings] = useState({
    pbDistances: ['5K', '10K', '21.1K', '42.2K']
  });

  // Initialize visible columns and distances on mount
  useEffect(() => {
    // Load homepage settings for pbDistances
    const savedHomepageSettings = localStorage.getItem('homepageSettings');
    if (savedHomepageSettings) {
      const settings = JSON.parse(savedHomepageSettings);
      setHomepageSettings(settings);
    }
    
    const savedColumns = localStorage.getItem('visibleColumns');
    if (savedColumns) {
      try {
        const parsedColumns = JSON.parse(savedColumns);
        // Ensure rank is always first
        if (parsedColumns && Array.isArray(parsedColumns)) {
          if (!parsedColumns.includes('rank')) {
            setVisibleColumns(['rank', ...parsedColumns]);
          } else if (parsedColumns[0] !== 'rank') {
            const withoutRank = parsedColumns.filter(col => col !== 'rank');
            setVisibleColumns(['rank', ...withoutRank]);
          } else {
            setVisibleColumns(parsedColumns);
          }
        } else {
          // Invalid saved data, use defaults
          const defaultColumns = AVAILABLE_COLUMNS
            .filter(col => col.default)
            .map(col => col.key);
          setVisibleColumns(defaultColumns);
        }
      } catch (error) {
        console.error('Error parsing saved columns:', error);
        // Fall back to default columns
        const defaultColumns = AVAILABLE_COLUMNS
          .filter(col => col.default)
          .map(col => col.key);
        setVisibleColumns(defaultColumns);
      }
    } else {
      // Use default columns
      const defaultColumns = AVAILABLE_COLUMNS
        .filter(col => col.default)
        .map(col => col.key);
      // Ensure rank is first
      const rankIndex = defaultColumns.indexOf('rank');
      if (rankIndex > 0) {
        defaultColumns.splice(rankIndex, 1);
        defaultColumns.unshift('rank');
      }
      setVisibleColumns(defaultColumns);
    }
    
    // Load custom distances and sort them properly
    const savedDistances = localStorage.getItem('customDistances');
    if (savedDistances) {
      const customDistances = JSON.parse(savedDistances);
      // Merge custom distances with default ones
      const baseDistances = DISTANCES;
      const customLabels = customDistances.map(d => d.label);
      
      // Sort all distances by their meter values
      const allDistanceLabels = [...baseDistances, ...customLabels].sort((a, b) => {
        const aMeters = DISTANCE_METERS[a] || (customDistances.find(d => d.label === a)?.meters) || 0;
        const bMeters = DISTANCE_METERS[b] || (customDistances.find(d => d.label === b)?.meters) || 0;
        return aMeters - bMeters;
      });
      
      setAllDistances(allDistanceLabels);
    }
  }, []);

  // Save visible columns to localStorage when changed
  useEffect(() => {
    if (visibleColumns.length > 0) {
      localStorage.setItem('visibleColumns', JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  const { personalBests, isLoading } = usePersonalBests({
    distance: selectedDistance,
    timeFilter,
    customDateFrom,
    customDateTo,
    limit: viewMode === 'progression' ? 0 : 10
  });

  // Calculate progression data from personalBests
  const getProgressionData = () => {
    if (!personalBests || personalBests.length === 0) {
      console.log('Progression: No personal bests data');
      return [];
    }

    console.log('Progression: Processing', personalBests.length, 'segments');

    // Sort by date (oldest first)
    const sortedByDate = [...personalBests].sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB;
    });

    // Filter to show only records that were PBs at the time
    const progression = [];
    let currentBest = Infinity;

    sortedByDate.forEach((pb, index) => {
      if (index < 3) {
        console.log(`Segment ${index}:`, {
          time: pb.time,
          date: pb.date,
          name: pb.runName,
          currentBest
        });
      }
      if (pb.time < currentBest) {
        progression.push({
          ...pb,
          rank: progression.length + 1
        });
        currentBest = pb.time;
      }
    });

    console.log('Progression: Found', progression.length, 'PB improvements');
    console.log('First progression entry:', progression[0]);
    return progression;
  };

  const displayData = viewMode === 'progression' ? getProgressionData() : personalBests;

  console.log('View mode:', viewMode, 'Display data count:', displayData?.length);

  // Filter distances based on settings unless Show All is active
  const getVisibleDistances = () => {
    if (showAllDistances) {
      return allDistances;
    }
    
    // Get custom distances
    const savedDistances = localStorage.getItem('customDistances');
    const customDistances = savedDistances ? JSON.parse(savedDistances) : [];
    const customLabels = customDistances.map(d => d.label);
    
    // Filter to show only enabled distances from settings plus custom distances
    return allDistances.filter(distance => 
      homepageSettings.pbDistances.includes(distance) || customLabels.includes(distance)
    );
  };

  const visibleDistances = getVisibleDistances();

  // If selected distance is hidden, switch to first visible distance
  useEffect(() => {
    if (!visibleDistances.includes(selectedDistance) && visibleDistances.length > 0) {
      setSelectedDistance(visibleDistances[0]);
    }
  }, [visibleDistances, selectedDistance]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mt-6 space-y-6 mx-4">
      <DistanceSelector
        selectedDistance={selectedDistance}
        setSelectedDistance={setSelectedDistance}
        distances={visibleDistances}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        isColumnSelectorOpen={isColumnSelectorOpen}
        setIsColumnSelectorOpen={setIsColumnSelectorOpen}
        visibleColumns={visibleColumns}
        setVisibleColumns={setVisibleColumns}
        showAllDistances={showAllDistances}
        setShowAllDistances={setShowAllDistances}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {isFilterOpen && (
        <DateFilter
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          customDateFrom={customDateFrom}
          setCustomDateFrom={setCustomDateFrom}
          customDateTo={customDateTo}
          setCustomDateTo={setCustomDateTo}
        />
      )}

      {isColumnSelectorOpen && (
        <div className="athletic-card-gradient p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Column Order
              </label>
              <div className="space-y-2">
                {visibleColumns.map((columnKey, index) => {
                  const column = AVAILABLE_COLUMNS.find(col => col.key === columnKey);
                  const isRank = columnKey === 'rank';
                  return (
                    <div
                      key={columnKey}
                      className={`flex items-center justify-between p-2 rounded ${
                        isRank 
                          ? 'bg-slate-700/50 cursor-not-allowed' 
                          : 'bg-slate-700/30'
                      }`}
                    >
                      <span className="text-sm text-white flex-1">{column?.label || columnKey}</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            if (isRank || index === 0) return;
                            const newColumns = [...visibleColumns];
                            [newColumns[index], newColumns[index - 1]] = [newColumns[index - 1], newColumns[index]];
                            setVisibleColumns(newColumns);
                          }}
                          disabled={isRank || index === 0}
                          className="px-2 py-1 text-xs bg-slate-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => {
                            if (isRank || index === visibleColumns.length - 1) return;
                            const newColumns = [...visibleColumns];
                            [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
                            setVisibleColumns(newColumns);
                          }}
                          disabled={isRank || index === visibleColumns.length - 1}
                          className="px-2 py-1 text-xs bg-slate-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Visible Columns
              </label>
              <div className="space-y-2">
                {AVAILABLE_COLUMNS.filter(column => {
                  // Get column settings from localStorage
                  const columnSettings = JSON.parse(localStorage.getItem('columnSettings') || '{}');
                  // Always show rank, show others only if enabled in settings
                  return column.key === 'rank' || columnSettings[column.key];
                }).map((column) => {
                  const isRank = column.key === 'rank';
                  return (
                    <label
                      key={column.key}
                      className={`flex items-start space-x-3 p-2 rounded ${
                        isRank 
                          ? 'bg-slate-700/50 cursor-not-allowed' 
                          : 'hover:bg-blue-500/10 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns && Array.isArray(visibleColumns) && visibleColumns.includes(column.key)}
                        onChange={() => {
                          if (isRank) return;
                          
                          if (visibleColumns && Array.isArray(visibleColumns) && visibleColumns.includes(column.key)) {
                            if (visibleColumns.length <= 2) return;
                            setVisibleColumns(visibleColumns.filter(col => col !== column.key));
                          } else {
                            setVisibleColumns([...visibleColumns, column.key]);
                          }
                        }}
                        disabled={isRank}
                        className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-600 bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-white">
                            {column.label}
                          </span>
                          {isRank && (
                            <span className="text-xs text-slate-500">(Always visible)</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-300">
                          {column.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              
              <div className="mt-4 pt-3 border-t border-blue-500/20 flex items-center justify-between">
                <button
                  onClick={() => {
                    const defaultColumns = AVAILABLE_COLUMNS
                      .filter(col => col.default)
                      .map(col => col.key);
                    // Ensure rank is first
                    const rankIndex = defaultColumns.indexOf('rank');
                    if (rankIndex > 0) {
                      defaultColumns.splice(rankIndex, 1);
                      defaultColumns.unshift('rank');
                    }
                    setVisibleColumns(defaultColumns);
                  }}
                  className="text-sm text-orange-400 hover:text-orange-300"
                >
                  Reset to default
                </button>
                <button
                  onClick={() => {
                    // Navigate to settings page with column management focus
                    window.location.hash = '#/settings';
                    setTimeout(() => {
                      const columnSection = document.getElementById('column-management');
                      if (columnSection) {
                        columnSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }, 100);
                  }}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                >
                  <span>More Columns</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {displayData.length === 0 ? (
        <div className="athletic-card-gradient p-8 text-center">
          <div className="text-slate-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>No Personal Bests Found</h3>
          <p className="text-slate-300 mb-4">
            No activities found for {selectedDistance} distance. Try selecting a different distance or go to Settings to generate segments for all distances.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden">
            <ResultsCards personalBests={displayData} visibleColumns={visibleColumns} />
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <ResultsTable personalBests={displayData} visibleColumns={visibleColumns} />
          </div>
        </>
      )}
    </div>
  );
};

export default PersonalBests;