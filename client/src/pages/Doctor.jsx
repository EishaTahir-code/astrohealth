import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import HealthOverview from '../components/HealthOverview'
import AlertnessChart from '../components/AlertnessChart'
import StatusPill from '../components/StatusPill'
import { db } from '../lib/db'
import { currentDoctor, login, logout } from '../lib/auth'
import { detectFlags } from '../lib/health'
import { detectDecline } from '../lib/alertness'
import { CREW, crewName } from '../data/crew'

// Doctor dashboard. Shows health readings, alertness and red flags only.
// It never loads check-in notes, moods, journals or family messages.
export default function Doctor({ astronautId }) {
  const [doctor, setDoctor] = useState(currentDoctor)

  if (!doctor) return <Login onLogin={setDoctor} />

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span className="muted">Signed in as {doctor.name}</span>
        <button
          className="btn secondary"
          type="button"
          onClick={() => {
            logout()
            setDoctor(null)
          }}
        >
          Sign out
        </button>
      </div>
      {astronautId && CREW.some((c) => c.id === astronautId) ? (
        <Profile id={astronautId} doctor={doctor} />
      ) : (
        <CrewList />
      )}
    </div>
  )
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    const session = login(email, password)
    if (session) onLogin(session)
    else setError('That email and password do not match a doctor account. Check both and try again.')
  }

  return (
    <div className="page" style={{ maxWidth: 460 }}>
      <form className="card" onSubmit={submit} noValidate>
        <h1>Doctor sign in</h1>
        <p className="muted small">For flight surgeons only.</p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" style={{ color: 'var(--bad)' }}>{error}</p>}
        <button className="btn" type="submit">Sign in</button>
        <div className="alert info small" style={{ marginTop: '1rem' }}>
          Demo account: <strong>dr.rivera@orbloom.demo</strong> with password <strong>demo1234</strong>. Fake login,
          not real security.
        </div>
      </form>
    </div>
  )
}

function CrewList() {
  const readings = useLiveQuery(() => db.readings.toArray(), [])
  const tests = useLiveQuery(() => db.reactionTests.toArray(), [])
  if (!readings || !tests) return <p>Loading…</p>

  return (
    <>
      <div className="page-head">
        <h1>Crew health</h1>
        <p>Select an astronaut to see their trends and alerts. Private journals, moods and family messages are not shown.</p>
      </div>
      <div className="grid grid-3">
        {CREW.map((p) => {
          const flags = detectFlags(readings.filter((r) => r.userId === p.id))
          const reds = flags.filter((f) => f.status === 'red').length
          const yellows = flags.length - reds
          const alert = detectDecline(tests.filter((t) => t.userId === p.id))
          const overall = reds || alert.status === 'red' ? 'red' : yellows || alert.status === 'yellow' ? 'yellow' : 'green'
          return (
            <a key={p.id} className="door" href={`#/doctor/${p.id}`}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0 }}>{p.name}</h2>
                <StatusPill status={overall}>
                  {overall === 'red' ? 'Red flag' : overall === 'yellow' ? 'Watch' : 'Stable'}
                </StatusPill>
              </div>
              <p>{p.role}</p>
              <p className="small">
                {reds} red flag{reds === 1 ? '' : 's'}, {yellows} to watch
                {alert.status === 'red' ? ', large alertness drop' : alert.status === 'yellow' ? ', alertness lower' : ''}
              </p>
            </a>
          )
        })}
      </div>
    </>
  )
}

function Profile({ id, doctor }) {
  const readings = useLiveQuery(() => db.readings.where('userId').equals(id).toArray(), [id])
  const tests = useLiveQuery(() => db.reactionTests.where('userId').equals(id).toArray(), [id])
  const person = CREW.find((c) => c.id === id)

  // Audit log: record that this doctor opened this profile.
  useEffect(() => {
    db.auditLog.add({ doctor: doctor.email, astronautId: id, at: Date.now() }).catch(() => {})
  }, [id, doctor.email])

  return (
    <>
      <p><a href="#/doctor">Back to crew list</a></p>
      <div className="page-head">
        <h1>{crewName(id)}</h1>
        <p>
          {person.role}. Health readings and alertness only. This visit is recorded in the access log.
        </p>
      </div>
      {!readings || !tests ? (
        <p>Loading…</p>
      ) : (
        <div className="stack">
          <HealthOverview readings={readings} forDoctor />
          <AlertnessChart tests={tests} forDoctor />
          <p className="disclaimer">Demo thresholds and made-up data. Use clinical judgement and mission protocol.</p>
        </div>
      )}
    </>
  )
}
