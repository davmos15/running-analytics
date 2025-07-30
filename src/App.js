import React, { useState } from 'react';
import Layout from './components/Layout/Layout';
import PersonalBests from './components/PersonalBests/PersonalBests';
import RecentRuns from './components/RecentRuns/RecentRuns';
import Settings from './components/Settings/Settings';
import Graphs from './components/Graphs/Graphs';
import PredictionsPage from './components/Predictions/PredictionsPage';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import { useStrava } from './hooks/useStrava';
import './styles/globals.css';

function App() {
  const [activeTab, setActiveTab] = useState('personal-bests');
  const { isAuthenticated, isLoading, error, login } = useStrava();
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={login} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="athletic-card-gradient p-8 text-center max-w-md">
          <h1 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Athletic Performance Hub
          </h1>
          <p className="text-slate-300 mb-6">
            Connect with Strava to unlock your running potential
          </p>
          <button
            onClick={login}
            className="athletic-button-primary text-white px-8 py-3 rounded-lg font-semibold text-lg"
          >
            Connect with Strava
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'personal-bests' && <PersonalBests />}
      {activeTab === 'recent-runs' && <RecentRuns />}
      {activeTab === 'graphs' && <Graphs />}
      {activeTab === 'predictions' && <PredictionsPage />}
      {activeTab === 'settings' && <Settings />}
    </Layout>
  );
}

export default App;