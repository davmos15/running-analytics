import React, { useState } from 'react';
import firebaseService from '../services/firebaseService';

const FixSeptember25Run = () => {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const fixSeptember25Run = async () => {
    setLoading(true);
    setStatus('Starting to reprocess September 25th run...');

    try {
      // Reprocess the "lunch 800s" activity from September 25th, 2025
      const count = await firebaseService.reprocessActivityByNameAndDate('lunch 800s', '2025-09-25');

      if (count > 0) {
        setStatus(`Successfully reprocessed ${count} activity(ies) from September 25th`);

        // After reprocessing, check the 10K personal bests
        const personalBests = await firebaseService.getPersonalBests('10K', 'all-time');
        const sep25PB = personalBests.find(pb => {
          const pbDate = pb.date?.toDate ? pb.date.toDate() : new Date(pb.date);
          return pbDate.getMonth() === 8 && pbDate.getDate() === 25 && pbDate.getFullYear() === 2025;
        });

        if (sep25PB) {
          setStatus(prev => prev + `\n✅ September 25th run is now showing in 10K PBs with time: ${sep25PB.time}`);
        } else {
          setStatus(prev => prev + '\n⚠️ September 25th run not found in 10K PBs. Checking all activities...');

          // Try to find the activity directly
          const activities = await firebaseService.getActivities();
          const sep25Activities = activities.filter(activity => {
            const activityDate = new Date(activity.start_date);
            const nameMatch = activity.name?.toLowerCase().includes('lunch 800');
            const dateMatch = activityDate.getMonth() === 8 && activityDate.getDate() === 25 && activityDate.getFullYear() === 2025;
            return nameMatch || dateMatch;
          });

          if (sep25Activities.length > 0) {
            setStatus(prev => prev + `\n📊 Found ${sep25Activities.length} matching activities:\n` +
              sep25Activities.map(a => `- ${a.name} (${a.distance}m, ${a.moving_time}s)`).join('\n'));
          }
        }
      } else {
        setStatus('No activities found matching "lunch 800s" on September 25th, 2025');
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error('Error fixing September 25th run:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="athletic-card p-6 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4">Fix September 25th Run</h3>
      <p className="text-slate-400 mb-4">
        This utility will reprocess your "lunch 800s" run from September 25th to ensure it appears in your 10K personal bests.
      </p>

      <button
        onClick={fixSeptember25Run}
        disabled={loading}
        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : 'Reprocess September 25th Run'}
      </button>

      {status && (
        <div className="mt-4 p-3 bg-slate-800 rounded">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap">{status}</pre>
        </div>
      )}
    </div>
  );
};

export default FixSeptember25Run;