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

// Runs a seeding function only once per device.
export async function seedOnce(key, fn) {
  const done = await db.meta.get(key)
  if (done) return
  await db.transaction('rw', db.tables, async () => {
    await fn()
    await db.meta.put({ key, at: Date.now() })
  })
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

// Small predictable random generator so the demo data looks the same every time.
export function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}
