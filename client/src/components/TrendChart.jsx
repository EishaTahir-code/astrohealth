import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import StatusPill from './StatusPill'
import { METRICS, STATUS_LABEL, formatValue, statusOf } from '../lib/health'

// One trend graph for one measurement. The shaded band is the demo "stable" range.
export default function TrendChart({ type, readings }) {
  const m = METRICS[type]
  const data = readings.map((r) => ({
    day: new Date(r.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: Number(r.value),
    value2: r.value2 != null ? Number(r.value2) : undefined,
  }))
  const latest = readings[readings.length - 1]
  const status = latest ? statusOf(type, latest.value, latest.value2) : 'none'

  return (
    <section className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>{m.label}</h3>
        <StatusPill status={status}>{STATUS_LABEL[status]}</StatusPill>
      </div>
      <p className="muted small" style={{ margin: '0.25rem 0 0.5rem' }}>
        Latest: {formatValue(latest)}, from {readings.length} readings
      </p>
      {!readings.length ? (
        <p className="muted">No readings yet. Add one above to start this graph.</p>
      ) : (
        <div
          role="img"
          aria-label={`${m.label} trend over ${readings.length} readings. Latest ${formatValue(latest)}, ${STATUS_LABEL[status]}.`}
          style={{ width: '100%', height: 190 }}
        >
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <ReferenceArea y1={m.band[0]} y2={m.band[1]} fill="var(--ok-soft)" fillOpacity={0.8} ifOverflow="extendDomain" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--muted)' }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8 }} />
              {type === 'bp' && <Legend wrapperStyle={{ fontSize: 12 }} />}
              <Line
                type="monotone"
                dataKey="value"
                name={type === 'bp' ? 'Systolic (top)' : `${m.label} (${m.unit})`}
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 2.5 }}
                isAnimationActive={false}
              />
              {type === 'bp' && (
                <Line type="monotone" dataKey="value2" name="Diastolic (bottom)" stroke="var(--muted)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2.5 }} isAnimationActive={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
