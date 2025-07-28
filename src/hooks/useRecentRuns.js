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
      const runningActivities = cachedActivities
        .filter(activity => ['Run', 'TrailRun'].includes(activity.type))
        .slice(0, 10);
      
      if (runningActivities.length > 0) {
        setRecentRuns(runningActivities);
        setIsLoading(false); // Show cached data immediately
      }

      // Fetch fresh data from Strava to check for new activities
      const stravaActivities = await stravaApi.getActivities(1, 20);
      const newRunningActivities = stravaActivities
        .filter(activity => ['Run', 'TrailRun'].includes(activity.type));

      // Process only new activities (not already in Firebase)
      let hasNewActivities = false;
      for (const activity of newRunningActivities) {
        const exists = await firebaseService.activityExists(activity.id);
        if (!exists) {
          await firebaseService.saveActivityWithSegments(activity.id, activity);
          hasNewActivities = true;
        }
      }

      // If we found new activities, refresh the data from Firebase
      if (hasNewActivities) {
        const updatedActivities = await firebaseService.getActivities();
        const updatedRunningActivities = updatedActivities
          .filter(activity => ['Run', 'TrailRun'].includes(activity.type))
          .slice(0, 10);
        setRecentRuns(updatedRunningActivities);
      }

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