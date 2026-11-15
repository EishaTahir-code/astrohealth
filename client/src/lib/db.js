// Local database inside the browser (IndexedDB, via the Dexie library).
// Everything is saved on this device first, so the app works with no internet.
import Dexie from 'dexie'

export const db = new Dexie('orbloom')

// "++id" = automatic id. The other names are fields we can search by.
db.version(1).stores({
  checkIns: '++id, userId, date, [userId+date]',
  readings: '++id, userId, type, recordedAt, [userId+type]',
  reactionTests: '++id, userId, createdAt',
  meta: 'key',
})

// Version 2 adds an audit log: every time a doctor opens an astronaut's profile.
db.version(2).stores({
  auditLog: '++id, doctor, astronautId, at',
})

// Version 3: sync ids ("uid", the same on every device), family messages, greenhouse,
// doctor alerts, messages with the flight surgeon, shared notes, doctor notes,
// crew garden status, settings and the device encryption key.
db.version(3)
  .stores({
    readings: '++id, &uid, userId, type, recordedAt, [userId+type]',
    reactionTests: '++id, &uid, userId, createdAt',
    auditLog: '++id, &uid, doctor, astronautId, at',
    alerts: '++id, &uid, userId, kind, createdAt',
    careMessages: '++id, &uid, userId, createdAt',
    sharedNotes: '++id, &uid, userId, createdAt',
    doctorNotes: '++id, &uid, userId, createdAt',
    crewStatus: 'uid, userId',
    family: '++id, &uid, userId, contact, createdAt, status',
    plants: '++id, &uid, userId, status',
    plantLog: '++id, &uid, plantUid, date, [plantUid+date]',
    supportCheckins: '++id, userId, about, date',
    settings: 'key',
    keys: 'name',
  })
  .upgrade(async (tx) => {
    // Older records get a uid so they can sync.
    for (const name of ['readings', 'reactionTests', 'auditLog']) {
      await tx.table(name).toCollection().modify((r) => {
        if (!r.uid) r.uid = newId()
      })
    }
  })

export function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Adds a record, or updates the one with the same uid (used when sync brings records in).
export async function upsertByUid(table, record) {
  const existing = await db[table].where('uid').equals(record.uid).first()
  if (existing) await db[table].update(existing.id ?? existing.uid, record)
  else await db[table].add(record)
}

// Runs a seeding function only once per device.
// The check happens inside the transaction, so two calls at once can't both add data.
export async function seedOnce(key, fn) {
  await db.transaction('rw', db.tables, async () => {
    if (await db.meta.get(key)) return
    await fn()
    await db.meta.put({ key, at: Date.now() })
  })
}

// Small settings store: getSetting('blackout', false)
export async function getSetting(key, fallback = null) {
  const row = await db.settings.get(key)
  return row ? row.value : fallback
}
export function setSetting(key, value) {
  return db.settings.put({ key, value })
}

// Helpers for dates in YYYY-MM-DD form.
export function dayKey(date = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function daysAgo(n) {
  const d = new Date()
  d.setHours(9, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}

// Small predictable random generator so the sample data looks the same every time.
export function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}
