import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Calendar, Database } from 'lucide-react';
import firebaseService from '../../services/firebaseService';

const Settings = () => {
  const [dateFormat, setDateFormat] = useState('DD MMM YYYY');
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedDateFormat = localStorage.getItem('dateFormat');
    if (savedDateFormat) {
      setDateFormat(savedDateFormat);
    }
  }, []);

  const handleDateFormatChange = (format) => {
    setDateFormat(format);
    localStorage.setItem('dateFormat', format);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleReprocessActivities = async () => {
    if (window.confirm('This will reprocess all your activities to create segments for all distances. This may take a few minutes. Continue?')) {
      setIsReprocessing(true);
      try {
        await firebaseService.reprocessAllActivitiesForSegments();
        alert('Activities reprocessed successfully!');
      } catch (error) {
        alert('Error reprocessing activities: ' + error.message);
      } finally {
        setIsReprocessing(false);
      }
    }
  };

  const dateFormatOptions = [
    { value: 'DD MMM YYYY', label: '28 Jan 2025' },
    { value: 'MM/DD/YYYY', label: '01/28/2025' },
    { value: 'DD/MM/YYYY', label: '28/01/2025' },
    { value: 'YYYY-MM-DD', label: '2025-01-28' },
    { value: 'MMM DD, YYYY', label: 'Jan 28, 2025' },
    { value: 'DD.MM.YYYY', label: '28.12.2025' }
  ];

  return (
    <div className="mt-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-4">
          <SettingsIcon className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-medium text-gray-900">Settings</h2>
        </div>

        {showSuccessMessage && (
          <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg">
            Settings saved successfully!
          </div>
        )}

        {/* Date Format Settings */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-500" />
            <h3 className="text-md font-medium text-gray-900">Date Format</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Choose how dates are displayed throughout the application
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dateFormatOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                  dateFormat === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="dateFormat"
                  value={option.value}
                  checked={dateFormat === option.value}
                  onChange={() => handleDateFormatChange(option.value)}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {option.value}
                  </div>
                </div>
                {dateFormat === option.value && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Data Management */}
        <div className="border-t pt-6">
          <div className="flex items-center space-x-2 mb-3">
            <Database className="w-4 h-4 text-gray-500" />
            <h3 className="text-md font-medium text-gray-900">Data Management</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Generate Segments for All Distances
              </h4>
              <p className="text-sm text-gray-500 mb-3">
                Process all your activities to create segments for every supported distance (100m to Marathon).
                This is useful if you're missing data for shorter distances.
              </p>
              <button
                onClick={handleReprocessActivities}
                disabled={isReprocessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {isReprocessing ? 'Processing...' : 'Reprocess All Activities'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;