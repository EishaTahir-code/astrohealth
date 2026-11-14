import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import HealthOverview from '../components/HealthOverview'
import { db } from '../lib/db'
import { METRICS } from '../lib/health'
import { ME } from '../data/crew'

const EMPTY = { sys: '', dia: '', heartRate: '', temperature: '', sleep: '', bloodSugar: '' }

// Sensible limits so typing mistakes (like 1200 bpm) are caught.
const LIMITS = {
  sys: [60, 250], dia: [30, 160], heartRate: [20, 250], temperature: [30, 45], sleep: [0, 24], bloodSugar: [20, 600],
}

export default function Health() {
  const readings = useLiveQuery(() => db.readings.where('userId').equals(ME).toArray(), [])

  return (
    <div className="stack">
      <ReadingForm />
      {!readings ? <p>Loading…</p> : <HealthOverview readings={readings} />}
      <p className="disclaimer">
        Green, yellow and red use simple demo ranges, not medical advice. The shaded band on each graph is the demo
        &ldquo;stable&rdquo; range. This app does not replace professional medical care.
      </p>
    </div>
  )
}

function ReadingForm() {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState('')

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function save(e) {
    e.preventDefault()
    const errs = {}
    for (const [key, val] of Object.entries(form)) {
      if (val === '') continue
      const n = Number(val)
      const [min, max] = LIMITS[key]
      if (Number.isNaN(n) || n < min || n > max) errs[key] = `Enter a number between ${min} and ${max}.`
    }
    if ((form.sys === '') !== (form.dia === '')) errs.sys = 'Enter both the top and bottom blood pressure numbers.'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const now = Date.now()
    const base = { userId: ME, recordedAt: now, synced: false }
    const rows = []
    if (form.sys !== '') rows.push({ ...base, type: 'bp', value: Number(form.sys), value2: Number(form.dia), unit: METRICS.bp.unit })
    for (const type of ['heartRate', 'temperature', 'sleep', 'bloodSugar']) {
      if (form[type] !== '') rows.push({ ...base, type, value: Number(form[type]), unit: METRICS[type].unit })
    }
    if (!rows.length) {
      setErrors({ form: 'Fill in at least one measurement.' })
      return
    }
    await db.readings.bulkAdd(rows)
    setForm(EMPTY)
    setSaved(`Saved ${rows.length} reading${rows.length > 1 ? 's' : ''} on this device.`)
    setTimeout(() => setSaved(''), 4000)
  }

  const field = (key, label, hint, step = 'any') => (
    <div className="field tight">
      <label htmlFor={key}>
        {label} <span className="hint">{hint}</span>
      </label>
      <input
        id={key}
        type="number"
        inputMode="decimal"
        step={step}
        value={form[key]}
        onChange={set(key)}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `${key}-err` : undefined}
      />
      {errors[key] && <span id={`${key}-err`} className="small field-error">{errors[key]}</span>}
    </div>
  )

  return (
    <form className="card" onSubmit={save} noValidate>
      <h2>Add today&apos;s measurements</h2>
      <p className="muted small">Fill in only what you measured. Everything is optional.</p>
      <div className="grid grid-3 form-grid">
        {field('sys', 'Blood pressure, top', '(mmHg)', '1')}
        {field('dia', 'Blood pressure, bottom', '(mmHg)', '1')}
        {field('heartRate', 'Heart rate', '(bpm)', '1')}
        {field('temperature', 'Temperature', '(°C)')}
        {field('sleep', 'Sleep last night', '(hours)')}
        {field('bloodSugar', 'Blood sugar', '(mg/dL)', '1')}
      </div>
      <div className="row form-actions">
        <button className="btn" type="submit">Save measurements</button>
        <span aria-live="polite">
          {saved && <span className="toast">{saved}</span>}
          {errors.form && <span className="field-error">{errors.form}</span>}
        </span>
      </div>
    </form>
  )
}
