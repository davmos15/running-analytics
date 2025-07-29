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
  const [customDistance, setCustomDistance] = useState('');
  const [timeFilter, setTimeFilter] = useState('all-time');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [allDistances, setAllDistances] = useState(DISTANCES);

  // Initialize visible columns and distances on mount
  useEffect(() => {
    const savedColumns = localStorage.getItem('visibleColumns');
    if (savedColumns) {
      const parsedColumns = JSON.parse(savedColumns);
      // Ensure rank is always first
      if (!parsedColumns.includes('rank')) {
        setVisibleColumns(['rank', ...parsedColumns]);
      } else if (parsedColumns[0] !== 'rank') {
        const withoutRank = parsedColumns.filter(col => col !== 'rank');
        setVisibleColumns(['rank', ...withoutRank]);
      } else {
        setVisibleColumns(parsedColumns);
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
      const baseDistances = DISTANCES.filter(d => d !== 'Custom');
      const customLabels = customDistances.map(d => d.label);
      
      // Sort all distances by their meter values
      const allDistanceLabels = [...baseDistances, ...customLabels].sort((a, b) => {
        const aMeters = DISTANCE_METERS[a] || (customDistances.find(d => d.label === a)?.meters) || 0;
        const bMeters = DISTANCE_METERS[b] || (customDistances.find(d => d.label === b)?.meters) || 0;
        return aMeters - bMeters;
      });
      
      // Add 'Custom' at the end
      allDistanceLabels.push('Custom');
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
    distance: selectedDistance === 'Custom' ? (customDistance || '') : selectedDistance,
    timeFilter,
    customDateFrom,
    customDateTo
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mt-6 space-y-6 mx-4">
      <DistanceSelector
        selectedDistance={selectedDistance}
        setSelectedDistance={setSelectedDistance}
        distances={allDistances}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        customDistance={customDistance}
        setCustomDistance={setCustomDistance}
        visibleColumns={visibleColumns}
        setVisibleColumns={setVisibleColumns}
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

      {personalBests.length === 0 ? (
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
            <ResultsCards personalBests={personalBests} />
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <ResultsTable personalBests={personalBests} visibleColumns={visibleColumns} />
          </div>
        </>
      )}
    </div>
  );
};

export default PersonalBests;