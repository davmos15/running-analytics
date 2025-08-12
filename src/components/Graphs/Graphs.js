import React, { useState, useEffect } from 'react';
import { Plus, Filter, Eye, EyeOff } from 'lucide-react';
import ProgressionGraph from './ProgressionGraph';
import BarGraph from './BarGraph';
import GraphSettings from './GraphSettings';
import { TIME_FILTERS } from '../../utils/constants';

const Graphs = () => {
  const [activeSection, setActiveSection] = useState('progression');
  const [timeFilter, setTimeFilter] = useState('all-time');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [allDistances, setAllDistances] = useState([]);
  
  // Progression settings
  const [progressionSettings, setProgressionSettings] = useState({
    distance: '5K',
    maxResults: 10,
    color: '#3B82F6',
    visible: true
  });

  // Average graphs
  const [averageGraphs, setAverageGraphs] = useState([]);
  
  // Total graphs
  const [totalGraphs, setTotalGraphs] = useState([]);

  // Load distances and settings on mount
  useEffect(() => {
    // Load all available distances
    const customDistances = localStorage.getItem('customDistances');
    const baseDistances = ['100m', '200m', '400m', '800m', '1K', '1.5K', '2K', '3K', '5K', '10K', '15K', '21.1K', '42.2K'];
    if (customDistances) {
      const custom = JSON.parse(customDistances);
      setAllDistances([...baseDistances, ...custom.map(d => d.label)]);
    } else {
      setAllDistances(baseDistances);
    }

    // Load saved settings
    const savedProgressionSettings = localStorage.getItem('progressionGraphSettings');
    if (savedProgressionSettings) {
      setProgressionSettings(JSON.parse(savedProgressionSettings));
    }

    const savedAverageGraphs = localStorage.getItem('averageGraphs');
    if (savedAverageGraphs) {
      setAverageGraphs(JSON.parse(savedAverageGraphs));
    } else {
      // Default average graphs
      setAverageGraphs([
        { id: '1', type: 'bar', metric: 'distance', period: 'monthly', visible: true, color: '#10B981' },
        { id: '2', type: 'bar', metric: 'speed', period: 'monthly', visible: true, color: '#8B5CF6' }
      ]);
    }
    
    const savedTotalGraphs = localStorage.getItem('totalGraphs');
    if (savedTotalGraphs) {
      setTotalGraphs(JSON.parse(savedTotalGraphs));
    } else {
      // Default total graphs
      setTotalGraphs([
        { id: '1', type: 'bar', metric: 'distance', period: 'monthly', visible: true, color: '#F59E0B' },
        { id: '2', type: 'bar', metric: 'time', period: 'monthly', visible: true, color: '#EC4899' }
      ]);
    }

  }, []);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('progressionGraphSettings', JSON.stringify(progressionSettings));
  }, [progressionSettings]);

  useEffect(() => {
    localStorage.setItem('averageGraphs', JSON.stringify(averageGraphs));
  }, [averageGraphs]);
  
  useEffect(() => {
    localStorage.setItem('totalGraphs', JSON.stringify(totalGraphs));
  }, [totalGraphs]);

  const addAverageGraph = () => {
    const newGraph = {
      id: Date.now().toString(),
      type: 'bar',
      metric: 'distance',
      period: 'monthly',
      visible: true,
      color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };
    setAverageGraphs([...averageGraphs, newGraph]);
  };

  const updateAverageGraph = (id, updates) => {
    setAverageGraphs(averageGraphs.map(graph => 
      graph.id === id ? { ...graph, ...updates } : graph
    ));
  };

  const deleteAverageGraph = (id) => {
    setAverageGraphs(averageGraphs.filter(graph => graph.id !== id));
  };
  
  const addTotalGraph = () => {
    const newGraph = {
      id: Date.now().toString(),
      type: 'bar',
      metric: 'distance',
      period: 'monthly',
      visible: true,
      color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };
    setTotalGraphs([...totalGraphs, newGraph]);
  };

  const updateTotalGraph = (id, updates) => {
    setTotalGraphs(totalGraphs.map(graph => 
      graph.id === id ? { ...graph, ...updates } : graph
    ));
  };

  const deleteTotalGraph = (id) => {
    setTotalGraphs(totalGraphs.filter(graph => graph.id !== id));
  };

  const sections = [
    { id: 'progression', label: 'Progression', description: 'Track your personal best improvements over time' },
    { id: 'average', label: 'Average', description: 'View average performance metrics by period' },
    { id: 'total', label: 'Total', description: 'View total metrics over different time periods' }
  ];

  return (
    <div className="mt-6 space-y-6 mx-4">
      <div className="athletic-card-gradient p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Performance Graphs</h2>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center space-x-2 px-3 py-2 athletic-button-secondary text-slate-300 rounded-lg transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Date Filter</span>
          </button>
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

        {/* Section Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeSection === section.id
                  ? 'athletic-button-primary text-white'
                  : 'athletic-button-secondary text-slate-300'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Section Content */}
        {activeSection === 'progression' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Personal Best Progression</h3>
                <p className="text-sm text-slate-300">Track your fastest times improving over time</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setProgressionSettings({...progressionSettings, visible: !progressionSettings.visible})}
                  className="p-2 athletic-button-secondary rounded-lg"
                >
                  {progressionSettings.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <select
                  value={progressionSettings.distance}
                  onChange={(e) => setProgressionSettings({...progressionSettings, distance: e.target.value})}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  {allDistances.map(distance => (
                    <option key={distance} value={distance}>{distance}</option>
                  ))}
                </select>
                <select
                  value={progressionSettings.maxResults}
                  onChange={(e) => setProgressionSettings({...progressionSettings, maxResults: parseInt(e.target.value)})}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={15}>Top 15</option>
                  <option value={20}>Top 20</option>
                  <option value={50}>Top 50</option>
                </select>
              </div>
            </div>
            
            {progressionSettings.visible && (
              <ProgressionGraph
                distance={progressionSettings.distance}
                color={progressionSettings.color}
                timePeriod={timeFilter}
                customDateFrom={customDateFrom}
                customDateTo={customDateTo}
                maxResults={progressionSettings.maxResults}
              />
            )}
          </div>
        )}

        {activeSection === 'average' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Average Performance</h3>
                <p className="text-sm text-slate-300">View your average metrics over different time periods</p>
              </div>
              <button
                onClick={addAverageGraph}
                className="flex items-center space-x-2 px-3 py-2 athletic-button-primary text-white rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Add Graph</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {averageGraphs.map(graph => (
                <div key={graph.id} className="relative">
                  <div className="absolute top-2 right-2 flex items-center space-x-2 z-10">
                    <button
                      onClick={() => updateAverageGraph(graph.id, {visible: !graph.visible})}
                      className="p-1 text-slate-400 hover:text-slate-200 athletic-card rounded shadow"
                    >
                      {graph.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <GraphSettings
                      graph={graph}
                      allDistances={allDistances}
                      onUpdate={(updates) => updateAverageGraph(graph.id, updates)}
                    />
                    <button
                      onClick={() => deleteAverageGraph(graph.id)}
                      className="p-1 text-red-400 hover:text-red-300 athletic-card rounded shadow"
                    >
                      ×
                    </button>
                  </div>

                  {graph.visible && (
                    <BarGraph
                      metric={graph.metric}
                      period={graph.period}
                      color={graph.color}
                      timeFilter={timeFilter}
                      customDateFrom={customDateFrom}
                      customDateTo={customDateTo}
                    />
                  )}
                </div>
              ))}
            </div>

            {averageGraphs.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-300 mb-4">No average graphs added yet.</p>
                <button
                  onClick={addAverageGraph}
                  className="px-4 py-2 athletic-button-primary text-white rounded-lg"
                >
                  Add Your First Graph
                </button>
              </div>
            )}
          </div>
        )}

        {activeSection === 'total' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Total Metrics</h3>
                <p className="text-sm text-slate-300">View your cumulative totals over different time periods</p>
              </div>
              <button
                onClick={addTotalGraph}
                className="flex items-center space-x-2 px-3 py-2 athletic-button-primary text-white rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Add Graph</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {totalGraphs.map(graph => (
                <div key={graph.id} className="relative">
                  <div className="absolute top-2 right-2 flex items-center space-x-2 z-10">
                    <button
                      onClick={() => updateTotalGraph(graph.id, {visible: !graph.visible})}
                      className="p-1 text-slate-400 hover:text-slate-200 athletic-card rounded shadow"
                    >
                      {graph.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <GraphSettings
                      graph={graph}
                      allDistances={allDistances}
                      onUpdate={(updates) => updateTotalGraph(graph.id, updates)}
                      isTotal={true}
                    />
                    <button
                      onClick={() => deleteTotalGraph(graph.id)}
                      className="p-1 text-red-400 hover:text-red-300 athletic-card rounded shadow"
                    >
                      ×
                    </button>
                  </div>

                  {graph.visible && (
                    <BarGraph
                      metric={graph.metric}
                      period={graph.period}
                      color={graph.color}
                      timeFilter={timeFilter}
                      customDateFrom={customDateFrom}
                      customDateTo={customDateTo}
                      isTotal={true}
                    />
                  )}
                </div>
              ))}
            </div>

            {totalGraphs.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-300 mb-4">No total graphs added yet.</p>
                <button
                  onClick={addTotalGraph}
                  className="px-4 py-2 athletic-button-primary text-white rounded-lg"
                >
                  Add Your First Graph
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Graphs;