import React, { useState, useEffect } from 'react';
import { Plus, X, Eye, EyeOff, Filter } from 'lucide-react';
import ProgressionGraph from './ProgressionGraph';
import BarGraph from './BarGraph';
import GraphSettings from './GraphSettings';
import { TIME_FILTERS } from '../../utils/constants';

const Graphs = () => {
  const [graphs, setGraphs] = useState([]);
  const [isAddingGraph, setIsAddingGraph] = useState(false);
  const [newGraphType, setNewGraphType] = useState('progression');
  const [selectedDistance, setSelectedDistance] = useState('5K');
  const [selectedMetric, setSelectedMetric] = useState('speed');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [allDistances, setAllDistances] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all-time');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Load saved graphs and distances on mount
  useEffect(() => {
    const savedGraphs = localStorage.getItem('dashboardGraphs');
    if (savedGraphs) {
      setGraphs(JSON.parse(savedGraphs));
    } else {
      // Default graphs
      setGraphs([
        { id: '1', type: 'progression', distance: '5K', visible: true, color: '#3B82F6' },
        { id: '2', type: 'bar', metric: 'distance', period: 'monthly', visible: true, color: '#10B981' }
      ]);
    }

    // Load all available distances
    const customDistances = localStorage.getItem('customDistances');
    const baseDistances = ['100m', '200m', '400m', '800m', '1K', '1.5K', '2K', '3K', '5K', '10K', '15K', '21.1K', '42.2K'];
    if (customDistances) {
      const custom = JSON.parse(customDistances);
      setAllDistances([...baseDistances, ...custom.map(d => d.label)]);
    } else {
      setAllDistances(baseDistances);
    }
  }, []);

  // Save graphs to localStorage when changed
  useEffect(() => {
    if (graphs.length > 0) {
      localStorage.setItem('dashboardGraphs', JSON.stringify(graphs));
    }
  }, [graphs]);

  const addGraph = () => {
    const newGraph = {
      id: Date.now().toString(),
      type: newGraphType,
      visible: true,
      color: '#' + Math.floor(Math.random()*16777215).toString(16) // Random color
    };

    if (newGraphType === 'progression') {
      newGraph.distance = selectedDistance;
    } else if (newGraphType === 'bar') {
      newGraph.metric = selectedMetric;
      newGraph.period = selectedPeriod;
    }

    setGraphs([...graphs, newGraph]);
    setIsAddingGraph(false);
    setNewGraphType('progression');
  };

  const updateGraph = (id, updates) => {
    setGraphs(graphs.map(graph => 
      graph.id === id ? { ...graph, ...updates } : graph
    ));
  };

  const deleteGraph = (id) => {
    setGraphs(graphs.filter(graph => graph.id !== id));
  };

  const toggleGraphVisibility = (id) => {
    setGraphs(graphs.map(graph => 
      graph.id === id ? { ...graph, visible: !graph.visible } : graph
    ));
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Performance Graphs</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Date Filter</span>
            </button>
            <button
              onClick={() => setIsAddingGraph(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Graph</span>
            </button>
          </div>
        </div>

        {isFilterOpen && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-3">Date Filter</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">Time Period</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {TIME_FILTERS.map(filter => (
                    <option key={filter.value} value={filter.value}>{filter.label}</option>
                  ))}
                </select>
              </div>
              
              {timeFilter === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">From Date</label>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">To Date</label>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {isAddingGraph && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Add New Graph</h3>
              <button
                onClick={() => setIsAddingGraph(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Graph Type
                </label>
                <select
                  value={newGraphType}
                  onChange={(e) => setNewGraphType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="progression">Distance Progression</option>
                  <option value="bar">Average Metrics</option>
                </select>
              </div>

              {newGraphType === 'progression' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Distance
                  </label>
                  <select
                    value={selectedDistance}
                    onChange={(e) => setSelectedDistance(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {allDistances.map(distance => (
                      <option key={distance} value={distance}>{distance}</option>
                    ))}
                  </select>
                </div>
              )}

              {newGraphType === 'bar' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Metric
                    </label>
                    <select
                      value={selectedMetric}
                      onChange={(e) => setSelectedMetric(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="speed">Average Speed</option>
                      <option value="distance">Average Distance</option>
                      <option value="time">Average Time</option>
                      <option value="totalDistance">Total Distance</option>
                      <option value="totalTime">Total Time</option>
                      <option value="totalRuns">Total Number of Runs</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Period
                    </label>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </>
              )}

              <button
                onClick={addGraph}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Graph
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {graphs.map(graph => (
            <div key={graph.id} className="relative">
              <div className="absolute top-2 right-2 flex items-center space-x-2 z-10">
                <button
                  onClick={() => toggleGraphVisibility(graph.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 bg-white rounded shadow"
                >
                  {graph.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <GraphSettings
                  graph={graph}
                  allDistances={allDistances}
                  onUpdate={(updates) => updateGraph(graph.id, updates)}
                />
                <button
                  onClick={() => deleteGraph(graph.id)}
                  className="p-1 text-red-400 hover:text-red-600 bg-white rounded shadow"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {graph.visible && (
                <>
                  {graph.type === 'progression' && (
                    <ProgressionGraph
                      distance={graph.distance}
                      color={graph.color}
                      timePeriod={timeFilter}
                      customDateFrom={customDateFrom}
                      customDateTo={customDateTo}
                    />
                  )}
                  {graph.type === 'bar' && (
                    <BarGraph
                      metric={graph.metric}
                      period={graph.period}
                      color={graph.color}
                      timeFilter={timeFilter}
                      customDateFrom={customDateFrom}
                      customDateTo={customDateTo}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {graphs.length === 0 && !isAddingGraph && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No graphs added yet. Create your first graph to visualize your performance!</p>
            <button
              onClick={() => setIsAddingGraph(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Your First Graph
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Graphs;