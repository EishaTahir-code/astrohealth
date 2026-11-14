import { useEffect, useState } from 'react'
import Guide from './Guide'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon, Logo } from './Icons'
import { login, logout, ROLE_LABEL } from '../lib/auth'
import { useLink } from '../lib/connection'
import { startAutoSync, stopAutoSync, syncNow, useSyncStatus } from '../lib/sync'
import { db, getSetting, setSetting } from '../lib/db'
import { CREW } from '../data/crew'

// [id, label, icon, href, group]
const NAV = {
  astronaut: [
    ['today', 'Today', 'today', '#/me', null],
    ['checkin', 'Daily check-in', 'checkin', '#/me/checkin', 'Daily'],
    ['reaction', 'Alertness game', 'reaction', '#/me/reaction', 'Daily'],
    ['health', 'Health', 'health', '#/me/health', 'Health'],
    ['meds', 'Medical kit', 'meds', '#/me/meds', 'Health'],
    ['care', 'Flight surgeon', 'care', '#/me/care', 'Health'],
    ['family', 'Family', 'family', '#/me/family', 'Life on board'],
    ['greenhouse', 'Greenhouse', 'greenhouse', '#/me/greenhouse', 'Life on board'],
    ['garden', 'Crew garden', 'garden', '#/garden', 'Life on board'],
  ],
  doctor: [
    ['crew', 'Crew overview', 'crew', '#/doctor', null],
    ['alerts', 'Alerts', 'alerts', '#/doctor/alerts', null],
    ...CREW.map((c) => [c.id, c.name, 'person', `#/doctor/${c.id}`, 'Astronauts']),
    ['log', 'Access log', 'log', '#/doctor/log', 'Records'],
    ['garden', 'Crew garden', 'garden', '#/garden', 'Records'],
  ],
}

function useBadges(user) {
  return (
    useLiveQuery(async () => {
      if (user.role === 'doctor') {
        return { alerts: await db.alerts.filter((a) => !a.reviewed).count() }
      }
      const me = user.crewId
      return {
        family: await db.family.where('userId').equals(me).filter((m) => m.direction === 'in' && !m.read).count(),
        care: await db.careMessages.where('userId').equals(me).filter((m) => m.from === 'doctor' && !m.read).count(),
      }
    }, [user.role, user.crewId]) ?? {}
  )
}

// Signed-in layout: sidebar (top bar on phones) + page content.
export default function AppShell({ user, active, children }) {
  const items = NAV[user.role] ?? []
  const badges = useBadges(user)

  const [guideOpen, setGuideOpen] = useState(false)

  // Background sync while signed in.
  useEffect(() => {
    startAutoSync()
    return stopAutoSync
  }, [user.email])

  // The guide opens by itself the first time this account signs in on this device.
  useEffect(() => {
    let alive = true
    getSetting(`guideSeen:${user.email}`, false).then((seen) => alive && !seen && setGuideOpen(true))
    return () => {
      alive = false
    }
  }, [user.email])
  const closeGuide = () => {
    setGuideOpen(false)
    setSetting(`guideSeen:${user.email}`, true)
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className="sidebar">
        <a className="brand" href={user.role === 'doctor' ? '#/doctor' : '#/me'}>
          <Logo /> <span>Orbloom</span>
        </a>
        {user.role === 'astronaut' && (
          <a className="help-btn" href="#/me/help">
            <Icon name="help" size={20} /> Get medical help
          </a>
        )}
        <nav className="side-nav" aria-label="Main">
          {items.map(([id, label, icon, href, group], i) => {
            const showGroup = group && group !== items[i - 1]?.[4]
            const badge = badges[id]
            return [
              showGroup && (
                <span key={`g-${group}`} className="side-group" aria-hidden="true">
                  {group}
                </span>
              ),
              <a key={id} href={href} aria-current={active === id ? 'page' : undefined}>
                <Icon name={icon} />
                <span>{label}</span>
                {badge > 0 && (
                  <span className="nav-badge">
                    {badge}
                    <span className="sr-only"> new</span>
                  </span>
                )}
              </a>,
            ]
          })}
        </nav>
        <div className="side-foot">
          <div className="foot-links">
            <button type="button" className="foot-link" onClick={() => setGuideOpen(true)}>
              <Icon name="today" size={18} /> Guide
            </button>
            {user.role === 'astronaut' && (
              <a className="foot-link" href="#/me/settings" aria-current={active === 'settings' ? 'page' : undefined}>
                <Icon name="settings" size={18} /> Settings
              </a>
            )}
          </div>
          <ConnectionStatus showSync />
          <div className="who">
            <span className="who-name">{user.name}</span>
            <span className="who-role">
              {ROLE_LABEL[user.role]} (demo){user.token ? '' : ', signed in offline'}
            </span>
          </div>
          <button type="button" className="signout" onClick={() => { logout(); window.location.hash = '#/' }}>
            <Icon name="signout" size={18} /> <span className="signout-text">Sign out</span>
          </button>
        </div>
      </aside>
      <main id="main" className="main" tabIndex={-1}>
        <LinkBanners user={user} />
        {children}
      </main>
      {guideOpen && <Guide role={user.role} onClose={closeGuide} />}
    </div>
  )
}

