// Reaction test scoring and alertness decline detection.
// Simple demo rules, not a medical or fitness-for-duty test.

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))

// times: reaction times in ms for valid taps. errors: early taps + missed signals.
export function scoreTest(times, errors, trials) {
  const avg = times.length ? times.reduce((s, t) => s + t, 0) / times.length : 0
  const sd = times.length > 1 ? Math.sqrt(times.reduce((s, t) => s + (t - avg) ** 2, 0) / times.length) : 0
  const speed = times.length ? clamp(((600 - avg) / 350) * 100) : 0 // 250 ms or faster = 100, 600 ms or slower = 0
  const accuracy = clamp(((trials - errors) / trials) * 100)
  const consistency = times.length > 1 ? clamp(100 - (sd / avg) * 200) : times.length ? 70 : 0
  return {
    reactionTimeMs: Math.round(avg),
    accuracy: Math.round(accuracy),
    consistency: Math.round(consistency),
    alertnessScore: Math.round(0.6 * speed + 0.25 * accuracy + 0.15 * consistency),
  }
}

// Compares the latest score with the average of up to 5 earlier tests.
export function detectDecline(tests) {
  const sorted = [...tests].sort((a, b) => a.createdAt - b.createdAt)
  if (sorted.length < 3) return { status: 'none', drop: 0, baseline: null }
  const latest = sorted[sorted.length - 1].alertnessScore
  const earlier = sorted.slice(-6, -1)
  const baseline = earlier.reduce((s, t) => s + t.alertnessScore, 0) / earlier.length
  const drop = baseline > 0 ? (baseline - latest) / baseline : 0
  const status = drop >= 0.35 ? 'red' : drop >= 0.2 ? 'yellow' : 'green'
  return { status, drop, baseline: Math.round(baseline), latest }
}

export const ALERTNESS_ADVICE = {
  none: 'Do a few tests on different days so the app can learn your usual level.',
  green: 'Your alertness is close to your usual level.',
  yellow:
    'Your alertness is lower than usual. Consider a short rest, drinking water, a snack, some light movement, or lightening your workload.',
  red:
    'Your alertness has dropped a lot. Avoid high-risk tasks for now, let your crew lead know, and contact medical support if it does not improve.',
}
