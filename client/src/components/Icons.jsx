// Fine-line icons in one style (24px grid, 1.6px stroke), drawn like specimen sketches.
// The glowing part uses --icon-accent (pale lime by default).
const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
const accent = 'var(--icon-accent, var(--lime))'

const ICONS = {
  today: (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <ellipse key={a} cx="12" cy="6.4" rx="1.6" ry="2.9" transform={`rotate(${a} 12 12)`} {...line} />
      ))}
      <circle cx="12" cy="12" r="2.2" fill={accent} />
    </>
  ),
  checkin: (
    <>
      <path d="M7.2 4.8c0 4.3 1.8 6.9 4.8 6.9s4.8-2.6 4.8-6.9l-2.4 1.7L12 3.4 9.6 6.5z" {...line} />
      <path d="M12 11.7V20.5M12 17.6c-2.7 0-4.3-1.5-4.8-3.7 2.7 0 4.3 1.4 4.8 3.7z" {...line} />
      <circle cx="12" cy="7.6" r="1.3" fill={accent} />
    </>
  ),
  health: (
    <>
      <path d="M12 19.5s-6.8-4.1-6.8-9a3.5 3.5 0 0 1 6.8-1.3 3.5 3.5 0 0 1 6.8 1.3c0 4.9-6.8 9-6.8 9z" {...line} />
      <path d="M8.3 12h2l1.1-2.2 1.5 4.2 1.1-2h1.7" {...line} stroke={accent} />
    </>
  ),
  ai: (
    <>
      <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H11l-4 3.5v-3.5h-.5a2 2 0 0 1-2-2z" {...line} />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx="12" cy="7.9" r="1.2" transform={`rotate(${a} 12 10)`} fill={accent} />
      ))}
    </>
  ),
  meds: (
    <>
      <path d="M12 20.5V7M12 10.5c-2.6 0-4.2-1.5-4.7-3.8 2.6 0 4.2 1.4 4.7 3.8zM12 10.5c2.6 0 4.2-1.5 4.7-3.8-2.6 0-4.2 1.4-4.7 3.8zM12 15.5c-2.9 0-4.6-1.6-5.1-4.1 2.9 0 4.6 1.5 5.1 4.1zM12 15.5c2.9 0 4.6-1.6 5.1-4.1-2.9 0-4.6 1.5-5.1 4.1z" {...line} />
      <circle cx="12" cy="5" r="1.7" fill={accent} />
    </>
  ),
  reaction: (
    <>
      <circle cx="12" cy="13.5" r="6.5" {...line} />
      <path d="M12 13.5l2.8-2.6M10 3.5h4M12 3.5V7" {...line} />
      <circle cx="12" cy="13.5" r="1.3" fill={accent} />
    </>
  ),
  garden: (
    <>
      <path d="M4 20h16M8 20v-6M12 20V9M16 20v-6" {...line} />
      <circle cx="8" cy="12.3" r="1.9" fill={accent} />
      <circle cx="12" cy="7.2" r="2.1" fill={accent} />
      <circle cx="16" cy="12.3" r="1.9" fill={accent} />
    </>
  ),
  family: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 14.5z" {...line} />
      <path d="M4.6 6.5l7.4 5.6 7.4-5.6" {...line} />
      <path d="M12 20.5c-1.4-1-2.3-1.8-2.3-2.7a1.15 1.15 0 0 1 2.3-.4 1.15 1.15 0 0 1 2.3.4c0 .9-.9 1.7-2.3 2.7z" fill={accent} />
    </>
  ),
  greenhouse: (
    <>
      <path d="M4 20V10l8-5.5 8 5.5v10z" {...line} />
      <path d="M12 20v-5.5M12 16.5c-2 0-3.1-1.1-3.4-2.7 2 0 3.1 1 3.4 2.7zM12 15c1.7 0 2.7-1 3-2.4-1.7 0-2.7.9-3 2.4z" {...line} />
      <circle cx="12" cy="12.6" r="1.1" fill={accent} />
    </>
  ),
  care: (
    <>
      <path d="M7 4v5a4 4 0 0 0 8 0V4M7 4H5.5M15 4h1.5" {...line} />
      <path d="M11 13v2.5a4.5 4.5 0 0 0 9 0V13" {...line} />
      <circle cx="20" cy="11.4" r="1.6" fill={accent} />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" {...line} />
      <path d="M12 7.5v5.5" {...line} strokeWidth="2" />
      <circle cx="12" cy="16.2" r="1.2" fill="currentColor" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="2.6" {...line} />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4L18 18M6 18l1.6-1.6M16.4 7.6L18 6" {...line} />
    </>
  ),
  crew: (
    <>
      <circle cx="8.3" cy="9" r="2.6" {...line} />
      <circle cx="15.7" cy="9" r="2.6" {...line} />
      <path d="M3.5 18.5c.6-2.8 2.5-4.4 4.8-4.4s4.2 1.6 4.8 4.4M11 15c.9-.6 2-.9 3.1-.9 2.3 0 4.2 1.6 4.8 4.4" {...line} />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8.5" r="3.2" {...line} />
      <path d="M5.8 19.5c.8-3.4 3.3-5.3 6.2-5.3s5.4 1.9 6.2 5.3" {...line} />
    </>
  ),
  alerts: (
    <>
      <path d="M12 4a5 5 0 0 0-5 5v3.5L5.5 16h13L17 12.5V9a5 5 0 0 0-5-5zM10 19a2 2 0 0 0 4 0" {...line} />
      <circle cx="17.5" cy="5.5" r="2" fill={accent} />
    </>
  ),
  log: (
    <>
      <path d="M7 3.5h7.5L18 7v13.5H7z" {...line} />
      <path d="M14.5 3.5V7H18M9.5 11h6M9.5 14h6M9.5 17h4" {...line} />
    </>
  ),
  signout: (
    <>
      <path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10" {...line} />
      <path d="M14.5 8l4 4-4 4M18.5 12H9.5" {...line} />
    </>
  ),
  back: <path d="M14.5 5.5L8 12l6.5 6.5" {...line} />,
  check: <path d="M5 12.5l4.2 4.2L19 7" {...line} />,
  photo: (
    <>
      <rect x="3.5" y="6" width="17" height="13" rx="2.5" {...line} />
      <path d="M8.5 6l1.5-2h4l1.5 2" {...line} />
      <circle cx="12" cy="12.5" r="3.3" {...line} />
    </>
  ),
}

export function Icon({ name, size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      {ICONS[name]}
    </svg>
  )
}

// The Orbloom mark: a luminous five-petal bloom crossed by a fine orbit.
export function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" style={{ overflow: 'visible' }}>
      <ellipse cx="16" cy="16" rx="14.8" ry="5.6" fill="none" stroke="var(--teal-2)" strokeWidth="1" transform="rotate(-22 16 16)" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="16" cy="9.8" rx="3.4" ry="5.4" transform={`rotate(${a} 16 16)`} fill="rgba(243,246,234,0.16)" stroke="var(--bone)" strokeWidth="1" />
      ))}
      <circle cx="16" cy="16" r="2.6" fill="var(--lime)" style={{ filter: 'drop-shadow(0 0 4px rgba(223,233,154,0.9))' }} />
      <circle cx="29.1" cy="10.6" r="1.2" fill="var(--lime)" />
    </svg>
  )
}
