import React from 'react';
import { formatDate, getEffortColor } from '../../utils/dateUtils';

const ResultsCards = ({ personalBests }) => {
  return (
    <div className="space-y-3">
      {personalBests.map((run, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                run.rank === 1 ? 'bg-yellow-500' : 
                run.rank === 2 ? 'bg-gray-400' : 
                run.rank === 3 ? 'bg-orange-600' : 'bg-blue-500'
              }`}>
                {run.rank}
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{run.time}</div>
                <div className="text-sm text-gray-500">{run.pace}/km</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">{formatDate(run.date)}</div>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getEffortColor(run.effort)}`}>
                {run.effort}
              </span>
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-1">{run.runName}</div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Total: {run.totalDistance}</span>
              <span>Avg HR: {run.avgHR}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ResultsCards;