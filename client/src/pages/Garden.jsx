import { useLiveQuery } from 'dexie-react-hooks'
import FlowerBed from '../components/FlowerBed'
import StatusPill from '../components/StatusPill'
import { db } from '../lib/db'
import { scoreGarden } from '../lib/garden'
import { CREW } from '../data/crew'

const PETALS = { a1: '#d77fa1', a2: '#7a9be0', a3: '#e39a5b' }

// Shared crew garden. No login. Shows only garden status, never health data.
export default function Garden() {
  const checkIns = useLiveQuery(() => db.checkIns.toArray(), [])

  return (
    <div className="page">
      <div className="page-head">
        <h1>Crew garden</h1>
        <p>
          Each crew member has a flower bed. It grows with daily check-ins and good rest, and wilts when routines slip.
          It shows general well-being only: no health numbers, moods or notes.
        </p>
      </div>

      {!checkIns ? (
        <p>Loading…</p>
      ) : (
        <div className="grid grid-3">
          {CREW.map((person) => {
            const g = scoreGarden(checkIns.filter((c) => c.userId === person.id))
            return (
              <article className="card" key={person.id}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>{person.name}</h2>
                    <span className="muted small">{person.role}</span>
                  </div>
                  <StatusPill status={g.status}>{g.label}</StatusPill>
                </div>
                <FlowerBed stage={g.stage} color={PETALS[person.id]} label={`${person.name}'s flower bed: ${g.label}`} />
                <p className="muted small" style={{ margin: 0 }}>{g.note}</p>
                {g.status === 'red' && (
                  <p className="alert yellow small" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                    {person.name.split(' ')[0]}&apos;s garden may need extra support today. Consider checking in with{' '}
                    {person.name.split(' ')[0]} or offering help.
                  </p>
                )}
              </article>
            )
          })}
        </div>
      )}

      <section className="card quiet" style={{ marginTop: '1.5rem' }}>
        <h2>How a bed grows</h2>
        <p>Daily check-ins and good sleep help it grow. Poor sleep, high stress and missed check-ins make it wilt.</p>
        <p className="muted small" style={{ margin: 0 }}>
          Demo with made-up crew data. The garden is a gentle nudge to look out for each other, not a medical score.
        </p>
      </section>
    </div>
  )
}
