import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LayoutRouter from './components/Layout/LayoutRouter';
import ErrorMessage from './components/common/ErrorMessage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useStrava } from './hooks/useStrava';
import './styles/globals.css';

// Lazy load all route components for code splitting - using simple working pattern
const Homepage = lazy(() => import('./components/Homepage/HomepageSimple')); // Simple working homepage
const PersonalBests = lazy(() => import('./components/PersonalBests/PersonalBests'));
const RecentRuns = lazy(() => import('./components/RecentRuns/RecentRuns'));
const Graphs = lazy(() => import('./components/Graphs/Graphs'));
const PredictionsPage = lazy(() => import('./components/Predictions/PredictionsPageSimple')); // Simple working predictions
const TrainingPlanPage = lazy(() => import('./components/TrainingPlan/TrainingPlanPage'));
const Settings = lazy(() => import('./components/Settings/Settings')); // Original working settings

// Ultra-fast loading component for lazy loaded routes
const RouteLoading = () => (
  <div className="mt-6 mx-4">
    <div className="athletic-card-gradient p-6">
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-white">Loading...</span>
      </div>
    </div>
  </div>
);

function AppRouter() {
  const { isAuthenticated, isLoading, error, login } = useStrava();

  // Show fast loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="athletic-card-gradient p-8 text-center">
          <div className="w-12 h-12 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Connecting to Strava...</p>
        </div>
      </div>
    );
  }

  // Show error message if there's an error
  if (error) {
    return <ErrorMessage message={error} onRetry={login} />;
  }

  // Show login screen if not authenticated
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

  // Main app with routing
  return (
    <Router>
      <ErrorBoundary>
        <LayoutRouter>
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              {/* Homepage route */}
              <Route path="/" element={
                <ErrorBoundary>
                  <Homepage />
                </ErrorBoundary>
              } />
              
              {/* Personal Bests route */}
              <Route path="/personal-bests" element={
                <ErrorBoundary>
                  <PersonalBests />
                </ErrorBoundary>
              } />
              
              {/* Recent Runs route */}
              <Route path="/recent-runs" element={
                <ErrorBoundary>
                  <RecentRuns />
                </ErrorBoundary>
              } />
              
              {/* Graphs route */}
              <Route path="/graphs" element={
                <ErrorBoundary>
                  <Graphs />
                </ErrorBoundary>
              } />
              
              {/* Predictions route */}
              <Route path="/predictions" element={
                <ErrorBoundary>
                  <PredictionsPage />
                </ErrorBoundary>
              } />
              
              {/* Training Plan route */}
              <Route path="/training-plan" element={
                <ErrorBoundary>
                  <TrainingPlanPage />
                </ErrorBoundary>
              } />
              
              {/* Settings route */}
              <Route path="/settings" element={
                <ErrorBoundary>
                  <Settings />
                </ErrorBoundary>
              } />
              
              {/* Redirect any unknown routes to homepage */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </LayoutRouter>
      </ErrorBoundary>
    </Router>
  );
}

export default AppRouter;