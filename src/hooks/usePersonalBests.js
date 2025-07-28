import { useState, useEffect } from 'react';
import firebaseService from '../services/firebaseService';

export const usePersonalBests = ({ distance, timeFilter, customDateFrom, customDateTo }) => {
  const [personalBests, setPersonalBests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPersonalBests = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching personal bests for:', { distance, timeFilter, customDateFrom, customDateTo });
        const bests = await firebaseService.getPersonalBests(
          distance, 
          timeFilter, 
          customDateFrom, 
          customDateTo
        );
        console.log('Personal bests fetched:', bests.length, 'results');
        setPersonalBests(bests);
        setError(null);
      } catch (err) {
        setError('Failed to load personal bests');
        console.error('Error fetching personal bests:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonalBests();
  }, [distance, timeFilter, customDateFrom, customDateTo]);

  return {
    personalBests,
    isLoading,
    error
  };
};