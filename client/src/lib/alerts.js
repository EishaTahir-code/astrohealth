// Doctor alerts (TECH.md "DoctorAlert"): red-flag readings, a large alertness drop,
// and emergency signals the astronaut sends. Alerts sync to the flight surgeon.
import { db, newId } from './db'
import { detectFlags, METRICS } from './health'
import { detectDecline } from './alertness'
import { requestSync } from './sync'

export const ALERT_KIND_LABEL = {
  'red-flag': 'Red-flag reading',
  alertness: 'Large alertness drop',
  emergency: 'Emergency signal',
}

export async function raiseAlert({ userId, kind, severity = 'red', message, signals = [] }) {
  const alert = { uid: newId(), userId, kind, severity, message, signals, createdAt: Date.now(), reviewed: false, synced: false }
  await db.alerts.add(alert)
  requestSync()
  return alert
}

// Is there already an open alert like this from the last 24 hours? (Avoids repeating the same alert.)
async function alreadyOpen(userId, kind, signal) {
  const since = Date.now() - 24 * 3600 * 1000
  const open = await db.alerts
    .where('userId')
    .equals(userId)
    .filter((a) => a.kind === kind && !a.reviewed && a.createdAt > since && (!signal || a.signals?.[0] === signal))
    .count()
  return open > 0
}

// After new readings: every metric whose latest reading is red becomes a doctor alert.
export async function alertOnRedFlags(userId) {
  const readings = await db.readings.where('userId').equals(userId).toArray()
  for (const flag of detectFlags(readings).filter((f) => f.status === 'red')) {
    if (await alreadyOpen(userId, 'red-flag', flag.type)) continue
    await raiseAlert({ userId, kind: 'red-flag', message: flag.message, signals: [flag.type, METRICS[flag.type].label] })
  }
}

// After a reaction test: a large drop (35% or more) becomes a doctor alert.
export async function alertOnAlertness(userId) {
  const tests = await db.reactionTests.where('userId').equals(userId).toArray()
  const decline = detectDecline(tests)
  if (decline.status !== 'red' || (await alreadyOpen(userId, 'alertness'))) return
  await raiseAlert({
    userId,
    kind: 'alertness',
    message: `Alertness score ${decline.latest}, usual about ${decline.baseline} (${Math.round(decline.drop * 100)}% lower).`,
  })
}
