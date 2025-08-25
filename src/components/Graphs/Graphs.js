import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, GripVertical, Columns, Square } from 'lucide-react';
import BarGraph from './BarGraph';
import DistanceThresholdGraph from './DistanceThresholdGraph';
import GraphSettings from './GraphSettings';
import firebaseService from '../../services/firebaseService';
import { TIME_FILTERS, DISTANCES } from '../../utils/constants';
import { formatTime } from '../../utils/timeUtils';

const Graphs = () => {
  const [timeFilter, setTimeFilter] = useState('all-time');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allDistances, setAllDistances] = useState([]);
  const [layoutMode, setLayoutMode] = useState('two-column'); // 'one-column' or 'two-column'
  const [draggedItem, setDraggedItem] = useState(null);
  
  // Total statistics
  const [totalStats, setTotalStats] = useState({
    totalDistance: 0,
    totalTime: 0,
    totalRuns: 0
  });

  // Unified graphs array with order
  const [graphs, setGraphs] = useState([]);

  // Load settings and initialize graphs on mount
  useEffect(() => {
    // Load all available distances
    const customDistances = localStorage.getItem('customDistances');
    const baseDistances = DISTANCES.filter(d => d !== 'Custom');
    if (customDistances) {
      const custom = JSON.parse(customDistances);
      const allDistancesList = [...baseDistances, ...custom.map(d => d.label)];
      setAllDistances(allDistancesList);
    } else {
      setAllDistances(baseDistances);
    }

    // Load saved graphs or initialize defaults
    const savedGraphs = localStorage.getItem('unifiedGraphs');
    if (savedGraphs) {
      setGraphs(JSON.parse(savedGraphs));
    } else {
      // Initialize with default graphs
      setGraphs([
        {
          id: 'distance-threshold',
          type: 'distance-threshold',
          settings: {
            chartType: 'column',
            color: '#f97316',
            visibleDistances: null,
            visible: true,
            showSettings: false,
            isFullWidth: false
          },
          order: 0
        },
        {
          id: 'avg-distance',
          type: 'average',
          settings: {
            type: 'column',
            metric: 'distance',
            period: 'monthly',
            visible: true,
            color: '#10B981',
            isFullWidth: false
          },
          order: 1
        },
        {
          id: 'avg-speed',
          type: 'average',
          settings: {
            type: 'column',
            metric: 'speed',
            period: 'monthly',
            visible: true,
            color: '#8B5CF6',
            isFullWidth: false
          },
          order: 2
        },
        {
          id: 'total-distance',
          type: 'total',
          settings: {
            type: 'column',
            metric: 'distance',
            period: 'monthly',
            visible: true,
            color: '#F59E0B',
            isFullWidth: false
          },
          order: 3
        },
        {
          id: 'total-time',
          type: 'total',
          settings: {
            type: 'column',
            metric: 'time',
            period: 'monthly',
            visible: true,
            color: '#EC4899',
            isFullWidth: false
          },
          order: 4
        }
      ]);
    }

    // Load layout preference
    const savedLayout = localStorage.getItem('graphLayoutMode');
    if (savedLayout) {
      setLayoutMode(savedLayout);
    }
  }, []);

  // Save graphs and layout when changed
  useEffect(() => {
    if (graphs.length > 0) {
      localStorage.setItem('unifiedGraphs', JSON.stringify(graphs));
    }
  }, [graphs]);

  useEffect(() => {
    localStorage.setItem('graphLayoutMode', layoutMode);
  }, [layoutMode]);

  // Load total statistics
  const loadTotalStats = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get all activities for the time period
      const activities = await firebaseService.getActivities(timeFilter, customDateFrom, customDateTo);
      
      // Filter running activities
      const runningActivities = activities.filter(activity => 
        activity.type && ['Run', 'TrailRun'].includes(activity.type)
      );

      // Calculate totals
      const totalDistance = runningActivities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
      const totalTime = runningActivities.reduce((sum, activity) => sum + (activity.elapsed_time || activity.moving_time || 0), 0);
      const totalRuns = runningActivities.length;

      setTotalStats({
        totalDistance,
        totalTime,
        totalRuns
      });
    } catch (error) {
      console.error('Error loading total stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [timeFilter, customDateFrom, customDateTo]);

  useEffect(() => {
    loadTotalStats();
  }, [loadTotalStats]);

  const formatDistance = (meters) => {
    const km = Math.round(meters / 1000);
    return `${km.toLocaleString()} km`;
  };

  // Add graph modal
  const [showAddModal, setShowAddModal] = useState(false);
  
  const addGraph = (type) => {
    const newGraph = {
      id: `${type}-${Date.now()}`,
      type: type,
      settings: type === 'distance-threshold' ? {
        chartType: 'column',
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        visibleDistances: null,
        visible: true,
        showSettings: false,
        isFullWidth: false
      } : {
        type: 'column',
        metric: type === 'average' ? 'distance' : 'distance',
        period: 'monthly',
        visible: true,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        isFullWidth: false
      },
      order: graphs.length
    };
    setGraphs([...graphs, newGraph]);
    setShowAddModal(false);
  };

  const updateGraph = (id, updates) => {
    setGraphs(graphs.map(graph => 
      graph.id === id ? { ...graph, settings: { ...graph.settings, ...updates } } : graph
    ));
  };

  const deleteGraph = (id) => {
    setGraphs(graphs.filter(graph => graph.id !== id));
  };

  // Drag and drop handlers
  const handleDragStart = (e, graph) => {
    setDraggedItem(graph);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetGraph) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetGraph.id) return;

    const draggedIndex = graphs.findIndex(g => g.id === draggedItem.id);
    const targetIndex = graphs.findIndex(g => g.id === targetGraph.id);

    const newGraphs = [...graphs];
    const [removed] = newGraphs.splice(draggedIndex, 1);
    newGraphs.splice(targetIndex, 0, removed);

    // Update order
    newGraphs.forEach((graph, index) => {
      graph.order = index;
    });

    setGraphs(newGraphs);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Sort graphs by order
  const sortedGraphs = [...graphs].sort((a, b) => a.order - b.order);

  // Distance threshold specific functions
  const toggleDistanceVisibility = (graphId, distance) => {
    const graph = graphs.find(g => g.id === graphId);
    if (!graph) return;

    const currentVisible = graph.settings.visibleDistances || allDistances;
    let newVisible;
    
    if (currentVisible.includes(distance)) {
      newVisible = currentVisible.filter(d => d !== distance);
    } else {
      newVisible = [...currentVisible, distance];
    }
    
    // If all distances are selected, set to null (show all)
    if (newVisible.length === allDistances.length) {
      newVisible = null;
    }
    
    updateGraph(graphId, { visibleDistances: newVisible });
  };

  const resetDistanceFilter = (graphId) => {
    updateGraph(graphId, { visibleDistances: null });
  };

  // Render individual graph
  const renderGraph = (graph) => (
    <div
      key={graph.id}
      className={`relative group ${graph.settings.isFullWidth ? 'w-full' : ''}`}
      draggable
      onDragStart={(e) => handleDragStart(e, graph)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, graph)}
      onDragEnd={handleDragEnd}
    >
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move z-10">
        <GripVertical className="w-5 h-5 text-slate-400" />
      </div>
      <div className="absolute top-2 right-2 flex items-center space-x-2 z-10">
        {/* Consolidated Settings Button */}
        <GraphSettings
          graph={graph.settings}
          graphId={graph.id}
          graphType={graph.type}
          allDistances={allDistances}
          onUpdate={(updates) => updateGraph(graph.id, updates)}
          onToggleVisibility={() => updateGraph(graph.id, { visible: !graph.settings.visible })}
          onDelete={() => deleteGraph(graph.id)}
          isTotal={graph.type === 'total'}
          showMobileFullWidth={false}
        />
      </div>

      {/* Distance Filter Settings for distance-threshold graphs */}
      {graph.type === 'distance-threshold' && graph.settings.showSettings && (
        <div className="mb-4 p-4 athletic-card rounded-lg mt-12">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Distance Visibility</h4>
            <button
              onClick={() => resetDistanceFilter(graph.id)}
              className="text-sm text-orange-400 hover:text-orange-300"
            >
              Show All
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {allDistances.map(distance => {
              const visibleDistances = graph.settings.visibleDistances || allDistances;
              return (
                <label
                  key={distance}
                  className="flex items-center space-x-2 p-2 rounded hover:bg-blue-500/10 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visibleDistances.includes(distance)}
                    onChange={() => toggleDistanceVisibility(graph.id, distance)}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-600 bg-slate-700 rounded"
                  />
                  <span className="text-sm text-white">{distance}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-slate-400">
            {(graph.settings.visibleDistances || allDistances).length} of {allDistances.length} distances visible
          </div>
        </div>
      )}

      {graph.settings.visible && (
        <div className={graph.type === 'distance-threshold' && graph.settings.showSettings ? 'mt-2' : ''}>
          {graph.type === 'distance-threshold' ? (
            <DistanceThresholdGraph
              color={graph.settings.color}
              timePeriod={timeFilter}
              customDateFrom={customDateFrom}
              customDateTo={customDateTo}
              chartType={graph.settings.chartType}
              visibleDistances={graph.settings.visibleDistances}
            />
          ) : (
            <BarGraph
              metric={graph.settings.metric}
              period={graph.settings.period}
              color={graph.settings.color}
              timeFilter={timeFilter}
              customDateFrom={customDateFrom}
              customDateTo={customDateTo}
              isTotal={graph.type === 'total'}
              speedUnit={graph.settings.speedUnit || 'kph'}
              type={graph.settings.type || 'column'}
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-6 space-y-6 mx-4">
      <div className="athletic-card-gradient p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Graphs
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-3 py-2 athletic-button-primary text-white rounded-lg"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Graph</span>
            </button>
            <div className="hidden md:flex items-center space-x-1 p-1 athletic-card rounded-lg">
              <button
                onClick={() => setLayoutMode('one-column')}
                className={`p-2 rounded ${layoutMode === 'one-column' ? 'athletic-button-primary text-white' : 'athletic-button-secondary text-slate-300'}`}
                title="Single Column"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('two-column')}
                className={`p-2 rounded ${layoutMode === 'two-column' ? 'athletic-button-primary text-white' : 'athletic-button-secondary text-slate-300'}`}
                title="Two Columns"
              >
                <Columns className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center space-x-2 px-3 py-2 athletic-button-secondary text-slate-300 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Date Filter</span>
            </button>
          </div>
        </div>

        {isFilterOpen && (
          <div className="mb-6 p-4 athletic-card rounded-lg">
            <h3 className="font-medium text-white mb-3">Date Filter</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Time Period</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm text-white"
                >
                  {TIME_FILTERS.map(filter => (
                    <option key={filter.value} value={filter.value}>{filter.label}</option>
                  ))}
                </select>
              </div>
              
              {timeFilter === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">From Date</label>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">To Date</label>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm text-white"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Total Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="athletic-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Total Distance</h3>
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-2xl">🏃</span>
              </div>
            </div>
            {isLoading ? (
              <div className="h-8 bg-slate-700 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold text-white">
                {formatDistance(totalStats.totalDistance)}
              </div>
            )}
            <div className="text-sm text-slate-400 mt-1">
              Cumulative running distance
            </div>
          </div>

          <div className="athletic-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Total Time</h3>
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-2xl">⏱️</span>
              </div>
            </div>
            {isLoading ? (
              <div className="h-8 bg-slate-700 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold text-white">
                {formatTime(totalStats.totalTime)}
              </div>
            )}
            <div className="text-sm text-slate-400 mt-1">
              Total time running
            </div>
          </div>

          <div className="athletic-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Total Runs</h3>
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
            {isLoading ? (
              <div className="h-8 bg-slate-700 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold text-white">
                {totalStats.totalRuns.toLocaleString()}
              </div>
            )}
            <div className="text-sm text-slate-400 mt-1">
              Total completed runs
            </div>
          </div>
        </div>

        {/* Graphs - Mixed Layout */}
        <div className="space-y-6">
          {sortedGraphs.map(graph => {
            if (graph.settings.isFullWidth) {
              // Render full-width graphs independently
              return renderGraph(graph);
            }
            return null;
          })}

          {/* Grid for regular width graphs */}
          {sortedGraphs.filter(graph => !graph.settings.isFullWidth).length > 0 && (
            <div className={`grid gap-6 ${layoutMode === 'two-column' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
              {sortedGraphs
                .filter(graph => !graph.settings.isFullWidth)
                .map(graph => renderGraph(graph))
              }
            </div>
          )}
        </div>

        {graphs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-300 mb-4">No graphs added yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 athletic-button-primary text-white rounded-lg"
            >
              Add Your First Graph
            </button>
          </div>
        )}
      </div>

      {/* Add Graph Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="athletic-card-gradient p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Add Graph</h3>
            <div className="space-y-3">
              <button
                onClick={() => addGraph('distance-threshold')}
                className="w-full p-4 athletic-card hover:bg-slate-700 rounded-lg text-left"
              >
                <h4 className="font-semibold text-white mb-1">Distance Analysis</h4>
                <p className="text-sm text-slate-300">Track runs exceeding distance thresholds</p>
              </button>
              <button
                onClick={() => addGraph('average')}
                className="w-full p-4 athletic-card hover:bg-slate-700 rounded-lg text-left"
              >
                <h4 className="font-semibold text-white mb-1">Average Metrics</h4>
                <p className="text-sm text-slate-300">View average performance over time</p>
              </button>
              <button
                onClick={() => addGraph('total')}
                className="w-full p-4 athletic-card hover:bg-slate-700 rounded-lg text-left"
              >
                <h4 className="font-semibold text-white mb-1">Total Metrics</h4>
                <p className="text-sm text-slate-300">View cumulative totals over time</p>
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(false)}
              className="mt-4 w-full px-4 py-2 athletic-button-secondary text-slate-300 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Graphs;