import { useState, useEffect, useCallback } from 'react';
import firebaseService from '../services/firebaseService';

export const useHomepageSummary = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummaryData = useCallback(async () => {
    try {
      setIsLoading(true);
      const summary = await firebaseService.getHomepageSummary();
      setSummaryData(summary);
      setError(null);
    } catch (err) {
      setError('Failed to load homepage data');
      console.error('Error fetching homepage summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const regenerateSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      const summary = await firebaseService.generateHomepageSummary();
      setSummaryData(summary);
      setError(null);
    } catch (err) {
      setError('Failed to regenerate homepage data');
      console.error('Error regenerating homepage summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaryData();
  }, [fetchSummaryData]);

  return {
    summaryData,
    isLoading,
    error,
    refetch: fetchSummaryData,
    regenerate: regenerateSummary
  };
};