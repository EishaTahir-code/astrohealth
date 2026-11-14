// Crew garden status and crew-support alerts (PRD 6.1 and 6.2).
//
// - Each astronaut's device works out their own garden stage and shares ONLY that
//   (stage, score, whether support alerts are on) as "crew status". Never moods or notes.
// - Crewmates see "Maya's garden may need extra support today" when a bed is wilting,
//   unless Maya paused or turned off these alerts.
import { useLiveQuery } from 'dexie-react-hooks'
import { db, dayKey } from './db'
import { scoreGarden } from './garden'
import { useCrew } from '../data/crew'
import { requestSync } from './sync'

export const SUPPORT_MODES = {
  on: 'On: crewmates may get a gentle alert with my name',
  paused: 'Paused for 24 hours',
  off: 'Off: no support alerts about me',
}

// Is the support alert about this person allowed right now?
export function supportAllowed(mode, pausedUntil, now = Date.now()) {
  if (mode === 'off') return false
  if (mode === 'paused' && pausedUntil && pausedUntil > now) return false
  return true
}

// Days in the last week when this person finished their greenhouse checklist.
async function greenhouseDays(userId) {
  const plants = await db.plants.where('userId').equals(userId).toArray()
  const uids = new Set(plants.map((p) => p.uid))
  const logs = await db.plantLog.filter((l) => uids.has(l.plantUid) && l.complete).toArray()
  return new Set(logs.map((l) => l.date))
}

// Recomputes my garden and shares the result (no private details) with the crew.
export async function publishCrewStatus(userId) {
  const checkIns = await db.checkIns.where('userId').equals(userId).toArray()
  const careDays = await greenhouseDays(userId)
  const g = scoreGarden(checkIns, new Date(), careDays)
  const support = (await db.settings.get(`support:${userId}`))?.value ?? { mode: 'on' }
  const active = await db.plants.where('userId').equals(userId).filter((p) => p.status === 'growing').count()
  // How many of the last 7 days had a check-in: a count only, never the answers.
  const week = new Set(Array.from({ length: 7 }, (_, i) => dayKey(new Date(Date.now() - i * 86400000))))
  const checkins7 = checkIns.filter((c) => week.has(c.date)).length
  await db.crewStatus.put({
    uid: userId,
    userId,
    stage: g.stage,
    score: g.score,
    checkins7,
    supportAlerts: support.mode,
    pausedUntil: support.pausedUntil ?? null,
    greenhouseActive: active > 0,
    updatedAt: Date.now(),
    synced: false,
  })
  requestSync()
}

// Everyone's bed for the crew garden. Uses check-ins saved on this device when there are any
// (the demo crew), otherwise the status each crewmate shared through sync.
export function useCrewGarden() {
  const crew = useCrew()
  return useLiveQuery(async () => {
    const [checkIns, statuses] = await Promise.all([db.checkIns.toArray(), db.crewStatus.toArray()])
    const out = []
    for (const person of crew) {
      const mine = checkIns.filter((c) => c.userId === person.id)
      const shared = statuses.find((s) => s.userId === person.id)
      let garden
      if (mine.length) garden = scoreGarden(mine, new Date(), await greenhouseDays(person.id))
      else if (shared) garden = { ...scoreGarden([]), ...stageInfo(shared.stage), score: shared.score }
      else garden = scoreGarden([])
      const support = (await db.settings.get(`support:${person.id}`))?.value ?? (shared ? { mode: shared.supportAlerts, pausedUntil: shared.pausedUntil } : { mode: 'on' })
      out.push({ person, garden, supportOk: supportAllowed(support.mode, support.pausedUntil) })
    }
    return out
  }, [crew])
}

function stageInfo(stage) {
  const map = {
    empty: { stage: 'empty', label: 'Empty bed', status: 'none', note: 'Waiting for a first check-in' },
    wilting: { stage: 'wilting', label: 'Wilting', status: 'red', note: 'Needs extra care' },
    needsCare: { stage: 'needsCare', label: 'Needs care', status: 'yellow', note: 'Could use some attention' },
    growing: { stage: 'growing', label: 'Growing', status: 'green', note: 'Growing steadily' },
    blooming: { stage: 'blooming', label: 'Blooming', status: 'green', note: 'In full bloom' },
  }
  return map[stage] ?? map.empty
}

// "I checked in with Sara": counts as a crew-support check-in (a PRD success metric).
export async function recordSupportCheckin(userId, about) {
  await db.supportCheckins.add({ userId, about, date: dayKey(), at: Date.now() })
}
