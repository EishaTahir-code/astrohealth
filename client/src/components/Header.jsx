import { useEffect, useState } from 'react'
import { getStatus } from '../lib/api'

// Top bar: app name, main sections, and connection status
// (the PRD says sync/connection status must always be visible).
export default function Header({ section }) {
  const online = useOnline()
  const [aiReady, setAiReady] = useState(null)

  useEffect(() => {
    let alive = true
    const check = () =>
      getStatus().then((s) => {
        if (alive) setAiReady(s ? s.ai.health || s.ai.medication : false)
      })
    check()
    const timer = setInterval(check, 30000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [online])

  const links = [
    ['garden', 'Crew garden'],
    ['me', 'My space'],
    ['doctor', 'Doctor'],
  ]

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="#/">
          <LogoMark /> Orbloom
        </a>
        <nav className="nav" aria-label="Main">
          {links.map(([id, label]) => (
            <a key={id} href={`#/${id}`} aria-current={section === id ? 'page' : undefined}>
              {label}
            </a>
          ))}
        </nav>
        <div className="conn" aria-live="polite">
          <span>
            <i className={`dot ${online ? 'on' : 'off'}`} aria-hidden="true" />
            {online ? 'Online' : 'Offline, saving on this device'}
          </span>
          <span>
            <i className={`dot ${aiReady ? 'on' : 'off'}`} aria-hidden="true" />
            {aiReady ? 'AI connected' : 'AI: offline answers'}
          </span>
        </div>
      </div>
    </header>
  )
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <ellipse cx="13" cy="13" rx="11.5" ry="5" fill="none" stroke="var(--accent)" strokeWidth="1.6" transform="rotate(-20 13 13)" />
      <circle cx="13" cy="13" r="3.2" fill="var(--accent)" />
      <circle cx="13" cy="7.6" r="2.4" fill="var(--accent)" opacity="0.75" />
      <circle cx="13" cy="18.4" r="2.4" fill="var(--accent)" opacity="0.75" />
      <circle cx="7.6" cy="13" r="2.4" fill="var(--accent)" opacity="0.75" />
      <circle cx="18.4" cy="13" r="2.4" fill="var(--accent)" opacity="0.75" />
    </svg>
  )
}
