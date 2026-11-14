import CheckIn from './CheckIn'
import Health from './Health'
import HealthAssistant from './HealthAssistant'
import Medication from './Medication'
import Reaction from './Reaction'
import Today from './Today'

// The astronaut's personal dashboard. The sidebar picks the section.
const SECTIONS = {
  checkin: {
    title: 'Daily check-in',
    intro: 'Five quick questions about how you are doing. Your answers stay private on this device.',
    page: <CheckIn />,
  },
  health: {
    title: 'Health',
    intro: 'Add your measurements and see how they change over time.',
    page: <Health />,
  },
  ai: {
    title: 'Health assistant',
    intro: 'Ask about your graphs in plain words. It only sees a summary of your own readings.',
    page: <HealthAssistant />,
  },
  meds: {
    title: 'Medication assistant',
    intro: 'Ask about the medicines on the spacecraft list. It cannot answer about anything else.',
    page: <Medication />,
  },
  reaction: {
    title: 'Alertness game',
    intro: 'A 30-second reaction test. Your scores build a graph of how alert you usually are.',
    page: <Reaction />,
  },
}

export default function MySpace({ tab, user }) {
  const section = SECTIONS[tab]
  if (!section) return <Today user={user} />

  return (
    <div className="page">
      <header className="page-head">
        <h1>{section.title}</h1>
        <p>{section.intro}</p>
      </header>
      {section.page}
    </div>
  )
}
