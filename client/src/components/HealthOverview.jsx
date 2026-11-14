import TrendChart from './TrendChart'
import { METRIC_KEYS, STATUS_ACTION, detectFlags, groupReadings } from '../lib/health'

// Red-flag alerts + one trend graph per measurement.
// Used by the astronaut's Health tab and by the doctor dashboard.
export default function HealthOverview({ readings, forDoctor = false }) {
  const groups = groupReadings(readings)
  const flags = detectFlags(readings)

  return (
    <div className="stack">
      <RedFlags flags={flags} forDoctor={forDoctor} />
      <div className="grid grid-2">
        {METRIC_KEYS.map((type) => (
          <TrendChart key={type} type={type} readings={groups[type]} />
        ))}
      </div>
    </div>
  )
}

export function RedFlags({ flags, forDoctor }) {
  if (!flags.length) {
    return (
      <div className="alert green" role="status">
        No red flags right now. All latest readings are stable or only slightly off.
      </div>
    )
  }
  const reds = flags.filter((f) => f.status === 'red')
  const yellows = flags.filter((f) => f.status === 'yellow')
  return (
    <div className="stack" role="status">
      {reds.length > 0 && (
        <div className="alert red">
          <h3 style={{ marginBottom: '0.35rem' }}>Red flag{reds.length > 1 ? 's' : ''}</h3>
          <ul style={{ margin: '0 0 0.5rem', paddingLeft: '1.2rem' }}>
            {reds.map((f) => <li key={f.type}>{f.message}</li>)}
          </ul>
          <p style={{ margin: 0 }}>
            <strong>{forDoctor ? 'Suggested review: ' : 'What to do: '}</strong>
            {forDoctor ? 'Contact the astronaut and review against mission protocol.' : STATUS_ACTION.red}
          </p>
        </div>
      )}
      {yellows.length > 0 && (
        <div className="alert yellow">
          <h3 style={{ marginBottom: '0.35rem' }}>Needs attention</h3>
          <ul style={{ margin: '0 0 0.5rem', paddingLeft: '1.2rem' }}>
            {yellows.map((f) => <li key={f.type}>{f.message}</li>)}
          </ul>
          {!forDoctor && <p style={{ margin: 0 }}>{STATUS_ACTION.yellow}</p>}
        </div>
      )}
    </div>
  )
}
