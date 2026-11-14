import { useLiveQuery } from 'dexie-react-hooks'
import FlowerBed from '../components/FlowerBed'
import StatusPill from '../components/StatusPill'
import { db } from '../lib/db'
import { scoreGarden } from '../lib/garden'
import { CREW } from '../data/crew'

// Shared crew garden. No login. Shows only garden status, never health data.
export default function Garden() {
  const checkIns = useLiveQuery(() => db.checkIns.toArray(), [])

  return (
    <div className="page">
      <header className="page-head">
        <h1>Crew garden</h1>
        <p>
          Each crew member has a flower bed. It grows with daily check-ins and good rest, and wilts when routines slip.
          It shows general well-being only: no health numbers, moods or notes.
        </p>
      </header>

      {!checkIns ? (
        <p>Loading…</p>
      ) : (
        <div className="garden-plot">
          {CREW.map((person) => {
            const g = scoreGarden(checkIns.filter((c) => c.userId === person.id))
            const first = person.name.split(' ')[0]
            return (
              <article className="card bed-card" key={person.id}>
                <div className="row spread">
                  <div>
                    <h2 className="bed-name">{person.name}</h2>
                    <span className="muted small">{person.role}</span>
                  </div>
                  <StatusPill status={g.status}>{g.label}</StatusPill>
                </div>
                <FlowerBed stage={g.stage} color={person.flower} label={`${person.name}'s flower bed: ${g.label}`} />
                <p className="muted small bed-note">{g.note}</p>
                {g.status === 'red' && (
                  <p className="alert yellow small support-note">
                    {first}&apos;s garden may need extra support today. Consider checking in with {first} or offering help.
                  </p>
                )}
              </article>
            )
          })}
        </div>
      )}

      <section className="card quiet garden-how">
        <h2>How a bed grows</h2>
        <p>Daily check-ins and good sleep help it grow. Poor sleep, high stress and missed check-ins make it wilt.</p>
        <ol className="stage-row" aria-label="Garden stages, from empty to blooming">
          {[
            ['empty', 'Empty'],
            ['wilting', 'Wilting'],
            ['needsCare', 'Needs care'],
            ['growing', 'Growing'],
            ['blooming', 'Blooming'],
          ].map(([stage, label]) => (
            <li key={stage}>
              <FlowerBed stage={stage} color="var(--lavender)" label={`${label} bed`} />
              <span>{label}</span>
            </li>
          ))}
        </ol>
        <p className="muted small flush">
          Demo with made-up crew data. The garden is a gentle nudge to look out for each other, not a medical score.
        </p>
      </section>
    </div>
  )
}
