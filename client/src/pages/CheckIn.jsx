import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import ScaleInput from '../components/ScaleInput'
import { db, dayKey, newId } from '../lib/db'
import { seal, unseal } from '../lib/secure'
import { publishCrewStatus } from '../lib/support'
import { requestSync } from '../lib/sync'
import { CHECKIN_FIELDS } from '../data/checkinFields'

const EMPTY = { mood: null, stress: null, energy: null, sleepQuality: null, workload: null }

export default function CheckIn({ me }) {
  const today = dayKey()
  // undefined = still loading, null = no check-in yet today
  const existing = useLiveQuery(() => db.checkIns.where({ userId: me, date: today }).first().then((r) => r ?? null), [me, today])
  const recent = useLiveQuery(
    () => db.checkIns.where('userId').equals(me).reverse().sortBy('date').then((r) => r.slice(0, 7)),
    [me],
  )

  return (
    <div className="grid grid-2 top">
      {existing === undefined ? <div className="card">Loading…</div> : <CheckInForm key={`${me}-${today}`} me={me} existing={existing} today={today} />}
      <RecentCheckIns recent={recent} />
    </div>
  )
}

function CheckInForm({ me, existing, today }) {
  const [form, setForm] = useState(existing ? { ...EMPTY, ...existing } : EMPTY)
  const [note, setNote] = useState('')
  const [share, setShare] = useState(false)
  const [saved, setSaved] = useState('')
  const [hasEntry, setHasEntry] = useState(Boolean(existing))

  // The private note is stored encrypted: unscramble it to show it here.
  useEffect(() => {
    if (existing?.notes) unseal(existing.notes).then(setNote)
  }, [existing])

  const missing = CHECKIN_FIELDS.filter((f) => form[f.key] == null)

  async function save(e) {
    e.preventDefault()
    if (missing.length) return
    const entry = {
      userId: me,
      date: today,
      mood: form.mood,
      stress: form.stress,
      energy: form.energy,
      sleepQuality: form.sleepQuality,
      workload: form.workload,
      notes: await seal(note.trim()),
      createdAt: Date.now(),
      synced: false, // check-ins never leave this device
    }
    // One check-in per day: update today's if it exists, otherwise add a new one.
    const current = await db.checkIns.where({ userId: me, date: today }).first()
    if (current) await db.checkIns.update(current.id, entry)
    else await db.checkIns.add(entry)

    // Only if the astronaut ticks the box: a copy of the note goes to the flight surgeon.
    if (share && note.trim()) {
      await db.sharedNotes.add({ uid: newId(), userId: me, text: note.trim(), date: today, createdAt: Date.now(), synced: false })
      requestSync()
    }
    await publishCrewStatus(me)
    setHasEntry(true)
    setSaved(share && note.trim() ? 'Check-in saved. Your note was shared with the flight surgeon.' : 'Check-in saved on this device.')
    setShare(false)
    setTimeout(() => setSaved(''), 5000)
  }

  return (
    <form className="card" onSubmit={save} noValidate>
      <h2>How are you today?</h2>
      <p className="muted small">{hasEntry ? 'You already checked in today. You can update it.' : 'Takes about one minute.'}</p>
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
          Private note <span className="hint">(optional, encrypted on this device, only you can see it)</span>
        </label>
        <textarea id="notes" value={note} onChange={(e) => setNote(e.target.value)} />
        <label className="check small">
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} disabled={!note.trim()} />
          <span>Also share this note with the flight surgeon</span>
        </label>
      </div>
      <div className="row form-actions">
        <button className="btn" type="submit" disabled={missing.length > 0}>
          {hasEntry ? 'Update check-in' : 'Save check-in'}
        </button>
        {missing.length > 0 && <span className="muted small">Still to answer: {missing.map((f) => f.label.toLowerCase()).join(', ')}</span>}
      </div>
      <div aria-live="polite" className="spaced">
        {saved && <div className="toast">{saved}</div>}
      </div>
    </form>
  )
}

function RecentCheckIns({ recent }) {
  return (
    <section className="card quiet">
      <h2>Your last 7 check-ins</h2>
      <p className="muted small">Each answer is from 1 to 5.</p>
      {!recent?.length ? (
        <p className="muted">No check-ins yet. Your first one will plant a seed in your crew garden bed.</p>
      ) : (
        <div className="table-wrap">
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
                  <td className="num">{c.date.slice(5)}</td>
                  <td className="num">{c.mood}</td>
                  <td className="num">{c.stress}</td>
                  <td className="num">{c.energy}</td>
                  <td className="num">{c.sleepQuality}</td>
                  <td className="num">{c.workload}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small spaced">Check-ins never leave this device. Only your garden stage is shared with the crew.</p>
    </section>
  )
}
