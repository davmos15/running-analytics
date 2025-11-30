import { useState, useEffect, useCallback } from 'react';
import firebaseService from '../services/firebaseService';

export const usePersonalBests = ({ distance, timeFilter, customDateFrom, customDateTo, limit = 10 }) => {
  const [personalBests, setPersonalBests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPersonalBests = useCallback(async () => {
    // Don't fetch if distance is empty
    if (!distance) {
      setPersonalBests([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const bests = await firebaseService.getPersonalBests(
        distance,
        timeFilter,
        customDateFrom,
        customDateTo,
        limit
      );
      setPersonalBests(bests);
      setError(null);
    } catch (err) {
      setError('Failed to load personal bests');
      console.error('Error fetching personal bests:', err);
    } finally {
      setIsLoading(false);
    }
  }, [distance, timeFilter, customDateFrom, customDateTo, limit]);

  useEffect(() => {
    fetchPersonalBests();
  }, [fetchPersonalBests]);

  return {
    personalBests,
    isLoading,
    error,
    refetch: fetchPersonalBests
  };
};