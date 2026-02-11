import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Mountain, Trash2, Plus, ExternalLink, Info, Upload, FileText, Link2 } from 'lucide-react';
import stravaRouteService from '../../services/stravaRouteService';
import predictionServiceEnhanced from '../../services/predictionServiceEnhanced';
import firebaseService from '../../services/firebaseService';
import stravaApi from '../../services/stravaApi';
import gpxTcxParser from '../../services/gpxTcxParser';
import ElevationProfileKM from './ElevationProfileKM';

const CoursePrediction = () => {
  const [courses, setCourses] = useState([]);
  const [newRouteUrl, setNewRouteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [mobileLink, setMobileLink] = useState(null); // { originalUrl, resolvedUrl }
  const [manualRoute, setManualRoute] = useState({
    name: '',
    distance: '',
    elevationGain: ''
  });
  const fileInputRef = useRef(null);

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

  const addCourseFromRouteInfo = async (routeInfo, url) => {
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
      url: url,
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
  };

  const handleAddCourse = async () => {
    if (!newRouteUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      const routeInfo = stravaRouteService.extractRouteId(newRouteUrl);

      if (!routeInfo) {
        throw new Error('Invalid Strava URL. Please use a strava.com/segments/... or strava.com/routes/... URL.');
      }

      // Handle mobile links — try auto-resolve, then show helper
      if (routeInfo.type === 'mobile_link') {
        const result = await stravaRouteService.resolveMobileLink(newRouteUrl);
        if (result.resolved && result.routeInfo) {
          // Auto-resolved! Process directly
          await addCourseFromRouteInfo(result.routeInfo, result.url);
          setNewRouteUrl('');
          setMobileLink(null);
        } else {
          // Can't auto-resolve — show the helper UI
          setMobileLink({ originalUrl: newRouteUrl });
          setNewRouteUrl('');
        }
        return;
      }

      await addCourseFromRouteInfo(routeInfo, newRouteUrl);
      setNewRouteUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolvedUrl = async (resolvedUrl) => {
    setIsLoading(true);
    setError(null);
    try {
      const routeInfo = stravaRouteService.extractRouteId(resolvedUrl);
      if (!routeInfo || routeInfo.type === 'mobile_link') {
        throw new Error('That doesn\'t look like a full Strava URL. It should look like: strava.com/segments/12345');
      }
      await addCourseFromRouteInfo(routeInfo, resolvedUrl);
      setMobileLink(null);
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Parse the GPX/TCX file
      const routeData = await gpxTcxParser.parseFile(file);
      
      // Generate prediction for the route
      const prediction = await predictionServiceEnhanced.generateCoursePrediction(routeData);
      
      const newCourse = {
        id: Date.now().toString(),
        routeId: 'file_' + Date.now(),
        routeType: 'file',
        url: `File: ${file.name}`,
        name: routeData.name,
        distance: routeData.distance,
        elevationGain: routeData.elevation_gain,
        elevationProfile: routeData.elevation_profile,
        prediction,
        addedAt: new Date().toISOString(),
        fileType: routeData.fileType.toUpperCase()
      };
      
      const updatedCourses = [...courses, newCourse];
      setCourses(updatedCourses);
      await firebaseService.saveCourses(updatedCourses);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowFileUpload(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
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
        
        {/* API Status Message */}
        {!stravaApi.isAuthenticated() ? (
          <div className="mt-3 p-3 bg-amber-900/20 border border-amber-600/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-400">
                <strong>Demo Mode:</strong> Currently using simulated data. Connect your Strava account to fetch real route data.
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-400">
                <strong>Tip:</strong> Use <strong>segment</strong> URLs (e.g., strava.com/segments/123456) instead of route URLs. 
                Segments are usually public, while routes are private to their creators.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Course Input */}
      <div className="mb-6">
        {/* Toggle between URL, Manual, and File input */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => {setShowManualInput(false); setShowFileUpload(false);}}
            className={`px-3 py-1 rounded-lg text-sm ${!showManualInput && !showFileUpload ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            From Strava URL
          </button>
          <button
            onClick={() => {setShowManualInput(true); setShowFileUpload(false);}}
            className={`px-3 py-1 rounded-lg text-sm ${showManualInput ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            Enter Manually
          </button>
          <button
            onClick={() => {setShowManualInput(false); setShowFileUpload(true);}}
            className={`px-3 py-1 rounded-lg text-sm ${showFileUpload ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            Upload GPX/TCX
          </button>
        </div>

        {showFileUpload ? (
          // File Upload Input
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              accept=".gpx,.tcx"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            >
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-white font-medium mb-1">Click to upload GPX or TCX file</p>
              <p className="text-xs text-slate-400">Supported formats: .gpx, .tcx</p>
              <p className="text-xs text-slate-500 mt-2">File will be analyzed locally for elevation and distance</p>
            </div>
            {isLoading && (
              <div className="text-center text-sm text-slate-400">
                Processing file...
              </div>
            )}
          </div>
        ) : !showManualInput ? (
          // URL Input
          <div className="flex gap-2">
            <input
              type="text"
              value={newRouteUrl}
              onChange={(e) => setNewRouteUrl(e.target.value)}
              placeholder="Paste Strava segment/route URL (desktop URL preferred: https://www.strava.com/segments/...)"
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
        {/* Mobile Link Resolution Helper */}
        {mobileLink && (
          <div className="mt-3 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <Link2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-white mb-1">Mobile link detected</h4>
                <p className="text-xs text-slate-400">
                  Mobile share links (strava.app.link) can't be read directly by browsers.
                  Click the button below to open it — then copy the full URL from your browser's address bar and paste it here.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => window.open(mobileLink.originalUrl, '_blank')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Link in Browser
              </button>
              <input
                type="text"
                placeholder="Paste the full strava.com URL here..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (pasted && pasted.includes('strava.com')) {
                    e.preventDefault();
                    handleResolvedUrl(pasted.trim());
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  if (val.includes('strava.com/')) {
                    handleResolvedUrl(val);
                  }
                }}
              />
              <button
                onClick={() => setMobileLink(null)}
                className="px-3 py-2 text-slate-400 hover:text-white text-sm"
              >
                Cancel
              </button>
            </div>
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
                  <h3 className="text-lg font-medium text-white mb-1">
                    {course.name}
                    {course.fromApi && (
                      <span className="ml-2 text-xs px-2 py-1 bg-green-600/20 text-green-400 rounded">
                        Live Data
                      </span>
                    )}
                    {course.apiError && (
                      <span className="ml-2 text-xs px-2 py-1 bg-red-600/20 text-red-400 rounded">
                        Mock Data
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span>{(course.distance / 1000).toFixed(2)} km</span>
                    <span className="flex items-center gap-1">
                      <Mountain className="w-3 h-3" />
                      {course.elevationGain}m gain
                    </span>
                    {course.routeType === 'manual' ? (
                      <span className="text-slate-500">Manual entry</span>
                    ) : course.routeType === 'file' ? (
                      <span className="flex items-center gap-1 text-slate-400">
                        <FileText className="w-3 h-3" />
                        {course.fileType || 'File'} upload
                      </span>
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

              {/* API Error Message */}
              {course.apiError && (
                <div className="mb-3 p-2 bg-red-900/20 border border-red-600/30 rounded text-xs text-red-400">
                  <strong>Note:</strong> {course.apiError}. Using simulated data instead.
                </div>
              )}

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

              {/* Enhanced KM-based Elevation Profile */}
              {course.elevationProfile && (
                <div className="mt-3">
                  <ElevationProfileKM 
                    routeData={{
                      distance: course.distance,
                      elevation_gain: course.elevationGain,
                      elevation_profile: course.elevationProfile
                    }}
                  />
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