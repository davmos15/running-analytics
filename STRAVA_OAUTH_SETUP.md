# Strava OAuth Setup for GitHub Pages

## The Problem
GitHub Pages serves your app from a subdirectory (`davmos15.github.io/running-analytics/`), but Strava's OAuth flow has specific requirements:

- **Authorization Callback Domain**: Only accepts domains (no paths/slashes)
- **Actual Redirect**: Must redirect to the full URL path

## Solution

### 1. Strava App Configuration
In your Strava app settings (https://www.strava.com/settings/api):

- **Authorization Callback Domain**: `davmos15.github.io`
- **Description**: This tells Strava that `davmos15.github.io` is an allowed domain

### 2. App Configuration
Your app uses: `https://davmos15.github.io/running-analytics` as the redirect URI

### 3. How it Works
1. User clicks "Authorize" → Strava redirects to `https://davmos15.github.io/running-analytics?code=...`
2. GitHub Pages serves your app from the `/running-analytics` path
3. Your app detects the `code` parameter and exchanges it for a token
4. The URL is cleaned up to remove OAuth parameters

### 4. Environment Variables
```env
# For GitHub Pages deployment
REACT_APP_STRAVA_REDIRECT_URI=https://davmos15.github.io/running-analytics
```

### 5. For Local Development
```env
# For local development
REACT_APP_STRAVA_REDIRECT_URI=http://localhost:3000
```

You can add both domains to your Strava app's callback domain field:
- `localhost` (for development)
- `davmos15.github.io` (for production)

### 6. GitHub Secrets Setup
Add these to your repository's GitHub Actions secrets:

```
REACT_APP_STRAVA_CLIENT_ID=169705
REACT_APP_STRAVA_CLIENT_SECRET=your_secret_here
```

The redirect URI is now hardcoded in the GitHub Actions workflow to use the GitHub Pages URL.