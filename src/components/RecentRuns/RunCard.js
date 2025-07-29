import React from 'react';
import { formatDate } from '../../utils/dateUtils';
import { ExternalLink } from 'lucide-react';

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
    <div className="p-4 hover:bg-blue-500/10 transition-colors cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="font-medium text-white">{run.name}</h3>
            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
              {run.type}
            </span>
            {run.id && (
              <a
                href={`https://www.strava.com/activities/${run.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-orange-400 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm text-slate-300">
            <span>{formatDate(run.start_date)}</span>
            <span>•</span>
            <span>{formatDistance(run.distance)}</span>
            <span>•</span>
            <span>{formatPace(run.average_speed)}/km avg</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-white">
            {formatTime(run.moving_time)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunCard;