// The walled garden seen from above (sign-in page illustration).
// Inspired by the "Magical Reagent Garden" design image: hedges all around,
// raised flower beds in four quarters, and a cross-shaped stone path.
// Drawn in code so it stays sharp at any size and works offline.

const QUARTERS = [
  { x: 66, y: 66, beds: ['lav', 'mari', 'herb'] },
  { x: 334, y: 66, beds: ['herb', 'mari', 'peri'] },
  { x: 66, y: 334, beds: ['peri', 'poppy', 'herb'] },
  { x: 334, y: 334, beds: ['grass', 'mari', 'lav'] },
]

const BED_W = 58
const BED_H = 196
const BED_GAP = 13

function shrubs() {
  const spots = []
  const step = 50
  for (let p = 25; p <= 575; p += step) {
    const nearPath = p > 250 && p < 350
    if (!nearPath) {
      spots.push([p, 27], [p, 573])
      if (p > 40 && p < 560) spots.push([27, p], [573, p])
    }
  }
  return spots
}

export default function GardenPlan({ className }) {
  const plants = []
  QUARTERS.forEach((q, qi) => {
    q.beds.forEach((kind, bi) => {
      const bx = q.x + bi * (BED_W + BED_GAP)
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 2; c++) {
          const x = bx + 15 + c * 28
          const y = q.y + 20 + r * 31.5
          const d = Math.hypot(x - 300, y - 300)
          plants.push({ key: `${qi}-${bi}-${r}-${c}`, kind, x, y, delay: Math.round(d * 2.2) })
        }
      }
    })
  })

  return (
    <svg
      className={className}
      viewBox="0 0 600 600"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Illustration: a walled flower garden seen from above, with raised beds around a stone path."
    >
      <defs>
        <pattern id="gp-cobbles" width="36" height="36" patternUnits="userSpaceOnUse">
          <rect width="36" height="36" fill="#c9b38b" />
          <rect x="1.5" y="1.5" width="15" height="13" rx="4.5" fill="#e8d9b8" />
          <rect x="18.5" y="1.5" width="16" height="9.5" rx="4" fill="#e2d1ad" />
          <rect x="1.5" y="16.5" width="10" height="18" rx="4" fill="#e4d4b2" />
          <rect x="13.5" y="13" width="21" height="10" rx="4" fill="#ebdec0" />
          <rect x="13.5" y="25" width="10" height="9.5" rx="3.5" fill="#dfcda7" />
          <rect x="25.5" y="25" width="9" height="9.5" rx="3.5" fill="#e8d9b8" />
        </pattern>
        <symbol id="gp-leaves" viewBox="-13 -13 26 26">
          {[20, 110, 200, 290].map((a) => (
            <ellipse key={a} cx="6" cy="0" rx="6.5" ry="3.6" transform={`rotate(${a})`} fill="#4f7d39" />
          ))}
          {[65, 155, 245, 335].map((a) => (
            <ellipse key={a} cx="5" cy="0" rx="5" ry="3" transform={`rotate(${a})`} fill="#6a9a48" />
          ))}
        </symbol>
        {[
          ['lav', 'var(--lavender)', '#f3e8a6'],
          ['peri', 'var(--periwinkle)', '#f3e8a6'],
          ['mari', 'var(--marigold)', '#8a5a1c'],
          ['poppy', 'var(--poppy)', '#3b2a22'],
        ].map(([id, petal, middle]) => (
          <symbol key={id} id={`gp-${id}`} viewBox="-13 -13 26 26">
            <use href="#gp-leaves" x="-13" y="-13" width="26" height="26" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <circle key={a} cx="4.3" cy="0" r="3.4" transform={`rotate(${a})`} fill={petal} />
            ))}
            <circle r="2.3" fill={middle} />
          </symbol>
        ))}
        <symbol id="gp-herb" viewBox="-13 -13 26 26">
          <circle r="10" fill="#5b8a40" />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx="5" cy="0" r="4.4" transform={`rotate(${a})`} fill="#86b25f" />
          ))}
          <circle r="3" fill="#a6c877" />
        </symbol>
        <symbol id="gp-grass" viewBox="-13 -13 26 26">
          {[-8, -4, 0, 4, 8].map((x) => (
            <path key={x} d={`M${x} 11 Q ${x + 1} 0 ${x - 1} -11`} stroke="#9bb547" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          ))}
        </symbol>
        <symbol id="gp-shrub" viewBox="-30 -30 60 60">
          <circle r="27" fill="#2f5229" />
          <circle cx="-3" cy="-4" r="22" fill="#45743a" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <circle key={a} cx="11" cy="0" r="6.5" transform={`rotate(${a} -3 -4) translate(-3 -4)`} fill="#5d8c47" />
          ))}
          <circle cx="-3" cy="-4" r="6" fill="#77a456" />
        </symbol>
      </defs>

      {/* hedge background and packed earth */}
      <rect width="600" height="600" fill="#2a4527" />
      <rect x="54" y="54" width="492" height="492" rx="8" fill="#5e4c3a" />

      {/* stone paths */}
      <rect x="272" y="30" width="56" height="540" fill="url(#gp-cobbles)" />
      <rect x="30" y="272" width="540" height="56" fill="url(#gp-cobbles)" />

      {/* raised beds */}
      {QUARTERS.map((q, qi) =>
        q.beds.map((_, bi) => (
          <rect
            key={`${qi}-${bi}`}
            x={q.x + bi * (BED_W + BED_GAP)}
            y={q.y}
            width={BED_W}
            height={BED_H}
            rx="4"
            fill="#46372a"
            stroke="#a8876b"
            strokeWidth="6"
          />
        )),
      )}

      {/* plants bloom outward from the centre once, on load */}
      {plants.map((p) => (
        <use
          key={p.key}
          className="gp-plant"
          href={`#gp-${p.kind}`}
          x={p.x - 13}
          y={p.y - 13}
          width="26"
          height="26"
          style={{ animationDelay: `${p.delay}ms` }}
        />
      ))}

      {/* hedge shrubs around the walls, with steps where the paths leave the garden */}
      {shrubs().map(([x, y]) => (
        <use key={`${x}-${y}`} href="#gp-shrub" x={x - 30} y={y - 30} width="60" height="60" />
      ))}
      {[
        [272, 0, 56, 30],
        [272, 570, 56, 30],
        [0, 272, 30, 56],
        [570, 272, 30, 56],
      ].map(([x, y, w, h]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={w} height={h} fill="#8a7663" />
          {w > h
            ? [6, 14, 22].map((o) => <rect key={o} x={x} y={y + o} width={w} height="3" fill="#6d5c4c" />)
            : [6, 14, 22].map((o) => <rect key={o} x={x + o} y={y} width="3" height={h} fill="#6d5c4c" />)}
        </g>
      ))}

      {/* the round plaza where the paths cross */}
      <circle cx="300" cy="300" r="46" fill="url(#gp-cobbles)" stroke="#b49c74" strokeWidth="3" />
      <circle cx="300" cy="300" r="21" fill="#8f7b62" />
      <g className="gp-plant" style={{ animationDelay: '0ms' }}>
        {[0, 72, 144, 216, 288].map((a, i) => (
          <ellipse key={a} cx="300" cy="289" rx="6.5" ry="9" transform={`rotate(${a} 300 300)`} fill={i % 2 ? 'var(--periwinkle)' : 'var(--lavender)'} />
        ))}
        <circle cx="300" cy="300" r="6" fill="var(--marigold)" />
      </g>
    </svg>
  )
}
