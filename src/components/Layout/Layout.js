import React from 'react';
import Navigation from './Navigation';

const Layout = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 md:pb-6">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        {children}
      </div>
    </div>
  );
};

export default Layout;