// Offline answers for AI 1 (Health Trends Assistant).
// Pre-written, plain-language explanations for each measurement and each status.
import { ESCALATE_MESSAGE, mentionsRedFlagSymptom } from './safety'
import { METRICS } from './health'

const TEXT = {
  bp: {
    green: 'Your blood pressure is in the stable range. Keep up your usual routine.',
    yellow: 'Your blood pressure is a little higher than the stable range. This can happen with stress, poor sleep or lots of salt. Rest, drink water and measure again later, sitting quietly for a few minutes first.',
    red: 'Your blood pressure is outside the safe range. Please measure again after resting, and contact the flight surgeon so they can review it.',
  },
  heartRate: {
    green: 'Your heart rate is in the stable range.',
    yellow: 'Your heart rate is a bit outside the usual range. Exercise, caffeine, stress or poor sleep can do this. Rest for a while and measure again.',
    red: 'Your heart rate is outside the safe range. Sit down, rest, and contact the flight surgeon if it stays like this.',
  },
  temperature: {
    green: 'Your body temperature is in the normal range.',
    yellow: 'Your temperature is slightly off. Rest, drink fluids and check again in a few hours.',
    red: 'Your temperature is outside the safe range. Rest, drink fluids and tell the flight surgeon.',
  },
  sleep: {
    green: 'You are getting a healthy amount of sleep. Keeping a regular sleep time helps.',
    yellow: 'You are sleeping a bit less than recommended. Try a regular bedtime, dim lights before sleep and fewer screens late in the day.',
    red: 'You are getting very little sleep. This affects alertness and mood. Consider lighter tasks and talk to the flight surgeon about your sleep.',
  },
  bloodSugar: {
    green: 'Your blood sugar is in the stable range.',
    yellow: 'Your blood sugar is a little outside the usual range. Meal timing affects this. Measure again at a similar time tomorrow.',
    red: 'Your blood sugar is outside the safe range. Tell the flight surgeon so they can advise you.',
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

// General self-care ideas and common causes, used when the question asks for them.
const TIPS = {
  bp: 'Rest quietly for 5 minutes before measuring, drink water, go easy on salty food, and take short breaks from high workload.',
  heartRate: 'Measure after sitting still for a few minutes, cut back on caffeine, and try slow breathing (in for 4, out for 6).',
  temperature: 'Rest, drink fluids and measure again in a few hours. Note any other symptoms for the flight surgeon.',
  sleep: 'Keep a regular sleep time, dim the lights an hour before, use the eye mask and earplugs, and avoid screens late.',
  bloodSugar: 'Measure at the same time each day (for example before breakfast) and keep meal times regular.',
}
const CAUSES = {
  bp: 'Common reasons include stress, poor sleep, salty food, caffeine, and fluid shifts in microgravity.',
  heartRate: 'Common reasons include exercise, caffeine, stress, poor sleep, or being slightly dehydrated.',
  temperature: 'Temperature changes with exercise, the time of day, a warm module, or the start of an illness.',
  sleep: 'Noise, light, a shifted schedule, workload and worry often affect sleep on a mission.',
  bloodSugar: 'Meal timing, exercise and stress all move blood sugar during the day.',
}
const INTENT = {
  summary: /summary|doctor|surgeon|report/i,
  tips: /what (should|can|do) i|tip|improve|advice|better|lower|raise|reduce|help me/i,
  normal: /normal|range|healthy|\bok\b|okay|fine|good|bad|worry/i,
  why: /why|cause|reason/i,
}

export function explainOffline(summary, question = '') {
  if (mentionsRedFlagSymptom(question)) return ESCALATE_MESSAGE

  const withData = summary.filter((m) => m.count > 0)
  if (!withData.length) {
    return 'There are no readings yet. Add some measurements on this page and I can explain them.'
  }

  const asked = withData.filter((m) => KEYWORDS[m.type]?.test(question))
  const wantsSummary = INTENT.summary.test(question)

  // A question that names no measurement: say what can be asked, plus a one-line overview.
  if (!asked.length && !wantsSummary) {
    const watch = withData.filter((m) => m.status !== 'green')
    return [
      'Offline, I can explain each of your measurements. Try for example: "Is my blood pressure normal?", "Why is my sleep low?" or "What should I do about my heart rate?"',
      watch.length
        ? `Right now: ${watch.map((m) => `${m.label.toLowerCase()} ${m.status === 'red' ? 'is in the red range' : 'needs attention'}`).join(', ')}. Everything else is stable.`
        : 'Right now all your latest readings are in the stable range.',
      withData.some((m) => m.status === 'red') ? 'Because something is in the red range, please contact the flight surgeon.' : null,
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  const list = asked.length ? asked : withData
  const lines = list.map((m) => {
    const band = METRICS[m.type].band
    const parts = [`${m.label}: latest ${m.latest}, ${m.direction} over the last week.`]
    if (INTENT.normal.test(question)) {
      parts.push(m.type === 'bp' ? 'The normal range is 90–129 (top) and 60–84 (bottom) mmHg.' : m.type === 'sleep' ? 'The aim is 6.5 hours or more.' : `The normal range is ${band[0]}–${band[1]} ${METRICS[m.type].unit}.`)
    }
    parts.push(TEXT[m.type][m.status] ?? '')
    if (INTENT.why.test(question)) parts.push(CAUSES[m.type])
    if (INTENT.tips.test(question)) parts.push(`What can help: ${TIPS[m.type]}`)
    return parts.filter(Boolean).join(' ')
  })

  const minCount = Math.min(...list.map((m) => m.count))
  const hasRed = list.some((m) => m.status === 'red')
  const unsure =
    minCount < 5
      ? 'There are only a few readings, so this is a rough picture and may change.'
      : 'This is based on your recent readings and may not tell the whole story.'

  return [
    wantsSummary ? 'Summary of recent readings (to share with the flight surgeon if you choose):' : null,
    ...lines,
    hasRed ? 'Because something is in the red range, please contact the flight surgeon.' : null,
    unsure,
  ]
    .filter(Boolean)
    .join('\n\n')
}
