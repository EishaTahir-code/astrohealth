import { Icon, Logo } from './Icons'
import { logout, ROLE_LABEL } from '../lib/auth'
import { useAiReady, useOnline } from '../lib/connection'
import { CREW } from '../data/crew'

// Navigation for each kind of user. [id, label, icon, href, flower colour]
const NAV = {
  astronaut: [
    ['today', 'Today', 'today', '#/me', 'var(--marigold)'],
    ['checkin', 'Daily check-in', 'checkin', '#/me/checkin', 'var(--poppy)'],
    ['health', 'Health', 'health', '#/me/health', 'var(--poppy)'],
    ['ai', 'Health assistant', 'ai', '#/me/ai', 'var(--lavender)'],
    ['meds', 'Medication', 'meds', '#/me/meds', 'var(--periwinkle)'],
    ['reaction', 'Alertness game', 'reaction', '#/me/reaction', 'var(--moss)'],
    ['garden', 'Crew garden', 'garden', '#/garden', 'var(--lavender)'],
  ],
  doctor: [
    ['crew', 'Crew overview', 'crew', '#/doctor', 'var(--marigold)'],
    ...CREW.map((c) => [c.id, c.name, 'person', `#/doctor/${c.id}`, c.flower]),
    ['garden', 'Crew garden', 'garden', '#/garden', 'var(--lavender)'],
  ],
}

// Signed-in layout: sidebar (top bar on phones) + page content.
export default function AppShell({ user, active, children }) {
  const items = NAV[user.role] ?? []
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className="sidebar">
        <a className="brand" href={user.role === 'doctor' ? '#/doctor' : '#/me'}>
          <Logo /> <span>Orbloom</span>
        </a>
        <nav className="side-nav" aria-label="Main">
          {user.role === 'doctor' && <span className="side-nav-label">Flight surgeon</span>}
          {items.map(([id, label, icon, href, flower]) => (
            <a
              key={id}
              href={href}
              aria-current={active === id ? 'page' : undefined}
              style={{ '--icon-accent': flower }}
            >
              <Icon name={icon} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="side-foot">
          <ConnectionStatus />
          <div className="who">
            <span className="who-name">{user.name}</span>
            <span className="who-role">{ROLE_LABEL[user.role]} (demo)</span>
          </div>
          <button type="button" className="signout" onClick={() => { logout(); window.location.hash = '#/' }}>
            <Icon name="signout" size={20} /> <span className="signout-text">Sign out</span>
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
      <main id="main" className="main main-public">{children}</main>
    </div>
  )
}

export function ConnectionStatus({ compact = false }) {
  const online = useOnline()
  const aiReady = useAiReady(online)
  return (
    <div className={`conn ${compact ? 'compact' : ''}`} aria-live="polite">
      <span>
        <i className={`dot ${online ? 'on' : 'off'}`} aria-hidden="true" />
        {online ? 'Online' : 'Offline, saving on this device'}
      </span>
      <span>
        <i className={`dot ${aiReady ? 'on' : 'off'}`} aria-hidden="true" />
        {aiReady ? 'AI connected' : aiReady === null ? 'Checking AI…' : 'AI: offline answers'}
      </span>
    </div>
  )
}
