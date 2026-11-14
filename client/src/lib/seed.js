// FAKE demo data for the other crew members, saved once per device.
// Maya (a1, "you") starts with no check-ins so her garden bed starts empty.
import { db, dayKey, daysAgo, seededRandom, seedOnce } from './db'

const pick = (rand, min, max) => min + Math.floor(rand() * (max - min + 1))

async function seedCheckIns() {
  const rand = seededRandom(42)
  const rows = []
  for (let i = 13; i >= 1; i--) {
    const date = dayKey(daysAgo(i))
    // Leo (a2): steady routine, good sleep, low stress, never misses.
    rows.push({
      userId: 'a2', date, mood: pick(rand, 3, 5), stress: pick(rand, 1, 3), energy: pick(rand, 3, 5),
      sleepQuality: pick(rand, 4, 5), workload: pick(rand, 2, 4), notes: '', createdAt: daysAgo(i).getTime(), synced: true,
    })
    // Sara (a3): rough week, poor sleep, high stress, missed some days.
    if (![1, 3, 4].includes(i)) {
      rows.push({
        userId: 'a3', date, mood: pick(rand, 1, 3), stress: pick(rand, 4, 5), energy: pick(rand, 1, 3),
        sleepQuality: pick(rand, 1, 2), workload: pick(rand, 4, 5), notes: '', createdAt: daysAgo(i).getTime(), synced: true,
      })
    }
  }
  await db.checkIns.bulkAdd(rows)
}

export async function ensureDemoData() {
  await seedOnce('seed:checkIns', seedCheckIns)
}
