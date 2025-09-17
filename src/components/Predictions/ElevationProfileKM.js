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
          <svg className="w-full h-32" viewBox="0 0 400 128" preserveAspectRatio="none">
            <defs>
              <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            
            {/* Area chart */}
            <path
              d={(() => {
                if (kmProfile.length === 0) return '';
                
                const width = 400;
                const height = 128;
                const padding = 10;
                const chartWidth = width - (padding * 2);
                const chartHeight = height - (padding * 2);
                
                // Get min and max elevations for proper scaling
                const allElevations = kmProfile.flatMap(seg => seg.elevations);
                const minElev = Math.min(...allElevations);
                const maxElev = Math.max(...allElevations);
                const elevRange = maxElev - minElev || 1;
                
                // Create path points
                const points = [];
                kmProfile.forEach((segment, segIdx) => {
                  const segmentElevations = segment.elevations;
                  const segmentWidth = chartWidth / kmProfile.length;
                  const segmentStartX = padding + (segIdx * segmentWidth);
                  
                  segmentElevations.forEach((elev, elevIdx) => {
                    const x = segmentStartX + (elevIdx / (segmentElevations.length - 1)) * segmentWidth;
                    const y = padding + chartHeight - ((elev - minElev) / elevRange) * chartHeight;
                    points.push({ x, y });
                  });
                });
                
                // Build path string
                let pathString = `M ${points[0].x} ${points[0].y}`;
                for (let i = 1; i < points.length; i++) {
                  pathString += ` L ${points[i].x} ${points[i].y}`;
                }
                
                // Close the area to the bottom
                pathString += ` L ${points[points.length - 1].x} ${height - padding}`;
                pathString += ` L ${points[0].x} ${height - padding}`;
                pathString += ' Z';
                
                return pathString;
              })()}
              fill="url(#elevationGradient)"
              className="opacity-80"
            />
            
            {/* Line chart */}
            <path
              d={(() => {
                if (kmProfile.length === 0) return '';
                
                const width = 400;
                const height = 128;
                const padding = 10;
                const chartWidth = width - (padding * 2);
                const chartHeight = height - (padding * 2);
                
                // Get min and max elevations for proper scaling
                const allElevations = kmProfile.flatMap(seg => seg.elevations);
                const minElev = Math.min(...allElevations);
                const maxElev = Math.max(...allElevations);
                const elevRange = maxElev - minElev || 1;
                
                // Create path points
                const points = [];
                kmProfile.forEach((segment, segIdx) => {
                  const segmentElevations = segment.elevations;
                  const segmentWidth = chartWidth / kmProfile.length;
                  const segmentStartX = padding + (segIdx * segmentWidth);
                  
                  segmentElevations.forEach((elev, elevIdx) => {
                    const x = segmentStartX + (elevIdx / (segmentElevations.length - 1)) * segmentWidth;
                    const y = padding + chartHeight - ((elev - minElev) / elevRange) * chartHeight;
                    points.push({ x, y });
                  });
                });
                
                // Build path string
                let pathString = `M ${points[0].x} ${points[0].y}`;
                for (let i = 1; i < points.length; i++) {
                  pathString += ` L ${points[i].x} ${points[i].y}`;
                }
                
                return pathString;
              })()}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              className="opacity-90"
            />
            
            {/* KM markers and hover areas */}
            {kmProfile.map((segment, idx) => {
              const width = 400;
              const padding = 10;
              const chartWidth = width - (padding * 2);
              const x = padding + (idx * chartWidth / kmProfile.length) + (chartWidth / kmProfile.length / 2);
              
              return (
                <g key={segment.km}>
                  {/* Vertical line at each KM */}
                  <line
                    x1={x}
                    y1={padding}
                    x2={x}
                    y2={128 - padding}
                    stroke="#475569"
                    strokeWidth="1"
                    opacity="0.3"
                  />
                  
                  {/* Invisible hover area */}
                  <rect
                    x={padding + (idx * chartWidth / kmProfile.length)}
                    y={0}
                    width={chartWidth / kmProfile.length}
                    height={128}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseMove={(e) => handleMouseMove(e, idx)}
                    onMouseLeave={() => setHoveredKm(null)}
                  />
                </g>
              );
            })}
          </svg>
          
          {/* X-axis labels */}
          <div className="flex justify-between mt-2 px-2">
            {kmProfile.map((segment) => (
              <div key={segment.km} className="text-xs text-slate-500 flex-1 text-center">
                {segment.km}
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-500 text-center mt-1">Kilometer</div>
        </div>
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