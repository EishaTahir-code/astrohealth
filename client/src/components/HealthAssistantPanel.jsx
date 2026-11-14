import Chat from './Chat'
import { askAi } from '../lib/api'
import { STATUS_LABEL, summarize } from '../lib/health'
import { confidenceFor, explainOffline } from '../lib/fallbackHealth'
import { DISCLAIMER } from '../lib/safety'
import { useLink } from '../lib/connection'
import { useCloudReady, useSession } from '../lib/auth'

// Why the live AI is not answering, in plain words (shown above the chat).
function aiNotice(link, cloud) {
  if (!link.online) return 'You are offline, so answers are pre-written. They still explain your own readings.'
  if (link.server === false) return 'The ground link (Supabase) cannot be reached right now, so answers are pre-written.'
  if (cloud === false) return 'You signed in while offline, so the AI is paused. Use “Reconnect” at the top of the page.'
  if (link.aiProblem === 'missing') return 'No AI key is set yet, so answers are pre-written. The app owner adds the Groq key in Supabase (Edge Functions, Secrets, GROQ_API_KEY).'
  if (link.aiProblem === 'example') return 'The AI key in Supabase is still example text, so answers are pre-written.'
  if (link.aiProblem === 'refused') return 'Groq did not accept the AI key saved in Supabase. Make a new Groq key and save it as the GROQ_API_KEY secret.'
  return null
}

// The Health assistant: explains this astronaut's own readings in plain words. Never diagnoses.
export default function HealthAssistantPanel({ readings, request }) {
  const link = useLink()
  const user = useSession()
  const cloud = useCloudReady(user?.email)
  const summary = summarize(readings)
  const counts = summary.filter((m) => m.count).map((m) => m.count)
  const confidence = confidenceFor(counts.length ? Math.min(...counts) : 0)
  const notice = aiNotice(link, cloud)

  async function ask(question) {
    const res = await askAi('health', { question, summary })
    if (res.fallback) return { text: explainOffline(summary, question), source: 'offline', reason: res.reason, confidence }
    return { text: res.answer, source: res.source, confidence: res.source === 'ai' ? confidence : undefined }
  }

  return (
    <section className="card assistant-card" id="assistant" aria-labelledby="assistant-h">
      <h2 id="assistant-h">Health assistant</h2>
      <p className="muted small">
        Ask about your readings in plain words. It only sees this summary of your own readings, never your notes or check-ins.
        Confidence: <strong>{confidence}</strong>.
      </p>
      {notice && <p className="alert yellow small">{notice}</p>}
      <Chat
        icon="ai"
        ask={ask}
        request={request}
        placeholder="For example: is my blood pressure normal?"
        quickQuestions={['Explain my readings', 'Why is my sleep low?', 'What should I do about my blood pressure?', 'Write a summary for my doctor']}
        intro="Hi. I can explain your health readings in simple words. I can't diagnose anything, and I'll tell you when something should go to the flight surgeon. Tip: click a yellow or red status to ask me about it."
      />
      <details className="small">
        <summary className="muted">What the assistant sees</summary>
        <div className="table-wrap">
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
                  <td>{STATUS_LABEL[m.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="disclaimer spaced">{DISCLAIMER}</p>
    </section>
  )
}
