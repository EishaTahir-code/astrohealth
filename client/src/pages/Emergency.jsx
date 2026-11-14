import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { raiseAlert } from '../lib/alerts'
import { syncNow } from '../lib/sync'
import { useLink } from '../lib/connection'

// Emergency escalation (TODO Phase 3) with user-selected emergency signals (PRD section 7).
const SIGNALS = [
  'Chest pain or pressure',
  'Trouble breathing',
  'Fainting, confusion or slurred speech',
  'Severe headache',
  'Heavy bleeding or injury',
  'Severe allergic reaction',
  'Thoughts of harming myself',
  'Something else feels very wrong',
]

export default function Emergency({ me }) {
  const [signals, setSignals] = useState([])
  const [details, setDetails] = useState('')
  const [sent, setSent] = useState(null)
  const link = useLink()
  const history = useLiveQuery(
    () => db.alerts.where('userId').equals(me).filter((a) => a.kind === 'emergency').reverse().sortBy('createdAt'),
    [me],
  )

  const toggle = (s) => setSignals(signals.includes(s) ? signals.filter((x) => x !== s) : [...signals, s])

  async function send(e) {
    e.preventDefault()
    const message = [signals.length ? signals.join('; ') : 'Help requested', details.trim()].filter(Boolean).join('. ')
    const alert = await raiseAlert({ userId: me, kind: 'emergency', severity: 'red', message, signals })
    setSent(alert.uid)
    setSignals([])
    setDetails('')
    syncNow()
  }

  return (
    <div className="grid grid-2 top">
      <form className="card emergency-card" onSubmit={send} aria-labelledby="send-h">
        <h2 id="send-h">Send a help signal</h2>
        <p>If this could be life-threatening, start your emergency protocol now and alert the crew. This signal tells the flight surgeon at the same time.</p>
        <fieldset className="scale-field">
          <legend className="scale-legend">What is happening? (choose any)</legend>
          <div className="signal-grid">
            {SIGNALS.map((s) => (
              <label key={s}>
                <input type="checkbox" checked={signals.includes(s)} onChange={() => toggle(s)} />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="help-details">
            Anything else? <span className="hint">(optional)</span>
          </label>
          <textarea id="help-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} />
        </div>
        <button className="btn danger big wide" type="submit">
          Send help signal to the flight surgeon
        </button>
        <div aria-live="assertive" className="spaced">
          {sent && (
            <p className="alert red flush">
              Help signal saved. {link.open ? 'Sending to the flight surgeon now.' : 'No ground link right now: it will send the moment the link opens.'} Tell a crewmate how you feel.
            </p>
          )}
        </div>
      </form>

      <div className="stack">
        <section className="card">
          <h2>While you wait</h2>
          <ol className="steps">
            <li>Tell a crewmate now. Do not stay alone.</li>
            <li>Stop any high-risk task and move somewhere safe.</li>
            <li>Follow the emergency procedure in your medical checklist.</li>
            <li>Get the medical kit ready. The flight surgeon will guide you over a private medical conference.</li>
            <li>If you are thinking about harming yourself, tell a crewmate and the flight surgeon. You deserve support right away.</li>
          </ol>
        </section>

        <section className="card quiet">
          <h2>Signals you sent</h2>
          {!history?.length ? (
            <p className="muted">None.</p>
          ) : (
            <ul className="notes">
              {history.map((a) => (
                <li key={a.uid}>
                  {a.message}
                  <span className="meta">
                    {new Date(a.createdAt).toLocaleString()} ·{' '}
                    {a.reviewed ? `Reviewed by ${a.reviewedBy}` : a.synced ? 'Received by the flight surgeon' : 'Waiting for the ground link'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
