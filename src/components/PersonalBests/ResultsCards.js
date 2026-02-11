import React, { useState } from 'react';
import { formatDate } from '../../utils/dateUtils';
import { ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { AVAILABLE_COLUMNS } from '../../utils/constants';

const ResultsCards = ({ personalBests, visibleColumns }) => {
  const [expandedCard, setExpandedCard] = useState(null);

  const toggleExpanded = (index) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  const renderColumnValue = (run, columnKey) => {
    const column = AVAILABLE_COLUMNS.find(col => col.key === columnKey);
    if (!column) return null;

    switch (columnKey) {
      case 'rank':
      case 'time':
      case 'pace':
      case 'date':
      case 'runName':
        return null; // These are already shown in the basic card view
        
      case 'segment':
        if (!run.segment || run.segment === 'Full Run') return null;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2 font-mono">{run.segment}</span>
          </div>
        );
        
      case 'fullRunDistance':
        if (!run.fullRunDistance) return null;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{run.fullRunDistance}</span>
          </div>
        );
        
      case 'averageSpeed':
        if (!run.averageSpeed) return null;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{run.averageSpeed} m/s</span>
          </div>
        );
        
      case 'fullRunTime':
        if (!run.fullRunTime) return null;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{run.fullRunTime}</span>
          </div>
        );
        
      case 'elevation':
        if (!run.elevationGain && !run.elevation) return null;
        const elevation = run.elevationGain || run.elevation;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{elevation}m</span>
          </div>
        );
        
      case 'heartRate':
        if (!run.averageHeartRate && !run.heartRate) return null;
        const hr = run.averageHeartRate || run.heartRate;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{hr} bpm</span>
          </div>
        );
        
      case 'maxHeartRate':
        if (!run.maxHeartRate) return null;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{run.maxHeartRate} bpm</span>
          </div>
        );
        
      case 'cadence':
        if (!run.averageCadence && !run.cadence) return null;
        const cadence = run.averageCadence || run.cadence;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{cadence} spm</span>
          </div>
        );
        
      case 'strideLength': {
        const stride = run.strideLength || run.average_stride_length;
        if (!stride) return null;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{stride}m</span>
          </div>
        );
      }

      case 'avgPower': {
        const avgPwr = run.averagePower || run.average_watts || run.average_watts_calculated;
        if (!avgPwr) return null;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{avgPwr}W</span>
          </div>
        );
      }

      case 'maxPower': {
        const maxPwr = run.maxPower || run.max_watts || run.max_watts_calculated;
        if (!maxPwr) return null;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{maxPwr}W</span>
          </div>
        );
      }

      case 'activityType':
        if (!run.activityType) return null;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{run.activityType}</span>
          </div>
        );
        
      case 'startTime':
        if (!run.startTime) return null;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{run.startTime}</span>
          </div>
        );
        
      case 'activityId':
        if (!run.activityId) return null;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{run.activityId}</span>
          </div>
        );
        
      default:
        // Generic handler for any other columns
        if (!run[columnKey]) return null;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{run[columnKey]}</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-3">
      {personalBests.map((run, index) => {
        const isExpanded = expandedCard === index;
        const expandableColumns = visibleColumns.filter(col => 
          !['rank', 'time', 'pace', 'date', 'runName'].includes(col)
        );
        
        return (
          <div key={index} className="athletic-card">
            <div 
              className="p-4 cursor-pointer"
              onClick={() => toggleExpanded(index)}
            >
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
                <div className="text-right flex items-center space-x-2">
                  <div className="text-sm text-slate-300">{formatDate(run.date)}</div>
                  {expandableColumns.length > 0 && (
                    <div className="text-slate-400">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  )}
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
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Run Distance: {run.fullRunDistance}</span>
                </div>
                
                {/* Enhanced metrics - always show */}
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-300">
                  {run.averageHeartRate && (
                    <span>❤️ {run.averageHeartRate} bpm</span>
                  )}
                  {run.averageCadence && (
                    <span>🦵 {run.averageCadence} spm</span>
                  )}
                  {run.elevationGain !== undefined && run.elevationGain > 0 && (
                    <span>⛰️ {run.elevationGain}m</span>
                  )}
                  {(run.averagePower || run.average_watts) && (
                    <span>⚡ {run.averagePower || run.average_watts}W</span>
                  )}
                  {(run.strideLength || run.average_stride_length) && (
                    <span>📏 {run.strideLength || run.average_stride_length}m stride</span>
                  )}
                </div>
                
                {run.segment && run.segment !== 'Full Run' && (
                  <div className="text-sm text-slate-400 mt-1">
                    <span className="font-mono">Segment: {run.segment}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Expanded section */}
            {isExpanded && expandableColumns.length > 0 && (
              <div className="px-4 pb-4 border-t border-slate-600 pt-3">
                <div className="text-sm text-slate-400 mb-2 font-medium">Additional Stats</div>
                <div className="grid grid-cols-1 gap-2">
                  {expandableColumns.map(columnKey => {
                    const renderedValue = renderColumnValue(run, columnKey);
                    if (!renderedValue) return null;
                    return (
                      <div key={columnKey}>
                        {renderedValue}
                      </div>
                    );
                  })}
                </div>
                {expandableColumns.every(col => !renderColumnValue(run, col)) && (
                  <div className="text-sm text-slate-500 italic">
                    No additional data available for the selected columns
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ResultsCards;