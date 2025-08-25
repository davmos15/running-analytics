import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import firebaseService from '../../services/firebaseService';
import LoadingSpinner from '../common/LoadingSpinner';
import { format, startOfWeek, endOfWeek } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const BarGraph = ({ metric = 'distance', period = 'monthly', color = '#10B981', timeFilter = 'all-time', customDateFrom, customDateTo, isTotal = false, speedUnit = 'kph', type = 'column' }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBarData();
  }, [metric, period, timeFilter, customDateFrom, customDateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const filterActivitiesByDate = (activities, timeFilter, customDateFrom, customDateTo) => {
    const now = new Date();
    let startDate, endDate;

    switch (timeFilter) {
      case 'this-year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      case 'last-12-months':
        startDate = new Date(now.setMonth(now.getMonth() - 12));
        endDate = new Date();
        break;
      case 'last-6-months':
        startDate = new Date(now.setMonth(now.getMonth() - 6));
        endDate = new Date();
        break;
      case 'last-3-months':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        endDate = new Date();
        break;
      case 'custom':
        if (customDateFrom && customDateTo) {
          startDate = new Date(customDateFrom);
          endDate = new Date(customDateTo);
        } else {
          return activities; // No filter if dates not provided
        }
        break;
      default:
        return activities;
    }

    return activities.filter(activity => {
      const activityDate = new Date(activity.start_date);
      return activityDate >= startDate && activityDate <= endDate;
    });
  };

  const loadBarData = async () => {
    try {
      setIsLoading(true);
      let activities = await firebaseService.getActivities();
      
      // Apply date filtering
      if (timeFilter !== 'all-time') {
        activities = filterActivitiesByDate(activities, timeFilter, customDateFrom, customDateTo);
      }
      
      // Group activities by period
      const groupedData = groupActivitiesByPeriod(activities, period);
      
      // Calculate values for each period (averages or totals)
      const chartData = Object.entries(groupedData).map(([periodKey, activities]) => {
        let value;
        
        if (isTotal) {
          // Calculate totals
          switch (metric) {
            case 'distance':
              value = activities.reduce((sum, act) => sum + act.distance, 0) / 1000; // total km
              break;
            case 'time':
              value = activities.reduce((sum, act) => sum + act.moving_time, 0) / 60; // total minutes
              break;
            case 'runs':
              value = activities.length; // total number of runs
              break;
            case 'elevation':
              value = activities.reduce((sum, act) => sum + (act.total_elevation_gain || 0), 0); // total elevation in meters
              break;
            default:
              value = 0;
          }
        } else {
          // Calculate averages
          switch (metric) {
            case 'distance':
              value = activities.reduce((sum, act) => sum + act.distance, 0) / activities.length / 1000; // avg km
              break;
            case 'speed':
              if (speedUnit === 'pace') {
                // Convert to min/km pace
                const avgSpeedKmh = activities.reduce((sum, act) => sum + act.average_speed * 3.6, 0) / activities.length;
                value = avgSpeedKmh > 0 ? 60 / avgSpeedKmh : 0; // min/km
              } else {
                value = activities.reduce((sum, act) => sum + act.average_speed * 3.6, 0) / activities.length; // avg km/h
              }
              break;
            case 'time':
              value = activities.reduce((sum, act) => sum + act.moving_time, 0) / activities.length / 60; // avg minutes
              break;
            case 'totalDistance':
              value = activities.reduce((sum, act) => sum + act.distance, 0) / 1000; // total km
              break;
            case 'totalTime':
              value = activities.reduce((sum, act) => sum + act.moving_time, 0) / 60; // total minutes
              break;
            case 'totalRuns':
              value = activities.length; // total number of runs
              break;
            default:
              value = 0;
          }
        }
        return { label: periodKey, value, date: activities[0]?.start_date };
      });
      
      // Sort by date to ensure chronological order
      const sortedData = chartData.sort((a, b) => new Date(a.date) - new Date(b.date));
      setData(sortedData);
    } catch (error) {
      console.error('Error loading bar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupActivitiesByPeriod = (activities, period) => {
    const grouped = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.start_date);
      let periodKey;
      
      switch (period) {
        case 'weekly':
          const weekStart = startOfWeek(date);
          const weekEnd = endOfWeek(date);
          periodKey = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
          break;
        case 'monthly':
          periodKey = format(date, 'MMM yyyy');
          break;
        case 'yearly':
          periodKey = format(date, 'yyyy');
          break;
        default:
          periodKey = format(date, 'MMM yyyy');
      }
      
      if (!grouped[periodKey]) {
        grouped[periodKey] = [];
      }
      grouped[periodKey].push(activity);
    });
    
    return grouped;
  };

  const getMetricLabel = () => {
    if (isTotal) {
      switch (metric) {
        case 'distance':
          return 'Total Distance (km)';
        case 'time':
          return 'Total Time (minutes)';
        case 'runs':
          return 'Total Number of Runs';
        case 'elevation':
          return 'Total Elevation Gain (m)';
        default:
          return 'Total';
      }
    } else {
      switch (metric) {
        case 'distance':
          return 'Average Distance (km)';
        case 'speed':
          return speedUnit === 'pace' ? 'Average Pace (min/km)' : 'Average Speed (km/h)';
        case 'time':
          return 'Average Time (minutes)';
        case 'totalDistance':
          return 'Total Distance (km)';
        case 'totalTime':
          return 'Total Time (minutes)';
        case 'totalRuns':
          return 'Total Number of Runs';
        default:
          return 'Average';
      }
    }
  };

  const chartData = {
    labels: data.slice(-12).map(d => d.label), // Show last 12 periods
    datasets: [
      {
        label: getMetricLabel(),
        data: data.slice(-12).map(d => d.value),
        backgroundColor: color + '80',
        borderColor: color,
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: type === 'column' ? 'x' : 'y',
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: `${getMetricLabel()} - ${period.charAt(0).toUpperCase() + period.slice(1)}`,
        font: {
          size: 18,
          family: 'Rajdhani, sans-serif',
          weight: 'bold'
        },
        color: '#e2e8f0'
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        borderColor: '#f97316',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#94a3b8'
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.2)'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: getMetricLabel(),
          color: '#e2e8f0',
          font: {
            family: 'Inter, sans-serif',
            weight: '500'
          }
        },
        ticks: {
          color: '#94a3b8'
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.2)'
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="athletic-card p-6 h-96 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="athletic-card p-6">
      <div style={{ height: '300px' }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default BarGraph;