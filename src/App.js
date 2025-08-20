import React, { useState } from 'react';
import Layout from './components/Layout/Layout';
import HomepageLite from './components/Homepage/HomepageLite';
import PersonalBests from './components/PersonalBests/PersonalBests';
import RecentRuns from './components/RecentRuns/RecentRuns';
import Settings from './components/Settings/Settings';
import Graphs from './components/Graphs/Graphs';
import PredictionsPage from './components/Predictions/PredictionsPage';
import TrainingPlanPage from './components/TrainingPlan/TrainingPlanPage';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useStrava } from './hooks/useStrava';
import './styles/globals.css';

function App() {
  const [activeTab, setActiveTab] = useState('homepage');
  const { isAuthenticated, isLoading, error, login } = useStrava();

  // Debug function to track state changes
  const debugSetActiveTab = (newTab) => {
    console.log('App.js: setActiveTab called with:', newTab);
    console.log('App.js: Current activeTab:', activeTab);
    try {
      setActiveTab(newTab);
      console.log('App.js: setActiveTab completed successfully');
    } catch (err) {
      console.error('App.js: Error setting active tab:', err);
    }
  };
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
    <ErrorBoundary>
      <Layout activeTab={activeTab} setActiveTab={debugSetActiveTab}>
        {activeTab === 'homepage' && <HomepageLite />}
        {activeTab === 'personal-bests' && (
          <ErrorBoundary>
            <PersonalBests />
          </ErrorBoundary>
        )}
        {activeTab === 'recent-runs' && (
          <ErrorBoundary>
            <RecentRuns />
          </ErrorBoundary>
        )}
        {activeTab === 'graphs' && (
          <ErrorBoundary>
            <Graphs />
          </ErrorBoundary>
        )}
        {activeTab === 'predictions' && (
          <ErrorBoundary>
            <PredictionsPage />
          </ErrorBoundary>
        )}
        {activeTab === 'training-plan' && (
          <ErrorBoundary>
            <TrainingPlanPage />
          </ErrorBoundary>
        )}
        {activeTab === 'settings' && (
          <ErrorBoundary>
            <Settings />
          </ErrorBoundary>
        )}
      </Layout>
    </ErrorBoundary>
  );
}

export default App;