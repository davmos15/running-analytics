import axios from 'axios';

const STRAVA_BASE_URL = 'https://www.strava.com/api/v3';

class StravaAPI {
  constructor() {
    this.accessToken = localStorage.getItem('strava_access_token');
    this.refreshToken = localStorage.getItem('strava_refresh_token');
    
    this.api = axios.create({
      baseURL: STRAVA_BASE_URL,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    // Add response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.refreshAccessToken();
          return this.api.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  // OAuth Methods
  getAuthURL() {
    const clientId = process.env.REACT_APP_STRAVA_CLIENT_ID;
    const redirectUri = process.env.REACT_APP_STRAVA_REDIRECT_URI;
    const scope = 'read,activity:read_all';
    
    return `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;
  }

  async exchangeToken(code) {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: process.env.REACT_APP_STRAVA_CLIENT_ID,
        client_secret: process.env.REACT_APP_STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code'
      });

      const { access_token, refresh_token, athlete } = response.data;
      
      localStorage.setItem('strava_access_token', access_token);
      localStorage.setItem('strava_refresh_token', refresh_token);
      localStorage.setItem('strava_athlete', JSON.stringify(athlete));
      
      this.accessToken = access_token;
      this.refreshToken = refresh_token;
      
      return response.data;
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw error;
    }
  }

  async refreshAccessToken() {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: process.env.REACT_APP_STRAVA_CLIENT_ID,
        client_secret: process.env.REACT_APP_STRAVA_CLIENT_SECRET,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token'
      });

      const { access_token, refresh_token } = response.data;
      
      localStorage.setItem('strava_access_token', access_token);
      localStorage.setItem('strava_refresh_token', refresh_token);
      
      this.accessToken = access_token;
      this.refreshToken = refresh_token;
      
      return response.data;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      throw error;
    }
  }

  // API Methods
  async getAthlete() {
    try {
      const response = await this.api.get('/athlete');
      return response.data;
    } catch (error) {
      console.error('Failed to get athlete:', error);
      throw error;
    }
  }

  async getActivities(page = 1, perPage = 30) {
    try {
      const response = await this.api.get('/athlete/activities', {
        params: {
          page,
          per_page: perPage
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get activities:', error);
      throw error;
    }
  }

  async getActivityById(id) {
    try {
      const response = await this.api.get(`/activities/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get activity:', error);
      throw error;
    }
  }

  async getActivityStreams(id, keys = ['time', 'distance', 'latlng', 'altitude']) {
    try {
      const response = await this.api.get(`/activities/${id}/streams`, {
        params: {
          keys: keys.join(','),
          key_by_type: true
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get activity streams:', error);
      throw error;
    }
  }

  // Utility Methods
  isAuthenticated() {
    return !!this.accessToken;
  }

  logout() {
    localStorage.removeItem('strava_access_token');
    localStorage.removeItem('strava_refresh_token');
    localStorage.removeItem('strava_athlete');
    this.accessToken = null;
    this.refreshToken = null;
  }
}

export default new StravaAPI();