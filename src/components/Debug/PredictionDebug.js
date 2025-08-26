import React, { useState } from 'react';
import debugPredictionService from '../../services/predictionServiceDebug';

const PredictionDebug = () => {
  const [debugResult, setDebugResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDebug = async () => {
    setIsLoading(true);
    console.log('🔧 Starting prediction debug...');
    
    try {
      const result = await debugPredictionService.debugPredictions(16, [], 30);
      setDebugResult(result);
      console.log('🔧 Debug completed:', result);
    } catch (error) {
      console.error('🔧 Debug failed:', error);
      setDebugResult({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6 mx-4">
      <div className="athletic-card p-6">
        <h2 className="text-xl font-bold text-white mb-4">Prediction Debug Tool</h2>
        
        <button
          onClick={runDebug}
          disabled={isLoading}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-600"
        >
          {isLoading ? 'Running Debug...' : 'Run Enhanced Prediction Debug'}
        </button>

        {debugResult && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-slate-800 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-2">Debug Results</h3>
              
              {debugResult.success ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-green-400">✅ Debug Successful</h4>
                  </div>
                  
                  {debugResult.enduranceParams && (
                    <div>
                      <h4 className="font-medium text-white">Endurance Parameters:</h4>
                      <pre className="text-sm text-slate-300 mt-1 overflow-x-auto">
                        {JSON.stringify(debugResult.enduranceParams, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {debugResult.testPrediction && (
                    <div>
                      <h4 className="font-medium text-white">5K Test Prediction:</h4>
                      <pre className="text-sm text-slate-300 mt-1 overflow-x-auto">
                        {JSON.stringify(debugResult.testPrediction, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {debugResult.dataQuality && (
                    <div>
                      <h4 className="font-medium text-white">Data Quality:</h4>
                      <pre className="text-sm text-slate-300 mt-1 overflow-x-auto">
                        {JSON.stringify(debugResult.dataQuality, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h4 className="font-medium text-red-400">❌ Debug Failed</h4>
                  <p className="text-red-300 mt-1">{debugResult.error}</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-800 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-2">Console Output</h3>
              <p className="text-sm text-slate-400">Check browser console for detailed logs</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionDebug;