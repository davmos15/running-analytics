import React, { useState } from 'react';
import { Settings, Eye, EyeOff, Maximize, X, Trash2 } from 'lucide-react';

const GraphSettings = ({ 
  graph, 
  graphId, 
  graphType, 
  allDistances, 
  onUpdate, 
  onToggleVisibility, 
  onDelete, 
  isTotal = false, 
  showMobileFullWidth = true 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState({
    color: graph.color,
    title: graph.title || '',
    type: graph.type || 'column',
    chartType: graph.chartType || 'column',
    metric: graph.metric,
    period: graph.period,
    speedUnit: graph.speedUnit || 'kph',
    isFullWidth: graph.isFullWidth || false
  });

  const handleSave = () => {
    onUpdate(tempSettings);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSettings({
      color: graph.color,
      title: graph.title || '',
      type: graph.type || 'column',
      chartType: graph.chartType || 'column',
      metric: graph.metric,
      period: graph.period,
      speedUnit: graph.speedUnit || 'kph',
      isFullWidth: graph.isFullWidth || false
    });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-slate-400 hover:text-slate-200 athletic-card rounded shadow"
        title="Graph Settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute top-8 right-0 w-80 athletic-card-gradient rounded-lg shadow-lg p-4 z-50 border border-blue-500/30">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-white">Graph Settings</h4>
            <button
              onClick={handleCancel}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Custom Title */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Title (Optional)
              </label>
              <input
                type="text"
                value={tempSettings.title}
                onChange={(e) => setTempSettings({ ...tempSettings, title: e.target.value })}
                placeholder="Custom graph title"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Graph Type for bar/column charts */}
            {(graphType === 'average' || graphType === 'total' || graphType === 'distance-threshold') && (
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Graph Type
                </label>
                <select
                  value={graphType === 'distance-threshold' ? tempSettings.chartType : tempSettings.type}
                  onChange={(e) => {
                    if (graphType === 'distance-threshold') {
                      setTempSettings({ ...tempSettings, chartType: e.target.value });
                    } else {
                      setTempSettings({ ...tempSettings, type: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="column">Column Chart</option>
                  <option value="bar">Bar Chart</option>
                </select>
              </div>
            )}

            {/* Metric Selection */}
            {(graphType === 'average' || graphType === 'total') && (
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Metric
                </label>
                <select
                  value={tempSettings.metric}
                  onChange={(e) => setTempSettings({ ...tempSettings, metric: e.target.value })}
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
            )}

            {/* Period Selection */}
            {(graphType === 'average' || graphType === 'total') && (
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Period
                </label>
                <select
                  value={tempSettings.period}
                  onChange={(e) => setTempSettings({ ...tempSettings, period: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}

            {/* Speed Unit */}
            {tempSettings.metric === 'speed' && (
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Speed Unit
                </label>
                <select
                  value={tempSettings.speedUnit}
                  onChange={(e) => setTempSettings({ ...tempSettings, speedUnit: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="kph">km/h</option>
                  <option value="pace">min/km</option>
                </select>
              </div>
            )}

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={tempSettings.color}
                  onChange={(e) => setTempSettings({ ...tempSettings, color: e.target.value })}
                  className="w-12 h-8 border border-slate-600 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={tempSettings.color}
                  onChange={(e) => setTempSettings({ ...tempSettings, color: e.target.value })}
                  className="flex-1 px-3 py-1 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-600 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">Actions</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {/* Visibility Toggle */}
                <button
                  onClick={() => {
                    onToggleVisibility();
                    setIsOpen(false);
                  }}
                  className="flex items-center space-x-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white"
                >
                  {graph.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{graph.visible ? 'Hide' : 'Show'}</span>
                </button>

                {/* Full Width Toggle - Hidden on mobile */}
                {showMobileFullWidth && (
                  <button
                    onClick={() => setTempSettings({ ...tempSettings, isFullWidth: !tempSettings.isFullWidth })}
                    className={`hidden sm:flex items-center space-x-1 px-3 py-2 rounded-lg text-sm ${
                      tempSettings.isFullWidth 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    <Maximize className="w-4 h-4" />
                    <span>{tempSettings.isFullWidth ? 'Normal' : 'Full Width'}</span>
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={() => {
                    if (window.confirm('Delete this graph?')) {
                      onDelete();
                    }
                  }}
                  className="flex items-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={handleCancel}
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