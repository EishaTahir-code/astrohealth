import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, setSetting } from '../lib/db'
import { SUPPORT_MODES, publishCrewStatus } from '../lib/support'
import { encryptionAvailable } from '../lib/secure'
import { syncNow, useSyncStatus } from '../lib/sync'
import { logout } from '../lib/auth'
import { firstName } from '../data/crew'

export default function Settings({ me }) {
  const settings = useLiveQuery(async () => {
    const rows = await db.settings.toArray()
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  }, [])
  const sync = useSyncStatus()
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [notice, setNotice] = useState('')
  const [now] = useState(() => Date.now())
  // Changes show straight away; the saved value catches up a moment later.
  const [pending, setPending] = useState({})
  const value = (key, fallback) => (key in pending ? pending[key] : settings?.[key] ?? fallback)
  async function save(key, v) {
    setPending((p) => ({ ...p, [key]: v }))
    await setSetting(key, v)
  }
  if (!settings) return <p className="muted">Loading…</p>

  const support = value(`support:${me}`, { mode: 'on' })
  const paused = support.mode === 'paused' && support.pausedUntil > now

  async function setSupport(mode) {
    await save(`support:${me}`, { mode, pausedUntil: mode === 'paused' ? Date.now() + 24 * 3600 * 1000 : null })
    await publishCrewStatus(me)
  }

  async function toggleNotifications(on) {
    if (on && 'Notification' in window && Notification.permission !== 'granted') {
      const result = await Notification.requestPermission().catch(() => 'denied')
      if (result !== 'granted') {
        setNotice('Notifications are blocked in this browser. You can allow them in the browser settings.')
        return
      }
    }
    setNotice('')
    await save('notifications', on)
  }

  async function wipe() {
    await db.delete()
    logout()
    window.location.hash = '#/'
    window.location.reload()
  }

  return (
    <div className="grid grid-2 top">
      <section className="card">
        <h2>Crew support alerts</h2>
        <p className="muted small">
          If your garden bed is wilting, crewmates may see: “{firstName(me)}&apos;s garden may need extra support today.” They never see why: no moods, notes or health numbers.
        </p>
        <fieldset className="scale-field">
          <legend className="sr-only">Support alerts about me</legend>
          <div className="radio-list">
            {Object.entries(SUPPORT_MODES).map(([mode, label]) => (
              <label key={mode} className="check">
                <input type="radio" name="support" checked={support.mode === mode} onChange={() => setSupport(mode)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {paused && <p className="small muted">Paused until {new Date(support.pausedUntil).toLocaleString()}.</p>}

        <div className="setting">
          <h3>Notifications</h3>
          <label className="check">
            <input type="checkbox" checked={Boolean(value('notifications', false))} onChange={(e) => toggleNotifications(e.target.checked)} />
            <span>Show a notification when a family or flight-surgeon message arrives while the app is in the background</span>
          </label>
          {notice && <p className="form-error small">{notice}</p>}
        </div>

        <div className="setting">
          <h3>Ground link</h3>
          <label className="check">
            <input type="checkbox" checked={Boolean(value('blackout', false))} onChange={(e) => { const on = e.target.checked; save('blackout', on).then(() => !on && syncNow()) }} />
            <span>Pretend the ground link is down (practice mode). Everything keeps working; messages and readings wait in a queue.</span>
          </label>
          <p className="small muted">
            Sync: {sync.phase === 'done' ? `last synced ${new Date(sync.lastSyncAt).toLocaleTimeString()}` : sync.message || 'not synced yet'}.{' '}
            <button type="button" className="link-btn small" onClick={() => syncNow()}>
              Sync now
            </button>
          </p>
        </div>
      </section>

      <section className="card quiet">
        <h2>Privacy</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>What</th>
                <th>Who can see it</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Check-ins, moods, private notes</td><td>Only you, on this device</td></tr>
              <tr><td>Family messages and photos</td><td>You and the person you write to</td></tr>
              <tr><td>Greenhouse notes and photos</td><td>Only you, on this device</td></tr>
              <tr><td>Health readings, alertness scores</td><td>You and the flight surgeons</td></tr>
              <tr><td>Notes you choose to share</td><td>You and the flight surgeons</td></tr>
              <tr><td>Help signals, red-flag alerts</td><td>You and the flight surgeons</td></tr>
              <tr><td>Garden stage (not the reasons)</td><td>The whole crew</td></tr>
            </tbody>
          </table>
        </div>
        <p className="small spaced">
          {encryptionAvailable
            ? 'Private notes, family messages and greenhouse notes are encrypted on this device (AES-256).'
            : 'This browser cannot encrypt data. Open the app on https or localhost to turn encryption on.'}{' '}
          Every time a flight surgeon opens your profile, it is written to an access log.
        </p>

        <div className="setting">
          <h3>Erase this device</h3>
          <p className="small muted">Deletes everything Orbloom saved in this browser, then signs you out. Data already synced stays on the server.</p>
          {confirmWipe ? (
            <div className="row">
              <button type="button" className="btn danger" onClick={wipe}>
                Yes, erase everything
              </button>
              <button type="button" className="btn secondary" onClick={() => setConfirmWipe(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="btn secondary" onClick={() => setConfirmWipe(true)}>
              Erase this device
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
