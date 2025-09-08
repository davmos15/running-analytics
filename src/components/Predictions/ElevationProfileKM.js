import React, { useState, useMemo } from 'react';
import { Mountain, TrendingUp } from 'lucide-react';

const ElevationProfileKM = ({ routeData, pacingStrategy }) => {
  const [hoveredKm, setHoveredKm] = useState(null);

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
        
        const elevationGain = Math.max(0, endElev - startElev);
        const elevationLoss = Math.max(0, startElev - endElev);
        const netChange = endElev - startElev;
        const avgGrade = kmDistance > 0 ? (netChange / (kmDistance * 1000)) * 100 : 0;
        
        profile.push({
          km: km + 1,
          startElev,
          endElev,
          maxElev,
          minElev,
          elevationGain,
          elevationLoss,
          netChange,
          avgGrade,
          distance: kmDistance,
          elevations: kmElevations
        });
      }
    }

    return profile;
  }, [routeData]);

  // Calculate max elevation for scaling
  const maxElevation = useMemo(() => {
    if (kmProfile.length === 0) return 100;
    return Math.max(...kmProfile.map(seg => seg.maxElev));
  }, [kmProfile]);

  const minElevation = useMemo(() => {
    if (kmProfile.length === 0) return 0;
    return Math.min(...kmProfile.map(seg => seg.minElev));
  }, [kmProfile]);

  // Generate KM-based pacing strategy
  const kmPacingStrategy = useMemo(() => {
    if (!pacingStrategy || kmProfile.length === 0) {
      return kmProfile.map((seg, idx) => ({
        km: seg.km,
        pace: 300, // Default 5:00/km if no strategy
        paceLabel: '5:00',
        effort: 'Steady'
      }));
    }

    // Base pace from overall strategy
    const basePace = pacingStrategy.reduce((sum, seg) => sum + seg.pace, 0) / pacingStrategy.length;

    return kmProfile.map((seg) => {
      let paceFactor = 1.0;
      let effort = 'Steady';

      // Adjust pace based on elevation grade
      if (seg.avgGrade > 3) {
        paceFactor = 1.10 + (seg.avgGrade - 3) * 0.02; // Slower on steep uphills
        effort = seg.avgGrade > 6 ? 'Hard' : 'Moderate';
      } else if (seg.avgGrade < -3) {
        paceFactor = 0.92 + (Math.abs(seg.avgGrade) - 3) * 0.01; // Controlled on downhills
        effort = 'Controlled';
      } else if (Math.abs(seg.avgGrade) <= 1) {
        effort = 'Steady';
      } else {
        effort = seg.avgGrade > 0 ? 'Moderate' : 'Easy';
      }

      const adjustedPace = basePace * paceFactor;
      const minutes = Math.floor(adjustedPace / 60);
      const seconds = Math.floor(adjustedPace % 60);

      return {
        km: seg.km,
        pace: adjustedPace,
        paceLabel: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        effort,
        grade: seg.avgGrade
      };
    });
  }, [pacingStrategy, kmProfile]);

  const formatElevation = (elev) => Math.round(elev) + 'm';
  const formatGrade = (grade) => {
    const sign = grade >= 0 ? '+' : '';
    return `${sign}${grade.toFixed(1)}%`;
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Mountain className="w-4 h-4 text-blue-400" />
          Elevation Profile by KM
        </h3>
        <div className="text-xs text-slate-400">
          {routeData.elevation_gain}m total gain • {(routeData.distance / 1000).toFixed(1)}km
        </div>
      </div>

      {/* Elevation Chart */}
      <div className="relative mb-4">
        <div className="h-32 flex items-end gap-1 bg-slate-800/30 rounded p-2">
          {kmProfile.map((segment, idx) => {
            const height = ((segment.endElev - minElevation) / (maxElevation - minElevation)) * 100;
            const isHovered = hoveredKm === idx;
            
            return (
              <div
                key={segment.km}
                className="flex-1 relative cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredKm(idx)}
                onMouseLeave={() => setHoveredKm(null)}
              >
                {/* Elevation bar */}
                <div
                  className={`w-full rounded-t transition-all duration-200 ${
                    isHovered ? 'bg-blue-400' : 'bg-blue-500/70'
                  }`}
                  style={{
                    height: `${Math.max(height, 4)}%`,
                    minHeight: '4px'
                  }}
                />
                
                {/* KM label */}
                <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-slate-500">
                  {segment.km}
                </div>

                {/* Grade indicator */}
                {Math.abs(segment.avgGrade) > 2 && (
                  <div className={`absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs px-1 rounded ${
                    segment.avgGrade > 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {formatGrade(segment.avgGrade)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-32 flex flex-col justify-between text-xs text-slate-500 -ml-12">
          <span>{formatElevation(maxElevation)}</span>
          <span>{formatElevation((maxElevation + minElevation) / 2)}</span>
          <span>{formatElevation(minElevation)}</span>
        </div>
      </div>

      {/* Pacing Strategy */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-orange-400" />
          Suggested Pacing Strategy
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {kmPacingStrategy.map((pace, idx) => (
            <div
              key={pace.km}
              className={`p-2 rounded text-xs transition-all ${
                hoveredKm === idx 
                  ? 'bg-blue-600/20 border border-blue-500/30' 
                  : 'bg-slate-800/30 border border-transparent'
              }`}
              onMouseEnter={() => setHoveredKm(idx)}
              onMouseLeave={() => setHoveredKm(null)}
            >
              <div className="flex justify-between items-center">
                <span className="text-slate-400">KM {pace.km}</span>
                <span className={`px-1 rounded text-xs ${
                  pace.effort === 'Hard' ? 'bg-red-600/20 text-red-400' :
                  pace.effort === 'Moderate' ? 'bg-orange-600/20 text-orange-400' :
                  pace.effort === 'Controlled' ? 'bg-green-600/20 text-green-400' :
                  'bg-blue-600/20 text-blue-400'
                }`}>
                  {pace.effort}
                </span>
              </div>
              <div className="text-white font-medium">{pace.paceLabel}/km</div>
              {Math.abs(pace.grade) > 1 && (
                <div className="text-slate-500 text-xs">{formatGrade(pace.grade)} grade</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredKm !== null && (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3">
          <div className="text-sm font-medium text-white mb-2">
            KM {kmProfile[hoveredKm].km} Details
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-slate-400">Elevation Range</div>
              <div className="text-white">
                {formatElevation(kmProfile[hoveredKm].minElev)} - {formatElevation(kmProfile[hoveredKm].maxElev)}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Net Change</div>
              <div className={kmProfile[hoveredKm].netChange >= 0 ? 'text-red-400' : 'text-green-400'}>
                {kmProfile[hoveredKm].netChange >= 0 ? '+' : ''}{Math.round(kmProfile[hoveredKm].netChange)}m
              </div>
            </div>
            <div>
              <div className="text-slate-400">Elevation Gain</div>
              <div className="text-red-400">+{Math.round(kmProfile[hoveredKm].elevationGain)}m</div>
            </div>
            <div>
              <div className="text-slate-400">Elevation Loss</div>
              <div className="text-green-400">-{Math.round(kmProfile[hoveredKm].elevationLoss)}m</div>
            </div>
            <div>
              <div className="text-slate-400">Average Grade</div>
              <div className={kmProfile[hoveredKm].avgGrade >= 0 ? 'text-red-400' : 'text-green-400'}>
                {formatGrade(kmProfile[hoveredKm].avgGrade)}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Suggested Pace</div>
              <div className="text-white">{kmPacingStrategy[hoveredKm].paceLabel}/km</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElevationProfileKM;