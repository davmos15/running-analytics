import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Calendar, Info, RefreshCw, AlertTriangle, Plus, X } from 'lucide-react';
import predictionService from '../../services/predictionService';
import LoadingSpinner from '../common/LoadingSpinner';
import PredictionCard from './PredictionCard';
import TrainingInsights from './TrainingInsights';

const PredictionsPage = () => {
  const [predictions, setPredictions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weeksBack, setWeeksBack] = useState(16);
  const [showExplanation, setShowExplanation] = useState(false);
  const [customDistances, setCustomDistances] = useState([]);
  const [newDistance, setNewDistance] = useState('');
  const [isAddingDistance, setIsAddingDistance] = useState(false);

  const loadPredictionsCallback = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await predictionService.generatePredictions(weeksBack, customDistances);
      setPredictions(result);
    } catch (error) {
      console.error('Error loading predictions:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [weeksBack, customDistances]);

  useEffect(() => {
    loadPredictionsCallback();
  }, [loadPredictionsCallback]);

  const handleAddDistance = async () => {
    if (!newDistance || isNaN(parseFloat(newDistance))) {
      alert('Please enter a valid distance in kilometers');
      return;
    }
    
    const distanceKm = parseFloat(newDistance);
    const distanceMeters = distanceKm * 1000;
    const distanceLabel = distanceKm >= 1 ? `${distanceKm}K` : `${distanceMeters}m`;
    
    if (customDistances.some(d => d.meters === distanceMeters)) {
      alert('This distance already exists');
      return;
    }
    
    setIsAddingDistance(true);
    const newDistanceObj = { label: distanceLabel, meters: distanceMeters };
    const updatedDistances = [...customDistances, newDistanceObj].sort((a, b) => a.meters - b.meters);
    setCustomDistances(updatedDistances);
    setNewDistance('');
    setIsAddingDistance(false);
  };

  const handleRemoveDistance = (distanceToRemove) => {
    setCustomDistances(customDistances.filter(d => d.meters !== distanceToRemove.meters));
  };

  const formatDataQualityLevel = (level) => {
    const levels = {
      high: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'High Quality' },
      medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Medium Quality' },
      low: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Low Quality' }
    };
    return levels[level] || levels.low;
  };

  if (isLoading) {
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

  if (error) {
    return (
      <div className="mt-6 space-y-6 mx-4">
        <div className="athletic-card-gradient p-6">
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Unable to Generate Predictions</h3>
            <p className="text-slate-300 mb-4">{error}</p>
            <div className="space-y-2 text-sm text-slate-400">
              <p>To improve prediction accuracy, you need:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>At least 3 recent races or time trials</li>
                <li>8+ weeks of consistent training data</li>
                <li>Regular running activity (3+ runs per week)</li>
              </ul>
            </div>
            <button
              onClick={loadPredictionsCallback}
              className="mt-6 px-4 py-2 athletic-button-primary text-white rounded-lg"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dataQuality = formatDataQualityLevel(predictions.dataQuality.level);

  return (
    <div className="mt-6 space-y-6 mx-4">
      {/* Header */}
      <div className="athletic-card-gradient p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-6 h-6 text-orange-400" />
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Race Predictions
              </h2>
            </div>
            <p className="text-slate-300">
              AI-powered race time predictions based on your training data and performance history
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex items-center space-x-2 px-3 py-2 athletic-button-secondary text-slate-300 rounded-lg transition-colors"
            >
              <Info className="w-4 h-4" />
              <span className="text-sm font-medium">How it works</span>
            </button>
            
            <button
              onClick={loadPredictionsCallback}
              className="flex items-center space-x-2 px-3 py-2 athletic-button-primary text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>
        </div>

        {/* Data Quality and Settings */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 athletic-card rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <label className="text-sm font-medium text-slate-300">Training Period:</label>
              <select
                value={weeksBack}
                onChange={(e) => setWeeksBack(parseInt(e.target.value))}
                className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              >
                <option value={8}>8 weeks</option>
                <option value={12}>12 weeks</option>
                <option value={16}>16 weeks</option>
                <option value={20}>20 weeks</option>
                <option value={24}>24 weeks</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-400">Data Quality:</span>
              <div className={`px-2 py-1 rounded text-xs font-medium ${dataQuality.bg} ${dataQuality.color}`}>
                {dataQuality.label} ({predictions.dataQuality.score}%)
              </div>
            </div>
          </div>
          
          <div className="text-sm text-slate-400">
            Based on {predictions.dataSource} • Updated {new Date(predictions.lastUpdated).toLocaleDateString()}
          </div>
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className="mt-4 p-4 athletic-card rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">How Race Predictions Work</h3>
            <div className="space-y-3 text-sm text-slate-300">
              <p>
                Our prediction system uses advanced machine learning to analyze your training and race data:
              </p>
              <div className="space-y-2 mt-4">
                <h4 className="font-medium text-orange-400">ML Feature Analysis</h4>
                <p>Our machine learning model considers multiple factors including:</p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Recent race performances and time trials</li>
                  <li>Training volume and consistency patterns</li>
                  <li>Form trends and pace improvements</li>
                  <li>Distance-specific experience and preparation</li>
                  <li>Heart rate efficiency trends (when available)</li>
                </ul>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Confidence levels are calculated based on data quality, training consistency, and recent performance patterns. 
                Predictions are most accurate for runners with regular training and multiple recent race results.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Custom Distance Input */}
      <div className="athletic-card-gradient p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Plus className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-bold text-white">Custom Distance Prediction</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            step="0.1"
            placeholder="Enter distance in km (e.g., 7.5)"
            value={newDistance}
            onChange={(e) => setNewDistance(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-slate-400"
          />
          <button
            onClick={handleAddDistance}
            disabled={isAddingDistance || !newDistance}
            className="px-4 py-2 athletic-button-primary text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingDistance ? 'Adding...' : 'Add Prediction'}</span>
          </button>
        </div>
        
        {customDistances.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {customDistances.map((distance) => (
              <div key={distance.meters} className="flex items-center space-x-2 px-3 py-1 bg-slate-700 rounded-lg">
                <span className="text-sm text-white">{distance.label}</span>
                <button
                  onClick={() => handleRemoveDistance(distance)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prediction Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(predictions.predictions).map(([distance, prediction]) => (
          <PredictionCard
            key={distance}
            distance={distance}
            prediction={prediction}
          />
        ))}
      </div>

      {/* Training Insights */}
      <TrainingInsights 
        dataQuality={predictions.dataQuality}
        predictions={predictions.predictions}
      />
    </div>
  );
};

export default PredictionsPage;