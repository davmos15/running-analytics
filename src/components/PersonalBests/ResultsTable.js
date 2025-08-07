import React from 'react';
import { formatDate } from '../../utils/dateUtils';
import { AVAILABLE_COLUMNS } from '../../utils/constants';
import { ExternalLink } from 'lucide-react';

const ResultsTable = ({ personalBests, visibleColumns = [] }) => {
  // If no visible columns specified, use all default columns
  const columnsToShow = visibleColumns.length > 0 ? visibleColumns : 
    AVAILABLE_COLUMNS.filter(col => col.default).map(col => col.key);

  const renderCellValue = (run, columnKey) => {
    switch (columnKey) {
      case 'rank':
        return (
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
        );
      case 'time':
        return <div className="text-lg font-semibold text-white">{run.time}</div>;
      case 'pace':
        const unitSystem = localStorage.getItem('unitSystem') || 'metric';
        const paceUnit = unitSystem === 'metric' ? '/km' : '/mi';
        return <div className="text-sm text-slate-300">{run.pace}{paceUnit}</div>;
      case 'date':
        return <div className="text-sm text-slate-300">{formatDate(run.date)}</div>;
      case 'runName':
        return (
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium text-white max-w-xs truncate">
              {run.runName}
            </div>
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
        );
      case 'segment':
        return <div className="text-sm text-slate-300 font-mono">{run.segment || 'Full Run'}</div>;
      case 'fullRunDistance':
        return <div className="text-sm text-slate-300">{run.fullRunDistance}</div>;
      case 'averageSpeed':
        return <div className="text-sm text-slate-300">{run.averageSpeed ? `${(run.averageSpeed * 3.6).toFixed(2)} km/h` : 'N/A'}</div>;
      case 'fullRunTime':
        return <div className="text-sm text-slate-300">{run.fullRunTime ? `${Math.floor(run.fullRunTime / 60)}:${(run.fullRunTime % 60).toString().padStart(2, '0')}` : 'N/A'}</div>;
      case 'activityId':
        return <div className="text-xs text-slate-500 font-mono">{run.activityId}</div>;
      case 'heartRate':
        // Debug: log the run data to see what HR fields are available
        if ((!run.averageHeartRate && !run.average_heartrate) && run.runName && typeof run.runName === 'string' && run.runName.includes('Morning Run')) {
          console.log('Missing HR data for Morning Run:', {
            runName: run.runName,
            date: run.date,
            activityId: run.activityId,
            averageHeartRate: run.averageHeartRate,
            average_heartrate: run.average_heartrate,
            heartRate: run.heartRate,
            avgHeartRate: run.avgHeartRate,
            maxHeartRate: run.maxHeartRate,
            max_heartrate: run.max_heartrate,
            allFields: Object.keys(run).filter(k => k && typeof k === 'string' && k.toLowerCase().includes('heart'))
          });
        }
        // Use averageHeartRate (camelCase) or fallback to average_heartrate (snake_case)
        const heartRate = run.averageHeartRate || run.average_heartrate;
        return (
          <div className="text-sm text-slate-300">
            {heartRate ? `${heartRate} bpm` : 'N/A'}
          </div>
        );
      case 'maxHeartRate':
        // Use maxHeartRate (camelCase) or fallback to max_heartrate (snake_case)
        const maxHeartRate = run.maxHeartRate || run.max_heartrate;
        return (
          <div className="text-sm text-slate-300">
            {maxHeartRate ? `${maxHeartRate} bpm` : 'N/A'}
          </div>
        );
      case 'cadence':
        // Use averageCadence (camelCase) or fallback to average_cadence (snake_case)
        const cadence = run.averageCadence || run.average_cadence;
        return (
          <div className="text-sm text-slate-300">
            {cadence ? `${cadence} spm` : 'N/A'}
          </div>
        );
      case 'elevation':
        return (
          <div className="text-sm text-slate-300">
            {run.elevationGain !== undefined ? `${run.elevationGain}m` : 'N/A'}
          </div>
        );
      default:
        return <div className="text-sm text-slate-300">{run[columnKey] || 'N/A'}</div>;
    }
  };
  return (
    <div className="athletic-card-gradient overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-blue-500/20">
              {columnsToShow.map((columnKey) => {
                const column = AVAILABLE_COLUMNS.find(col => col.key === columnKey);
                return (
                  <th key={columnKey} className="px-6 py-4 text-left text-xs font-bold text-orange-400 uppercase tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {column?.label || columnKey}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-500/10">
            {personalBests.map((run, index) => (
              <tr key={index} className="hover:bg-blue-500/10 transition-colors cursor-pointer">
                {columnsToShow.map((columnKey) => (
                  <td key={columnKey} className="px-6 py-4">
                    {renderCellValue(run, columnKey)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;