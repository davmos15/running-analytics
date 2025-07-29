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
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            run.rank <= 3 ? '' : 'bg-blue-500 text-white'
          } font-bold text-sm`}>
            {run.rank <= 3 ? (
              <span className="text-lg">
                {run.rank === 1 ? '🥇' : run.rank === 2 ? '🥈' : '🥉'}
              </span>
            ) : (
              run.rank
            )}
          </div>
        );
      case 'time':
        return <div className="text-lg font-semibold text-gray-900">{run.time}</div>;
      case 'pace':
        const unitSystem = localStorage.getItem('unitSystem') || 'metric';
        const paceUnit = unitSystem === 'metric' ? '/km' : '/mi';
        return <div className="text-sm text-gray-900">{run.pace}{paceUnit}</div>;
      case 'date':
        return <div className="text-sm text-gray-900">{formatDate(run.date)}</div>;
      case 'runName':
        return (
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
              {run.runName}
            </div>
            {run.activityId && (
              <a
                href={`https://www.strava.com/activities/${run.activityId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        );
      case 'fullRunDistance':
        return <div className="text-sm text-gray-900">{run.fullRunDistance}</div>;
      case 'averageSpeed':
        return <div className="text-sm text-gray-900">{run.averageSpeed ? `${(run.averageSpeed * 3.6).toFixed(2)} km/h` : 'N/A'}</div>;
      case 'fullRunTime':
        return <div className="text-sm text-gray-900">{run.fullRunTime ? `${Math.floor(run.fullRunTime / 60)}:${(run.fullRunTime % 60).toString().padStart(2, '0')}` : 'N/A'}</div>;
      case 'activityId':
        return <div className="text-xs text-gray-500 font-mono">{run.activityId}</div>;
      default:
        return <div className="text-sm text-gray-900">{run[columnKey] || 'N/A'}</div>;
    }
  };
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {columnsToShow.map((columnKey) => {
                const column = AVAILABLE_COLUMNS.find(col => col.key === columnKey);
                return (
                  <th key={columnKey} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {column?.label || columnKey}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {personalBests.map((run, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors cursor-pointer">
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