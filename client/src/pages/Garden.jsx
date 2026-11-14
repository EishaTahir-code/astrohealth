import { useCallback, useRef, useState } from 'react'
import FlowerBed from '../components/FlowerBed'
import InteractiveGarden from '../components/InteractiveGarden'
import StatusPill from '../components/StatusPill'
import { useCrewGarden } from '../lib/support'
import { firstName } from '../data/crew'

// Shared crew garden. No login. Shows only garden status, never health data.
// The top is an interactive night meadow: move the mouse (or drag a finger) to stir the flowers.
export default function Garden({ user }) {
  const crew = useCrewGarden()
  const hero = useRef(null)
  const [picked, setPicked] = useState(null)

  // The headline drifts a little with the pointer, for depth.
  const onMove = (e) => {
    const r = hero.current?.getBoundingClientRect()
    if (!r) return
    hero.current.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
    hero.current.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
  }

  // Clicking someone's part of the meadow jumps to their bed card.
  const onSelect = useCallback((id) => {
    setPicked(id)
    const card = document.getElementById(`bed-${id}`)
    card?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
    card?.focus({ preventScroll: true })
  }, [])

  const zones = (crew ?? []).map(({ person, garden }) => ({ id: person.id, name: firstName(person.id), stage: garden.stage, label: garden.label, color: person.flower }))
  const summary = (crew ?? []).map(({ person, garden }) => `${person.name}: ${garden.label}`).join('. ')

  return (
    <div className="garden-page">
      <section ref={hero} className="garden-hero" onPointerMove={onMove} aria-labelledby="garden-h">
        {crew && <InteractiveGarden zones={zones} onSelect={onSelect} label={`Interactive night meadow with one patch of flowers per crew member. ${summary}.`} />}
        <div className="garden-hero-copy">
          <span className="tag">[ Shared / no sign-in needed ]</span>
          <h1 id="garden-h">Crew garden</h1>
          <p>Each crew member tends a patch of night flowers. Check-ins, rest and greenhouse care make it bloom; it wilts when routines slip.</p>
          <span className="tag dim garden-hint">[ Move or drag to stir the flowers. Tap a patch to see that bed. ]</span>
        </div>
      </section>

      <div className="page">
        {!crew ? (
          <p className="muted">Loading…</p>
        ) : (
          <div className="garden-plot">
            {crew.map(({ person, garden, supportOk }) => (
              <article className={`card ${picked === person.id ? 'picked' : ''}`} key={person.id} id={`bed-${person.id}`} tabIndex={-1}>
                <div className="row spread">
                  <div>
                    <h2 className="bed-name">{person.name}</h2>
                    <span className="muted small">{person.role}</span>
                  </div>
                  <StatusPill status={garden.status}>{garden.label}</StatusPill>
                </div>
                <FlowerBed stage={garden.stage} color={person.flower} label={`${person.name}'s flower bed: ${garden.label}`} />
                <p className="muted small bed-note">{garden.note}</p>
                {garden.status === 'red' && supportOk && person.id !== user?.crewId && (
                  <p className="alert yellow small support-note">
                    {firstName(person.id)}&apos;s garden may need extra support today. Consider checking in with {firstName(person.id)} or offering help.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}

        <section className="card quiet garden-how">
          <h2>How a bed grows</h2>
          <p>Daily check-ins, good sleep and greenhouse care help it grow. Poor sleep, high stress and missed check-ins make it wilt.</p>
          <ol className="stage-row" aria-label="Garden stages, from empty to blooming">
            {[
              ['empty', 'Empty'],
              ['wilting', 'Wilting'],
              ['needsCare', 'Needs care'],
              ['growing', 'Growing'],
              ['blooming', 'Blooming'],
            ].map(([stage, label]) => (
              <li key={stage}>
                <FlowerBed stage={stage} label={`${label} bed`} />
                <span>{label}</span>
              </li>
            ))}
          </ol>
          <p className="muted small flush">
            Demo with made-up crew data. The garden is a gentle nudge to look out for each other, not a medical score. Anyone can pause or turn off support alerts about themselves in Settings.
          </p>
        </section>
      </div>
    </div>
  )
}
