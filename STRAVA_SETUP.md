# Strava App Configuration

To fix the redirect issue, you need to update your Strava app settings:

## Steps to Configure Strava App

1. **Go to Strava Settings**
   - Visit: https://www.strava.com/settings/api
   - Find your application or create a new one

2. **Update Authorization Callback Domain**
   - Change from: `localhost`
   - Change to: `davmos15.github.io`

3. **Update the full callback URL in your app**
   - Add this URL to your Strava app's callback URLs:
   ```
   https://davmos15.github.io/running-analytics/auth/callback
   ```

4. **For Local Development**
   - Keep `http://localhost:3000/auth/callback` as an additional callback URL
   - This allows you to test locally while developing

5. **Create a `.env` file** (for local use only)
   ```bash
   cp .env.example .env
   ```
   Then update it with your actual Strava credentials and use the production redirect URI:
   ```
   REACT_APP_STRAVA_CLIENT_ID=your_actual_client_id
   REACT_APP_STRAVA_CLIENT_SECRET=your_actual_client_secret
   REACT_APP_STRAVA_REDIRECT_URI=https://davmos15.github.io/running-analytics/auth/callback
   ```

## GitHub Pages Deployment with Environment Variables

Since GitHub Pages doesn't support environment variables, you have two options:

### Option 1: Use GitHub Secrets (Recommended)
1. Go to your repository settings on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Add your Strava credentials as secrets
4. Use GitHub Actions to build and deploy with these secrets

### Option 2: Create a production config file
Create a separate config file for production that you can safely commit (without secrets).

## Important Security Note
Never commit your actual Strava Client Secret to GitHub. The client secret should only be used in a secure backend environment.