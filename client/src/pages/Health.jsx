import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import HealthOverview from '../components/HealthOverview'
import HealthAssistantPanel from '../components/HealthAssistantPanel'
import { db, newId } from '../lib/db'
import { METRICS, STATUS_LABEL, formatValue, statusOf } from '../lib/health'
import { alertOnRedFlags } from '../lib/alerts'
import { requestSync } from '../lib/sync'

const EMPTY = { sys: '', dia: '', heartRate: '', temperature: '', sleep: '', bloodSugar: '' }

// Sensible limits so typing mistakes (like 1200 bpm) are caught.
const LIMITS = {
  sys: [60, 250], dia: [30, 160], heartRate: [20, 250], temperature: [30, 45], sleep: [0, 24], bloodSugar: [20, 600],
}

// Health: add measurements, ask the assistant, and see each measurement's graph.
// askType (from a link like #/me/health/ask-bp) asks the assistant about that measurement on arrival.
export default function Health({ me, extra }) {
  const readings = useLiveQuery(() => db.readings.where('userId').equals(me).toArray(), [me])
  const [request, setRequest] = useState(null)
  const fromLink = useRef(null)

  // Clicking a yellow or red status: ask the assistant about that reading, and scroll to it.
  const askAbout = useCallback((type, reading) => {
    const text = `My latest ${METRICS[type].label.toLowerCase()} is ${formatValue(reading)} and it is marked “${STATUS_LABEL[statusOf(type, reading.value, reading.value2)]}”. What could this mean, and what should I do?`
    setRequest({ id: `${type}-${Date.now()}`, text })
    document.getElementById('assistant')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    const type = extra?.startsWith('ask-') ? extra.slice(4) : null
    if (!readings || !type || !METRICS[type] || fromLink.current === extra) return
    const latest = [...readings].filter((r) => r.type === type).sort((a, b) => a.recordedAt - b.recordedAt).at(-1)
    if (!latest) return
    // asked once per link, just after the page has drawn
    const t = setTimeout(() => {
      fromLink.current = extra
      askAbout(type, latest)
    }, 0)
    return () => clearTimeout(t)
  }, [extra, readings, askAbout])

  if (!readings) return <p className="muted">Loading…</p>
  return (
    <div className="stack">
      <div className="grid grid-2 top">
        <ReadingForm me={me} />
        <HealthAssistantPanel readings={readings} request={request} />
      </div>
      <HealthOverview readings={readings} onAsk={askAbout} />
      <p className="disclaimer">
        Green, yellow and red use simple reference ranges, not medical advice. The shaded bands on each graph are the
        normal range. This app does not replace professional medical care.
      </p>
    </div>
  )
}

function ReadingForm({ me }) {
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
    const base = { userId: me, recordedAt: now, synced: false }
    const rows = []
    if (form.sys !== '') rows.push({ ...base, uid: newId(), type: 'bp', value: Number(form.sys), value2: Number(form.dia), unit: METRICS.bp.unit })
    for (const type of ['heartRate', 'temperature', 'sleep', 'bloodSugar']) {
      if (form[type] !== '') rows.push({ ...base, uid: newId(), type, value: Number(form[type]), unit: METRICS[type].unit })
    }
    if (!rows.length) {
      setErrors({ form: 'Fill in at least one measurement.' })
      return
    }
    await db.readings.bulkAdd(rows)
    // Red readings become alerts for the flight surgeon; readings sync when the link is open.
    await alertOnRedFlags(me)
    requestSync()
    setForm(EMPTY)
    setSaved(`Saved ${rows.length} reading${rows.length > 1 ? 's' : ''}. They sync to the flight surgeon when the link is open.`)
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
        {field('sys', 'Blood pressure, top', '(mmHg, normal 90–129)', '1')}
        {field('dia', 'Blood pressure, bottom', '(mmHg, normal 60–84)', '1')}
        {field('heartRate', 'Heart rate', '(bpm, normal 50–100)', '1')}
        {field('temperature', 'Temperature', '(°C, normal 36.1–37.5)')}
        {field('sleep', 'Sleep last night', '(hours, 6.5 or more)')}
        {field('bloodSugar', 'Blood sugar', '(mg/dL, normal 70–140)', '1')}
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
