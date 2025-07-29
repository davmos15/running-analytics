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
    <div className="mt-6 mx-4">
      <div className="athletic-card-gradient">
        <div className="p-4 border-b border-blue-500/20">
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Recent Activities</h2>
          <p className="text-sm text-slate-300 mt-1">Your latest runs from Strava</p>
        </div>
        
        <div className="divide-y divide-blue-500/10">
          {recentRuns.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecentRuns;