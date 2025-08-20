import React from 'react';
import NavigationRouter from './NavigationRouter';

const LayoutRouter = ({ children }) => {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 md:pb-6">
        <NavigationRouter />
        {children}
      </div>
    </div>
  );
};

export default LayoutRouter;