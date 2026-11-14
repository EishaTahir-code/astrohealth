import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon, Logo } from './Icons'
import { logout, ROLE_LABEL } from '../lib/auth'
import { useLink } from '../lib/connection'
import { startAutoSync, stopAutoSync, syncNow, useSyncStatus } from '../lib/sync'
import { db } from '../lib/db'
import { CREW } from '../data/crew'

// [id, label, icon, href, group]
const NAV = {
  astronaut: [
    ['today', 'Today', 'today', '#/me', null],
    ['checkin', 'Daily check-in', 'checkin', '#/me/checkin', 'Daily'],
    ['reaction', 'Alertness game', 'reaction', '#/me/reaction', 'Daily'],
    ['health', 'Health', 'health', '#/me/health', 'Health'],
    ['ai', 'Health assistant', 'ai', '#/me/ai', 'Health'],
    ['meds', 'Medication', 'meds', '#/me/meds', 'Health'],
    ['care', 'Flight surgeon', 'care', '#/me/care', 'Health'],
    ['family', 'Family', 'family', '#/me/family', 'Life on board'],
    ['greenhouse', 'Greenhouse', 'greenhouse', '#/me/greenhouse', 'Life on board'],
    ['garden', 'Crew garden', 'garden', '#/garden', 'Life on board'],
    ['settings', 'Settings', 'settings', '#/me/settings', 'You'],
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

  // Background sync while signed in.
  useEffect(() => {
    startAutoSync()
    return stopAutoSync
  }, [user.email])

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
        {children}
      </main>
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
        {!link.online ? 'Offline, saving on this device' : link.blackout ? 'Ground link down (practice)' : link.server ? 'Ground link open' : link.server === null ? 'Checking link…' : 'App server not reachable'}
      </span>
      <span>
        <i className={`dot ${link.ai ? 'on' : 'off'}`} aria-hidden="true" />
        {link.ai ? 'AI connected' : link.server === null ? 'Checking AI…' : 'AI: offline answers'}
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
