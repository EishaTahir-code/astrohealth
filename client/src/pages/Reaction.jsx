import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import AlertnessChart from '../components/AlertnessChart'
import { db, newId } from '../lib/db'
import { scoreTest } from '../lib/alertness'
import { alertOnAlertness } from '../lib/alerts'
import { requestSync } from '../lib/sync'

const TRIALS = 5
const MISS_AFTER_MS = 2000
const randomWait = () => 1500 + Math.random() * 2500 // 1.5 to 4 seconds

// Reaction-time game: wait for the signal, then tap as fast as you can. 5 rounds.
export default function Reaction({ me }) {
  const tests = useLiveQuery(() => db.reactionTests.where('userId').equals(me).toArray(), [me])

  return (
    <div className="grid grid-2 top">
      <Game me={me} />
      {tests ? <AlertnessChart tests={tests} /> : <p>Loading…</p>}
    </div>
  )
}

function Game({ me }) {
  // phase: idle | waiting | go | done
  const [phase, setPhase] = useState('idle')
  const [round, setRound] = useState(0)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const times = useRef([])
  const errors = useRef(0)
  const roundRef = useRef(0)
  const shownAt = useRef(0)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  function start() {
    times.current = []
    errors.current = 0
    roundRef.current = 1
    setRound(1)
    setResult(null)
    setMessage('')
    wait()
  }

  function wait() {
    setPhase('waiting')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      shownAt.current = performance.now()
      setPhase('go')
      timer.current = setTimeout(() => {
        errors.current += 1
        setMessage('Missed that one.')
        next()
      }, MISS_AFTER_MS)
    }, randomWait())
  }

  function next() {
    if (roundRef.current >= TRIALS) {
      finish()
      return
    }
    roundRef.current += 1
    setRound(roundRef.current)
    wait()
  }

  async function finish() {
    clearTimeout(timer.current)
    setPhase('done')
    const score = scoreTest(times.current, errors.current, TRIALS)
    setResult(score)
    await db.reactionTests.add({ uid: newId(), userId: me, ...score, createdAt: Date.now(), synced: false })
    await alertOnAlertness(me)
    requestSync()
  }

  function tap() {
    if (phase === 'waiting') {
      clearTimeout(timer.current)
      errors.current += 1
      setMessage('Too soon. Wait for the signal.')
      next()
    } else if (phase === 'go') {
      clearTimeout(timer.current)
      const ms = Math.round(performance.now() - shownAt.current)
      times.current.push(ms)
      setMessage(`${ms} ms`)
      next()
    }
  }

  const text = {
    idle: 'Press start when you are ready',
    waiting: 'Wait for it…',
    go: 'Tap now!',
    done: 'Done',
  }[phase]
  const active = phase === 'waiting' || phase === 'go'

  return (
    <section className="card">
      <h2>Reaction test</h2>
      <p className="muted small">
        When the bud opens into a flower and says &ldquo;Tap now!&rdquo;, tap it (or press the space bar) as fast as you
        can.{` ${TRIALS} rounds, about 30 seconds.`}
      </p>

      <button
        type="button"
        className="reaction-pad"
        data-phase={phase}
        onPointerDown={active ? tap : undefined}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && active) {
            e.preventDefault()
            tap()
          }
        }}
        aria-live="assertive"
      >
        <PadFlower open={phase === 'go'} />
        <span className="pad-text">{text}</span>
      </button>

      <div className="row spread spaced">
        <span className="muted small">
          {active ? `Round ${round} of ${TRIALS}` : ''} {message}
        </span>
        {(phase === 'idle' || phase === 'done') && (
          <button className="btn" type="button" onClick={start}>
            {phase === 'done' ? 'Play again' : 'Start'}
          </button>
        )}
      </div>

      {result && (
        <div className="card quiet spaced" role="status">
          <h3>Your result</h3>
          <table>
            <tbody>
              <tr><td>Average reaction time</td><td className="num">{result.reactionTimeMs ? `${result.reactionTimeMs} ms` : '–'}</td></tr>
              <tr><td>Accuracy</td><td className="num">{result.accuracy}%</td></tr>
              <tr><td>Consistency</td><td className="num">{result.consistency}%</td></tr>
              <tr><td><strong>Alertness score</strong></td><td className="num"><strong>{result.alertnessScore} / 100</strong></td></tr>
            </tbody>
          </table>
          <p className="muted small spaced-sm">Saved on this device and added to your graph.</p>
        </div>
      )}
      <p className="disclaimer spaced">
        A simple reaction test, not a medical or fitness-for-duty assessment.
      </p>
    </section>
  )
}

// A closed bud while waiting; it opens into a flower when it is time to tap.
function PadFlower({ open }) {
  return (
    <svg className="pad-flower" viewBox="-40 -40 80 80" aria-hidden="true" focusable="false">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <ellipse key={a} className="pad-petal" cx="0" cy={open ? -19 : -9} rx={open ? 9 : 6} ry={open ? 16 : 12} transform={`rotate(${a})`} />
      ))}
      <circle r={open ? 10 : 7} className="pad-heart" />
    </svg>
  )
}
