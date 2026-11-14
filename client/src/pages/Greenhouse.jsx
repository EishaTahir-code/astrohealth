import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import StatusPill from '../components/StatusPill'
import { Icon } from '../components/Icons'
import { db, dayKey } from '../lib/db'
import { unseal } from '../lib/secure'
import { shrinkPhoto } from '../lib/family'
import { CHECKLIST, daysSince, plantAlerts, plantInfo, saveDailyLog, startPlant } from '../lib/greenhouse'
import { PLANTS, PROBLEMS, STAGES } from '../data/plants'

// Greenhouse Reset (PRD 6.8): pick a plant; if it is new, follow the steps;
// if it is growing, do the daily checklist. Finished checklists help your crew garden bed.
export default function Greenhouse({ me }) {
  const plants = useLiveQuery(() => db.plants.where('userId').equals(me).toArray(), [me])
  const [choosing, setChoosing] = useState(false)
  if (!plants) return <p className="muted">Loading…</p>

  const growing = plants.find((p) => p.status === 'growing')
  const harvested = plants.filter((p) => p.status === 'harvested')

  if (!growing || choosing) {
    return (
      <PlantPicker
        onPick={async (id) => {
          await startPlant(me, id)
          setChoosing(false)
        }}
        onCancel={growing ? () => setChoosing(false) : null}
        harvested={harvested}
      />
    )
  }
  return <PlantCare plant={growing} />
}

