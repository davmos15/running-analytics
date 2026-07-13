import React from 'react';
import { Mountain, Upload } from 'lucide-react';

/*
 * Course Predictions is being rebuilt around Garmin data.
 *
 * The previous implementation fetched route/segment data from the Strava routes
 * API, which Strava retired behind a paid developer subscription in 2026. The
 * planned replacement lets you upload a GPX course file (the app already has a
 * GPX parser in services/gpxTcxParser.js) and runs it through
 * predictionServiceEnhanced.generateCoursePrediction to produce a tailored time.
 * See docs/superpowers/specs for the follow-up spec.
 */
const CoursePrediction = () => {
  return (
    <div className="athletic-card-gradient p-6">
      <div className="flex items-center space-x-2 mb-3">
        <Mountain className="w-5 h-5 text-orange-400" />
        <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          Course Predictions
        </h3>
      </div>
      <div className="flex items-start space-x-3 text-slate-300">
        <Upload className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm">
          Course predictions are being rebuilt to work with Garmin data. Soon you'll be
          able to upload a GPX course file to get a time prediction tailored to that
          course's distance and elevation profile. The previous version relied on the
          Strava routes API, which is no longer available.
        </p>
      </div>
    </div>
  );
};

export default CoursePrediction;
