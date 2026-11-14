import CheckIn from './CheckIn'
import Health from './Health'
import HealthAssistant from './HealthAssistant'
import Medication from './Medication'
import Reaction from './Reaction'
import { crewName, ME } from '../data/crew'

// The astronaut's personal area, split into tabs.
const TABS = [
  ['checkin', 'Daily check-in'],
  ['health', 'Health'],
  ['ai', 'Health assistant'],
  ['meds', 'Medication'],
  ['reaction', 'Alertness game'],
]

export default function MySpace({ tab = 'checkin' }) {
  const pages = {
    checkin: <CheckIn />,
    health: <Health />,
    ai: <HealthAssistant />,
    meds: <Medication />,
    reaction: <Reaction />,
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>My space</h1>
        <p>Signed in as {crewName(ME)} (demo). Your entries stay private on this device.</p>
      </div>
      <nav className="tabs" aria-label="My space sections">
        {TABS.map(([id, label]) => (
          <a key={id} href={`#/me/${id}`} aria-current={tab === id ? 'page' : undefined}>
            {label}
          </a>
        ))}
      </nav>
      {pages[tab] ?? pages.checkin}
    </div>
  )
}
