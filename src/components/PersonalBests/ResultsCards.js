import React from 'react';
import { formatDate } from '../../utils/dateUtils';
import { ExternalLink } from 'lucide-react';

const ResultsCards = ({ personalBests }) => {
  return (
    <div className="space-y-3">
      {personalBests.map((run, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                run.rank === 1 ? 'bg-yellow-500' : 
                run.rank === 2 ? 'bg-gray-400' : 
                run.rank === 3 ? 'bg-orange-600' : 'bg-blue-500'
              } text-white font-bold`}>
                {run.rank <= 3 ? (
                  <span className="text-xl">
                    {run.rank === 1 ? '🥇' : run.rank === 2 ? '🥈' : '🥉'}
                  </span>
                ) : (
                  run.rank
                )}
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{run.time}</div>
                <div className="text-sm text-gray-500">{run.pace}{localStorage.getItem('unitSystem') === 'imperial' ? '/mi' : '/km'}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">{formatDate(run.date)}</div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <div className="font-medium text-gray-900 mb-1">{run.runName}</div>
              {run.activityId && (
                <a
                  href={`https://www.strava.com/activities/${run.activityId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Run Distance: {run.fullRunDistance}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ResultsCards;