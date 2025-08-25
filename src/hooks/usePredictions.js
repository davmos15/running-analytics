import { useState, useEffect, useCallback } from 'react';
import predictionService from '../services/predictionService';

export const usePredictions = (raceDate, customDistances = []) => {
  const [predictions, setPredictions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPredictions = useCallback(async () => {
    if (!raceDate) return;
    
    try {
      setIsLoading(true);
      
      // Generate predictions directly (same as working predictions page)
      const newPredictions = await predictionService.generatePredictionsForRaceDate(raceDate, customDistances);
      setPredictions(newPredictions);
      setError(null);
    } catch (err) {
      setError('Failed to load predictions');
      console.error('Error fetching predictions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [raceDate, customDistances]);

  const regeneratePredictions = useCallback(async () => {
    // Just call fetchPredictions to regenerate
    await fetchPredictions();
  }, [fetchPredictions]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  return {
    predictions,
    isLoading,
    error,
    refetch: fetchPredictions,
    regenerate: regeneratePredictions
  };
};