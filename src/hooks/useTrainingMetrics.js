import { useState, useEffect, useCallback } from 'react';
import trainingMetricsService from '../services/trainingMetricsService';

const useTrainingMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await trainingMetricsService.getTrainingMetrics();
      setMetrics(result);
    } catch (err) {
      console.error('Error loading training metrics:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const refresh = useCallback(() => {
    trainingMetricsService.clearCache();
    loadMetrics();
  }, [loadMetrics]);

  return { metrics, isLoading, error, refresh };
};

export default useTrainingMetrics;