function PlantPicker({ onPick, onCancel, harvested }) {
  return (
    <div className="stack">
      <section className="card">
        <h2>What are you growing?</h2>
        <p className="muted">Pick a plant. You will get step-by-step instructions, then a short daily checklist.</p>
        <div className="plant-pick spaced">
          {PLANTS.map((p) => (
            <button key={p.id} type="button" className="plant-option" onClick={() => onPick(p.id)}>
              <span className="tag dim">About {p.harvestDays} days</span>
              <h3>{p.name}</h3>
              <span className="muted small">{p.note}</span>
              <span className="small">
                Water every {p.waterEveryDays} day{p.waterEveryDays > 1 ? 's' : ''}, {p.lightHours} h of light
              </span>
            </button>
          ))}
        </div>
        {onCancel && (
          <button type="button" className="btn secondary spaced" onClick={onCancel}>
            Back to my plant
          </button>
        )}
      </section>
      {harvested.length > 0 && (
        <section className="card quiet">
          <h2>Harvested</h2>
          <ul>
            {harvested.map((p) => (
              <li key={p.uid}>
                {plantInfo(p)?.name}, harvested {new Date(p.harvestedAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function PlantCare({ plant }) {
  const info = plantInfo(plant)
  const today = dayKey()
  const logs = useLiveQuery(() => db.plantLog.where('plantUid').equals(plant.uid).sortBy('at'), [plant.uid])
  if (!logs) return <p className="muted">Loading…</p>

  const age = daysSince(plant.startedAt)
  const todays = logs.find((l) => l.date === today)
  const alerts = plantAlerts(plant, logs)
  const progress = Math.min(100, Math.round((age / info.harvestDays) * 100))
  const isNew = age < 1 && !logs.length

  return (
    <div className="grid grid-2 top">
      <div className="stack">
        <section className="card">
          <span className="tag">[ Day {age} of about {info.harvestDays} ]</span>
          <h2>{info.name}</h2>
          <div className="progress" role="img" aria-label={`${progress}% of the way to harvest`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <dl className="kv">
            <div>
              <dt>Stage</dt>
              <dd>{plant.stage}</dd>
            </div>
            <div>
              <dt>Water</dt>
              <dd>{{ low: 'Low', ok: 'Good', high: 'Too wet' }[plant.water] ?? 'Good'}</dd>
            </div>
            <div>
              <dt>Light</dt>
              <dd>{plant.lightHours} h</dd>
            </div>
          </dl>
          {alerts.length ? (
            <div className="stack">
              {alerts.map((a) => (
                <p key={a.text} className={`alert ${a.status} small flush`} role="status">
                  {a.text}
                </p>
              ))}
            </div>
          ) : (
            <p className="alert green small flush">All looks well. Keep to the daily checklist.</p>
          )}
        </section>

        <section className="card quiet">
          <h2>{isNew ? 'Getting started' : 'Growing steps'}</h2>
          <p className="muted small">You need: {info.materials.join(', ')}.</p>
          <ol className="steps">
            {info.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>

        <PhotoLog logs={logs} />
      </div>

      {/* Keyed by plant and day only: saving must not reset the form (it would hide the confirmation). */}
      <DailyChecklist key={`${plant.uid}-${today}`} plant={plant} todays={todays} />
    </div>
  )
}

function DailyChecklist({ plant, todays }) {
  const [done, setDone] = useState(todays?.done ?? {})
  const [stage, setStage] = useState(todays?.stage ?? plant.stage)
  const [water, setWater] = useState(todays?.water ?? plant.water ?? 'ok')
  const [lightHours, setLightHours] = useState(todays?.lightHours ?? plant.lightHours)
  const [problems, setProblems] = useState(todays?.problems ?? [])
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState(null)
  const [saved, setSaved] = useState('')

  useEffect(() => {
    if (todays?.note) unseal(todays.note).then(setNote)
  }, [todays])

  const toggle = (key) => setDone({ ...done, [key]: !done[key] })
  const toggleProblem = (key) => setProblems(problems.includes(key) ? problems.filter((p) => p !== key) : [...problems, key])

  async function save(e) {
    e.preventDefault()
    const complete = await saveDailyLog(plant, { done, stage, water, lightHours: Number(lightHours), problems, note, photo })
    setPhoto(null)
    setSaved(complete ? 'Checklist complete. Your crew garden bed got a little boost.' : 'Saved. Finish the remaining items when you can.')
    setTimeout(() => setSaved(''), 5000)
  }

  return (
    <form className="card" onSubmit={save}>
      <span className="tag dim">Today</span>
      <h2>Daily checklist</h2>
      <fieldset className="scale-field">
        <legend className="sr-only">Today&apos;s tasks</legend>
        {CHECKLIST.map((c) => (
          <label key={c.key} className="check">
            <input type="checkbox" checked={Boolean(done[c.key])} onChange={() => toggle(c.key)} />
            <span>{c.label}</span>
          </label>
        ))}
      </fieldset>

      <div className="grid grid-2 form-grid">
        <div className="field">
          <label htmlFor="stage">Growth stage</label>
          <select id="stage" value={stage} onChange={(e) => setStage(e.target.value)}>
            {STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="water">Water level</label>
          <select id="water" value={water} onChange={(e) => setWater(e.target.value)}>
            <option value="low">Low (dry wick)</option>
            <option value="ok">Good (damp wick)</option>
            <option value="high">Too wet (soaked)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="light">
            Light <span className="hint">(hours on)</span>
          </label>
          <input id="light" type="number" min="0" max="24" value={lightHours} onChange={(e) => setLightHours(e.target.value)} />
        </div>
      </div>

      <fieldset className="scale-field">
        <legend className="scale-legend">Anything wrong?</legend>
        {Object.entries(PROBLEMS).map(([key, p]) => (
          <label key={key} className="check">
            <input type="checkbox" checked={problems.includes(key)} onChange={() => toggleProblem(key)} />
            <span>{p.label}</span>
          </label>
        ))}
      </fieldset>

      <div className="field">
        <label htmlFor="plant-note">
          Notes <span className="hint">(optional, encrypted, only you can see them)</span>
        </label>
        <textarea id="plant-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="field">
        <label className="btn secondary" htmlFor="plant-photo" style={{ width: 'fit-content' }}>
          <Icon name="photo" size={18} /> {photo ? 'Change photo' : 'Add today’s photo'}
        </label>
        <input
          id="plant-photo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) {
              setPhoto(await shrinkPhoto(f, 700))
              setDone((d) => ({ ...d, photo: true }))
            }
          }}
        />
        {photo && <img src={photo} alt="Today's plant photo" className="spaced-sm" style={{ maxHeight: 120, borderRadius: 10 }} />}
      </div>

      <button className="btn" type="submit">
        Save today&apos;s checklist
      </button>
      <div aria-live="polite" className="spaced">
        {saved && <div className="toast">{saved}</div>}
      </div>
    </form>
  )
}

function PhotoLog({ logs }) {
  const withPhotos = logs.filter((l) => l.photo)
  const [photos, setPhotos] = useState([])
  useEffect(() => {
    let alive = true
    Promise.all(withPhotos.slice(-6).map(async (l) => ({ date: l.date, src: await unseal(l.photo) }))).then((p) => alive && setPhotos(p))
    return () => {
      alive = false
    }
  }, [withPhotos.length]) // eslint-disable-line
  return (
    <section className="card quiet">
      <div className="row spread">
        <h2>Growth log</h2>
        <StatusPill status={logs.length ? 'green' : 'none'}>
          {logs.length} day{logs.length === 1 ? '' : 's'} logged
        </StatusPill>
      </div>
      {photos.length ? (
        <div className="grid grid-3 spaced-sm">
          {photos.map((p) => (
            <figure key={p.date} className="flush">
              <img src={p.src} alt={`Plant on ${p.date}`} style={{ borderRadius: 10 }} />
              <figcaption className="muted small">{p.date}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="muted small">Photos you add to the checklist appear here, so you can watch your plant grow.</p>
      )}
    </section>
  )
}
