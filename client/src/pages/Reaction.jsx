import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import AlertnessChart from '../components/AlertnessChart'
import { db } from '../lib/db'
import { scoreTest } from '../lib/alertness'
import { ME } from '../data/crew'

const TRIALS = 5
const MISS_AFTER_MS = 2000

// Reaction-time game: wait for the signal, then tap as fast as you can. 5 rounds.
export default function Reaction() {
  const tests = useLiveQuery(() => db.reactionTests.where('userId').equals(ME).toArray(), [])

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      <Game />
      {tests ? <AlertnessChart tests={tests} /> : <p>Loading…</p>}
    </div>
  )
}

function Game() {
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
    }, 1500 + Math.random() * 2500)
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
    await db.reactionTests.add({ userId: ME, ...score, createdAt: Date.now(), synced: false })
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

  const area = {
    idle: { bg: 'var(--surface-2)', text: 'Press start when you are ready' },
    waiting: { bg: 'var(--surface-2)', text: 'Wait for it…' },
    go: { bg: 'var(--ok)', text: 'Tap now!' },
    done: { bg: 'var(--surface-2)', text: 'Done' },
  }[phase]

  return (
    <section className="card">
      <h2>Alertness game</h2>
      <p className="muted small">
        When the box turns green and says &ldquo;Tap now!&rdquo;, tap it (or press the space bar) as fast as you can.
        {` ${TRIALS} rounds, about 30 seconds.`}
      </p>

      <button
        type="button"
        onPointerDown={phase === 'waiting' || phase === 'go' ? tap : undefined}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && (phase === 'waiting' || phase === 'go')) {
            e.preventDefault()
            tap()
          }
        }}
        aria-live="assertive"
        style={{
          width: '100%',
          minHeight: 180,
          border: '2px solid var(--line)',
          borderRadius: 12,
          background: area.bg,
          color: phase === 'go' ? '#fff' : 'var(--ink)',
          font: 'inherit',
          fontSize: '1.5rem',
          fontWeight: 700,
          cursor: phase === 'waiting' || phase === 'go' ? 'pointer' : 'default',
          touchAction: 'manipulation',
          userSelect: 'none',
        }}
      >
        {area.text}
      </button>

      <div className="row" style={{ justifyContent: 'space-between', marginTop: '0.75rem' }}>
        <span className="muted small">
          {phase === 'waiting' || phase === 'go' ? `Round ${round} of ${TRIALS}` : ''} {message}
        </span>
        {(phase === 'idle' || phase === 'done') && (
          <button className="btn" type="button" onClick={start}>
            {phase === 'done' ? 'Play again' : 'Start'}
          </button>
        )}
      </div>

      {result && (
        <div className="card quiet" style={{ marginTop: '1rem' }} role="status">
          <h3>Your result</h3>
          <table>
            <tbody>
              <tr><td>Average reaction time</td><td className="num">{result.reactionTimeMs ? `${result.reactionTimeMs} ms` : '–'}</td></tr>
              <tr><td>Accuracy</td><td className="num">{result.accuracy}%</td></tr>
              <tr><td>Consistency</td><td className="num">{result.consistency}%</td></tr>
              <tr><td><strong>Alertness score</strong></td><td className="num"><strong>{result.alertnessScore} / 100</strong></td></tr>
            </tbody>
          </table>
          <p className="muted small" style={{ margin: '0.5rem 0 0' }}>Saved on this device and added to your graph.</p>
        </div>
      )}
      <p className="disclaimer" style={{ marginTop: '1rem' }}>
        A simple demo test, not a medical or fitness-for-duty assessment.
      </p>
    </section>
  )
}
