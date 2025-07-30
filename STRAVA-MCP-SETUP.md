# Strava MCP Setup Guide

This project now includes support for Strava MCP (Model Context Protocol) integration, which allows AI assistants to directly access your Strava data.

## What is Strava MCP?

The Strava MCP server provides tools that allow AI assistants (like Claude) to:
- Get your recent activities
- Fetch activities by date range  
- Get detailed activity information
- Access activity streams (power, heart rate, etc.)
- Perform professional cycling coach analysis

## Setup Instructions

### 1. Create a Strava API Application

1. Go to https://www.strava.com/settings/api
2. Click "Create & Manage Your App"
3. Fill in the application details:
   - Application Name: "Running Analytics MCP"
   - Category: "Data Importer"
   - Club: Leave blank
   - Website: Your website or GitHub repo
   - Authorization Callback Domain: `localhost`
4. Click "Create"
5. Note your Client ID and Client Secret

### 2. Get a Refresh Token

You'll need to get a refresh token using OAuth. Here's a simple way:

1. Install the Strava MCP package globally:
   ```bash
   npm install -g @r-huijts/strava-mcp
   ```

2. Run the token generation script:
   ```bash
   strava-mcp-token --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET
   ```

3. Follow the OAuth flow in your browser
4. Copy the refresh token that's generated

### 3. Configure Environment Variables

Create a `.env` file in the project root with:

```env
STRAVA_CLIENT_ID=your_client_id_here
STRAVA_CLIENT_SECRET=your_client_secret_here  
STRAVA_REFRESH_TOKEN=your_refresh_token_here
```

### 4. Update MCP Configuration

The `mcp-config.json` file has been created with the Strava server configuration. Update it with your credentials or use environment variables.

## Available MCP Tools

Once configured, the following tools will be available to AI assistants:

- `get_activities(limit)` - Get recent activities
- `get_activities_by_date_range(start_date, end_date, limit)` - Get activities in date range
- `get_activity_by_id(activity_id)` - Get detailed activity info
- `get_recent_activities(days, limit)` - Get activities from past X days

## Usage with Claude Code

With the MCP server running, you can ask Claude to:
- "Show me my activities from last week"
- "What was my fastest 5K this month?"
- "Analyze my running performance trends"
- "Compare my recent runs to my personal bests"

The MCP integration provides a more direct and real-time connection to your Strava data compared to the current Firebase-based approach.

## Troubleshooting

- Make sure your Strava app has the correct callback domain (`localhost`)
- Ensure your refresh token hasn't expired
- Check that all environment variables are set correctly
- Verify the MCP server is running with `npx @r-huijts/strava-mcp`