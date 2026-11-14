// Sync: devices send their new shareable records and get back what changed since last time.
//
// Privacy rules (PRD section 8), enforced here on the server:
// - Check-ins, moods, private notes and family messages are NEVER sent here (they stay on the device;
//   family messages use the separate family relay).
// - An astronaut can only send records about themselves, and only reads: the crew garden status of
//   everyone, plus their own alerts and their own messages with the flight surgeon.
// - A doctor reads all shareable health records, but can only write doctor notes, messages,
//   alert reviews and access-log entries.
import { CREW_IDS } from './auth.js';
import { changedSince, currentSeq, get, upsert } from './store.js';

// The fields each table may contain. Anything else is dropped.
const FIELDS = {
  readings: ['uid', 'userId', 'type', 'value', 'value2', 'unit', 'recordedAt'],
  reactionTests: ['uid', 'userId', 'reactionTimeMs', 'accuracy', 'consistency', 'alertnessScore', 'createdAt'],
  alerts: ['uid', 'userId', 'kind', 'severity', 'message', 'signals', 'createdAt', 'reviewed', 'reviewedBy', 'reviewedAt', 'reviewNote'],
  sharedNotes: ['uid', 'userId', 'text', 'date', 'createdAt'],
  careMessages: ['uid', 'userId', 'from', 'author', 'text', 'createdAt'],
  doctorNotes: ['uid', 'userId', 'author', 'text', 'createdAt'],
  crewStatus: ['uid', 'userId', 'stage', 'score', 'checkins7', 'supportAlerts', 'pausedUntil', 'greenhouseActive', 'updatedAt'],
  auditLog: ['uid', 'doctor', 'astronautId', 'at'],
};

// Who may write each table.
const WRITERS = {
  astronaut: ['readings', 'reactionTests', 'alerts', 'sharedNotes', 'careMessages', 'crewStatus'],
  doctor: ['alerts', 'careMessages', 'doctorNotes', 'auditLog'],
};

// Who may read each table (and which rows).
function canRead(user, table, r) {
  if (user.role === 'doctor') return true; // all shareable health records
  if (table === 'crewStatus') return true; // the shared garden
  if (['alerts', 'careMessages', 'sharedNotes'].includes(table)) return r.userId === user.crewId;
  return false;
}

function clean(table, rec) {
  const out = {};
  for (const f of FIELDS[table]) {
    if (rec[f] === undefined) continue;
    const v = rec[f];
    out[f] = typeof v === 'string' ? v.slice(0, 4000) : Array.isArray(v) ? v.slice(0, 20).map((x) => String(x).slice(0, 200)) : v;
  }
  return out;
}

function allowedWrite(user, table, rec) {
  if (!WRITERS[user.role]?.includes(table)) return false;
  if (typeof rec.uid !== 'string' || rec.uid.length > 100) return false;
  if (table === 'auditLog') return rec.doctor === user.sub && CREW_IDS.includes(rec.astronautId);
  // Doctors may only mark an existing alert as reviewed, not create or change alerts.
  if (user.role === 'doctor' && table === 'alerts') return Boolean(get('alerts', rec.uid));
  if (!CREW_IDS.includes(rec.userId)) return false;
  if (user.role === 'astronaut') {
    if (rec.userId !== user.crewId) return false;
    if (table === 'careMessages' && rec.from !== 'astronaut') return false;
    if (table === 'alerts' && (rec.reviewed || rec.reviewedBy)) return false; // only doctors review
    return true;
  }
  // doctor
  if (table === 'careMessages' && rec.from !== 'doctor') return false;
  return true;
}

export function syncHandler(req, res) {
  const user = req.user;
  const push = req.body?.push ?? {};
  const since = Number(req.body?.since) || 0;
  const accepted = [];
  const rejected = [];

  for (const [table, list] of Object.entries(push)) {
    if (!FIELDS[table] || !Array.isArray(list)) continue;
    for (const raw of list.slice(0, 500)) {
      if (!raw || !allowedWrite(user, table, raw)) {
        rejected.push(raw?.uid);
        continue;
      }
      let rec = clean(table, raw);
      if (user.role === 'doctor' && table === 'alerts') {
        const existing = get('alerts', rec.uid);
        rec = { ...existing, reviewed: Boolean(rec.reviewed), reviewedBy: user.name, reviewedAt: rec.reviewedAt ?? Date.now(), reviewNote: rec.reviewNote ?? '' };
        delete rec._seq;
      }
      if (table === 'careMessages' && user.role === 'doctor') rec.author = user.name;
      if (table === 'doctorNotes') rec.author = user.name;
      upsert(table, rec);
      accepted.push(rec.uid);
    }
  }

  const pulled = {};
  for (const table of Object.keys(FIELDS)) {
    const rows = changedSince(table, since, (r) => canRead(user, table, r));
    if (rows.length) pulled[table] = rows.map(({ _savedAt: _s, ...r }) => r);
  }
  res.json({ accepted, rejected: rejected.filter(Boolean), pulled, seq: currentSeq() });
}
