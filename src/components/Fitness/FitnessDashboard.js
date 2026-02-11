import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Heart, Activity, TrendingUp, Battery, RefreshCw } from 'lucide-react';
import useTrainingMetrics from '../../hooks/useTrainingMetrics';
import LoadingSpinner from '../common/LoadingSpinner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const FitnessDashboard = () => {
  const { metrics, isLoading, error, refresh } = useTrainingMetrics();
  const [chartRange, setChartRange] = useState(60); // days to show

  if (isLoading) {
    return (
      <div className="mt-6 space-y-6 mx-4">
        <div className="athletic-card-gradient p-6">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 space-y-6 mx-4">
        <div className="athletic-card-gradient p-6 text-center">
          <p className="text-red-400">Error loading training metrics: {error}</p>
          <button onClick={refresh} className="mt-3 athletic-button-primary px-4 py-2 rounded-lg text-white text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const { fitness, vdot, recovery, vdotHistory } = metrics;

  // Form status colors
  const formColors = {
    fresh: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Fresh' },
    optimal: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Optimal' },
    tired: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Tired' },
    fatigued: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Fatigued' }
  };
  const formStyle = formColors[fitness.formStatus] || formColors.optimal;

  // Recovery colors
  const recoveryColors = {
    light: { bg: 'bg-green-500/20', text: 'text-green-400' },
    moderate: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    hard: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    very_hard: { bg: 'bg-red-500/20', text: 'text-red-400' }
  };
  const recoveryStyle = recoveryColors[recovery.level] || recoveryColors.moderate;

  // Prepare chart data
  const chartData = fitness.tsbData.slice(-chartRange);
  const fitnessChartConfig = {
    labels: chartData.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Fitness (CTL)',
        data: chartData.map(d => d.ctl),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2
      },
      {
        label: 'Fatigue (ATL)',
        data: chartData.map(d => d.atl),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2
      },
      {
        label: 'Form (TSB)',
        data: chartData.map(d => d.tsb),
        borderColor: '#10B981',
        backgroundColor: (ctx) => {
          if (!ctx.chart?.chartArea) return 'rgba(16, 185, 129, 0.1)';
          const gradient = ctx.chart.ctx.createLinearGradient(0, ctx.chart.chartArea.top, 0, ctx.chart.chartArea.bottom);
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
          gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.05)');
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0.1)');
          return gradient;
        },
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2
      }
    ]
  };

  const fitnessChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        labels: { color: '#94A3B8', font: { size: 12 } }
      },
      tooltip: {
        backgroundColor: '#1E293B',
        titleColor: '#F8FAFC',
        bodyColor: '#CBD5E1',
        borderColor: '#334155',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748B', maxTicksLimit: 10 },
        grid: { color: 'rgba(100, 116, 139, 0.1)' }
      },
      y: {
        ticks: { color: '#64748B' },
        grid: { color: 'rgba(100, 116, 139, 0.1)' }
      }
    }
  };

  // VDOT history chart
  const vdotChartConfig = vdotHistory.length > 1 ? {
    labels: vdotHistory.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      label: 'VO2 Max (VDOT)',
      data: vdotHistory.map(d => d.vdot),
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointBackgroundColor: '#F59E0B',
      borderWidth: 2
    }]
  } : null;

  const vdotChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E293B',
        titleColor: '#F8FAFC',
        bodyColor: '#CBD5E1'
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748B', maxTicksLimit: 8 },
        grid: { color: 'rgba(100, 116, 139, 0.1)' }
      },
      y: {
        ticks: { color: '#64748B' },
        grid: { color: 'rgba(100, 116, 139, 0.1)' }
      }
    }
  };

  return (
    <div className="mt-6 space-y-6 mx-4">
      {/* Header */}
      <div className="athletic-card-gradient p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}>
              <Heart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Training Load & Fitness
              </h1>
              <p className="text-sm text-slate-400">
                Track your fitness, fatigue, and form over time
              </p>
            </div>
          </div>
          <button
            onClick={refresh}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* VDOT Card */}
        <div className="athletic-card p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs text-slate-400 uppercase tracking-wider">VO2 Max</span>
          </div>
          <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {vdot.vdot ? vdot.vdot : '--'}
          </div>
          {vdot.basedOn && vdot.basedOn.length > 0 && (
            <div className="text-xs text-slate-500 mt-1">
              Based on {vdot.basedOn.length} distance{vdot.basedOn.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Fitness (CTL) Card */}
        <div className="athletic-card p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs text-slate-400 uppercase tracking-wider">Fitness</span>
          </div>
          <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {fitness.ctl}
          </div>
          <div className="text-xs text-slate-500 mt-1">CTL (42-day load)</div>
        </div>

        {/* Fatigue (ATL) Card */}
        <div className="athletic-card p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-xs text-slate-400 uppercase tracking-wider">Fatigue</span>
          </div>
          <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {fitness.atl}
          </div>
          <div className="text-xs text-slate-500 mt-1">ATL (7-day load)</div>
        </div>

        {/* Form (TSB) Card */}
        <div className="athletic-card p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className={`w-8 h-8 ${formStyle.bg} rounded-lg flex items-center justify-center`}>
              <Battery className={`w-4 h-4 ${formStyle.text}`} />
            </div>
            <span className="text-xs text-slate-400 uppercase tracking-wider">Form</span>
          </div>
          <div className={`text-3xl font-bold ${formStyle.text}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {fitness.tsb > 0 ? '+' : ''}{fitness.tsb}
          </div>
          <div className={`text-xs ${formStyle.text} mt-1`}>{formStyle.label}</div>
        </div>
      </div>

      {/* Fitness/Fatigue Chart */}
      <div className="athletic-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Fitness & Fatigue Over Time
          </h3>
          <select
            value={chartRange}
            onChange={(e) => setChartRange(parseInt(e.target.value))}
            className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-orange-400"
          >
            <option value={30}>4 Weeks</option>
            <option value={60}>8 Weeks</option>
            <option value={90}>12 Weeks</option>
          </select>
        </div>
        <div style={{ height: '300px' }}>
          {chartData.length > 0 ? (
            <Line data={fitnessChartConfig} options={fitnessChartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Not enough data to display chart. Import more activities.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Recovery + VDOT Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recovery Card */}
        <div className="athletic-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Recovery Status
          </h3>
          {recovery.lastActivity ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-slate-400">Last Activity</div>
                  <div className="text-white font-medium">{recovery.lastActivity.name}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(recovery.lastActivity.date).toLocaleDateString()} | TRIMP: {recovery.lastActivity.trimp}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm ${recoveryStyle.bg} ${recoveryStyle.text}`}>
                  {recovery.label}
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-400">Recovery Progress</span>
                  <span className="text-white">
                    {recovery.hoursRemaining !== null && recovery.hoursRemaining > 0
                      ? `${recovery.hoursRemaining}h remaining`
                      : 'Recovered'}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      recovery.hoursRemaining <= 0 ? 'bg-green-500' :
                      recovery.hoursRemaining < recovery.hours / 2 ? 'bg-blue-500' :
                      'bg-orange-500'
                    }`}
                    style={{
                      width: `${recovery.hoursRemaining !== null
                        ? Math.min(100, Math.max(0, ((recovery.hours - recovery.hoursRemaining) / recovery.hours) * 100))
                        : 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-sm">No recent activity data available.</div>
          )}
        </div>

        {/* VDOT Trend Chart */}
        <div className="athletic-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            VO2 Max Trend
          </h3>
          <div style={{ height: '200px' }}>
            {vdotChartConfig ? (
              <Line data={vdotChartConfig} options={vdotChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                {vdot.vdot ? 'Need more data points for trend chart.' : 'No VO2 Max estimates available yet.'}
              </div>
            )}
          </div>
          {vdot.basedOn && vdot.basedOn.length > 0 && (
            <div className="mt-3 border-t border-slate-700 pt-3">
              <div className="text-xs text-slate-400 mb-2">VDOT by distance:</div>
              <div className="flex flex-wrap gap-2">
                {vdot.basedOn.map((item, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                    {item.distance}: {item.vdot}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FitnessDashboard;
