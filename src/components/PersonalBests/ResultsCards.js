import React from 'react';
import { formatDate } from '../../utils/dateUtils';
import { ExternalLink } from 'lucide-react';

const ResultsCards = ({ personalBests }) => {
  return (
    <div className="space-y-3">
      {personalBests.map((run, index) => (
        <div key={index} className="athletic-card p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                run.rank <= 3 ? 'athletic-card' : 'bg-slate-600 text-white'
              } font-bold text-lg`}>
                {run.rank <= 3 ? (
                  <span className={`text-2xl ${
                    run.rank === 1 ? 'metallic-badge' : 
                    run.rank === 2 ? 'metallic-badge-silver' : 
                    'metallic-badge-bronze'
                  }`}>
                    {run.rank}
                  </span>
                ) : (
                  <span className="text-white">{run.rank}</span>
                )}
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{run.time}</div>
                <div className="text-sm text-slate-300">{run.pace}{localStorage.getItem('unitSystem') === 'imperial' ? '/mi' : '/km'}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-300">{formatDate(run.date)}</div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <div className="font-medium text-white mb-1">{run.runName}</div>
              {run.activityId && (
                <a
                  href={`https://www.strava.com/activities/${run.activityId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-orange-400 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Run Distance: {run.fullRunDistance}</span>
            </div>
            {run.segment && run.segment !== 'Full Run' && (
              <div className="text-sm text-slate-400 mt-1">
                <span className="font-mono">Segment: {run.segment}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ResultsCards;