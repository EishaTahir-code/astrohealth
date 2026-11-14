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

// 14 days of FAKE health readings for each crew member.
//   Maya (a1): mostly stable, blood pressure slowly creeping into "needs attention".
//   Leo  (a2): stable.
//   Sara (a3): short sleep and a high latest blood pressure, so the demo shows red flags.
async function seedReadings() {
  const rand = seededRandom(7)
  const jitter = (n) => (rand() - 0.5) * 2 * n
  const rows = []
  for (let i = 14; i >= 1; i--) {
    const at = daysAgo(i).getTime()
    const t = (14 - i) / 13 // 0 = two weeks ago, 1 = yesterday
    const add = (userId, type, value, value2) =>
      rows.push({ userId, type, value, value2, unit: '', recordedAt: at, synced: true })

    add('a1', 'bp', Math.round(118 + t * 15 + jitter(2)), Math.round(76 + t * 8 + jitter(2)))
    add('a1', 'heartRate', Math.round(66 + jitter(4)))
    add('a1', 'temperature', +(36.7 + jitter(0.2)).toFixed(1))
    add('a1', 'sleep', +(7 - t * 0.6 + jitter(0.4)).toFixed(1))
    add('a1', 'bloodSugar', Math.round(98 + jitter(8)))

    add('a2', 'bp', Math.round(116 + jitter(4)), Math.round(75 + jitter(3)))
    add('a2', 'heartRate', Math.round(60 + jitter(4)))
    add('a2', 'temperature', +(36.6 + jitter(0.2)).toFixed(1))
    add('a2', 'sleep', +(7.5 + jitter(0.5)).toFixed(1))
    add('a2', 'bloodSugar', Math.round(92 + jitter(8)))

    add('a3', 'bp', i === 1 ? 144 : Math.round(124 + t * 12 + jitter(3)), i === 1 ? 92 : Math.round(80 + t * 6 + jitter(2)))
    add('a3', 'heartRate', Math.round(88 + t * 18 + jitter(4)))
    add('a3', 'temperature', +(36.9 + jitter(0.25)).toFixed(1))
    add('a3', 'sleep', +(6 - t * 2 + jitter(0.3)).toFixed(1))
    add('a3', 'bloodSugar', Math.round(110 + jitter(12)))
  }
  for (const r of rows) r.unit = { bp: 'mmHg', heartRate: 'bpm', temperature: '°C', sleep: 'hours', bloodSugar: 'mg/dL' }[r.type]
  await db.readings.bulkAdd(rows)
}

export async function ensureDemoData() {
  await seedOnce('seed:checkIns', seedCheckIns)
  await seedOnce('seed:readings', seedReadings)
}
