/* Stage 2: read streams from Storage, compute segments via the shared engine,
   write `segments` docs + fold activity metrics back onto `activities`.

   Run: node scripts/computeSegments.js
   Requires GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_STORAGE_BUCKET. */
const zlib = require('zlib');
const path = require('path');
const engine = require('../src/services/segmentEngine');

async function buildSegmentsForActivity(activity, streams) {
  const segments = await engine.findBestSegmentsFromStreams(activity, streams);
  const metrics = engine.calculateActivityMetrics(streams);
  return { segments, metrics };
}

function segmentId(seg) {
  return `${seg.activityId}_${seg.distance}_${seg.startTime}`;
}

async function run() {
  const { initializeApp, cert } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'serviceAccountKey.json';
  initializeApp({ credential: cert(require(path.resolve(credPath))) });
  const db = getFirestore();

  const snap = await db.collection('activities')
    .where('type', 'in', ['Run', 'TrailRun', 'VirtualRun']).get();
  console.log(`Computing segments for ${snap.size} activities`);

  for (const doc of snap.docs) {
    const activity = { id: doc.id, ...doc.data() };
    const streamDoc = await db.collection('streams').doc(doc.id).get();
    if (!streamDoc.exists) { console.log(`  ${doc.id}: no streams, skipping`); continue; }
    const gz = streamDoc.data().gz; // Firestore bytes -> Buffer in admin SDK
    const streams = JSON.parse(zlib.gunzipSync(gz).toString('utf8'));
    if (!streams.distance || !streams.time) { console.log(`  ${doc.id}: no dist/time`); continue; }

    const { segments, metrics } = await buildSegmentsForActivity(activity, streams);

    const batch = db.batch();
    for (const seg of segments) {
      seg.activityName = activity.name;
      seg.activityId = activity.id;
      batch.set(db.collection('segments').doc(segmentId(seg)),
        { ...seg, lastUpdated: new Date() }, { merge: true });
    }
    if (metrics && Object.keys(metrics).length) {
      batch.set(doc.ref, metrics, { merge: true });
    }
    await batch.commit();
    console.log(`  ${doc.id}: wrote ${segments.length} segments`);
  }
  console.log('Done.');
}

module.exports = { buildSegmentsForActivity, segmentId };

if (require.main === module) {
  run().catch((e) => { console.error(e); process.exit(1); });
}
