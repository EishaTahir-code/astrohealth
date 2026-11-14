// Small flower-themed line icons, one per section. All share the same
// 24px grid and 1.7px stroke. The coloured part uses the CSS variable
// --icon-accent, so each section can tint its own flower.
const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
const accent = 'var(--icon-accent, currentColor)'

const ICONS = {
  // daisy: the "Today" overview
  today: (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <ellipse key={a} cx="12" cy="6.3" rx="1.8" ry="3" transform={`rotate(${a} 12 12)`} {...line} />
      ))}
      <circle cx="12" cy="12" r="2.4" fill={accent} />
    </>
  ),
  // tulip: daily check-in
  checkin: (
    <>
      <path d="M7.2 4.8c0 4.3 1.8 6.9 4.8 6.9s4.8-2.6 4.8-6.9l-2.4 1.7L12 3.4 9.6 6.5z" fill={accent} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 11.7V20.5" {...line} />
      <path d="M12 17.6c-2.7 0-4.3-1.5-4.8-3.7 2.7 0 4.3 1.4 4.8 3.7zM12 16c2.2 0 3.6-1.2 4-3 -2.2 0-3.6 1.1-4 3z" {...line} />
    </>
  ),
  // heart-shaped bloom: health readings
  health: (
    <>
      <path d="M12 19.5s-6.8-4.1-6.8-9a3.5 3.5 0 0 1 6.8-1.3 3.5 3.5 0 0 1 6.8 1.3c0 4.9-6.8 9-6.8 9z" {...line} />
      <path d="M8.5 12h2l1-2 1.5 4 1-2h1.5" {...line} stroke={accent} />
    </>
  ),
  // speech bubble with a flower: health assistant (AI 1)
  ai: (
    <>
      <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H11l-4 3.5v-3.5h-.5a2 2 0 0 1-2-2z" {...line} />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx="12" cy="7.7" r="1.35" transform={`rotate(${a} 12 10)`} fill={accent} />
      ))}
      <circle cx="12" cy="10" r="1" fill="currentColor" />
    </>
  ),
  // herb sprig: medication assistant (AI 2)
  meds: (
    <>
      <path d="M12 20.5V7" {...line} />
      <path d="M12 10.5c-2.6 0-4.2-1.5-4.7-3.8 2.6 0 4.2 1.4 4.7 3.8zM12 10.5c2.6 0 4.2-1.5 4.7-3.8-2.6 0-4.2 1.4-4.7 3.8zM12 15.5c-2.9 0-4.6-1.6-5.1-4.1 2.9 0 4.6 1.5 5.1 4.1zM12 15.5c2.9 0 4.6-1.6 5.1-4.1-2.9 0-4.6 1.5-5.1 4.1z" {...line} />
      <circle cx="12" cy="5" r="1.9" fill={accent} />
    </>
  ),
  // stopwatch with a leaf: alertness game
  reaction: (
    <>
      <circle cx="12" cy="13.5" r="6.5" {...line} />
      <path d="M12 13.5l2.8-2.6M10 3.5h4M12 3.5V7" {...line} />
      <path d="M17.2 7.3c.3-1.6 1.4-2.6 3-2.8-.2 1.6-1.3 2.6-3 2.8z" fill={accent} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </>
  ),
  // planter with three flowers: crew garden
  garden: (
    <>
      <path d="M5 14h14l-1.6 6H6.6z" {...line} />
      <path d="M8.5 14v-3.5M12 14V8.5M15.5 14v-3.5" {...line} />
      <circle cx="8.5" cy="9" r="1.8" fill={accent} />
      <circle cx="12" cy="6.6" r="2" fill={accent} />
      <circle cx="15.5" cy="9" r="1.8" fill={accent} />
    </>
  ),
  // two people: doctor's crew overview
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
  signout: (
    <>
      <path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10" {...line} />
      <path d="M14.5 8l4 4-4 4M18.5 12H9.5" {...line} />
    </>
  ),
  back: <path d="M14.5 5.5L8 12l6.5 6.5" {...line} />,
  check: <path d="M5 12.5l4.2 4.2L19 7" {...line} />,
}

export function Icon({ name, size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      {ICONS[name]}
    </svg>
  )
}

// The Orbloom mark: a five-petal bloom inside an orbit.
export function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <ellipse cx="16" cy="16" rx="14.5" ry="6.2" fill="none" stroke="var(--moss)" strokeWidth="1.8" transform="rotate(-24 16 16)" />
      {[0, 72, 144, 216, 288].map((a, i) => (
        <ellipse
          key={a}
          cx="16"
          cy="9.6"
          rx="3.6"
          ry="5"
          transform={`rotate(${a} 16 16)`}
          fill={i % 2 ? 'var(--periwinkle)' : 'var(--lavender)'}
        />
      ))}
      <circle cx="16" cy="16" r="3.4" fill="var(--marigold)" />
    </svg>
  )
}
