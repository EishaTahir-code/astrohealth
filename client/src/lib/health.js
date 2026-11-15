// Health measurements, green/yellow/red status and red-flag detection.
//
// REFERENCE RANGES ONLY. These are simple general ranges,
// not medical advice. In a real mission the flight surgeons set them.

export const METRICS = {
  // band = the green ("stable") range. Blood pressure has one for the top and one for the bottom number.
  bp: { label: 'Blood pressure', unit: 'mmHg', band: [90, 129], band2: [60, 84], digits: 0 },
  heartRate: { label: 'Heart rate', unit: 'bpm', band: [50, 100], digits: 0 },
  temperature: { label: 'Body temperature', unit: '°C', band: [36.1, 37.5], digits: 1 },
  sleep: { label: 'Sleep', unit: 'hours', band: [6.5, 10], digits: 1 },
  bloodSugar: { label: 'Blood sugar', unit: 'mg/dL', band: [70, 140], digits: 0 },
}

export const METRIC_KEYS = Object.keys(METRICS)

export const STATUS_LABEL = { green: 'Stable', yellow: 'Needs attention', red: 'Potentially concerning', none: 'No data' }

export const STATUS_ACTION = {
  green: 'Continue your normal routine.',
  yellow: 'Keep an eye on it, adjust your routine and repeat the measurement.',
  red: 'Notify the flight surgeon, reduce high-risk tasks and follow the escalation protocol.',
}

// Returns 'green', 'yellow' or 'red' for one reading.
export function statusOf(type, value, value2) {
  const v = Number(value)
  switch (type) {
    case 'bp': {
      const dia = Number(value2)
      if (v >= 140 || dia >= 90 || v < 90 || dia < 60) return 'red'
      if (v >= 130 || dia >= 85) return 'yellow'
      return 'green'
    }
    case 'heartRate':
      if (v < 40 || v > 120) return 'red'
      if (v < 50 || v > 100) return 'yellow'
      return 'green'
    case 'temperature':
      if (v >= 38.1 || v < 35.5) return 'red'
      if (v >= 37.6 || v < 36.1) return 'yellow'
      return 'green'
    case 'sleep':
      if (v < 4.5) return 'red'
      if (v < 6.5) return 'yellow'
      return 'green'
    case 'bloodSugar':
      if (v < 60 || v > 180) return 'red'
      if (v < 70 || v > 140) return 'yellow'
      return 'green'
    default:
      return 'none'
  }
}

export function formatValue(r) {
  if (!r) return '–'
  const m = METRICS[r.type]
  if (r.type === 'bp') return `${r.value}/${r.value2} ${m.unit}`
  return `${Number(r.value).toFixed(m.digits)} ${m.unit}`
}

// Groups readings by type, oldest first.
export function groupReadings(readings) {
  const groups = Object.fromEntries(METRIC_KEYS.map((k) => [k, []]))
  for (const r of [...readings].sort((a, b) => a.recordedAt - b.recordedAt)) groups[r.type]?.push(r)
  return groups
}

// Red-flag detection:
//  - latest reading is red                   -> red alert
//  - last 3 readings are all yellow or worse -> yellow alert (a worrying trend)
export function detectFlags(readings) {
  const flags = []
  const groups = groupReadings(readings)
  for (const type of METRIC_KEYS) {
    const list = groups[type]
    if (!list.length) continue
    const latest = list[list.length - 1]
    const status = statusOf(type, latest.value, latest.value2)
    if (status === 'red') {
      flags.push({ type, status: 'red', reading: latest, message: `${METRICS[type].label} is outside the safe range (${formatValue(latest)}).` })
    } else {
      const last3 = list.slice(-3)
      if (last3.length === 3 && last3.every((r) => statusOf(type, r.value, r.value2) !== 'green')) {
        flags.push({ type, status: 'yellow', reading: latest, message: `${METRICS[type].label} has needed attention for 3 readings in a row.` })
      }
    }
  }
  return flags
}

// Short summary of one person's data. Used by the Health assistant (AI 1).
export function summarize(readings) {
  const groups = groupReadings(readings)
  return METRIC_KEYS.map((type) => {
    const list = groups[type]
    if (!list.length) return { type, label: METRICS[type].label, status: 'none', count: 0 }
    const latest = list[list.length - 1]
    const recent = list.slice(-7)
    const avg = (arr, key) => arr.reduce((s, r) => s + Number(r[key]), 0) / arr.length
    const first = recent[0]
    const change = Number(latest.value) - Number(first.value)
    return {
      type,
      label: METRICS[type].label,
      unit: METRICS[type].unit,
      count: list.length,
      latest: formatValue(latest),
      average7: type === 'bp' ? `${Math.round(avg(recent, 'value'))}/${Math.round(avg(recent, 'value2'))}` : avg(recent, 'value').toFixed(METRICS[type].digits),
      direction: Math.abs(change) < (type === 'temperature' || type === 'sleep' ? 0.3 : 3) ? 'steady' : change > 0 ? 'going up' : 'going down',
      status: statusOf(type, latest.value, latest.value2),
    }
  })
}
