import React from 'react';
import RunCard from './RunCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { useRecentRuns } from '../../hooks/useRecentRuns';

const RecentRuns = () => {
  const { recentRuns, isLoading, error, refetch } = useRecentRuns();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  return (
    <div className="mt-6">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-medium text-gray-900">Recent Activities</h2>
          <p className="text-sm text-gray-500 mt-1">Your latest runs from Strava</p>
        </div>
        
        <div className="divide-y divide-gray-100">
          {recentRuns.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecentRuns;