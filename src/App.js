import React, { useState } from 'react';
import Layout from './components/Layout/Layout';
import PersonalBests from './components/PersonalBests/PersonalBests';
import RecentRuns from './components/RecentRuns/RecentRuns';
import SyncButton from './components/SyncButton/SyncButton';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import { useStrava } from './hooks/useStrava';
import './styles/globals.css';

function App() {
  const [activeTab, setActiveTab] = useState('personal-bests');
  const { isAuthenticated, isLoading, error, login } = useStrava();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={login} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Running Analytics
          </h1>
          <p className="text-gray-600 mb-6">
            Connect with Strava to analyze your running performance
          </p>
          <button
            onClick={login}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Connect with Strava
          </button>
        </div>
      </div>
    );
  }

  const handleSyncComplete = () => {
    // Trigger a refresh of data
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="mb-6">
        <SyncButton onSyncComplete={handleSyncComplete} />  
      </div>
      
      {activeTab === 'personal-bests' && <PersonalBests key={refreshTrigger} />}
      {activeTab === 'recent-runs' && <RecentRuns key={refreshTrigger} />}
    </Layout>
  );
}

export default App;