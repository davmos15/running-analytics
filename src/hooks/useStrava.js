import { useState, useEffect } from 'react';
import stravaApi from '../services/stravaApi';

export const useStrava = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [athlete, setAthlete] = useState(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        if (stravaApi.isAuthenticated()) {
          const athleteData = await stravaApi.getAthlete();
          setAthlete(athleteData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setError('Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };

    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        try {
          setIsLoading(true);
          await stravaApi.exchangeToken(code);
          window.history.replaceState({}, document.title, "/");
          await checkAuthentication();
        } catch (error) {
          setError('Failed to authenticate with Strava');
          setIsLoading(false);
        }
      }
    };

    checkAuthentication();
    handleAuthCallback();
  }, []);

  const login = () => {
    window.location.href = stravaApi.getAuthURL();
  };

  const logout = () => {
    stravaApi.logout();
    setIsAuthenticated(false);
    setAthlete(null);
  };

  return {
    isAuthenticated,
    isLoading,
    error,
    athlete,
    login,
    logout
  };
};