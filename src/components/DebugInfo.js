import React from 'react';

const DebugInfo = () => {
  // Always show for now to debug the production issue
  const showDebug = true;
  
  if (!showDebug) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      right: 0, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>Debug Info:</h4>
      <p><strong>Client ID:</strong> {process.env.REACT_APP_STRAVA_CLIENT_ID || 'NOT SET'}</p>
      <p><strong>Redirect URI:</strong> {process.env.REACT_APP_STRAVA_REDIRECT_URI || 'NOT SET'}</p>
      <p><strong>Has Secret:</strong> {process.env.REACT_APP_STRAVA_CLIENT_SECRET ? 'YES' : 'NO'}</p>
      <p><strong>Node Env:</strong> {process.env.NODE_ENV}</p>
    </div>
  );
};

export default DebugInfo;