// Layout for the crew garden when nobody is signed in (the PRD says it needs no login).
export function PublicShell({ children }) {
  return (
    <div className="public">
      <header className="public-bar">
        <a className="brand" href="#/">
          <Logo /> <span>Orbloom</span>
        </a>
        <ConnectionStatus compact />
        <a className="btn small-btn" href="#/">Sign in</a>
      </header>
      <main id="main" className="main">{children}</main>
    </div>
  )
}

function ago(ts) {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  return `${Math.round(s / 3600)} h ago`
}

export function ConnectionStatus({ compact = false, showSync = false }) {
  const link = useLink()
  const sync = useSyncStatus()
  return (
    <div className={`conn ${compact ? 'compact' : ''}`} aria-live="polite">
      <span>
        <i className={`dot ${link.open ? 'on' : 'off'}`} aria-hidden="true" />
        {!link.online ? 'Offline, saving on this device' : link.oldServer ? 'Older server answering' : link.blackout ? 'Ground link down (practice)' : link.server ? 'Ground link open' : link.server === null ? 'Checking link…' : 'App server not reachable'}
      </span>
      <span>
        <i className={`dot ${link.ai ? 'on' : 'off'}`} aria-hidden="true" />
        {link.ai ? 'AI connected' : link.server === null ? 'Checking AI…' : link.aiProblem === 'example' || link.aiProblem === 'missing' ? 'AI: no key yet' : link.aiProblem === 'refused' ? 'AI: key not accepted' : 'AI: offline answers'}
      </span>
      {showSync && (
        <span className="sync-line">
          <i className={`dot ${sync.phase === 'syncing' ? 'busy' : sync.phase === 'done' ? 'on' : 'off'}`} aria-hidden="true" />
          {sync.phase === 'syncing' ? 'Syncing…' : sync.phase === 'done' ? `Synced ${ago(sync.lastSyncAt)}` : sync.message || 'Not synced yet'}
          {sync.phase !== 'syncing' && link.open && (
            <button type="button" className="link-btn small" onClick={() => syncNow()}>
              Sync now
            </button>
          )}
        </span>
      )}
    </div>
  )
}

// Shown at the top of every signed-in page when something blocks the AI and syncing.
function LinkBanners({ user }) {
  const link = useLink()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (link.oldServer) {
    return (
      <div className="banner warn page-banner" role="status">
        <Icon name="help" />
        <p>An older copy of the Orbloom server is answering (probably another folder still running). Close that terminal, then run “npm run dev” again in this folder.</p>
      </div>
    )
  }
  // Signed in while offline, and now the server can be reached: one step to reconnect.
  if (!user.token && link.server && link.online) {
    async function reconnect(e) {
      e.preventDefault()
      setBusy(true)
      const res = await login(user.email, password, user.role)
      setBusy(false)
      if (res.ok && res.session.token) {
        setPassword('')
        syncNow()
      } else setError(res.ok ? 'Still offline. Try again in a moment.' : res.error)
    }
    return (
      <form className="banner page-banner" onSubmit={reconnect}>
        <Icon name="help" />
        <p>
          {user.expired ? 'Your sign-in ran out.' : 'You signed in while offline.'} The AI and syncing are paused until you reconnect.
          {error && <span className="form-error"> {error}</span>}
        </p>
        <label htmlFor="reconnect-pw" className="sr-only">Password</label>
        <input id="reconnect-pw" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ maxWidth: 180 }} />
        <button className="btn small-btn" type="submit" disabled={busy || !password}>
          {busy ? 'Reconnecting…' : 'Reconnect'}
        </button>
      </form>
    )
  }
  return null
}
