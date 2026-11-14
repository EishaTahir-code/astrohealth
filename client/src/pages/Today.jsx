import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import FlowerBed from '../components/FlowerBed'
import StatusPill from '../components/StatusPill'
import { Icon } from '../components/Icons'
import { db, dayKey } from '../lib/db'
import { scoreGarden } from '../lib/garden'
import { METRICS, STATUS_LABEL, detectFlags, summarize } from '../lib/health'
import { detectDecline } from '../lib/alertness'
import { CREW, ME, firstName } from '../data/crew'

const DECLINE_LABEL = { none: 'Not enough tests yet', green: 'Usual level', yellow: 'Lower than usual', red: 'Large drop' }

function greeting(date) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// The astronaut's dashboard home: a quick look at everything, with links into each section.
export default function Today() {
  // The time when the page opened, used for the greeting and the date.
  const [now] = useState(() => new Date())
  const today = dayKey(now)
  const checkIns = useLiveQuery(() => db.checkIns.where('userId').equals(ME).toArray(), [])
  const readings = useLiveQuery(() => db.readings.where('userId').equals(ME).toArray(), [])
  const tests = useLiveQuery(() => db.reactionTests.where('userId').equals(ME).toArray(), [])
  const me = CREW.find((c) => c.id === ME)

  const dateText = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  if (!checkIns || !readings || !tests) {
    return (
      <div className="page">
        <p>Loading…</p>
      </div>
    )
  }

  const garden = scoreGarden(checkIns)
  const checkedIn = checkIns.some((c) => c.date === today)
  const flags = detectFlags(readings)
  const reds = flags.filter((f) => f.status === 'red').length
  const yellows = flags.length - reds
  const summary = summarize(readings)
  const decline = detectDecline(tests)
  const lastTest = [...tests].sort((a, b) => a.createdAt - b.createdAt).at(-1)

  return (
    <div className="page">
      <header className="page-head today-head">
        <p className="today-date">{dateText}</p>
        <h1>
          {greeting(now)}, {firstName(ME)}
        </h1>
        <p>Here is how your garden and health look today. Your entries stay private on this device.</p>
      </header>

      <div className="today-grid">
        <section className="card bed-card today-bed" aria-labelledby="bed-h">
          <div className="row spread">
            <h2 id="bed-h">Your garden bed</h2>
            <StatusPill status={garden.status}>{garden.label}</StatusPill>
          </div>
          <FlowerBed stage={garden.stage} color={me.flower} label={`Your flower bed: ${garden.label}`} />
          <p className="muted small">
            {garden.stage === 'empty'
              ? 'Your bed is empty. Your first check-in plants the seeds.'
              : `${garden.note}. Daily check-ins and good sleep help it grow.`}
          </p>
        </section>

        <section className={`card checkin-card ${checkedIn ? 'done' : ''}`} aria-labelledby="ci-h">
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

        <section className="card health-card" aria-labelledby="hl-h">
          <div className="row spread">
            <h2 id="hl-h">Health</h2>
            <StatusPill status={reds ? 'red' : yellows ? 'yellow' : readings.length ? 'green' : 'none'}>
              {reds ? `${reds} red flag${reds > 1 ? 's' : ''}` : yellows ? `${yellows} to watch` : readings.length ? 'No red flags' : 'No data'}
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
          <a className="text-link" href="#/me/health">Open health graphs</a>
        </section>

        <section className="card alert-card" aria-labelledby="al-h">
          <div className="row spread">
            <h2 id="al-h">Alertness</h2>
            <StatusPill status={decline.status}>{DECLINE_LABEL[decline.status]}</StatusPill>
          </div>
          {lastTest ? (
            <p className="big-number">
              {lastTest.alertnessScore}
              <span> / 100, latest score{decline.baseline ? `. Usual about ${decline.baseline}` : ''}</span>
            </p>
          ) : (
            <p className="muted">No tests yet.</p>
          )}
          <a className="text-link" href="#/me/reaction">Play the alertness game</a>
        </section>

        <a className="card assistant-tile lavender tile-ai" href="#/me/ai">
          <span className="tile-icon"><Icon name="ai" size={28} /></span>
          <span className="tile-text">
            <strong>Ask the health assistant</strong>
            <span className="muted small">Plain-language help with your graphs.</span>
            <span className="tile-example">“What does my blood pressure trend mean?”</span>
          </span>
        </a>
        <a className="card assistant-tile periwinkle tile-meds" href="#/me/meds">
          <span className="tile-icon"><Icon name="meds" size={28} /></span>
          <span className="tile-text">
            <strong>Ask about medicines</strong>
            <span className="muted small">Only from the spacecraft medicine list.</span>
            <span className="tile-example">“What can I use for motion sickness?”</span>
          </span>
        </a>
      </div>

      <p className="disclaimer">
        Demo app with made-up crew data. It gives general information only and does not replace professional medical care.
      </p>
    </div>
  )
}
