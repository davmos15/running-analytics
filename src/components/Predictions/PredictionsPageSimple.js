import React, { useState } from 'react';
import { TrendingUp, Calendar, RefreshCw, Info } from 'lucide-react';
import { usePredictions } from '../../hooks/usePredictions';
import LoadingSpinner from '../common/LoadingSpinner';
import PredictionCard from './PredictionCard';

const PredictionsPageSimple = () => {
  const [tempRaceDate, setTempRaceDate] = useState(new Date().toISOString().split('T')[0]);
  const [raceDate, setRaceDate] = useState(new Date().toISOString().split('T')[0]);
  
  const { predictions, isLoading, error, regenerate } = usePredictions(raceDate);

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
    regenerate();
  };

  if (isLoading && !predictions) {
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
              {predictions?.generatedAt && (
                <p className="text-sm text-slate-400">
                  Generated: {new Date(predictions.generatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 athletic-button-secondary text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
        <p className="text-slate-300">
          AI-powered race time predictions stored in Firebase
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
          {/* Data Quality Overview */}
          {predictions.dataQuality && (
            <div className="athletic-card p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Data Quality</h3>
              <div className="flex items-center space-x-4">
                <div className="flex-1 bg-slate-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-green-500 h-3 rounded-full"
                    style={{ width: `${predictions.dataQuality.score || 0}%` }}
                  ></div>
                </div>
                <span className="text-white font-medium">{predictions.dataQuality.score || 0}%</span>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                {predictions.dataSource || 'No data source info'}
              </p>
            </div>
          )}

          {/* Prediction Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {predictions.predictions && Object.entries(predictions.predictions).map(([distance, prediction]) => (
              <PredictionCard 
                key={distance} 
                prediction={{ distance, ...prediction }}
                raceDate={raceDate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Loading overlay for refresh */}
      {isLoading && predictions && (
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

export default PredictionsPageSimple;