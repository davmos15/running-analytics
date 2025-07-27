import React from 'react';
import { formatDate, getTypeColor } from '../../utils/dateUtils';

const RunCard = ({ run }) => {
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}K`;
    }
    return `${meters}m`;
  };

  const formatPace = (metersPerSecond) => {
    const secondsPerKm = 1000 / metersPerSecond;
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="font-medium text-gray-900">{run.name}</h3>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(run.type)}`}>
              {run.type}
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{formatDate(run.start_date)}</span>
            <span>•</span>
            <span>{formatDistance(run.distance)}</span>
            <span>•</span>
            <span>{formatPace(run.average_speed)}/km avg</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-gray-900">
            {formatTime(run.moving_time)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunCard;