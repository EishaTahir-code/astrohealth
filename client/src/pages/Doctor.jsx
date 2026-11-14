import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import HealthOverview from '../components/HealthOverview'
import AlertnessChart from '../components/AlertnessChart'
import StatusPill from '../components/StatusPill'
import { Icon } from '../components/Icons'
import { db, newId } from '../lib/db'
import { STATUS_LABEL, detectFlags, summarize } from '../lib/health'
import { detectDecline } from '../lib/alertness'
import { ALERT_KIND_LABEL } from '../lib/alerts'
import { askAi, FALLBACK_REASONS } from '../lib/api'
import { requestSync } from '../lib/sync'
import { CREW, crewName, firstName } from '../data/crew'

// Doctor dashboard. Shows health readings, alertness, alerts, shared notes and messages only.
// It never loads check-ins, moods, private notes, journals or family messages.
// For check-ins it sees only how many days the astronaut checked in (shared by their device).
export default function Doctor({ page, doctor }) {
  let content
  if (page === 'alerts') content = <AlertsPage doctor={doctor} />
  else if (page === 'log') content = <AccessLog />
  else if (CREW.some((c) => c.id === page)) content = <Profile id={page} doctor={doctor} />
  else content = <CrewList doctor={doctor} />
  return <div className="page">{content}</div>
}

function useCrewData() {
  return useLiveQuery(async () => {
    const [readings, tests, alerts, statuses] = await Promise.all([db.readings.toArray(), db.reactionTests.toArray(), db.alerts.toArray(), db.crewStatus.toArray()])
    return { readings, tests, alerts, statuses }
  }, [])
}

function overallFor(id, data) {
  const flags = detectFlags(data.readings.filter((r) => r.userId === id))
  const reds = flags.filter((f) => f.status === 'red').length
  const yellows = flags.length - reds
  const decline = detectDecline(data.tests.filter((t) => t.userId === id))
  const open = data.alerts.filter((a) => a.userId === id && !a.reviewed)
  const emergency = open.some((a) => a.kind === 'emergency')
  const overall = emergency || reds || decline.status === 'red' ? 'red' : yellows || decline.status === 'yellow' ? 'yellow' : 'green'
  return { reds, yellows, decline, open, emergency, overall }
}

function CrewList({ doctor }) {
  const data = useCrewData()
  if (!data) return <p className="muted">Loading…</p>
  const openAlerts = data.alerts.filter((a) => !a.reviewed)

  return (
    <>
      <header className="page-head">
        <span className="tag">[ Signed in as {doctor.name} ]</span>
        <h1>Crew health</h1>
        <p>Select an astronaut to see their trends, alerts and messages. Private journals, moods and family messages are never shown.</p>
      </header>
      {openAlerts.length > 0 && (
        <div className="banner warn" role="status">
          <Icon name="alerts" />
          <p>
            {openAlerts.length} alert{openAlerts.length > 1 ? 's' : ''} to review
            {openAlerts.some((a) => a.kind === 'emergency') ? ', including an emergency signal' : ''}.
          </p>
          <a className="btn small-btn" href="#/doctor/alerts">Review alerts</a>
        </div>
      )}
      <div className="grid grid-3">
        {CREW.map((p) => {
          const o = overallFor(p.id, data)
          const status = data.statuses.find((s) => s.userId === p.id)
          return (
            <a key={p.id} className={`card crew-card status-${o.overall}`} href={`#/doctor/${p.id}`}>
              <div className="row spread">
                <span className="crew-name">
                  <Icon name="person" size={24} />
                  <h2>{p.name}</h2>
                </span>
                <StatusPill status={o.overall}>{o.emergency ? 'Emergency' : o.overall === 'red' ? 'Red flag' : o.overall === 'yellow' ? 'Watch' : 'Stable'}</StatusPill>
              </div>
              <p className="muted">{p.role}</p>
              <p className="small">
                {o.reds} red flag{o.reds === 1 ? '' : 's'}, {o.yellows} to watch
                {o.decline.status === 'red' ? ', large alertness drop' : o.decline.status === 'yellow' ? ', alertness lower' : ''}.
              </p>
              <p className="small muted">
                {o.open.length} open alert{o.open.length === 1 ? '' : 's'}. {status?.checkins7 != null ? `Checked in ${status.checkins7} of the last 7 days.` : 'No check-in count shared yet.'}
              </p>
              <span className="text-link">Open profile</span>
            </a>
          )
        })}
      </div>
    </>
  )
}

const TABS = [
  ['overview', 'Overview'],
  ['trends', 'Health trends'],
  ['alertness', 'Alertness'],
  ['alerts', 'Alerts'],
  ['notes', 'Notes'],
  ['messages', 'Messages'],
]

function Profile({ id, doctor }) {
  const [tab, setTab] = useState('overview')
  const data = useLiveQuery(async () => {
    const [readings, tests, alerts, shared, notes, messages, status] = await Promise.all([
      db.readings.where('userId').equals(id).toArray(),
      db.reactionTests.where('userId').equals(id).toArray(),
      db.alerts.where('userId').equals(id).reverse().sortBy('createdAt'),
      db.sharedNotes.where('userId').equals(id).reverse().sortBy('createdAt'),
      db.doctorNotes.where('userId').equals(id).reverse().sortBy('createdAt'),
      db.careMessages.where('userId').equals(id).sortBy('createdAt'),
      db.crewStatus.get(id),
    ])
    return { readings, tests, alerts, shared, notes, messages, status }
  }, [id])
  const person = CREW.find((c) => c.id === id)

  // Audit log: record that this doctor opened this profile (synced to the server's log too).
  useEffect(() => {
    db.auditLog.add({ uid: newId(), doctor: doctor.email, astronautId: id, at: Date.now(), synced: false }).then(requestSync).catch(() => {})
  }, [id, doctor.email])

  return (
    <>
      <a className="back-link" href="#/doctor">
        <Icon name="back" size={18} /> Back to crew list
      </a>
      <header className="page-head">
        <span className="tag">[ {person.role} ]</span>
        <h1>{crewName(id)}</h1>
        <p>Health readings, alertness, alerts, shared notes and messages only. This visit is recorded in the access log.</p>
      </header>
      <div className="tabs" role="tablist" aria-label="Profile sections">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
            {label}
            {key === 'alerts' && data?.alerts.some((a) => !a.reviewed) ? ` (${data.alerts.filter((a) => !a.reviewed).length})` : ''}
          </button>
        ))}
      </div>
      {!data ? (
        <p className="muted">Loading…</p>
      ) : (
        <div role="tabpanel">
          {tab === 'overview' && <Overview id={id} data={data} />}
          {tab === 'trends' && <HealthOverview readings={data.readings} forDoctor />}
          {tab === 'alertness' && <AlertnessChart tests={data.tests} forDoctor />}
          {tab === 'alerts' && <AlertList alerts={data.alerts} doctor={doctor} />}
          {tab === 'notes' && <Notes id={id} data={data} doctor={doctor} />}
          {tab === 'messages' && <Messages id={id} messages={data.messages} doctor={doctor} />}
          <p className="disclaimer spaced">Demo thresholds and made-up data. Use clinical judgement and mission protocol.</p>
        </div>
      )}
    </>
  )
}

function Overview({ id, data }) {
  const summary = summarize(data.readings)
  const flags = detectFlags(data.readings)
  const decline = detectDecline(data.tests)
  const open = data.alerts.filter((a) => !a.reviewed)
  const [ai, setAi] = useState(null)
  const [busy, setBusy] = useState(false)

  async function write() {
    setBusy(true)
    const alertness = decline.status === 'none' ? 'Not enough tests' : `Latest ${decline.latest}, usual about ${decline.baseline}, status ${decline.status}`
    const payload = { name: crewName(id), summary, alertness, flags: flags.map((f) => f.message), checkins: data.status?.checkins7 ?? 0 }
    const res = await askAi('doctor-summary', payload)
    setAi(res.fallback ? { text: offlineSummary(id, summary, flags, decline, data.status), source: 'offline', reason: res.reason } : { text: res.answer, source: 'ai' })
    setBusy(false)
  }

  return (
    <div className="grid grid-2 top">
      <section className="card">
        <h2>AI summary</h2>
        <p className="muted small">A short overview of the shareable data, written by the Health AI. It does not diagnose.</p>
        {ai && (
          <div className="bubble ai spaced-sm" style={{ maxWidth: 'none' }}>
            <div className="bubble-text">
              {ai.text}
              <span className="source">{ai.source === 'ai' ? 'Written by the AI from the data shown here.' : FALLBACK_REASONS[ai.reason] ?? 'Pre-written summary.'}</span>
            </div>
          </div>
        )}
        <button type="button" className="btn spaced" onClick={write} disabled={busy}>
          {busy ? 'Writing…' : ai ? 'Write it again' : 'Write AI summary'}
        </button>
      </section>
      <section className="card quiet">
        <h2>At a glance</h2>
        <ul className="metric-list">
          {summary.map((m) => (
            <li key={m.type}>
              <span>{m.label}</span>
              <span className="num">{m.latest ?? '–'}</span>
              <StatusPill status={m.status}>{STATUS_LABEL[m.status]}</StatusPill>
            </li>
          ))}
        </ul>
        <p className="small">
          {open.length} open alert{open.length === 1 ? '' : 's'}. Garden: {data.status?.stage ?? 'not shared'}.{' '}
          {data.status?.checkins7 != null ? `Checked in ${data.status.checkins7} of the last 7 days.` : 'No check-in count shared yet.'}
        </p>
      </section>
    </div>
  )
}

function offlineSummary(id, summary, flags, decline, status) {
  const lines = [`Summary for ${firstName(id)} (pre-written, offline):`]
  const reds = flags.filter((f) => f.status === 'red')
  if (reds.length) lines.push(`- Red: ${reds.map((f) => f.message).join(' ')}`)
  const watch = summary.filter((m) => m.status === 'yellow').map((m) => `${m.label} ${m.latest} (${m.direction})`)
  if (watch.length) lines.push(`- Needs attention: ${watch.join('; ')}.`)
  if (decline.status === 'red' || decline.status === 'yellow') lines.push(`- Alertness ${decline.latest}, usual about ${decline.baseline}.`)
  if (status?.checkins7 != null) lines.push(`- Checked in ${status.checkins7} of the last 7 days.`)
  if (lines.length === 1) lines.push('- No red flags. Latest readings are stable.')
  lines.push('- Based on limited demo data; worth reviewing with the astronaut.')
  return lines.join('\n')
}

function AlertList({ alerts, doctor, showName = false }) {
  const [notes, setNotes] = useState({})
  async function review(a) {
    await db.alerts.update(a.id, { reviewed: true, reviewedBy: doctor.name, reviewedAt: Date.now(), reviewNote: notes[a.uid] ?? '', reviewPending: true, synced: false })
    requestSync()
  }
  if (!alerts.length) return <p className="muted">No alerts.</p>
  return (
    <div>
      {alerts.map((a) => (
        <div key={a.uid} className="alert-row">
          <div>
            <div className="row">
              <StatusPill status={a.reviewed ? 'none' : 'red'}>{a.reviewed ? 'Reviewed' : 'Open'}</StatusPill>
              <strong>
                {showName ? `${crewName(a.userId)}: ` : ''}
                {ALERT_KIND_LABEL[a.kind] ?? a.kind}
              </strong>
            </div>
            <p>{a.message}</p>
            <p className="small muted">
              {new Date(a.createdAt).toLocaleString()}
              {a.reviewed ? `. Reviewed by ${a.reviewedBy}${a.reviewNote ? `: ${a.reviewNote}` : ''}.` : ''}
            </p>
          </div>
          {!a.reviewed && (
            <div style={{ display: 'grid', gap: '0.4rem', minWidth: 200 }}>
              <label htmlFor={`rn-${a.uid}`} className="sr-only">
                Review note
              </label>
              <input id={`rn-${a.uid}`} type="text" placeholder="Note (optional)" value={notes[a.uid] ?? ''} onChange={(e) => setNotes({ ...notes, [a.uid]: e.target.value })} />
              <button type="button" className="btn small-btn" onClick={() => review(a)}>
                Mark reviewed
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function AlertsPage({ doctor }) {
  const [show, setShow] = useState('open')
  const alerts = useLiveQuery(() => db.alerts.reverse().sortBy('createdAt'), [])
  if (!alerts) return <p className="muted">Loading…</p>
  const list = alerts.filter((a) => (show === 'open' ? !a.reviewed : true))
  return (
    <>
      <header className="page-head">
        <span className="tag">[ Red-flag system ]</span>
        <h1>Alerts</h1>
        <p>Red-flag readings, large alertness drops and emergency signals from the crew. Mark each one reviewed once you have followed up.</p>
      </header>
      <div className="chips" role="group" aria-label="Which alerts">
        <button type="button" className="chip" aria-pressed={show === 'open'} onClick={() => setShow('open')}>
          Open ({alerts.filter((a) => !a.reviewed).length})
        </button>
        <button type="button" className="chip" aria-pressed={show === 'all'} onClick={() => setShow('all')}>
          All ({alerts.length})
        </button>
      </div>
      <section className="card spaced">
        <AlertList alerts={list} doctor={doctor} showName />
      </section>
    </>
  )
}

function Notes({ id, data, doctor }) {
  const [text, setText] = useState('')
  async function add(e) {
    e.preventDefault()
    if (!text.trim()) return
    await db.doctorNotes.add({ uid: newId(), userId: id, author: doctor.name, text: text.trim(), createdAt: Date.now(), synced: false })
    setText('')
    requestSync()
  }
  return (
    <div className="grid grid-2 top">
      <section className="card">
        <h2>Doctor notes</h2>
        <p className="muted small">Visible to flight surgeons only.</p>
        <ul className="notes">
          {data.notes.map((n) => (
            <li key={n.uid}>
              {n.text}
              <span className="meta">
                {n.author}, {new Date(n.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
        <form onSubmit={add}>
          <label htmlFor="doc-note">New note</label>
          <textarea id="doc-note" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="btn spaced-sm" disabled={!text.trim()}>
            Save note
          </button>
        </form>
      </section>
      <section className="card quiet">
        <h2>Notes {firstName(id)} shared</h2>
        <p className="muted small">Only notes the astronaut chose to share. Everything else stays private.</p>
        {data.shared.length ? (
          <ul className="notes">
            {data.shared.map((n) => (
              <li key={n.uid}>
                {n.text}
                <span className="meta">{n.date}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">None yet.</p>
        )}
      </section>
    </div>
  )
}

function Messages({ id, messages, doctor }) {
  const [text, setText] = useState('')
  async function send(e) {
    e.preventDefault()
    if (!text.trim()) return
    await db.careMessages.add({ uid: newId(), userId: id, from: 'doctor', author: doctor.name, text: text.trim(), createdAt: Date.now(), read: false, synced: false })
    setText('')
    requestSync()
  }
  return (
    <section className="card">
      <h2>Messages with {firstName(id)}</h2>
      <div className="thread" aria-live="polite">
        {messages.map((m) => (
          <div key={m.uid} className={`msg ${m.from === 'doctor' ? 'out' : 'in'}`}>
            {m.text}
            <span className="meta">
              <span>{m.from === 'doctor' ? m.author : firstName(id)}</span>
              <span>{new Date(m.createdAt).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              {m.from === 'doctor' && <span>{m.synced ? 'Delivered' : 'Waiting to sync'}</span>}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={send}>
        <label htmlFor="doc-msg" className="sr-only">
          Message to {firstName(id)}
        </label>
        <textarea id="doc-msg" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Write to ${firstName(id)}…`} />
        <button type="submit" className="btn spaced-sm" disabled={!text.trim()}>
          Send message
        </button>
      </form>
    </section>
  )
}

function AccessLog() {
  const log = useLiveQuery(() => db.auditLog.reverse().sortBy('at'), [])
  return (
    <>
      <header className="page-head">
        <span className="tag">[ Security ]</span>
        <h1>Access log</h1>
        <p>Every time a flight surgeon opens an astronaut&apos;s profile, it is recorded here and on the server.</p>
      </header>
      <section className="card">
        {!log ? (
          <p className="muted">Loading…</p>
        ) : !log.length ? (
          <p className="muted">No profile views yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Doctor</th>
                  <th>Astronaut</th>
                  <th>Synced</th>
                </tr>
              </thead>
              <tbody>
                {log.slice(0, 200).map((e) => (
                  <tr key={e.uid ?? e.id}>
                    <td className="num">{new Date(e.at).toLocaleString()}</td>
                    <td>{e.doctor}</td>
                    <td>{crewName(e.astronautId)}</td>
                    <td>{e.synced ? 'Yes' : 'Waiting'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
