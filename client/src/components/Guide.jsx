import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icons'

// A short step-by-step guide. It opens by itself the first time someone signs in,
// and any time from the "Guide" button at the bottom of the menu.
const STEPS = {
  astronaut: [
    ['today', 'Welcome to Orbloom', 'A calm health companion for your mission. Everything is saved on this device first, so it keeps working even when there is no ground link.'],
    ['today', 'Today', 'Your dashboard: your garden bed, today’s check-in, health, alertness, and the latest messages from family and the flight surgeon.'],
    ['checkin', 'Daily check-in', 'Five quick questions about how you feel. Your answers stay private on this device, and each check-in helps your garden bed grow.'],
    ['health', 'Health and the assistant', 'Add measurements and see the normal range for each one. Click any yellow or red status and the health assistant explains it in plain words.'],
    ['meds', 'Medical kit', 'Search every medicine in the station’s kit by name or symptom. Some are for crew self-care, others only when the flight surgeon says so.'],
    ['help', 'Get medical help', 'The red button at the top of the menu sends a help signal to the flight surgeon straight away, or as soon as the link opens.'],
    ['family', 'Family and greenhouse', 'Write to family any time: messages wait safely until the ground link opens. In the greenhouse, grow real ISS crops with a daily checklist.'],
    ['garden', 'Crew garden', 'Everyone’s flower bed in one garden. Hover a bed to see how it is doing. You can pause support alerts about yourself in Settings.'],
    ['settings', 'Privacy and this guide', 'Settings shows exactly what is shared and with whom. You can open this guide again from the bottom of the menu.'],
  ],
  doctor: [
    ['crew', 'Welcome, flight surgeon', 'Orbloom shows you each astronaut’s health trends, alertness and alerts. Private notes, moods and family messages are never shown.'],
    ['crew', 'Crew overview', 'Every astronaut with an overall status: stable, watch, red flag or emergency.'],
    ['alerts', 'Alerts', 'Red readings, large alertness drops and help signals arrive here. Mark each one reviewed after you follow up. The astronaut sees that you did.'],
    ['person', 'Astronaut profiles', 'Open an astronaut to see an AI summary, health trends, alertness, their alerts, your notes and the notes they chose to share, and messages.'],
    ['log', 'Access log', 'Every profile you open is recorded, on this device and on the server.'],
    ['help', 'This guide', 'You can open this guide again any time from the bottom of the menu.'],
  ],
}

export default function Guide({ role, onClose }) {
  const steps = STEPS[role] ?? STEPS.astronaut
  const [i, setI] = useState(0)
  const nextRef = useRef(null)
  const [icon, title, text] = steps[i]
  const last = i === steps.length - 1

  useEffect(() => {
    nextRef.current?.focus()
  }, [i])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setI((n) => Math.min(steps.length - 1, n + 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, steps.length])

  return (
    <div className="guide-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="guide" role="dialog" aria-modal="true" aria-labelledby="guide-title" aria-describedby="guide-text">
        <div className="guide-top">
          <span className="tag">
            [ Guide {i + 1} / {steps.length} ]
          </span>
          <button type="button" className="link-btn small" onClick={onClose}>
            Skip guide
          </button>
        </div>
        <span className="guide-icon" aria-hidden="true">
          <Icon name={icon} size={34} />
        </span>
        <h2 id="guide-title">{title}</h2>
        <p id="guide-text">{text}</p>
        <div className="guide-dots" aria-hidden="true">
          {steps.map((_, n) => (
            <i key={n} className={n === i ? 'on' : ''} />
          ))}
        </div>
        <div className="row spread">
          <button type="button" className="btn secondary" onClick={() => setI(i - 1)} disabled={i === 0}>
            Back
          </button>
          <button ref={nextRef} type="button" className="btn" onClick={() => (last ? onClose() : setI(i + 1))}>
            {last ? 'Start using Orbloom' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
