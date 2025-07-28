import { useState, useEffect, useCallback } from 'react';
import stravaApi from '../services/stravaApi';
import firebaseService from '../services/firebaseService';

export const useRecentRuns = () => {
  const [recentRuns, setRecentRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecentRuns = useCallback(async () => {
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
        
        // Check for new activities in the background
        checkForNewActivities();
      } else {
        // No cached data, fetch from Strava
        await fetchFromStrava();
      }

      setError(null);
    } catch (err) {
      setError('Failed to load recent runs');
      console.error('Error fetching recent runs:', err);
      setIsLoading(false);
    }
  }, []);

  const checkForNewActivities = async () => {
    try {
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
    } catch (err) {
      console.error('Error checking for new activities:', err);
    }
  };

  const fetchFromStrava = async () => {
    try {
      const stravaActivities = await stravaApi.getActivities(1, 20);
      const runningActivities = stravaActivities
        .filter(activity => ['Run', 'TrailRun'].includes(activity.type))
        .slice(0, 10);

      // Save activities to Firebase for future caching
      for (const activity of runningActivities) {
        const exists = await firebaseService.activityExists(activity.id);
        if (!exists) {
          await firebaseService.saveActivityWithSegments(activity.id, activity);
        }
      }

      setRecentRuns(runningActivities);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching from Strava:', err);
      throw err;
    }
  };

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