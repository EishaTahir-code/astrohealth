import { useId } from 'react'

// One crew member's flower bed: a small night meadow, like the design image garden.png.
// It changes with the garden stage: empty -> wilting -> needs care -> growing -> blooming.
// Healthy flowers glow and sway gently; wilting ones droop and lose their light.
const LOOK = {
  empty: { n: 0 },
  wilting: { n: 6, h: [24, 44], heads: 4, size: 0.72, dry: true },
  needsCare: { n: 8, h: [34, 60], heads: 4, size: 0.82 },
  growing: { n: 11, h: [46, 86], heads: 8, size: 0.95, sway: true },
  blooming: { n: 14, h: [56, 104], heads: 14, size: 1.08, sway: true, fireflies: true },
}
const KINDS = ['daisy', 'umbel', 'daisy', 'seed', 'umbel', 'bud', 'daisy', 'umbel', 'seed', 'daisy', 'umbel', 'daisy', 'bud', 'umbel']
// Fixed "random" numbers so each bed looks natural but never changes between renders.
const jit = (i, k) => (((i * 9301 + k * 49297) % 233280) / 233280 - 0.5) * 2

export default function FlowerBed({ stage, color = 'var(--bone)', label, className }) {
  const id = useId().replace(/:/g, '')
  const look = LOOK[stage] ?? LOOK.empty
  const plants = Array.from({ length: look.n }, (_, i) => {
    const x = look.n > 1 ? 22 + (i * 216) / (look.n - 1) + jit(i, 1) * 6 : 130
    const h = look.h[0] + ((jit(i, 2) + 1) / 2) * (look.h[1] - look.h[0])
    return { i, x, h, kind: KINDS[i % KINDS.length], head: i < look.heads, lean: jit(i, 3) * 10 }
  })
  // Show the taller plants behind the shorter ones.
  plants.sort((a, b) => b.h - a.h)

  return (
    <svg viewBox="0 0 260 150" role="img" aria-label={label} className={`flowerbed ${className ?? ''}`}>
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#081626" />
          <stop offset="0.75" stopColor="#123647" />
          <stop offset="1" stopColor="#0b2230" />
        </linearGradient>
        <filter id={`glow${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="260" height="150" rx="14" fill={`url(#sky${id})`} />
      {[[30, 18], [92, 30], [150, 12], [214, 26], [246, 44], [60, 50], [182, 46]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="0.8" fill="rgba(234,240,230,0.55)" />
      ))}
      <path d="M0 132 Q 65 126 130 131 T 260 129 V150 H0 Z" fill="#06121a" />
      {Array.from({ length: 34 }, (_, i) => {
        const x = 4 + i * 7.6
        return <path key={i} d={`M${x} 140 q ${jit(i, 5) * 3} -6 ${jit(i, 6) * 4} ${-8 - Math.abs(jit(i, 7)) * 8}`} stroke="#123a33" strokeWidth="1" fill="none" />
      })}

      {look.n === 0 &&
        [46, 98, 150, 202].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 136 q 1 -5 ${i % 2 ? 2 : -2} -8`} stroke="var(--stem)" strokeWidth="1.2" fill="none" />
            <circle cx={x + (i % 2 ? 2 : -2)} cy="127.5" r="1.4" fill="var(--lime)" filter={`url(#glow${id})`} opacity="0.8" />
          </g>
        ))}

      {plants.map((p) => {
        const tipX = p.x + p.lean + (look.dry ? (p.i % 2 ? 12 : -12) : 0)
        const tipY = 136 - p.h + (look.dry ? 10 : 0)
        const ctrlX = p.x + p.lean * 0.2
        const ctrlY = 136 - p.h * (look.dry ? 0.9 : 0.5)
        return (
          <g key={p.i} className={look.sway ? 'sway' : undefined} style={look.sway ? { animationDelay: `${-p.i * 0.7}s` } : undefined}>
            <path d={`M${p.x} 137 Q ${ctrlX} ${ctrlY} ${tipX} ${tipY}`} stroke={look.dry ? 'var(--stem-dry)' : 'var(--stem)'} strokeWidth="1.2" fill="none" />
            {p.head && <Head kind={p.kind} x={tipX} y={tipY} s={look.size} color={look.dry ? 'var(--petal-dry)' : color} dry={look.dry} glow={`url(#glow${id})`} />}
          </g>
        )
      })}

      {look.fireflies &&
        [[40, 70], [118, 52], [176, 78], [226, 60], [84, 96]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="1.3" fill="var(--lime)" filter={`url(#glow${id})`} />
        ))}
    </svg>
  )
}

function Head({ kind, x, y, s, color, dry, glow }) {
  const g = dry ? undefined : glow
  if (kind === 'umbel') {
    return (
      <g transform={`translate(${x} ${y}) scale(${s})`} filter={g}>
        {[-60, -40, -20, 0, 20, 40, 60].map((a) => {
          const r = (a * Math.PI) / 180
          const ex = Math.sin(r) * 9
          const ey = -Math.cos(r) * 5 - 2
          return (
            <g key={a}>
              <line x1="0" y1="3" x2={ex} y2={ey} stroke="rgba(200,226,190,0.35)" strokeWidth="0.5" />
              <circle cx={ex} cy={ey} r="1.4" fill={color} />
            </g>
          )
        })}
      </g>
    )
  }
  if (kind === 'seed') {
    return (
      <g transform={`translate(${x} ${y}) scale(${s})`} filter={g} opacity={dry ? 0.6 : 0.9}>
        {Array.from({ length: 18 }, (_, i) => {
          const a = (i / 18) * Math.PI * 2
          return <line key={i} x1="0" y1="0" x2={Math.cos(a) * 6.5} y2={Math.sin(a) * 6.5} stroke={color} strokeWidth="0.45" />
        })}
        <circle r="1.3" fill={dry ? color : 'var(--lime)'} />
      </g>
    )
  }
  if (kind === 'bud') {
    return <ellipse cx={x} cy={y} rx={1.8 * s} ry={3 * s} fill={dry ? color : 'var(--lime)'} filter={g} />
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} filter={g}>
      {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((a) => (
        <ellipse key={a} cx="0" cy="-3.8" rx="1.2" ry="3.2" transform={`rotate(${a})`} fill={color} opacity={dry ? 0.7 : 0.85} />
      ))}
      <circle r="1.9" fill={dry ? 'var(--stem-dry)' : 'var(--lime)'} />
    </g>
  )
}
