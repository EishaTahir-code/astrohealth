import { useEffect, useRef, useState } from 'react'
import Guide from './Guide'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon, Logo } from './Icons'
import { login, logout, ROLE_LABEL, useCloudReady } from '../lib/auth'
import { useLink } from '../lib/connection'
import { finishBeforeSignOut, startAutoSync, stopAutoSync, syncNow, useSyncStatus } from '../lib/sync'
import { db, getSetting, setSetting } from '../lib/db'
import { useCrew } from '../data/crew'

// [id, label, icon, href, group, tag]
const NAV = {
  astronaut: [
    ['today', 'Today', 'today', '#/me', null],
    ['checkin', 'Daily check-in', 'checkin', '#/me/checkin', 'Daily'],
    ['reaction', 'Alertness game', 'reaction', '#/me/reaction', 'Daily'],
    ['health', 'Health', 'health', '#/me/health', 'Health'],
    ['meds', 'Medical kit', 'meds', '#/me/meds', 'Health'],
    ['care', 'Flight surgeon', 'care', '#/me/care', 'Health'],
    ['family', 'Family', 'family', '#/me/family', 'Life on board', 'Beta'],
    ['greenhouse', 'Greenhouse', 'greenhouse', '#/me/greenhouse', 'Life on board'],
    ['garden', 'Crew garden', 'garden', '#/garden', 'Life on board'],
  ],
  doctor: [
    ['crew', 'Crew overview', 'crew', '#/doctor', null],
    ['alerts', 'Alerts', 'alerts', '#/doctor/alerts', null],
    // (one link per astronaut is added here, see AppShell)
    ['log', 'Access log', 'log', '#/doctor/log', 'Records'],
    ['garden', 'Crew garden', 'garden', '#/garden', 'Records'],
  ],
}

function useBadges(user, crewIds) {
  return (
    useLiveQuery(async () => {
      if (user.role === 'doctor') {
        const mine = new Set(crewIds.split(','))
        return { alerts: await db.alerts.filter((a) => !a.reviewed && mine.has(a.userId)).count() }
      }
      const me = user.crewId
      return {
        family: await db.family.where('userId').equals(me).filter((m) => m.direction === 'in' && !m.read).count(),
        care: await db.careMessages.where('userId').equals(me).filter((m) => m.from === 'doctor' && !m.read).count(),
      }
    }, [user.role, user.crewId, crewIds]) ?? {}
  )
}

// On phones the menu is one line: swipe it sideways, or drag it with a mouse.
function useDragScroll(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let start = null
    let moved = false
    const down = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || el.scrollWidth <= el.clientWidth) return
      start = { x: e.clientX, left: el.scrollLeft }
      moved = false
    }
    const move = (e) => {
      if (!start) return
      const dx = e.clientX - start.x
      if (!moved && Math.abs(dx) < 6) return
      moved = true
      el.classList.add('dragging')
      el.scrollLeft = start.left - dx
    }
    const up = () => {
      start = null
      el.classList.remove('dragging')
    }
    // A drag should not also open the link it started on.
    const click = (e) => {
      if (moved) {
        e.preventDefault()
        e.stopPropagation()
        moved = false
      }
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    el.addEventListener('click', click, true)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.removeEventListener('click', click, true)
    }
  }, [ref])
}

// Signed-in layout: sidebar (one swipeable line on phones) + page content.
export default function AppShell({ user, active, children }) {
  const crew = useCrew()
  const items =
    user.role === 'doctor'
      ? [...NAV.doctor.slice(0, 2), ...crew.map((c) => [c.id, c.name, 'person', `#/doctor/${c.id}`, 'Astronauts']), ...NAV.doctor.slice(2)]
      : NAV[user.role] ?? []
  const cloud = useCloudReady(user.email)
  const badges = useBadges(user, crew.map((c) => c.id).join(','))

  const [guideOpen, setGuideOpen] = useState(false)
  const barRef = useRef(null)
  useDragScroll(barRef)

  // On phones, bring the current page's menu item into view.
  useEffect(() => {
    const bar = barRef.current
    const current = bar?.querySelector('.side-nav [aria-current="page"]')
    if (!current || !window.matchMedia('(max-width: 920px)').matches) return
    // Keep it clear of both edges.
    const barBox = bar.getBoundingClientRect()
    const item = current.getBoundingClientRect()
    const leftLimit = barBox.left + 12
    if (item.left < leftLimit) bar.scrollLeft -= leftLimit - item.left
    else if (item.right > barBox.right - 16) bar.scrollLeft += item.right - (barBox.right - 16)
  }, [active])

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

  // On phones the medical help button sits in its own bar at the bottom of the screen.
  const dock = user.role === 'astronaut' && active !== 'help'

  return (
    <div className={`shell${dock ? ' has-dock' : ''}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className="sidebar" ref={barRef}>
        <a className="brand" href={user.role === 'doctor' ? '#/doctor' : '#/me'}>
          <Logo /> <span>Orbloom</span>
        </a>
        {user.role === 'astronaut' && (
          <a className="help-btn" href="#/me/help">
            <Icon name="help" size={20} /> Get medical help
          </a>
        )}
        <nav className="side-nav" aria-label="Main">
          {items.map(([id, label, icon, href, group, tag], i) => {
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
                {tag && <span className="nav-tag">{tag}</span>}
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
              {ROLE_LABEL[user.role]}
              {user.sample ? ', sample crew' : ''}
              {cloud === false ? ', signed in offline' : ''}
            </span>
          </div>
          <SignOutButton />
        </div>
      </aside>
      <main id="main" className="main" tabIndex={-1}>
        <LinkBanners user={user} />
        {children}
      </main>
      {dock && (
        <div className="help-dock">
          <a className="help-btn" href="#/me/help">
            <Icon name="help" size={20} /> Get medical help
          </a>
        </div>
      )}
      {guideOpen && <Guide role={user.role} onClose={closeGuide} />}
    </div>
  )
}

// Layout for the crew garden when nobody is signed in (the PRD says it needs no login).
// Sign out: first sends anything still waiting (a few seconds at most), then signs out.
function SignOutButton() {
  const [leaving, setLeaving] = useState(false)
  const signOut = async () => {
    setLeaving(true)
    await finishBeforeSignOut()
    logout()
    window.location.hash = '#/'
  }
  return (
    <button type="button" className="signout" onClick={signOut} disabled={leaving} aria-busy={leaving}>
      <Icon name="signout" size={18} /> <span className="signout-text">{leaving ? 'Saving…' : 'Sign out'}</span>
    </button>
  )
}

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
        {!link.online ? 'Offline, saving on this device' : link.blackout ? 'Ground link down (practice)' : link.server ? 'Ground link open' : link.server === null ? 'Checking link…' : 'Ground link not reachable'}
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
  const cloud = useCloudReady(user.email)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Signed in while offline (or the sign-in ran out), and now the ground link is open: one step to reconnect.
  if (cloud === false && link.server && link.online) {
    async function reconnect(e) {
      e.preventDefault()
      setBusy(true)
      const res = await login(user.email, password, user.role)
      setBusy(false)
      if (res.ok && res.session.online) {
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
