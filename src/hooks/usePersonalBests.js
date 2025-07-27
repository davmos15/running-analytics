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
        const bests = await firebaseService.getPersonalBests(
          distance, 
          timeFilter, 
          customDateFrom, 
          customDateTo
        );
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