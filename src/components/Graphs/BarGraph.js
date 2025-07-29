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

const BarGraph = ({ metric = 'distance', period = 'monthly', color = '#10B981' }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBarData();
  }, [metric, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBarData = async () => {
    try {
      setIsLoading(true);
      const activities = await firebaseService.getActivities();
      
      // Group activities by period
      const groupedData = groupActivitiesByPeriod(activities, period);
      
      // Calculate averages for each period
      const chartData = Object.entries(groupedData).map(([periodKey, activities]) => {
        let value;
        switch (metric) {
          case 'distance':
            value = activities.reduce((sum, act) => sum + act.distance, 0) / activities.length / 1000; // km
            break;
          case 'speed':
            value = activities.reduce((sum, act) => sum + act.average_speed * 3.6, 0) / activities.length; // km/h
            break;
          case 'time':
            value = activities.reduce((sum, act) => sum + act.moving_time, 0) / activities.length / 60; // minutes
            break;
          default:
            value = 0;
        }
        return { label: periodKey, value };
      });
      
      setData(chartData);
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
    switch (metric) {
      case 'distance':
        return 'Average Distance (km)';
      case 'speed':
        return 'Average Speed (km/h)';
      case 'time':
        return 'Average Time (minutes)';
      default:
        return 'Average';
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
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: `${getMetricLabel()} - ${period.charAt(0).toUpperCase() + period.slice(1)}`,
        font: {
          size: 16
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: getMetricLabel()
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 h-96 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div style={{ height: '300px' }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default BarGraph;