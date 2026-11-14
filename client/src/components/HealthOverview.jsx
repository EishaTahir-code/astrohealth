import TrendChart from './TrendChart'
import { METRIC_KEYS, STATUS_ACTION, detectFlags, groupReadings } from '../lib/health'

// Red-flag alerts + one trend graph per measurement.
// Used by the astronaut's Health tab and by the doctor dashboard.
export default function HealthOverview({ readings, forDoctor = false, onAsk }) {
  const groups = groupReadings(readings)
  const flags = detectFlags(readings)

  return (
    <div className="stack">
      <RedFlags flags={flags} forDoctor={forDoctor} onAsk={onAsk} />
      <div className="grid grid-2">
        {METRIC_KEYS.map((type) => (
          <TrendChart key={type} type={type} readings={groups[type]} onAsk={forDoctor ? undefined : onAsk} />
        ))}
      </div>
    </div>
  )
}

export function RedFlags({ flags, forDoctor, onAsk }) {
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
          <h3 className="alert-title">Red flag{reds.length > 1 ? 's' : ''}</h3>
          <ul className="alert-list">
            {reds.map((f) => (
              <li key={f.type}>
                {f.message}{' '}
                {onAsk && !forDoctor && (
                  <button type="button" className="link-btn small" onClick={() => onAsk(f.type, f.reading)}>
                    Ask the assistant
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="flush">
            <strong>{forDoctor ? 'Suggested review: ' : 'What to do: '}</strong>
            {forDoctor ? 'Contact the astronaut and review against mission protocol.' : STATUS_ACTION.red}
          </p>
        </div>
      )}
      {yellows.length > 0 && (
        <div className="alert yellow">
          <h3 className="alert-title">Needs attention</h3>
          <ul className="alert-list">
            {yellows.map((f) => <li key={f.type}>{f.message}</li>)}
          </ul>
          {!forDoctor && <p className="flush">{STATUS_ACTION.yellow}</p>}
        </div>
      )}
    </div>
  )
}
