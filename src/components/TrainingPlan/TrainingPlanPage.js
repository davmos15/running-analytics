import React, { useState } from 'react';
import { Calendar, Target, Download, Play, ChevronRight, Clock } from 'lucide-react';
import trainingPlanService from '../../services/trainingPlanService';
import LoadingSpinner from '../common/LoadingSpinner';

const TrainingPlanPage = () => {
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [planConfig, setPlanConfig] = useState({
    raceDate: '',
    raceDistance: '5000', // meters
    goalType: 'completion', // 'completion' or 'time'
    goalTimeHours: '',
    goalTimeMinutes: '',
    runsPerWeek: 4,
    availableDays: ['Tuesday', 'Thursday', 'Saturday', 'Sunday'],
    longRunDay: 'Sunday'
  });

  const raceDistances = [
    { label: '5K', value: 5000 },
    { label: '10K', value: 10000 },
    { label: 'Half Marathon', value: 21100 },
    { label: 'Marathon', value: 42200 },
    { label: 'Custom', value: 'custom' }
  ];

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleDayToggle = (day) => {
    const days = [...planConfig.availableDays];
    const index = days.indexOf(day);
    
    if (index > -1) {
      days.splice(index, 1);
    } else {
      days.push(day);
    }
    
    setPlanConfig({ ...planConfig, availableDays: days });
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Validate inputs
      if (!planConfig.raceDate) {
        throw new Error('Please select a race date');
      }
      
      if (planConfig.goalType === 'time' && (!planConfig.goalTimeHours && !planConfig.goalTimeMinutes)) {
        throw new Error('Please enter a goal time');
      }
      
      if (planConfig.availableDays.length < planConfig.runsPerWeek) {
        throw new Error('Not enough available days for the selected runs per week');
      }
      
      if (!planConfig.availableDays.includes(planConfig.longRunDay)) {
        throw new Error('Long run day must be one of your available days');
      }

      // Convert time format and generate the plan
      const goalTimeInMinutes = planConfig.goalType === 'time' ? 
        (parseInt(planConfig.goalTimeHours || 0) * 60) + parseInt(planConfig.goalTimeMinutes || 0) : 
        undefined;
      
      const configWithTime = {
        ...planConfig,
        goalTime: goalTimeInMinutes
      };
      
      const plan = await trainingPlanService.generateTrainingPlan(configWithTime);
      setCurrentPlan(plan);
      setShowPlanForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (!currentPlan) return;
    
    const csv = trainingPlanService.exportToCSV(currentPlan);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-plan-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPhaseColor = (phase) => {
    switch (phase) {
      case 'base': return 'bg-blue-500/20 text-blue-400';
      case 'build': return 'bg-orange-500/20 text-orange-400';
      case 'peak': return 'bg-red-500/20 text-red-400';
      case 'taper': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="mt-6 space-y-6 mx-4">
      {!showPlanForm && !currentPlan && (
        <div className="athletic-card-gradient p-8 text-center">
          <Calendar className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Training Plan Creator
          </h2>
          <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
            Create a personalized training plan based on your race goals and current fitness level. 
            Our AI analyzes your training history to build the perfect plan for you.
          </p>
          <button
            onClick={() => setShowPlanForm(true)}
            className="px-6 py-3 athletic-button-primary text-white rounded-lg text-lg font-medium flex items-center space-x-2 mx-auto"
          >
            <Play className="w-5 h-5" />
            <span>Create New Plan</span>
          </button>
        </div>
      )}

      {showPlanForm && (
        <div className="athletic-card-gradient p-6">
          <h3 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Configure Your Training Plan
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 text-red-300 rounded-lg border border-red-500/30">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Race Details */}
            <div>
              <h4 className="text-lg font-medium text-white mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-orange-400" />
                Race Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Race Date
                  </label>
                  <input
                    type="date"
                    value={planConfig.raceDate}
                    onChange={(e) => setPlanConfig({ ...planConfig, raceDate: e.target.value })}
                    min={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Race Distance
                  </label>
                  <select
                    value={planConfig.raceDistance}
                    onChange={(e) => setPlanConfig({ ...planConfig, raceDistance: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
                  >
                    {raceDistances.map(distance => (
                      <option key={distance.value} value={distance.value}>
                        {distance.label}
                      </option>
                    ))}
                  </select>
                  {planConfig.raceDistance === 'custom' && (
                    <input
                      type="number"
                      placeholder="Distance in kilometers"
                      className="mt-2 w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
                      onChange={(e) => setPlanConfig({ 
                        ...planConfig, 
                        raceDistance: parseFloat(e.target.value) * 1000 
                      })}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Goal Type */}
            <div>
              <h4 className="text-lg font-medium text-white mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-orange-400" />
                Goal Type
              </h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    value="completion"
                    checked={planConfig.goalType === 'completion'}
                    onChange={(e) => setPlanConfig({ ...planConfig, goalType: e.target.value })}
                    className="text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-white">Completion - Focus on finishing the race</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    value="time"
                    checked={planConfig.goalType === 'time'}
                    onChange={(e) => setPlanConfig({ ...planConfig, goalType: e.target.value })}
                    className="text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-white">Time Goal - Train for a specific finish time</span>
                </label>
                
                {planConfig.goalType === 'time' && (
                  <div className="ml-6 mt-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Goal Time
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={planConfig.goalTimeHours}
                        onChange={(e) => setPlanConfig({ ...planConfig, goalTimeHours: e.target.value })}
                        placeholder="0"
                        className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white text-center"
                      />
                      <span className="text-slate-300">hours</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={planConfig.goalTimeMinutes}
                        onChange={(e) => setPlanConfig({ ...planConfig, goalTimeMinutes: e.target.value })}
                        placeholder="25"
                        className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white text-center"
                      />
                      <span className="text-slate-300">minutes</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      e.g., 0 hours 25 minutes for a 25-minute 5K
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Training Schedule */}
            <div>
              <h4 className="text-lg font-medium text-white mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-orange-400" />
                Training Schedule
              </h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Runs Per Week
                </label>
                <select
                  value={planConfig.runsPerWeek}
                  onChange={(e) => setPlanConfig({ ...planConfig, runsPerWeek: parseInt(e.target.value) })}
                  className="w-full md:w-1/3 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
                >
                  {[3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>{num} runs</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Available Training Days
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {weekDays.map(day => (
                    <label key={day} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={planConfig.availableDays.includes(day)}
                        onChange={() => handleDayToggle(day)}
                        className="text-orange-500 focus:ring-orange-500 rounded"
                      />
                      <span className="text-white text-sm">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Long Run Day
                </label>
                <select
                  value={planConfig.longRunDay}
                  onChange={(e) => setPlanConfig({ ...planConfig, longRunDay: e.target.value })}
                  className="w-full md:w-1/3 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
                >
                  {weekDays.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-600">
              <button
                onClick={() => setShowPlanForm(false)}
                className="px-4 py-2 athletic-button-secondary text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleGeneratePlan}
                disabled={isGenerating}
                className="px-4 py-2 athletic-button-primary text-white rounded-lg flex items-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Generate Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentPlan && (
        <>
          {/* Plan Overview */}
          <div className="athletic-card-gradient p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  Your Training Plan
                </h2>
                <p className="text-slate-300">
                  {currentPlan.metadata.totalWeeks} weeks • {currentPlan.metadata.runsPerWeek} runs/week • 
                  {currentPlan.metadata.goalType === 'time' ? 
                    ` Goal: ${Math.floor(currentPlan.metadata.goalTime / 60)}:${String(currentPlan.metadata.goalTime % 60).padStart(2, '0')}` : 
                    ' Goal: Complete the race'}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 athletic-button-secondary text-slate-300 rounded-lg flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentPlan(null);
                    setShowPlanForm(true);
                  }}
                  className="px-4 py-2 athletic-button-primary text-white rounded-lg"
                >
                  New Plan
                </button>
              </div>
            </div>

            {/* Phase Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {['base', 'build', 'peak', 'taper'].map(phase => {
                const phaseWeeks = currentPlan.weeks.filter(w => w.phase === phase);
                if (phaseWeeks.length === 0) return null;
                
                return (
                  <div key={phase} className={`p-3 rounded-lg ${getPhaseColor(phase)}`}>
                    <div className="text-xs font-medium uppercase">{phase} Phase</div>
                    <div className="text-lg font-bold">{phaseWeeks.length} weeks</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Plan Table */}
          <div className="athletic-card-gradient p-6">
            <h3 className="text-xl font-bold text-white mb-4">Weekly Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-3 px-2 text-slate-300 font-medium">Week</th>
                    <th className="text-left py-3 px-2 text-slate-300 font-medium">Start Date</th>
                    <th className="text-left py-3 px-2 text-slate-300 font-medium">Phase</th>
                    <th className="text-left py-3 px-2 text-slate-300 font-medium">Total Km</th>
                    <th className="text-left py-3 px-2 text-slate-300 font-medium">Key Workouts</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPlan.weeks.map((week, index) => (
                    <React.Fragment key={week.weekNumber}>
                      <tr 
                        className="border-b border-slate-700 cursor-pointer hover:bg-slate-800/50 transition-colors"
                        onClick={() => {
                          const details = document.getElementById(`week-${week.weekNumber}-details`);
                          details.classList.toggle('hidden');
                        }}
                      >
                        <td className="py-3 px-2 text-white font-medium">
                          <div className="flex items-center space-x-2">
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                            <span>Week {week.weekNumber}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-slate-300">
                          {formatDate(week.startDate)}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPhaseColor(week.phase)}`}>
                            {week.phase}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-white font-medium">
                          {week.totalKm.toFixed(1)} km
                        </td>
                        <td className="py-3 px-2 text-slate-300 text-sm">
                          {week.runs.filter(r => r.type !== 'Easy Run' && r.type !== 'Rest Day')
                            .map(r => r.type)
                            .join(', ') || 'Easy week'}
                        </td>
                      </tr>
                      
                      {/* Expandable Week Details */}
                      <tr id={`week-${week.weekNumber}-details`} className="hidden">
                        <td colSpan="5" className="p-4 bg-slate-800/30">
                          <div className="space-y-3">
                            {week.runs.map((run, runIndex) => (
                              <div key={runIndex} className="flex items-start space-x-4">
                                <div className="w-24 text-sm font-medium text-slate-400">
                                  {run.day}
                                </div>
                                <div className="flex-1">
                                  {run.type === 'Rest Day' ? (
                                    <div className="text-slate-500">Rest Day</div>
                                  ) : (
                                    <>
                                      <div className="text-white font-medium">
                                        {run.type} - {run.distance.toFixed(1)}km
                                      </div>
                                      <div className="text-sm text-slate-400 mt-1">
                                        {run.description}
                                      </div>
                                      {run.segments.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                          {run.segments.map((segment, segIndex) => (
                                            <div key={segIndex} className="text-xs text-slate-500">
                                              • {segment.type}: {segment.distance.toFixed(1)}km @ {segment.pace}/km
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TrainingPlanPage;