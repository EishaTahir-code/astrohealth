import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import StatusPill from './StatusPill'
import { ALERTNESS_ADVICE, detectDecline } from '../lib/alertness'

const LABEL = { none: 'Not enough tests yet', green: 'Usual level', yellow: 'Lower than usual', red: 'Large drop' }

// Alertness graph (one point per reaction test) plus decline status.
export default function AlertnessChart({ tests, forDoctor = false }) {
  const sorted = [...tests].sort((a, b) => a.createdAt - b.createdAt)
  const decline = detectDecline(sorted)
  const data = sorted.map((t) => ({
    day: new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: t.alertnessScore,
    ms: t.reactionTimeMs,
  }))

  return (
    <section className="card">
      <div className="row spread">
        <h3 className="chart-title">Alertness</h3>
        <StatusPill status={decline.status}>{LABEL[decline.status]}</StatusPill>
      </div>
      <p className="muted small chart-sub">
        {sorted.length
          ? `Latest score ${decline.latest ?? sorted[sorted.length - 1].alertnessScore} out of 100${decline.baseline ? `, usual about ${decline.baseline}` : ''}.`
          : 'No tests yet.'}
      </p>
      {sorted.length > 0 && (
        <div role="img" aria-label={`Alertness score over ${sorted.length} tests. ${LABEL[decline.status]}.`} className="chart-box">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--muted)' }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8 }}
                formatter={(v, name) => (name === 'score' ? [`${v} / 100`, 'Alertness'] : [v, name])}
              />
              <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {!forDoctor && decline.status !== 'green' && (
        <div className={`alert ${decline.status === 'none' ? 'info' : decline.status} small spaced-sm`}>
          {ALERTNESS_ADVICE[decline.status]}
        </div>
      )}
      {forDoctor && decline.status === 'red' && (
        <div className="alert red small spaced-sm">
          Large alertness drop. Suggest reviewing workload and high-risk tasks with the astronaut.
        </div>
      )}
    </section>
  )
}
