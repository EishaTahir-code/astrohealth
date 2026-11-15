import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import StatusPill from './StatusPill'
import { METRICS, STATUS_LABEL, formatValue, statusOf } from '../lib/health'

// One trend graph for one measurement. The shaded band is the reference "stable" range.
export default function TrendChart({ type, readings, onAsk }) {
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
      <div className="row spread">
        <h3 className="chart-title">{m.label}</h3>
        <StatusPill status={status} onAsk={onAsk && latest ? () => onAsk(type, latest) : undefined}>
          {STATUS_LABEL[status]}
        </StatusPill>
      </div>
      <p className="muted small chart-sub">
        Latest: {formatValue(latest)}, from {readings.length} readings. Normal: {m.band[0]}–{m.band[1]}
        {m.band2 ? ` top, ${m.band2[0]}–${m.band2[1]} bottom` : ''} {m.unit}.
      </p>
      {!readings.length ? (
        <p className="muted">No readings yet. Add one above to start this graph.</p>
      ) : (
        <div
          role="img"
          aria-label={`${m.label} trend over ${readings.length} readings. Latest ${formatValue(latest)}, ${STATUS_LABEL[status]}.`}
          className="chart-box"
        >
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <ReferenceArea y1={m.band[0]} y2={m.band[1]} fill="var(--leaf)" fillOpacity={0.1} ifOverflow="extendDomain" />
              {m.band2 && <ReferenceArea y1={m.band2[0]} y2={m.band2[1]} fill="var(--teal-2)" fillOpacity={0.12} ifOverflow="extendDomain" />}
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--muted)' }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: 'var(--panel-solid)', border: '1px solid var(--line-strong)', borderRadius: 10, color: 'var(--ink)' }} />
              {type === 'bp' && <Legend wrapperStyle={{ fontSize: 12 }} />}
              <Line
                type="monotone"
                dataKey="value"
                name={type === 'bp' ? 'Systolic (top)' : `${m.label} (${m.unit})`}
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 2.5, fill: 'var(--lime)', strokeWidth: 0 }}
                isAnimationActive={false}
              />
              {type === 'bp' && (
                <Line type="monotone" dataKey="value2" name="Diastolic (bottom)" stroke="var(--teal-2)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2.5, fill: 'var(--teal-2)', strokeWidth: 0 }} isAnimationActive={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
