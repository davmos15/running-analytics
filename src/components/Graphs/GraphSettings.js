import React, { useState } from 'react';
import { Settings } from 'lucide-react';

const GraphSettings = ({ graph, allDistances, onUpdate, isTotal = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColor, setTempColor] = useState(graph.color);

  const handleSave = () => {
    onUpdate({ color: tempColor });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-slate-400 hover:text-slate-200 athletic-button-secondary rounded"
      >
        <Settings className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute top-8 right-0 w-64 athletic-card-gradient rounded-lg shadow-lg p-4 z-50 border border-blue-500/30">
          <h4 className="font-medium mb-3 text-white">Graph Settings</h4>
          
          <div className="space-y-3">
            {graph.type === 'progression' && (
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Distance
                </label>
                <select
                  value={graph.distance}
                  onChange={(e) => onUpdate({ distance: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {allDistances.map(distance => (
                    <option key={distance} value={distance}>{distance}</option>
                  ))}
                </select>
              </div>
            )}

            {graph.type === 'bar' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Metric
                  </label>
                  <select
                    value={graph.metric}
                    onChange={(e) => onUpdate({ metric: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {isTotal ? (
                      <>
                        <option value="distance">Total Distance</option>
                        <option value="time">Total Time</option>
                        <option value="runs">Total Number of Runs</option>
                        <option value="elevation">Total Elevation Gain</option>
                      </>
                    ) : (
                      <>
                        <option value="speed">Average Speed</option>
                        <option value="distance">Average Distance</option>
                        <option value="time">Average Time</option>
                        <option value="totalDistance">Total Distance</option>
                        <option value="totalTime">Total Time</option>
                        <option value="totalRuns">Total Number of Runs</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Period
                  </label>
                  <select
                    value={graph.period}
                    onChange={(e) => onUpdate({ period: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={tempColor}
                  onChange={(e) => setTempColor(e.target.value)}
                  className="w-12 h-8 border border-slate-600 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={tempColor}
                  onChange={(e) => setTempColor(e.target.value)}
                  className="flex-1 px-3 py-1 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-sm text-slate-300 hover:text-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm athletic-button-primary text-white rounded"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphSettings;