import CheckIn from './CheckIn'
import Health from './Health'
import HealthAssistant from './HealthAssistant'
import Medication from './Medication'
import Reaction from './Reaction'
import Today from './Today'
import Family from './Family'
import Greenhouse from './Greenhouse'
import CareTeam from './CareTeam'
import Emergency from './Emergency'
import Settings from './Settings'

// The astronaut's personal dashboard. The sidebar picks the section.
const SECTIONS = {
  checkin: { tag: 'Daily', title: 'Daily check-in', intro: 'Five quick questions about how you are doing. Your answers stay private on this device.', Page: CheckIn },
  health: { tag: 'Health', title: 'Health', intro: 'Add your measurements and see how they change over time. Red readings are sent to the flight surgeon.', Page: Health },
  ai: { tag: 'Health / AI 1', title: 'Health assistant', intro: 'Ask about your graphs in plain words. It only sees a summary of your own readings.', Page: HealthAssistant },
  meds: { tag: 'Health / AI 2', title: 'Medication assistant', intro: 'Ask about the medicines in the station’s medical kit. It answers only from the kit list.', Page: Medication },
  care: { tag: 'Health', title: 'Flight surgeon', intro: 'Messages with your flight surgeon, and notes you chose to share.', Page: CareTeam },
  family: { tag: 'Life on board', title: 'Family', intro: 'Your private family space. Messages wait safely on this device until the ground link opens.', Page: Family },
  greenhouse: { tag: 'Life on board', title: 'Greenhouse', intro: 'Grow a real plant on board. Caring for it every day also helps your crew garden bed.', Page: Greenhouse },
  reaction: { tag: 'Daily', title: 'Alertness game', intro: 'A 30-second reaction test. Your scores build a picture of how alert you usually are.', Page: Reaction },
  settings: { tag: 'You', title: 'Settings', intro: 'Crew support alerts, reminders, the ground link and what you share.', Page: Settings },
  help: { tag: 'Medical help', title: 'Get medical help', intro: 'Use this if something feels wrong. Your flight surgeon is alerted straight away when the link is open.', Page: Emergency },
}

export default function MySpace({ tab, user }) {
  const section = SECTIONS[tab]
  if (!section) return <Today user={user} />
  const { Page } = section

  return (
    <div className="page">
      <header className="page-head">
        <span className="tag">[ {section.tag} ]</span>
        <h1>{section.title}</h1>
        <p>{section.intro}</p>
      </header>
      <Page user={user} me={user.crewId} />
    </div>
  )
}
