import React, { useState } from 'react';
import DistanceSelector from './DistanceSelector';
import DateFilter from './DateFilter';
import ResultsTable from './ResultsTable';
import ResultsCards from './ResultsCards';
import LoadingSpinner from '../common/LoadingSpinner';
import { usePersonalBests } from '../../hooks/usePersonalBests';
import { DISTANCES } from '../../utils/constants';

const PersonalBests = () => {
  const [selectedDistance, setSelectedDistance] = useState('5K');
  const [timeFilter, setTimeFilter] = useState('all-time');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { personalBests, isLoading } = usePersonalBests({
    distance: selectedDistance,
    timeFilter,
    customDateFrom,
    customDateTo
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mt-6 space-y-6">
      <DistanceSelector
        selectedDistance={selectedDistance}
        setSelectedDistance={setSelectedDistance}
        distances={DISTANCES}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
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

      {/* Mobile Cards */}
      <div className="md:hidden">
        <ResultsCards personalBests={personalBests} />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <ResultsTable personalBests={personalBests} />
      </div>
    </div>
  );
};

export default PersonalBests;