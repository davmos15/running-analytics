import React from 'react';
import { formatDate } from '../../utils/dateUtils';

const ResultsTable = ({ personalBests }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pace
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Run
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Run Distance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {personalBests.map((run, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    run.rank === 1 ? 'bg-yellow-500' : 
                    run.rank === 2 ? 'bg-gray-400' : 
                    run.rank === 3 ? 'bg-orange-600' : 'bg-blue-500'
                  }`}>
                    {run.rank}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-lg font-semibold text-gray-900">{run.time}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{run.pace}/km</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{formatDate(run.date)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                    {run.runName}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{run.fullRunDistance}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;