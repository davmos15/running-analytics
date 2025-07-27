import { useState, useEffect } from 'react';
import stravaApi from '../services/stravaApi';
import firebaseService from '../services/firebaseService';

export const useRecentRuns = () => {
  const [recentRuns, setRecentRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecentRuns();
  }, []);

  const fetchRecentRuns = async () => {
    try {
      setIsLoading(true);
      
      // Try to get from Firebase first
      const cachedActivities = await firebaseService.getActivities();
      
      if (cachedActivities.length > 0) {
        setRecentRuns(cachedActivities.slice(0, 10));
      }

      // Fetch fresh data from Strava
      const activities = await stravaApi.getActivities(1, 20);
      const runningActivities = activities
        .filter(activity => ['Run', 'TrailRun'].includes(activity.type))
        .slice(0, 10);

      // Save to Firebase for caching
      for (const activity of runningActivities) {
        await firebaseService.saveActivity(activity.id, activity);
      }

      setRecentRuns(runningActivities);
      setError(null);
    } catch (err) {
      setError('Failed to load recent runs');
      console.error('Error fetching recent runs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    recentRuns,
    isLoading,
    error,
    refetch: fetchRecentRuns
  };
};