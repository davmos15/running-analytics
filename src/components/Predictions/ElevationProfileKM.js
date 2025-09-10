import React, { useState, useMemo } from 'react';
import { Mountain } from 'lucide-react';

const ElevationProfileKM = ({ routeData }) => {
  const [hoveredKm, setHoveredKm] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Generate KM-based elevation profile
  const kmProfile = useMemo(() => {
    if (!routeData.elevation_profile || routeData.elevation_profile.length === 0) {
      return [];
    }

    const distance = routeData.distance / 1000; // Convert to KM
    const elevationProfile = routeData.elevation_profile;
    const kmCount = Math.ceil(distance);
    const profile = [];

    // Create KM segments
    for (let km = 0; km < kmCount; km++) {
      const isLastKm = km === kmCount - 1;
      const kmDistance = isLastKm ? distance - km : 1; // Handle partial last KM
      
      // Calculate elevation points for this KM
      const startIdx = Math.floor((km / distance) * elevationProfile.length);
      const endIdx = isLastKm ? 
        elevationProfile.length - 1 : 
        Math.floor(((km + 1) / distance) * elevationProfile.length);
      
      const kmElevations = elevationProfile.slice(startIdx, endIdx + 1);
      
      if (kmElevations.length > 0) {
        const startElev = kmElevations[0];
        const endElev = kmElevations[kmElevations.length - 1];
        const maxElev = Math.max(...kmElevations);
        const minElev = Math.min(...kmElevations);
        
        // Calculate total elevation gain for this KM (considering all ups and downs)
        let totalGain = 0;
        let totalLoss = 0;
        for (let i = 1; i < kmElevations.length; i++) {
          const diff = kmElevations[i] - kmElevations[i-1];
          if (diff > 0) {
            totalGain += diff;
          } else {
            totalLoss += Math.abs(diff);
          }
        }
        
        const netChange = endElev - startElev;
        const avgGrade = kmDistance > 0 ? (netChange / (kmDistance * 1000)) * 100 : 0;
        
        profile.push({
          km: km + 1,
          startElev,
          endElev,
          maxElev,
          minElev,
          elevationGain: totalGain,
          elevationLoss: totalLoss,
          netChange,
          avgGrade,
          distance: kmDistance,
          elevations: kmElevations
        });
      }
    }

    return profile;
  }, [routeData]);

  // Calculate max absolute change for scaling (can be positive or negative)
  const maxAbsChange = useMemo(() => {
    if (kmProfile.length === 0) return 10;
    const allChanges = kmProfile.map(seg => Math.abs(seg.netChange));
    return Math.max(...allChanges, 10);
  }, [kmProfile]);


  const formatGrade = (grade) => {
    const sign = grade >= 0 ? '+' : '';
    return `${sign}${grade.toFixed(1)}%`;
  };

  const handleMouseMove = (e, idx) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: rect.left + rect.width / 2, y: rect.top });
    setHoveredKm(idx);
  };

  if (kmProfile.length === 0) {
    return (
      <div className="p-4 bg-slate-900/50 rounded-lg">
        <div className="text-sm text-slate-500">No elevation profile data available</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 rounded-lg p-4">
      {/* Elevation Profile */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Mountain className="w-4 h-4 text-slate-400" />
            Elevation Profile
          </h3>
          <div className="text-xs text-slate-400">
            {routeData.elevation_gain}m gain • {(routeData.distance / 1000).toFixed(1)}km
          </div>
        </div>
        
        <div className="relative">
          <div className="h-32 flex items-center gap-1">
            {kmProfile.map((segment, idx) => {
              const isUphill = segment.netChange >= 0;
              const height = (Math.abs(segment.netChange) / maxAbsChange) * 50; // 50% max height for scaling
              
              return (
                <div
                  key={segment.km}
                  className="flex-1 relative h-full flex items-center"
                  onMouseMove={(e) => handleMouseMove(e, idx)}
                  onMouseLeave={() => setHoveredKm(null)}
                >
                  <div className="w-full relative h-full flex items-center justify-center">
                    {/* Center line */}
                    <div className="absolute w-full h-px bg-slate-700" style={{ top: '50%' }} />
                    
                    {/* Bar - uphill goes up, downhill goes down */}
                    <div
                      className="w-full bg-slate-600 cursor-pointer hover:bg-slate-500 transition-colors absolute"
                      style={{
                        height: `${Math.max(height, 3)}%`,
                        minHeight: '3px',
                        [isUphill ? 'bottom' : 'top']: '50%',
                        borderRadius: isUphill ? '4px 4px 0 0' : '0 0 4px 4px'
                      }}
                    />
                    
                    {/* Value label */}
                    <div 
                      className="absolute left-1/2 transform -translate-x-1/2 text-xs text-slate-400"
                      style={{ [isUphill ? 'bottom' : 'top']: `${50 + Math.min(height, 40)}%` }}
                    >
                      {segment.netChange >= 0 ? '+' : ''}{Math.round(segment.netChange)}m
                    </div>
                  </div>
                  
                  {/* KM label */}
                  <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-slate-500">
                    {segment.km}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-xs text-slate-500 text-center mt-6">Kilometer</div>
        </div>

      {/* Hover Tooltip */}
      {hoveredKm !== null && (
        <div 
          className="fixed z-50 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg p-2 pointer-events-none"
          style={{
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y - 80}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="text-xs text-white space-y-1">
            <div>KM {kmProfile[hoveredKm].km}</div>
            <div>Net change: {kmProfile[hoveredKm].netChange >= 0 ? '+' : ''}{Math.round(kmProfile[hoveredKm].netChange)}m</div>
            <div>Grade: {formatGrade(kmProfile[hoveredKm].avgGrade)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElevationProfileKM;