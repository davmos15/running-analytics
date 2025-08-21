import { useState, useEffect, useCallback } from 'react';
import firebaseService from '../services/firebaseService';

export const useHomepageSummary = () => {
  const [totalStats, setTotalStats] = useState(null);
  const [keyPBs, setKeyPBs] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get activities directly (same as working components)
      const activities = await firebaseService.getActivities();
      const runActivities = activities.filter(activity => 
        activity.type && ['Run', 'TrailRun', 'VirtualRun'].includes(activity.type)
      );

      // Calculate totals (same as graphs page)
      const stats = {
        totalDistance: runActivities.reduce((sum, activity) => sum + (activity.distance || 0), 0) / 1000,
        totalTime: runActivities.reduce((sum, activity) => sum + (activity.elapsed_time || activity.moving_time || 0), 0),
        totalRuns: runActivities.length,
        lastUpdated: new Date().toISOString()
      };
      setTotalStats(stats);

      // Get key PBs (same pattern as PersonalBests)
      const keyDistances = ['5K', '10K', '21.1K', '42.2K'];
      const pbs = {};
      
      for (const distance of keyDistances) {
        try {
          const personalBests = await firebaseService.getPersonalBests(distance, 'all-time');
          pbs[distance] = personalBests.length > 0 ? personalBests[0] : null;
        } catch (error) {
          console.error(`Error loading PB for ${distance}:`, error);
          pbs[distance] = null;
        }
      }
      setKeyPBs(pbs);
      
      setError(null);
    } catch (err) {
      setError('Failed to load homepage data');
      console.error('Error fetching homepage data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    totalStats,
    keyPBs,
    isLoading,
    error,
    refetch: fetchData
  };
};