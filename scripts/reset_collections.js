/* Backs up activities + segments to backups/<ts>.json, THEN deletes them.
   Deletion only proceeds with --confirm-delete AND after the backup wrote.

   Run: node scripts/reset_collections.js                 # backup only (dry run)
        node scripts/reset_collections.js --confirm-delete # backup then wipe
   Requires GOOGLE_APPLICATION_CREDENTIALS. */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

async function dump(db, name, backup) {
  const snap = await db.collection(name).get();
  backup[name] = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
  return snap.docs;
}

async function main() {
  const cred = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'serviceAccountKey.json';
  admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(cred))) });
  const db = admin.firestore();

  const backup = {};
  const acts = await dump(db, 'activities', backup);
  const segs = await dump(db, 'segments', backup);

  fs.mkdirSync('backups', { recursive: true });
  const file = path.join('backups', `reset-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(backup));
  const stat = fs.statSync(file);
  if (stat.size < 2) throw new Error('Backup looks empty; aborting delete.');
  console.log(`Backed up ${acts.length} activities + ${segs.length} segments to ${file}`);

  if (process.argv.includes('--confirm-delete')) {
    for (const group of [acts, segs]) {
      for (let i = 0; i < group.length; i += 400) {
        const batch = db.batch();
        group.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
    console.log('Deleted activities + segments. Ready for --backfill.');
  } else {
    console.log('Dry run: backup only. Re-run with --confirm-delete to wipe.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
