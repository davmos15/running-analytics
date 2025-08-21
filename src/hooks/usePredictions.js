import { useState, useEffect, useCallback } from 'react';
import firebaseService from '../services/firebaseService';
import predictionService from '../services/predictionService';

export const usePredictions = (raceDate) => {
  const [predictions, setPredictions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPredictions = useCallback(async () => {
    if (!raceDate) return;
    
    try {
      setIsLoading(true);
      
      // First try to get stored predictions
      const storedPredictions = await firebaseService.getStoredPredictions();
      if (storedPredictions && storedPredictions.raceDate === raceDate) {
        setPredictions(storedPredictions);
        setError(null);
        setIsLoading(false);
        return;
      }
      
      // Generate new predictions if none stored or date doesn't match
      const newPredictions = await predictionService.generatePredictionsForRaceDate(raceDate);
      const predictionData = {
        ...newPredictions,
        raceDate: raceDate,
        generatedAt: new Date().toISOString()
      };
      
      // Store for future use
      await firebaseService.storePredictions(predictionData);
      
      setPredictions(predictionData);
      setError(null);
    } catch (err) {
      setError('Failed to load predictions');
      console.error('Error fetching predictions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [raceDate]);

  const regeneratePredictions = useCallback(async () => {
    if (!raceDate) return;
    
    try {
      setIsLoading(true);
      
      // Generate fresh predictions
      const newPredictions = await predictionService.generatePredictionsForRaceDate(raceDate);
      const predictionData = {
        ...newPredictions,
        raceDate: raceDate,
        generatedAt: new Date().toISOString()
      };
      
      // Store the new predictions
      await firebaseService.storePredictions(predictionData);
      
      setPredictions(predictionData);
      setError(null);
    } catch (err) {
      setError('Failed to regenerate predictions');
      console.error('Error regenerating predictions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [raceDate]);

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