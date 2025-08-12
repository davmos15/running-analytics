import React, { useState, useEffect } from 'react';
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
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import firebaseService from '../../services/firebaseService';
import LoadingSpinner from '../common/LoadingSpinner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const ProgressionGraph = ({ distance, color = '#3B82F6', timePeriod = 'all', customDateFrom, customDateTo, maxResults = 10 }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProgressionData();
  }, [distance, timePeriod, customDateFrom, customDateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProgressionData = async () => {
    try {
      setIsLoading(true);
      const progressionData = await firebaseService.getProgressionData(distance, timePeriod, customDateFrom, customDateTo);
      
      // Prepare data for chart
      const sortedData = progressionData.map(pd => {
        let timeInSeconds = pd.time;
        
        // Handle case where time might be formatted string
        if (typeof pd.time === 'string') {
          const timeParts = pd.time.split(':');
          if (timeParts.length === 3) {
            // HH:MM:SS format
            timeInSeconds = parseInt(timeParts[0]) * 3600 + parseInt(timeParts[1]) * 60 + parseInt(timeParts[2]);
          } else if (timeParts.length === 2) {
            // MM:SS format
            timeInSeconds = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
          } else {
            timeInSeconds = parseInt(pd.time);
          }
        }
        
        // Handle Firebase Timestamp objects
        const dateValue = pd.date?.toDate ? pd.date.toDate() : new Date(pd.date);
        
        return {
          x: dateValue,
          y: timeInSeconds / 60 // Convert to minutes for chart
        };
      });
      
      // Limit to maxResults most recent improvements
      const limitedData = sortedData.slice(-maxResults);
      setData(limitedData);
    } catch (error) {
      console.error('Error loading progression data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (minutes) => {
    const totalSeconds = Math.round(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const chartData = {
    datasets: [
      {
        label: `${distance} Progression`,
        data: data,
        borderColor: color,
        backgroundColor: color + '20',
        tension: 0,
        pointRadius: 4,
        pointHoverRadius: 6
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
        text: `${distance} Time Progression`,
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
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            return `Time: ${formatTime(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'month',
          displayFormats: {
            month: 'MMM yyyy'
          }
        },
        title: {
          display: true,
          text: 'Date',
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
      },
      y: {
        title: {
          display: true,
          text: 'Time',
          color: '#e2e8f0',
          font: {
            family: 'Inter, sans-serif',
            weight: '500'
          }
        },
        ticks: {
          color: '#94a3b8',
          callback: (value) => formatTime(value)
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.2)'
        },
        reverse: false, // Faster times at bottom
        min: function(context) {
          // Add 10% padding below the fastest time
          const minValue = Math.min(...context.chart.data.datasets[0].data.map(d => d.y));
          return minValue * 0.9;
        },
        max: function(context) {
          // Add 5% padding above the slowest time
          const maxValue = Math.max(...context.chart.data.datasets[0].data.map(d => d.y));
          return maxValue * 1.05;
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

  if (data.length === 0) {
    return (
      <div className="athletic-card p-6">
        <div className="text-center py-8">
          <p className="text-slate-400">No progression data available for {distance}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="athletic-card p-6">
      <div style={{ height: '300px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default ProgressionGraph;