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

const ProgressionGraph = ({ distance, color = '#3B82F6', timePeriod = 'all' }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProgressionData();
  }, [distance, timePeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProgressionData = async () => {
    try {
      setIsLoading(true);
      const personalBests = await firebaseService.getPersonalBests(distance, timePeriod);
      
      // Sort by date and prepare data for chart
      const sortedData = personalBests
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(pb => ({
          x: new Date(pb.date),
          y: pb.time / 60 // Convert to minutes
        }));
      
      setData(sortedData);
    } catch (error) {
      console.error('Error loading progression data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (minutes) => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const chartData = {
    datasets: [
      {
        label: `${distance} Progression`,
        data: data,
        borderColor: color,
        backgroundColor: color + '20',
        tension: 0.4,
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
          size: 16
        }
      },
      tooltip: {
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
          text: 'Date'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Time (minutes)'
        },
        ticks: {
          callback: (value) => formatTime(value)
        },
        reverse: true // Lower times (better performance) at the top
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
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default ProgressionGraph;