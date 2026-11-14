import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import FlowerBed from '../components/FlowerBed'
import StatusPill from '../components/StatusPill'
import { Icon } from '../components/Icons'
import { db, dayKey } from '../lib/db'
import { METRICS, STATUS_LABEL, detectFlags, summarize } from '../lib/health'
import { detectDecline } from '../lib/alertness'
import { recordSupportCheckin, useCrewGarden } from '../lib/support'
import { plantAlerts, plantInfo } from '../lib/greenhouse'
import { unseal } from '../lib/secure'
import { CREW, firstName } from '../data/crew'

const DECLINE_LABEL = { none: 'Not enough tests yet', green: 'Usual level', yellow: 'Lower than usual', red: 'Large drop' }

function greeting(date) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// The astronaut's dashboard home: a quick look at everything, with links into each section.
export default function Today({ user }) {
  const me = user.crewId
  const [now] = useState(() => new Date())
  const today = dayKey(now)
  const data = useLiveQuery(async () => {
    const [checkIns, readings, tests, family, care, plants, alerts, supported] = await Promise.all([
      db.checkIns.where('userId').equals(me).toArray(),
      db.readings.where('userId').equals(me).toArray(),
      db.reactionTests.where('userId').equals(me).toArray(),
      db.family.where('userId').equals(me).toArray(),
      db.careMessages.where('userId').equals(me).toArray(),
      db.plants.where('userId').equals(me).filter((p) => p.status === 'growing').toArray(),
      db.alerts.where('userId').equals(me).filter((a) => a.kind === 'emergency' && !a.reviewed).toArray(),
      db.supportCheckins.where('userId').equals(me).filter((s) => s.date === today).toArray(),
    ])
    const plant = plants[0] ?? null
    const plantLogs = plant ? await db.plantLog.where('plantUid').equals(plant.uid).toArray() : []
    return { checkIns, readings, tests, family, care, plant, plantLogs, alerts, supported }
  }, [me, today])
  const crew = useCrewGarden()

  if (!data || !crew) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  const mine = crew.find((c) => c.person.id === me)
  const garden = mine.garden
  const checkedIn = data.checkIns.some((c) => c.date === today)
  const flags = detectFlags(data.readings)
  const reds = flags.filter((f) => f.status === 'red').length
  const yellows = flags.length - reds
  const summary = summarize(data.readings)
  const decline = detectDecline(data.tests)
  const lastTest = [...data.tests].sort((a, b) => a.createdAt - b.createdAt).at(-1)
  const lastFamily = [...data.family].filter((m) => m.direction === 'in').sort((a, b) => b.createdAt - a.createdAt)[0]
  const unreadFamily = data.family.filter((m) => m.direction === 'in' && !m.read).length
  const lastCare = [...data.care].sort((a, b) => b.createdAt - a.createdAt)[0]
  const supportedIds = new Set(data.supported.map((s) => s.about))
  const needSupport = crew.filter((c) => c.person.id !== me && c.garden.status === 'red' && c.supportOk && !supportedIds.has(c.person.id))
  const plantNotes = data.plant ? plantAlerts(data.plant, data.plantLogs) : []
  const dateText = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="page">
      <header className="page-head">
        <span className="tag">[ {dateText} ]</span>
        <h1>
          {greeting(now)}, {firstName(me)}
        </h1>
        <p>Here is how your garden and health look today. Your entries stay private on this device.</p>
      </header>

      {data.alerts.length > 0 && (
        <div className="banner warn" role="status">
          <Icon name="help" />
          <p>
            You sent a help signal. {data.alerts.some((a) => a.synced) ? 'The flight surgeon has received it.' : 'It is waiting to send: it goes out as soon as the ground link opens.'}{' '}
            Follow your emergency protocol and tell a crewmate.
          </p>
          <a className="btn small-btn danger" href="#/me/help">Open help</a>
        </div>
      )}

      {needSupport.map(({ person }) => (
        <div key={person.id} className="banner support" role="status">
          <Icon name="garden" />
          <p>
            {firstName(person.id)}&apos;s garden may need extra support today. Consider checking in with {firstName(person.id)} or offering help.
          </p>
          <button type="button" className="btn small-btn secondary" onClick={() => recordSupportCheckin(me, person.id)}>
            I checked in with {firstName(person.id)}
          </button>
        </div>
      ))}

      {plantNotes.filter((n) => n.status !== 'green').slice(0, 1).map((n) => (
        <div key={n.text} className="banner" role="status">
          <Icon name="greenhouse" />
          <p>
            {plantInfo(data.plant)?.name}: {n.text}
          </p>
          <a className="btn small-btn secondary" href="#/me/greenhouse">Open greenhouse</a>
        </div>
      ))}

      <div className="today-grid">
        <section className="card today-bed" aria-labelledby="bed-h">
          <div className="row spread">
            <h2 id="bed-h">Your garden bed</h2>
            <StatusPill status={garden.status}>{garden.label}</StatusPill>
          </div>
          <FlowerBed stage={garden.stage} color={CREW.find((c) => c.id === me)?.flower} label={`Your flower bed: ${garden.label}`} />
          <p className="muted small flush">
            {garden.stage === 'empty' ? 'Your bed is empty. Your first check-in plants the seeds.' : `${garden.note}. Check-ins, good sleep and greenhouse care help it grow.`}
          </p>
        </section>

        <section className={`card checkin-card ${checkedIn ? 'done' : ''}`} aria-labelledby="ci-h">
          <span className="tag dim">Daily</span>
          <h2 id="ci-h">Today&apos;s check-in</h2>
          {checkedIn ? (
            <>
              <p className="done-line">
                <Icon name="check" size={20} /> Done for today. Thank you.
              </p>
              <a className="btn secondary" href="#/me/checkin">Update check-in</a>
            </>
          ) : (
            <>
              <p className="muted">Five quick questions, about one minute. It helps your bed grow.</p>
              <a className="btn" href="#/me/checkin">Start check-in</a>
            </>
          )}
        </section>

        <section className="card alert-card" aria-labelledby="al-h">
          <div className="row spread">
            <h2 id="al-h">Alertness</h2>
            <StatusPill status={decline.status}>{DECLINE_LABEL[decline.status]}</StatusPill>
          </div>
          {lastTest ? (
            <p className="big-number">
              {lastTest.alertnessScore}
              <span> / 100{decline.baseline ? `, usual about ${decline.baseline}` : ''}</span>
            </p>
          ) : (
            <p className="muted">No tests yet.</p>
          )}
          <a className="text-link" href="#/me/reaction">Play the alertness game</a>
        </section>

        <section className="card health-card" aria-labelledby="hl-h">
          <div className="row spread">
            <h2 id="hl-h">Health</h2>
            <StatusPill status={reds ? 'red' : yellows ? 'yellow' : data.readings.length ? 'green' : 'none'}>
              {reds ? `${reds} red flag${reds > 1 ? 's' : ''}` : yellows ? `${yellows} to watch` : data.readings.length ? 'No red flags' : 'No data'}
            </StatusPill>
          </div>
          <ul className="metric-list">
            {summary.map((m) => (
              <li key={m.type}>
                <span>{METRICS[m.type].label}</span>
                <span className="num">{m.latest ?? '–'}</span>
                <StatusPill status={m.status}>{STATUS_LABEL[m.status]}</StatusPill>
              </li>
            ))}
          </ul>
          <div className="row">
            <a className="text-link" href="#/me/health">Open health graphs</a>
            <a className="text-link" href="#/me/ai">Ask the health assistant</a>
          </div>
        </section>

        <section className="card family-card" aria-labelledby="fam-h">
          <div className="row spread">
            <h2 id="fam-h">Family</h2>
            {unreadFamily > 0 && <StatusPill status="green">{unreadFamily} new</StatusPill>}
          </div>
          {lastFamily ? <LatestMessage message={lastFamily} /> : <p className="muted">No messages yet.</p>}
          <a className="text-link" href="#/me/family">Open family space</a>
        </section>

        <section className="card care-card" aria-labelledby="care-h">
          <span className="tag dim">Flight surgeon</span>
          <h2 id="care-h">Care team</h2>
          {lastCare ? (
            <p className="small">
              <strong>{lastCare.from === 'doctor' ? lastCare.author : 'You'}:</strong> {lastCare.text.length > 140 ? `${lastCare.text.slice(0, 140)}…` : lastCare.text}
            </p>
          ) : (
            <p className="muted">No messages yet.</p>
          )}
          <a className="text-link" href="#/me/care">Message the flight surgeon</a>
        </section>
      </div>

      <p className="disclaimer">
        Demo app with made-up crew data. It gives general information only and does not replace professional medical care.
      </p>
    </div>
  )
}

// Family messages are encrypted on the device, so unscramble the preview first.
function LatestMessage({ message }) {
  const [text, setText] = useState('')
  useEffect(() => {
    let alive = true
    unseal(message.text).then((t) => alive && setText(t))
    return () => {
      alive = false
    }
  }, [message])
  return (
    <p className="small">
      <strong>{message.contactName}:</strong> {text.length > 140 ? `${text.slice(0, 140)}…` : text}
    </p>
  )
}
