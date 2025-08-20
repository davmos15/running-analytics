import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Calendar, RefreshCw, Info } from 'lucide-react';
import predictionService from '../../services/predictionService';
import cacheService from '../../services/cacheService';
import LoadingSpinner from '../common/LoadingSpinner';
import PredictionCard from './PredictionCard';

const PredictionsPageOptimized = () => {
  const [predictions, setPredictions] = useState(null);
  const [isLoadingFresh, setIsLoadingFresh] = useState(false);
  const [error, setError] = useState(null);
  const [raceDate, setRaceDate] = useState('');
  const [tempRaceDate, setTempRaceDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load cached predictions immediately
  const loadCachedData = useCallback(() => {
    const cachedPredictions = cacheService.getCachedPredictions();
    if (cachedPredictions) {
      console.log('Loading cached predictions');
      setPredictions(cachedPredictions.data);
      setRaceDate(cachedPredictions.raceDate || tempRaceDate);
      setLastUpdated(cachedPredictions.lastUpdated);
      return true;
    }
    return false;
  }, [tempRaceDate]);

  // Load fresh predictions
  const loadFreshPredictions = useCallback(async (dateToUse, forceRefresh = false) => {
    try {
      setIsLoadingFresh(true);
      setError(null);
      
      console.log('Generating fresh predictions...');
      const result = await predictionService.generatePredictionsForRaceDate(dateToUse);
      
      setPredictions(result);
      const now = new Date().toISOString();
      setLastUpdated(now);
      
      // Cache the results
      const cacheData = {
        data: result,
        raceDate: dateToUse,
        lastUpdated: now
      };
      cacheService.cachePredictions(cacheData);
      
    } catch (error) {
      console.error('Error loading predictions:', error);
      setError(error.message);
    } finally {
      setIsLoadingFresh(false);
    }
  }, []);

  // Initial load - cache first, then fresh
  useEffect(() => {
    const dateToUse = raceDate || tempRaceDate;
    
    // Try to load cached data first
    const hasCachedData = loadCachedData();
    
    // If no cached data or race date changed, load fresh
    if (!hasCachedData || raceDate !== tempRaceDate) {
      loadFreshPredictions(dateToUse);
    }
  }, [loadCachedData, loadFreshPredictions, raceDate, tempRaceDate]);

  const handleDateChange = (newDate) => {
    setTempRaceDate(newDate);
  };

  const handleDateBlur = () => {
    if (tempRaceDate !== raceDate) {
      setRaceDate(tempRaceDate);
    }
  };

  const handleDateKeyPress = (e) => {
    if (e.key === 'Enter') {
      setRaceDate(tempRaceDate);
      e.target.blur();
    }
  };

  const handleRefresh = () => {
    const dateToUse = raceDate || tempRaceDate;
    loadFreshPredictions(dateToUse, true);
  };

  // Show loading only if no cached data
  if (!predictions && isLoadingFresh && !error) {
    return (
      <div className="mt-6 space-y-6 mx-4">
        <div className="athletic-card-gradient p-6">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6 mx-4">
      {/* Header with Refresh */}
      <div className="athletic-card-gradient p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-orange-400" />
            <div>
              <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Race Predictions
              </h1>
              {lastUpdated && (
                <p className="text-sm text-slate-400">
                  Updated: {new Date(lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoadingFresh}
            className="px-4 py-2 athletic-button-secondary text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingFresh ? 'animate-spin' : ''}`} />
            <span>{isLoadingFresh ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
        <p className="text-slate-300">
          AI-powered race time predictions with intelligent caching
        </p>
      </div>

      {/* Race Date Input */}
      <div className="athletic-card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-orange-400" />
          <h2 className="text-xl font-semibold text-white">Target Race Date</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <input
              type="date"
              value={tempRaceDate}
              onChange={(e) => handleDateChange(e.target.value)}
              onBlur={handleDateBlur}
              onKeyPress={handleDateKeyPress}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
            />
          </div>
        </div>
        
        {tempRaceDate !== raceDate && (
          <div className="mt-3 p-3 bg-blue-500/20 text-blue-300 rounded-lg text-sm">
            <Info className="w-4 h-4 inline mr-2" />
            Press Enter or click outside to update predictions for the new date
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="athletic-card p-6">
          <div className="text-red-400">
            Error: {error}
          </div>
        </div>
      )}

      {/* Predictions Display */}
      {predictions && (
        <div className="space-y-6">
          {/* Confidence Overview */}
          {predictions.overallConfidence && (
            <div className="athletic-card p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Prediction Confidence</h3>
              <div className="flex items-center space-x-4">
                <div className="flex-1 bg-slate-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-green-500 h-3 rounded-full"
                    style={{ width: `${predictions.overallConfidence}%` }}
                  ></div>
                </div>
                <span className="text-white font-medium">{predictions.overallConfidence}%</span>
              </div>
            </div>
          )}

          {/* Prediction Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {predictions.predictions && predictions.predictions.map((prediction) => (
              <PredictionCard 
                key={prediction.distance} 
                prediction={prediction}
                raceDate={raceDate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Loading overlay for fresh data */}
      {isLoadingFresh && predictions && (
        <div className="fixed top-4 right-4 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Updating predictions...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionsPageOptimized;