// Garden scoring: simple, explainable rules (not a medical measure).
// Looks at the last 7 days of daily check-ins.
//   + checked in that day          +5
//   + good sleep (4-5)             +4
//   + low stress (1-2)             +2
//   - poor sleep (1-2)             -6
//   - high stress (4-5)            -6
//   - missed a check-in            -6  (only counted after your first check-in,
//                                       and today does not count until it is over)
//   + greenhouse checklist done    +3  (Greenhouse Reset: caring for a real plant)
// Start at 50, keep between 0 and 100.
import { dayKey } from './db'

export const STAGES = {
  empty: { label: 'Empty bed', status: 'none', note: 'Waiting for a first check-in' },
  wilting: { label: 'Wilting', status: 'red', note: 'Needs extra care' },
  needsCare: { label: 'Needs care', status: 'yellow', note: 'Could use some attention' },
  growing: { label: 'Growing', status: 'green', note: 'Growing steadily' },
  blooming: { label: 'Blooming', status: 'green', note: 'In full bloom' },
}

// careDays: optional set of YYYY-MM-DD dates when the greenhouse checklist was finished.
export function scoreGarden(checkIns, today = new Date(), careDays = new Set()) {
  if (!checkIns?.length) return { score: null, stage: 'empty', ...STAGES.empty }

  const byDate = new Map(checkIns.map((c) => [c.date, c]))
  const firstDate = checkIns.map((c) => c.date).sort()[0]
  let score = 50

  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = dayKey(d)
    if (key < firstDate) break
    if (careDays.has(key)) score += 3
    const c = byDate.get(key)
    if (!c) {
      if (i > 0) score -= 6
      continue
    }
    score += 5
    if (c.sleepQuality >= 4) score += 4
    else if (c.sleepQuality <= 2) score -= 6
    if (c.stress >= 4) score -= 6
    else if (c.stress <= 2) score += 2
  }

  score = Math.max(0, Math.min(100, score))
  const stage = score >= 75 ? 'blooming' : score >= 55 ? 'growing' : score >= 35 ? 'needsCare' : 'wilting'
  return { score, stage, ...STAGES[stage] }
}
