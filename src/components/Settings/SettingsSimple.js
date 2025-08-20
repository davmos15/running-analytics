import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const SettingsSimple = () => {
  return (
    <div className="mt-6 space-y-6 mx-4">
      <div className="athletic-card-gradient p-6">
        <div className="flex items-center space-x-2 mb-4">
          <SettingsIcon className="w-5 h-5 text-orange-400" />
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Settings (Simple Test)
          </h2>
        </div>
        
        <p className="text-white">
          This is a simple settings page to test if the issue is with imports or complex logic.
        </p>
        
        <div className="mt-4 p-4 bg-green-500/20 text-green-300 rounded-lg">
          ✅ If you can see this, the Settings navigation works and the issue is in the full Settings component.
        </div>
      </div>
    </div>
  );
};

export default SettingsSimple;