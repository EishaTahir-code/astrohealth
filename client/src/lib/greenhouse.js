// Greenhouse Reset logic: the daily checklist, harvest reminder and plant-health alerts.
import { db, dayKey, newId } from './db'
import { seal } from './secure'
import { PLANTS, PROBLEMS } from '../data/plants'
import { publishCrewStatus } from './support'

export const CHECKLIST = [
  { key: 'water', label: 'Water the plant (if it is due)' },
  { key: 'inspect', label: 'Look at the leaves and roots' },
  { key: 'photo', label: 'Take a photo (optional)' },
  { key: 'stage', label: 'Note the growth stage' },
  { key: 'adjust', label: 'Adjust light or water if needed' },
]

export function plantInfo(plant) {
  return PLANTS.find((p) => p.id === plant?.type)
}

export function daysSince(ts, now = Date.now()) {
  return Math.floor((now - ts) / 86400000)
}

// Reminders and alerts for one plant, worked out from its log.
export function plantAlerts(plant, logs, now = Date.now()) {
  const info = plantInfo(plant)
  if (!info || plant.status !== 'growing') return []
  const out = []
  const age = daysSince(plant.startedAt, now)
  const watered = logs.filter((l) => l.done?.water).map((l) => l.at)
  const lastWater = watered.length ? Math.max(...watered) : plant.startedAt
  const sinceWater = daysSince(lastWater, now)
  if (sinceWater > info.waterEveryDays) {
    out.push({ status: 'yellow', text: `Water is overdue: last watered ${sinceWater} days ago (every ${info.waterEveryDays} days).` })
  }
  if (age >= info.harvestDays) out.push({ status: 'green', text: `Ready to harvest: day ${age} of about ${info.harvestDays}.` })
  else if (info.harvestDays - age <= 3) out.push({ status: 'green', text: `Harvest coming up in about ${info.harvestDays - age} days.` })
  const latest = [...logs].sort((a, b) => b.at - a.at)[0]
  for (const p of latest?.problems ?? []) {
    if (PROBLEMS[p]) out.push({ status: 'red', text: `${PROBLEMS[p].label}: ${PROBLEMS[p].advice}` })
  }
  return out
}

export async function startPlant(userId, type) {
  await db.plants.add({ uid: newId(), userId, type, status: 'growing', stage: 'Seed', startedAt: Date.now(), water: 'ok', lightHours: PLANTS.find((p) => p.id === type)?.lightHours ?? 16 })
  await publishCrewStatus(userId)
}

// Saves today's checklist. "complete" = every required item ticked (the photo is optional).
export async function saveDailyLog(plant, { done, stage, water, lightHours, problems, note, photo }) {
  const date = dayKey()
  const complete = CHECKLIST.filter((c) => c.key !== 'photo').every((c) => done[c.key])
  const existing = await db.plantLog.where({ plantUid: plant.uid, date }).first()
  const entry = {
    plantUid: plant.uid,
    date,
    at: Date.now(),
    done,
    complete,
    stage,
    water,
    lightHours,
    problems,
    note: await seal(note),
    photo: photo ? await seal(photo) : existing?.photo ?? null,
  }
  if (existing) await db.plantLog.update(existing.id, entry)
  else await db.plantLog.add({ uid: newId(), ...entry })
  await db.plants.update(plant.id, { stage, water, lightHours, status: stage === 'Harvested' ? 'harvested' : 'growing', ...(stage === 'Harvested' ? { harvestedAt: Date.now() } : {}) })
  await publishCrewStatus(plant.userId)
  return complete
}
