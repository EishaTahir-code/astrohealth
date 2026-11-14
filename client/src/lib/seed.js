// FAKE demo data, saved once per device. Every seeded record is marked synced: true,
// because every device makes the same demo data itself (it is never sent to the server).
// Maya (a1) starts with no check-ins so her garden bed starts empty.
import { db, dayKey, daysAgo, seededRandom, seedOnce } from './db'
import { seal } from './secure'

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
      rows.push({ uid: `seed-${userId}-${type}-${i}`, userId, type, value, value2, unit: '', recordedAt: at, synced: true })

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

// FAKE past reaction tests. Sara's (a3) alertness drops sharply, so the demo shows a red flag.
async function seedReactionTests() {
  const rows = []
  const plans = {
    a1: [80, 83, 78, 82],
    a2: [86, 84, 88, 85, 87],
    a3: [79, 76, 72, 64, 45],
  }
  for (const [userId, scores] of Object.entries(plans)) {
    scores.forEach((score, i) => {
      rows.push({
        uid: `seed-${userId}-rt-${i}`,
        userId,
        reactionTimeMs: Math.round(600 - (score / 100) * 350),
        accuracy: Math.min(100, score + 12),
        consistency: Math.min(100, score + 5),
        alertnessScore: score,
        createdAt: daysAgo((scores.length - i) * 2).getTime(),
        synced: true,
      })
    })
  }
  await db.reactionTests.bulkAdd(rows)
}

// Sara's red flags have already reached the flight surgeon (FAKE).
async function seedAlerts() {
  await db.alerts.bulkAdd([
    { uid: 'seed-alert-a3-bp', userId: 'a3', kind: 'red-flag', severity: 'red', message: 'Blood pressure is outside the safe range (144/92 mmHg).', signals: ['bp', 'Blood pressure'], createdAt: daysAgo(1).getTime(), reviewed: false, synced: true },
    { uid: 'seed-alert-a3-sleep', userId: 'a3', kind: 'red-flag', severity: 'red', message: 'Sleep is outside the safe range (3.9 hours).', signals: ['sleep', 'Sleep'], createdAt: daysAgo(1).getTime(), reviewed: false, synced: true },
    { uid: 'seed-alert-a3-alert', userId: 'a3', kind: 'alertness', severity: 'red', message: 'Alertness score 45, usual about 73 (38% lower).', signals: [], createdAt: daysAgo(2).getTime(), reviewed: false, synced: true },
  ])
}

// A welcome message from the flight surgeon to each astronaut (FAKE).
async function seedCareMessages() {
  const rows = [
    ['a1', 'Hi Maya, Dr. Rivera here. Your blood pressure has crept up a little this week. Nothing urgent: please measure again after a quiet rest tomorrow, and message me any time.'],
    ['a2', 'Hi Leo, Dr. Rivera here. Your numbers look steady. Keep it up, and message me any time.'],
    ['a3', 'Hi Sara, Dr. Rivera here. I saw your sleep and blood pressure alerts. Could we talk at the next private medical conference? Until then, take it easy on high-risk tasks.'],
  ].map(([userId, text], i) => ({ uid: `seed-care-${userId}`, userId, from: 'doctor', author: 'Dr. Ana Rivera', text, createdAt: daysAgo(1).getTime() + i, synced: true }))
  await db.careMessages.bulkAdd(rows)
}

// A child's drawing for Maya's family inbox (an SVG picture, no external file).
const DRAWING = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="#fdf8ec"/><circle cx="250" cy="55" r="28" fill="#f4c542"/><path d="M60 170 L95 60 L130 170 Z" fill="#7aa7e0" stroke="#2b4a7a" stroke-width="4"/><circle cx="95" cy="115" r="12" fill="#fff" stroke="#2b4a7a" stroke-width="4"/><path d="M78 170 l-14 30 M112 170 l14 30" stroke="#e8743b" stroke-width="8" stroke-linecap="round"/><path d="M190 200 q10 -50 0 -80" stroke="#4f8a3c" stroke-width="5" fill="none"/><g fill="#e86a9a"><circle cx="190" cy="110" r="10"/><circle cx="178" cy="120" r="10"/><circle cx="202" cy="120" r="10"/><circle cx="184" cy="132" r="10"/><circle cx="196" cy="132" r="10"/></g><circle cx="190" cy="122" r="7" fill="#f4c542"/><text x="160" y="212" font-family="Comic Sans MS, cursive" font-size="16" text-anchor="middle" fill="#2b4a7a">for Mama in space</text></svg>`)}`

async function familyRows() {
  const msg = async (userId, contact, contactName, direction, text, days, extra = {}) => ({
    uid: `seed-fam-${userId}-${contact}-${direction}-${days}`,
    userId,
    contact,
    contactName,
    direction,
    text: await seal(text),
    photo: extra.photo ? await seal(extra.photo) : null,
    status: direction === 'in' ? 'received' : 'sent',
    read: direction === 'out' || days > 1,
    demo: true,
    createdAt: daysAgo(days).getTime() + 3600000 * (direction === 'in' ? 6 : 2),
  })
  return Promise.all([
    msg('a1', 'jun', 'Jun', 'out', 'Saw the aurora tonight. Green curtains all the way to the horizon. Wish you were here.', 3),
    msg('a1', 'jun', 'Jun', 'in', 'That sounds unreal. The cat sleeps on your side of the bed every night. We miss you.', 3),
    msg('a1', 'ava', 'Ava', 'in', 'I drew you a rocket and a flower for your garden! Do flowers grow in space?', 1, { photo: DRAWING }),
    msg('a1', 'lin', 'Mum (Lin)', 'in', 'Remember to eat your vegetables, even the space ones. Love you, Mum.', 5),
    msg('a2', 'ngozi', 'Ngozi', 'in', 'The kids watched your spacewalk on TV. They are telling the whole school.', 2),
    msg('a3', 'erik', 'Erik', 'in', 'Thinking of you. No need to write back if you are busy, just know we are here.', 2),
  ])
}

// The garden status Leo and Sara's own devices would have shared (FAKE).
async function seedCrewStatus() {
  await db.crewStatus.bulkPut([
    { uid: 'a2', userId: 'a2', stage: 'blooming', score: 100, checkins7: 7, supportAlerts: 'on', pausedUntil: null, greenhouseActive: true, updatedAt: daysAgo(1).getTime(), synced: true },
    { uid: 'a3', userId: 'a3', stage: 'wilting', score: 10, checkins7: 4, supportAlerts: 'on', pausedUntil: null, greenhouseActive: false, updatedAt: daysAgo(1).getTime(), synced: true },
  ])
}

export async function ensureDemoData() {
  await seedOnce('seed:crewStatus', seedCrewStatus)
  await seedOnce('seed:checkIns', seedCheckIns)
  await seedOnce('seed:readings', seedReadings)
  await seedOnce('seed:reaction', seedReactionTests)
  await seedOnce('seed:alerts', seedAlerts)
  await seedOnce('seed:care', seedCareMessages)
  // Encrypting happens before the database transaction (the browser's crypto cannot run inside it).
  if (!(await db.meta.get('seed:family'))) {
    const rows = await familyRows()
    await seedOnce('seed:family', () => db.family.bulkAdd(rows))
  }
}
