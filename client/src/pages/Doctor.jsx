import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import HealthOverview from '../components/HealthOverview'
import AlertnessChart from '../components/AlertnessChart'
import StatusPill from '../components/StatusPill'
import { Icon } from '../components/Icons'
import { db } from '../lib/db'
import { detectFlags } from '../lib/health'
import { detectDecline } from '../lib/alertness'
import { CREW, crewName } from '../data/crew'

// Doctor dashboard. Shows health readings, alertness and red flags only.
// It never loads check-in notes, moods, journals or family messages.
// Sign in and sign out are handled by the sign-in page and the sidebar.
export default function Doctor({ astronautId, doctor }) {
  return (
    <div className="page">
      {astronautId && CREW.some((c) => c.id === astronautId) ? (
        <Profile id={astronautId} doctor={doctor} />
      ) : (
        <CrewList doctor={doctor} />
      )}
    </div>
  )
}

function CrewList({ doctor }) {
  const readings = useLiveQuery(() => db.readings.toArray(), [])
  const tests = useLiveQuery(() => db.reactionTests.toArray(), [])
  if (!readings || !tests) return <p>Loading…</p>

  return (
    <>
      <header className="page-head">
        <p className="today-date">Signed in as {doctor.name}</p>
        <h1>Crew health</h1>
        <p>Select an astronaut to see their trends and alerts. Private journals, moods and family messages are not shown.</p>
      </header>
      <div className="grid grid-3">
        {CREW.map((p) => {
          const flags = detectFlags(readings.filter((r) => r.userId === p.id))
          const reds = flags.filter((f) => f.status === 'red').length
          const yellows = flags.length - reds
          const alert = detectDecline(tests.filter((t) => t.userId === p.id))
          const overall = reds || alert.status === 'red' ? 'red' : yellows || alert.status === 'yellow' ? 'yellow' : 'green'
          return (
            <a key={p.id} className={`card crew-card status-${overall}`} href={`#/doctor/${p.id}`} style={{ '--icon-accent': p.flower }}>
              <div className="row spread">
                <span className="crew-name">
                  <Icon name="person" size={24} />
                  <h2>{p.name}</h2>
                </span>
                <StatusPill status={overall}>
                  {overall === 'red' ? 'Red flag' : overall === 'yellow' ? 'Watch' : 'Stable'}
                </StatusPill>
              </div>
              <p className="muted">{p.role}</p>
              <p className="small">
                {reds} red flag{reds === 1 ? '' : 's'}, {yellows} to watch
                {alert.status === 'red' ? ', large alertness drop' : alert.status === 'yellow' ? ', alertness lower' : ''}
              </p>
              <span className="text-link">Open profile</span>
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
      <a className="back-link" href="#/doctor">
        <Icon name="back" size={18} /> Back to crew list
      </a>
      <header className="page-head">
        <h1>{crewName(id)}</h1>
        <p>{person.role}. Health readings and alertness only. This visit is recorded in the access log.</p>
      </header>
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
