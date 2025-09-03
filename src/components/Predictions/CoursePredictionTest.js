import React from 'react';

const CoursePredictionTest = () => {
  console.log('🚨 COURSE PREDICTION TEST COMPONENT MOUNTED 🚨');
  
  return (
    <div style={{ 
      backgroundColor: 'red', 
      color: 'white', 
      padding: '20px', 
      margin: '20px',
      fontSize: '24px',
      fontWeight: 'bold',
      border: '5px solid yellow'
    }}>
      ⚠️ COURSE PREDICTION TEST - IF YOU SEE THIS, THE COMPONENT IS RENDERING ⚠️
    </div>
  );
};

export default CoursePredictionTest;