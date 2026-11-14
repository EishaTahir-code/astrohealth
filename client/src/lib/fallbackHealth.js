// Offline answers for AI 1 (Health Trends Assistant).
// Pre-written, plain-language explanations for each measurement and each status.
import { ESCALATE_MESSAGE, mentionsRedFlagSymptom } from './safety'

const TEXT = {
  bp: {
    green: 'Your blood pressure is in the stable range. Keep up your usual routine.',
    yellow: 'Your blood pressure is a little higher than the stable range. This can happen with stress, poor sleep or lots of salt. Rest, drink water and measure again later, sitting quietly for a few minutes first.',
    red: 'Your blood pressure is outside the safe demo range. Please measure again after resting, and contact the flight surgeon so they can review it.',
  },
  heartRate: {
    green: 'Your heart rate is in the stable range.',
    yellow: 'Your heart rate is a bit outside the usual range. Exercise, caffeine, stress or poor sleep can do this. Rest for a while and measure again.',
    red: 'Your heart rate is outside the safe demo range. Sit down, rest, and contact the flight surgeon if it stays like this.',
  },
  temperature: {
    green: 'Your body temperature is normal for the demo range.',
    yellow: 'Your temperature is slightly off. Rest, drink fluids and check again in a few hours.',
    red: 'Your temperature is outside the safe demo range. Rest, drink fluids and tell the flight surgeon.',
  },
  sleep: {
    green: 'You are getting a healthy amount of sleep. Keeping a regular sleep time helps.',
    yellow: 'You are sleeping a bit less than recommended. Try a regular bedtime, dim lights before sleep and fewer screens late in the day.',
    red: 'You are getting very little sleep. This affects alertness and mood. Consider lighter tasks and talk to the flight surgeon about your sleep.',
  },
  bloodSugar: {
    green: 'Your blood sugar is in the stable range.',
    yellow: 'Your blood sugar is a little outside the usual range. Meal timing affects this. Measure again at a similar time tomorrow.',
    red: 'Your blood sugar is outside the safe demo range. Tell the flight surgeon so they can advise you.',
  },
}

const KEYWORDS = {
  bp: /blood pressure|\bbp\b|pressure|systolic|diastolic/i,
  heartRate: /heart|pulse|\bbpm\b/i,
  temperature: /temp|fever|hot|cold/i,
  sleep: /sleep|tired|rest|insomnia/i,
  bloodSugar: /sugar|glucose/i,
}

// Rough confidence based on how many readings there are. Never "high".
export function confidenceFor(count) {
  if (count < 5) return 'low'
  if (count < 10) return 'medium'
  return 'moderate'
}

export function explainOffline(summary, question = '') {
  if (mentionsRedFlagSymptom(question)) return ESCALATE_MESSAGE

  const withData = summary.filter((m) => m.count > 0)
  if (!withData.length) {
    return 'There are no readings yet. Add some measurements in the Health tab and I can explain them.'
  }

  const asked = withData.filter((m) => KEYWORDS[m.type]?.test(question))
  const list = asked.length ? asked : withData
  const lines = list.map((m) => `${m.label}: latest ${m.latest}, ${m.direction} over the last week. ${TEXT[m.type][m.status] ?? ''}`)

  const minCount = Math.min(...list.map((m) => m.count))
  const hasRed = list.some((m) => m.status === 'red')
  const unsure =
    minCount < 5
      ? 'There are only a few readings, so this is a rough picture and may change.'
      : 'This is based on your recent readings and may not tell the whole story.'

  const wantsSummary = /summary|doctor|surgeon|report/i.test(question)
  let heading = null
  if (wantsSummary) heading = 'Summary of recent readings (to share with the flight surgeon if you choose):'
  else if (question && !asked.length) heading = 'I can only explain your measurements offline. Here is an overview:'

  return [
    heading,
    ...lines,
    hasRed ? 'Because something is in the red range, please contact the flight surgeon.' : null,
    unsure,
  ]
    .filter(Boolean)
    .join('\n\n')
}
