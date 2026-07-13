import { useState, useEffect, useCallback } from 'react';
import firebaseService from '../services/firebaseService';

export const useRecentRuns = () => {
  const [recentRuns, setRecentRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecentRuns = useCallback(async () => {
    try {
      setIsLoading(true);

      // Activities are synced into Firestore server-side by the Garmin job.
      const activities = await firebaseService.getActivities();
      const runningActivities = activities
        .filter(activity => activity.type && ['Run', 'TrailRun'].includes(activity.type))
        .slice(0, 10);

      setRecentRuns(runningActivities);
      setError(null);
    } catch (err) {
      setError('Failed to load recent runs');
      console.error('Error fetching recent runs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentRuns();
  }, [fetchRecentRuns]);

  return {
    recentRuns,
    isLoading,
    error,
    refetch: fetchRecentRuns
  };
};