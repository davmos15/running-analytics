import React, { useState, useEffect } from 'react';
import { Bar, Column } from 'react-chartjs-2';
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
import { DISTANCES, DISTANCE_METERS } from '../../utils/constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const DistanceThresholdGraph = ({ 
  color = '#f97316', 
  timePeriod = 'all', 
  customDateFrom, 
  customDateTo,
  chartType = 'bar',
  visibleDistances = null 
}) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableDistances, setAvailableDistances] = useState([]);

  useEffect(() => {
    loadDistanceData();
  }, [timePeriod, customDateFrom, customDateTo]);

  const loadDistanceData = async () => {
    try {
      setIsLoading(true);
      
      // Get all activities
      const activities = await firebaseService.getActivities(timePeriod, customDateFrom, customDateTo);
      
      // Filter running activities
      const runningActivities = activities.filter(activity => 
        ['Run', 'TrailRun'].includes(activity.type)
      );

      // Get available distances including custom ones
      const customDistances = localStorage.getItem('customDistances');
      let allDistances = DISTANCES.filter(d => d !== 'Custom');
      
      if (customDistances) {
        const custom = JSON.parse(customDistances);
        allDistances = [...allDistances, ...custom.map(d => d.label)];
      }
      
      setAvailableDistances(allDistances);

      // Count runs that exceed each distance threshold
      const distanceCounts = {};
      
      allDistances.forEach(distanceLabel => {
        const meters = DISTANCE_METERS[distanceLabel] || 
          (customDistances && JSON.parse(customDistances).find(d => d.label === distanceLabel)?.meters);
        
        if (meters) {
          // Count how many runs exceed this distance
          const count = runningActivities.filter(activity => 
            activity.distance >= meters
          ).length;
          
          distanceCounts[distanceLabel] = count;
        }
      });

      // Sort by distance meters
      const sortedData = Object.entries(distanceCounts)
        .sort((a, b) => {
          const aMeters = DISTANCE_METERS[a[0]] || 
            (customDistances && JSON.parse(customDistances).find(d => d.label === a[0])?.meters) || 0;
          const bMeters = DISTANCE_METERS[b[0]] || 
            (customDistances && JSON.parse(customDistances).find(d => d.label === b[0])?.meters) || 0;
          return aMeters - bMeters;
        });

      setData(sortedData);
    } catch (error) {
      console.error('Error loading distance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = visibleDistances 
    ? data.filter(([distance]) => visibleDistances.includes(distance))
    : data;

  const chartData = {
    labels: filteredData.map(([distance]) => distance),
    datasets: [
      {
        label: 'Number of Runs',
        data: filteredData.map(([, count]) => count),
        backgroundColor: color + '80',
        borderColor: color,
        borderWidth: 2,
        borderRadius: 4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: chartType === 'bar' ? 'x' : 'y',
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Runs Exceeding Distance Thresholds',
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
            const distance = context.label;
            const count = context.parsed[chartType === 'bar' ? 'y' : 'x'];
            return `${count} runs ≥ ${distance}`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: chartType === 'bar',
          text: 'Distance',
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
          text: chartType === 'bar' ? 'Number of Runs' : 'Distance',
          color: '#e2e8f0',
          font: {
            family: 'Inter, sans-serif',
            weight: '500'
          }
        },
        ticks: {
          color: '#94a3b8',
          stepSize: 1
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.2)'
        },
        beginAtZero: true
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

  if (filteredData.length === 0) {
    return (
      <div className="athletic-card p-6">
        <div className="text-center py-8">
          <p className="text-slate-400">No distance data available for the selected period</p>
        </div>
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

export default DistanceThresholdGraph;