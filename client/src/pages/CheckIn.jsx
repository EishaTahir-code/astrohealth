import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import ScaleInput from '../components/ScaleInput'
import { db, dayKey } from '../lib/db'
import { ME } from '../data/crew'
import { CHECKIN_FIELDS } from '../data/checkinFields'

const EMPTY = { mood: null, stress: null, energy: null, sleepQuality: null, workload: null, notes: '' }

export default function CheckIn() {
  const today = dayKey()
  // undefined = still loading, null = no check-in yet today
  const existing = useLiveQuery(
    () => db.checkIns.where({ userId: ME, date: today }).first().then((r) => r ?? null),
    [today],
  )
  const recent = useLiveQuery(
    () => db.checkIns.where('userId').equals(ME).reverse().sortBy('date').then((r) => r.slice(0, 7)),
    [],
  )

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      {existing === undefined ? (
        <div className="card">Loading…</div>
      ) : (
        <CheckInForm key={today} existing={existing} today={today} />
      )}
      <RecentCheckIns recent={recent} />
    </div>
  )
}

function CheckInForm({ existing, today }) {
  const [form, setForm] = useState(existing ? { ...EMPTY, ...existing } : EMPTY)
  const [saved, setSaved] = useState(false)
  const [hasEntry, setHasEntry] = useState(Boolean(existing))

  const missing = CHECKIN_FIELDS.filter((f) => form[f.key] == null)

  async function save(e) {
    e.preventDefault()
    if (missing.length) return
    const entry = {
      userId: ME,
      date: today,
      mood: form.mood,
      stress: form.stress,
      energy: form.energy,
      sleepQuality: form.sleepQuality,
      workload: form.workload,
      notes: form.notes.trim(),
      createdAt: Date.now(),
      synced: false,
    }
    // One check-in per day: update today's if it exists, otherwise add a new one.
    const current = await db.checkIns.where({ userId: ME, date: today }).first()
    if (current) await db.checkIns.update(current.id, entry)
    else await db.checkIns.add(entry)
    setHasEntry(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 4000)
  }

  return (
    <form className="card" onSubmit={save} noValidate>
      <h2>How are you today?</h2>
      <p className="muted small">
        {hasEntry ? 'You already checked in today. You can update it.' : 'Takes about one minute.'}
      </p>
      {CHECKIN_FIELDS.map((f) => (
        <ScaleInput
          key={f.key}
          name={f.key}
          label={f.label}
          low={f.low}
          high={f.high}
          value={form[f.key]}
          onChange={(v) => setForm({ ...form, [f.key]: v })}
        />
      ))}
      <div className="field">
        <label htmlFor="notes">
          Private note <span className="hint">(optional, only you can see this)</span>
        </label>
        <textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="row">
        <button className="btn" type="submit" disabled={missing.length > 0}>
          {hasEntry ? 'Update check-in' : 'Save check-in'}
        </button>
        {missing.length > 0 && (
          <span className="muted small">Still to answer: {missing.map((f) => f.label.toLowerCase()).join(', ')}</span>
        )}
      </div>
      <div aria-live="polite" style={{ marginTop: '0.75rem' }}>
        {saved && <div className="toast">Check-in saved on this device.</div>}
      </div>
    </form>
  )
}

function RecentCheckIns({ recent }) {
  return (
    <section className="card quiet">
      <h2>Your last 7 check-ins</h2>
      {!recent?.length ? (
        <p className="muted">No check-ins yet. Your first one will plant a seed in your crew garden bed.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Mood</th>
              <th>Stress</th>
              <th>Energy</th>
              <th>Sleep</th>
              <th>Work</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((c) => (
              <tr key={c.id}>
                <td>{c.date.slice(5)}</td>
                <td className="num">{c.mood}</td>
                <td className="num">{c.stress}</td>
                <td className="num">{c.energy}</td>
                <td className="num">{c.sleepQuality}</td>
                <td className="num">{c.workload}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted small" style={{ marginTop: '0.75rem' }}>
        Saved only on this device for now. Not synced: syncing is not built in this demo.
      </p>
    </section>
  )
}
