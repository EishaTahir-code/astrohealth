import { useLiveQuery } from 'dexie-react-hooks'
import Chat from '../components/Chat'
import StatusPill from '../components/StatusPill'
import { db } from '../lib/db'
import { askAi } from '../lib/api'
import { STATUS_LABEL, summarize } from '../lib/health'
import { confidenceFor, explainOffline } from '../lib/fallbackHealth'
import { DISCLAIMER } from '../lib/safety'
import { ME } from '../data/crew'

// AI 1: Health Trends Assistant. Uses only this astronaut's own readings.
export default function HealthAssistant() {
  const readings = useLiveQuery(() => db.readings.where('userId').equals(ME).toArray(), [])
  if (!readings) return <p>Loading…</p>

  const summary = summarize(readings)
  const counts = summary.filter((m) => m.count).map((m) => m.count)
  const confidence = confidenceFor(counts.length ? Math.min(...counts) : 0)

  async function ask(question) {
    const res = await askAi('health', { question, summary })
    if (res.fallback) return { text: explainOffline(summary, question), source: 'offline', reason: res.reason, confidence }
    return { text: res.answer, source: res.source, confidence: res.source === 'ai' ? confidence : undefined }
  }

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      <section className="card">
        <h2>Health assistant</h2>
        <p className="muted small">Ask about your graphs in plain words. It only sees your own readings.</p>
        <Chat
          ask={ask}
          placeholder="For example: what does my blood pressure trend mean?"
          quickQuestions={['Explain my graphs', 'How is my sleep?', 'Write a summary for my doctor']}
          intro="Hi. I can explain your health graphs in simple words. I can't diagnose anything, and I'll tell you when something should go to the flight surgeon."
        />
        <p className="disclaimer" style={{ marginTop: '1rem' }}>{DISCLAIMER}</p>
      </section>

      <section className="card quiet">
        <h2>What the assistant sees</h2>
        <p className="muted small">Only this summary is sent, never your notes or check-ins.</p>
        <table>
          <thead>
            <tr><th>Measurement</th><th>Latest</th><th>Trend</th><th>Status</th></tr>
          </thead>
          <tbody>
            {summary.map((m) => (
              <tr key={m.type}>
                <td>{m.label}</td>
                <td className="num">{m.latest ?? '–'}</td>
                <td>{m.direction ?? '–'}</td>
                <td><StatusPill status={m.status}>{STATUS_LABEL[m.status]}</StatusPill></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small" style={{ marginTop: '0.75rem' }}>
          Confidence in explanations: <strong>{confidence}</strong>. More readings make the picture clearer.
        </p>
      </section>
    </div>
  )
}
