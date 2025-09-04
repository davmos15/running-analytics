import React, { useState, useEffect } from 'react';
import { MapPin, Mountain, Trash2, Plus, ExternalLink, TrendingUp, Info } from 'lucide-react';
import stravaRouteService from '../../services/stravaRouteService';
import predictionServiceEnhanced from '../../services/predictionServiceEnhanced';
import firebaseService from '../../services/firebaseService';

const CoursePrediction = () => {
  const [courses, setCourses] = useState([]);
  const [newRouteUrl, setNewRouteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualRoute, setManualRoute] = useState({
    name: '',
    distance: '',
    elevationGain: ''
  });

  useEffect(() => {
    loadSavedCourses();
  }, []);

  const loadSavedCourses = async () => {
    try {
      const savedCourses = await firebaseService.getSavedCourses();
      setCourses(savedCourses || []);
    } catch (err) {
      console.error('Error loading saved courses:', err);
    }
  };

  const handleAddCourse = async () => {
    if (!newRouteUrl) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Extract route/segment ID from URL
      const routeInfo = stravaRouteService.extractRouteId(newRouteUrl);
      if (!routeInfo) {
        throw new Error('Invalid Strava route or segment URL');
      }

      // Check if course already exists
      if (courses.some(c => c.routeId === routeInfo.id)) {
        throw new Error('This course has already been added');
      }

      // Fetch route details from Strava
      const routeData = await stravaRouteService.fetchRouteDetails(routeInfo);
      
      // Generate course-specific prediction
      const prediction = await predictionServiceEnhanced.generateCoursePrediction(routeData);
      
      const newCourse = {
        id: Date.now().toString(),
        routeId: routeInfo.id,
        routeType: routeInfo.type,
        url: newRouteUrl,
        name: routeData.name,
        distance: routeData.distance,
        elevationGain: routeData.elevation_gain,
        elevationProfile: routeData.elevation_profile,
        prediction,
        addedAt: new Date().toISOString()
      };

      const updatedCourses = [...courses, newCourse];
      setCourses(updatedCourses);
      
      // Save to Firebase
      await firebaseService.saveCourses(updatedCourses);
      
      setNewRouteUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddManualCourse = async () => {
    if (!manualRoute.name || !manualRoute.distance) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create route data from manual input
      const distance = parseFloat(manualRoute.distance) * 1000; // Convert km to meters
      const elevationGain = parseFloat(manualRoute.elevationGain) || 0;
      
      const routeData = {
        name: manualRoute.name,
        distance: distance,
        elevation_gain: elevationGain,
        elevation_loss: elevationGain * 0.95,
        max_elevation: 100 + elevationGain,
        min_elevation: 50,
        elevation_profile: [],
        surface_type: 'mixed',
        terrain: elevationGain / (distance / 1000) > 30 ? 'hilly' : 
                 elevationGain / (distance / 1000) > 15 ? 'rolling' : 'flat',
        location: 'User specified',
        description: 'Manually entered course'
      };
      
      // Generate prediction
      const prediction = await predictionServiceEnhanced.generateCoursePrediction(routeData);
      
      const newCourse = {
        id: Date.now().toString(),
        routeId: 'manual_' + Date.now(),
        routeType: 'manual',
        url: 'Manual Entry',
        name: routeData.name,
        distance: routeData.distance,
        elevationGain: routeData.elevation_gain,
        elevationProfile: routeData.elevation_profile,
        prediction,
        addedAt: new Date().toISOString()
      };
      
      const updatedCourses = [...courses, newCourse];
      setCourses(updatedCourses);
      await firebaseService.saveCourses(updatedCourses);
      
      // Reset form
      setManualRoute({ name: '', distance: '', elevationGain: '' });
      setShowManualInput(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    try {
      const updatedCourses = courses.filter(c => c.id !== courseId);
      setCourses(updatedCourses);
      await firebaseService.saveCourses(updatedCourses);
    } catch (err) {
      console.error('Error deleting course:', err);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (secondsPerKm) => {
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  };

  return (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-400" />
          Course-Specific Predictions
        </h2>
        <p className="text-sm text-slate-400">
          Add Strava routes or segments to get predictions tailored to specific course profiles
        </p>
      </div>

      {/* Add Course Input */}
      <div className="mb-6">
        {/* Toggle between URL and Manual input */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setShowManualInput(false)}
            className={`px-3 py-1 rounded-lg text-sm ${!showManualInput ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            From Strava URL
          </button>
          <button
            onClick={() => setShowManualInput(true)}
            className={`px-3 py-1 rounded-lg text-sm ${showManualInput ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            Enter Manually
          </button>
        </div>

        {!showManualInput ? (
          // URL Input
          <div className="flex gap-2">
            <input
              type="text"
              value={newRouteUrl}
              onChange={(e) => setNewRouteUrl(e.target.value)}
              placeholder="Paste Strava route or segment URL (e.g., https://www.strava.com/routes/... or /segments/...)"
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleAddCourse}
              disabled={isLoading || !newRouteUrl}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>Loading...</>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Course
                </>
              )}
            </button>
          </div>
        ) : (
          // Manual Input Form
          <div className="space-y-3">
            <input
              type="text"
              value={manualRoute.name}
              onChange={(e) => setManualRoute({...manualRoute, name: e.target.value})}
              placeholder="Course name (e.g., Puffing Billy Trail)"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="0.1"
                value={manualRoute.distance}
                onChange={(e) => setManualRoute({...manualRoute, distance: e.target.value})}
                placeholder="Distance (km)"
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                disabled={isLoading}
              />
              <input
                type="number"
                value={manualRoute.elevationGain}
                onChange={(e) => setManualRoute({...manualRoute, elevationGain: e.target.value})}
                placeholder="Elevation gain (m)"
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleAddManualCourse}
              disabled={isLoading || !manualRoute.name || !manualRoute.distance}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>Loading...</>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Manual Course
                </>
              )}
            </button>
          </div>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
      </div>

      {/* Saved Courses */}
      <div className="space-y-4">
        {courses.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No courses added yet. Add a Strava route URL above to get started.
          </div>
        ) : (
          courses.map(course => (
            <div key={course.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">{course.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span>{(course.distance / 1000).toFixed(2)} km</span>
                    <span className="flex items-center gap-1">
                      <Mountain className="w-3 h-3" />
                      {course.elevationGain}m gain
                    </span>
                    {course.routeType === 'manual' ? (
                      <span className="text-slate-500">Manual entry</span>
                    ) : (
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                      >
                        View on Strava
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteCourse(course.id)}
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                  title="Delete course"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Prediction Results */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div className="bg-slate-900/50 rounded p-3">
                  <div className="text-xs text-slate-500 mb-1">Predicted Time</div>
                  <div className="text-xl font-bold text-white">
                    {formatTime(course.prediction.time)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {formatPace(course.prediction.pace)} pace
                  </div>
                </div>
                
                <div className="bg-slate-900/50 rounded p-3">
                  <div className="text-xs text-slate-500 mb-1">Elevation Impact</div>
                  <div className="text-lg font-semibold text-orange-400">
                    +{formatTime(course.prediction.elevationImpact)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    vs flat course
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded p-3">
                  <div className="text-xs text-slate-500 mb-1">Confidence</div>
                  <div className="text-lg font-semibold text-green-400">
                    {Math.round(course.prediction.confidence * 100)}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Based on {course.prediction.similarRuns} similar runs
                  </div>
                </div>
              </div>

              {/* Elevation Profile Mini Chart */}
              {course.elevationProfile && (
                <div className="mt-3 p-2 bg-slate-900/50 rounded">
                  <div className="text-xs text-slate-500 mb-2">Elevation Profile</div>
                  <div className="h-16 flex items-end gap-0.5">
                    {course.elevationProfile.map((elev, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-blue-500/50 rounded-t"
                        style={{
                          height: `${(elev / Math.max(...course.elevationProfile)) * 100}%`,
                          minHeight: '2px'
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Start</span>
                    <span>{(course.distance / 1000).toFixed(1)} km</span>
                  </div>
                </div>
              )}

              {/* Pacing Strategy */}
              {course.prediction.pacingStrategy && (
                <div className="mt-3 p-3 bg-slate-900/50 rounded">
                  <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Suggested Pacing Strategy
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {course.prediction.pacingStrategy.map((segment, idx) => (
                      <div key={idx} className="text-center">
                        <div className="text-slate-400">{segment.label}</div>
                        <div className="text-white font-medium">{formatPace(segment.pace)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Factors */}
              {course.prediction.factors && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {course.prediction.factors.map((factor, idx) => (
                    <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-slate-900/50 rounded text-xs text-slate-400">
                      <Info className="w-3 h-3" />
                      {factor}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CoursePrediction;