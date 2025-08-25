import React, { useState } from 'react';
import { TrendingUp, Calendar, Info, Plus, X } from 'lucide-react';
import { usePredictions } from '../../hooks/usePredictions';
import LoadingSpinner from '../common/LoadingSpinner';
import PredictionCard from './PredictionCard';

const PredictionsPageSimple = () => {
  const [tempRaceDate, setTempRaceDate] = useState(new Date().toISOString().split('T')[0]);
  const [raceDate, setRaceDate] = useState(new Date().toISOString().split('T')[0]);
  const [customDistances, setCustomDistances] = useState([]);
  const [newDistance, setNewDistance] = useState('');
  const [showAddDistance, setShowAddDistance] = useState(false);
  
  const { predictions, isLoading, error } = usePredictions(raceDate, customDistances);

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

  const handleAddDistance = () => {
    const distanceValue = parseFloat(newDistance);
    if (!isNaN(distanceValue) && distanceValue > 0) {
      const distanceMeters = distanceValue * 1000;
      const distanceLabel = distanceValue >= 1 ? `${distanceValue}K` : `${distanceMeters}m`;
      
      if (!customDistances.some(d => d.meters === distanceMeters)) {
        setCustomDistances([...customDistances, { label: distanceLabel, meters: distanceMeters }]);
      }
      setNewDistance('');
      setShowAddDistance(false);
    }
  };

  const handleRemoveDistance = (distanceToRemove) => {
    setCustomDistances(customDistances.filter(d => d.meters !== distanceToRemove.meters));
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
      {/* Header */}
      <div className="athletic-card-gradient p-6">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <TrendingUp className="w-8 h-8 text-orange-400" />
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Race Predictions
            </h1>
          </div>
          {predictions?.generatedAt && (
            <p className="text-sm text-slate-400">
              Generated: {new Date(predictions.generatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <p className="text-slate-300 text-center">
          AI-powered race time predictions based on your performance data
        </p>
      </div>

      {/* Race Date Input */}
      <div className="athletic-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-semibold text-white">Target Race Date</h2>
          </div>
          
          <input
            type="date"
            value={tempRaceDate}
            onChange={(e) => handleDateChange(e.target.value)}
            onBlur={handleDateBlur}
            onKeyPress={handleDateKeyPress}
            className="w-full sm:w-auto px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
          />
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

      {/* Custom Distances */}
      <div className="athletic-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Custom Distances</h3>
          <button
            onClick={() => setShowAddDistance(!showAddDistance)}
            className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Distance</span>
          </button>
        </div>

        {showAddDistance && (
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="number"
              step="0.1"
              placeholder="Distance in km"
              value={newDistance}
              onChange={(e) => setNewDistance(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
            <button
              onClick={handleAddDistance}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddDistance(false);
                setNewDistance('');
              }}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Cancel
            </button>
          </div>
        )}

        {customDistances.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customDistances.map((distance) => (
              <div key={distance.meters} className="flex items-center space-x-1 px-3 py-1 bg-slate-700 rounded-lg">
                <span className="text-sm text-white">{distance.label}</span>
                <button
                  onClick={() => handleRemoveDistance(distance)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Predictions Display */}
      {predictions && (
        <div className="space-y-6">

          {/* Prediction Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {predictions.predictions && Object.entries(predictions.predictions).map(([distance, prediction]) => (
              <PredictionCard 
                key={distance} 
                distance={distance}
                prediction={prediction}
                raceDate={raceDate}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default PredictionsPageSimple;