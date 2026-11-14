import { useCallback, useEffect, useState } from 'react'
import FlowerBed from '../components/FlowerBed'
import GardenScene from '../components/GardenScene'
import { useCrewGarden } from '../lib/support'
import { firstName } from '../data/crew'

// Shared crew garden. No login. Shows only garden status, never health data.
// Names are always on the wooden signs; a bed's details show on hover, keyboard focus or tap.
export default function Garden({ user }) {
  const crew = useCrewGarden()
  const [hovered, setHovered] = useState(null)
  const [pinned, setPinned] = useState(null)

  const onHover = useCallback((id) => setHovered(id), [])
  // Tap or click a bed (or its sign) to keep its details open; tap again or elsewhere to close.
  const onPick = useCallback((id) => setPinned((p) => (id && p !== id ? id : null)), [])

  useEffect(() => {
    const close = (e) => e.key === 'Escape' && setPinned(null)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  const zones = (crew ?? []).map(({ person, garden, supportOk }) => ({
    id: person.id,
    fullName: person.name,
    role: person.role,
    stage: garden.stage,
    support:
      garden.status === 'red' && supportOk && person.id !== user?.crewId
        ? `${firstName(person.id)}'s garden may need extra support today. Consider checking in with ${firstName(person.id)} or offering help.`
        : null,
  }))

  return (
    <div className="garden-page">
      <header className="page garden-head">
        <span className="tag">[ Shared / no sign-in needed ]</span>
        <h1>Crew garden</h1>
        <p>
          Each crew member tends a flower bed. Check-ins, rest and greenhouse care make it bloom; it wilts when routines slip. It shows
          general well-being only, never health numbers, moods or notes.
        </p>
        <span className="tag dim garden-hint">[ Move through the garden to stir the flowers. Hover or tap a bed to see how it is doing. ]</span>
      </header>

      <div className="garden-frame">
        {!crew ? <p className="muted page">Loading…</p> : <GardenScene zones={zones} hovered={hovered} pinned={pinned} onHover={onHover} onPick={onPick} />}
      </div>

      <div className="page">
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
