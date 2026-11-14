// Placeholder flower bed drawn with SVG. The look changes with the garden stage.
const LOOK = {
  empty: { count: 0 },
  wilting: { count: 3, height: 34, size: 6, droop: 16, petal: 'var(--petal-dry)', leaf: false },
  needsCare: { count: 3, height: 44, size: 7, droop: 6, petal: null, leaf: true },
  growing: { count: 4, height: 58, size: 9, droop: 0, petal: null, leaf: true },
  blooming: { count: 5, height: 72, size: 11, droop: 0, petal: null, leaf: true },
}

export default function FlowerBed({ stage, color = '#d77fa1', label }) {
  const look = LOOK[stage] ?? LOOK.empty
  const xs = spread(look.count)

  return (
    <svg viewBox="0 0 240 140" role="img" aria-label={label} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* soil */}
      <rect x="10" y="108" width="220" height="24" rx="8" fill="var(--soil)" />
      <rect x="10" y="108" width="220" height="6" rx="3" fill="var(--soil)" opacity="0.6" />
      {look.count === 0 &&
        [50, 95, 145, 190].map((x) => <ellipse key={x} cx={x} cy="112" rx="5" ry="2.2" fill="var(--bg)" opacity="0.5" />)}
      {xs.map((x, i) => (
        <Flower
          key={i}
          x={x}
          h={look.height + (i % 2 ? -6 : 4)}
          size={look.size}
          droop={look.droop * (i % 2 ? -1 : 1)}
          petal={look.petal ?? color}
          leaf={look.leaf}
        />
      ))}
    </svg>
  )
}

function spread(n) {
  if (!n) return []
  const gap = 200 / (n + 1)
  return Array.from({ length: n }, (_, i) => 20 + gap * (i + 1))
}

function Flower({ x, h, size, droop, petal, leaf }) {
  const top = 108 - h
  const hx = x + droop
  const hy = top + Math.abs(droop) * 0.8
  return (
    <g>
      <path d={`M${x} 108 Q ${x} ${top + h / 3} ${hx} ${hy}`} stroke="var(--stem)" strokeWidth="3" fill="none" strokeLinecap="round" />
      {leaf && <ellipse cx={x + 7} cy={108 - h / 3} rx="7" ry="3" fill="var(--stem)" transform={`rotate(-30 ${x + 7} ${108 - h / 3})`} />}
      {[0, 72, 144, 216, 288].map((a) => {
        const r = (a * Math.PI) / 180
        return <circle key={a} cx={hx + Math.cos(r) * size * 0.9} cy={hy + Math.sin(r) * size * 0.9} r={size * 0.7} fill={petal} />
      })}
      <circle cx={hx} cy={hy} r={size * 0.55} fill="#f2c94c" />
    </g>
  )
}
