// One crew member's raised flower bed, seen from above (like the beds in the
// design image). How full it is depends on the garden stage:
// empty -> wilting -> needs care -> growing -> blooming.
// The bed has 18 planting spots (6 columns x 3 rows).
// Planting order: spread out so even a few plants cover the whole bed.
const ORDER = [7, 16, 2, 11, 0, 14, 9, 4, 17, 6, 12, 1, 15, 10, 3, 13, 5, 8]

const LOOK = {
  empty: { plants: 0 },
  wilting: { plants: 6, flowers: 3, scale: 0.72, dry: true },
  needsCare: { plants: 9, flowers: 3, scale: 0.82 },
  growing: { plants: 13, flowers: 8, scale: 0.95 },
  blooming: { plants: 18, flowers: 18, scale: 1.08 },
}

// Small fixed "random" offsets so beds look natural but never change between renders.
const jitter = (i, n) => (((i * 9301 + n * 49297) % 233280) / 233280 - 0.5) * 6

export default function FlowerBed({ stage, color = 'var(--lavender)', label, className }) {
  const look = LOOK[stage] ?? LOOK.empty
  const planted = ORDER.slice(0, look.plants)
  const flowering = new Set(planted.slice(0, look.flowers))

  return (
    <svg viewBox="0 0 260 150" role="img" aria-label={label} className={`flowerbed ${className ?? ''}`}>
      {/* bed wall and soil */}
      <rect x="3" y="3" width="254" height="144" rx="14" fill="var(--bed)" />
      <rect x="3" y="3" width="254" height="144" rx="14" fill="none" stroke="var(--bed-edge)" strokeWidth="2" />
      <rect x="13" y="13" width="234" height="124" rx="8" fill="var(--soil)" />
      {[38, 75, 112].map((y) => (
        <path key={y} d={`M24 ${y} H236`} stroke="var(--soil-line)" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
      ))}

      {look.plants === 0 &&
        [40, 92, 144, 196].map((x, i) => (
          <g key={x} fill="var(--seed)">
            <ellipse cx={x} cy={i % 2 ? 75 : 38} rx="3" ry="2" />
            <ellipse cx={x + 22} cy={i % 2 ? 112 : 75} rx="3" ry="2" />
          </g>
        ))}

      {planted.map((spot) => {
        const col = spot % 6
        const row = Math.floor(spot / 6)
        const x = 32 + col * 39 + jitter(spot, 1)
        const y = 38 + row * 37 + jitter(spot, 2)
        return (
          <Plant
            key={spot}
            x={x}
            y={y}
            scale={look.scale}
            dry={look.dry}
            petal={look.dry ? 'var(--petal-dry)' : color}
            flower={flowering.has(spot)}
            turn={spot * 23}
          />
        )
      })}
    </svg>
  )
}

function Plant({ x, y, scale, dry, petal, flower, turn }) {
  const leaf = dry ? 'var(--leaf-dry)' : 'var(--stem)'
  const leaf2 = dry ? 'var(--leaf-dry-2)' : 'var(--stem-2)'
  return (
    <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${turn})`}>
      {[15, 105, 195, 285].map((a) => (
        <ellipse key={a} cx="9" cy="0" rx="9.5" ry={dry ? 3.2 : 4.6} transform={`rotate(${a})`} fill={leaf} />
      ))}
      {[60, 150, 240, 330].map((a) => (
        <ellipse key={a} cx="7" cy="0" rx="7" ry={dry ? 2.6 : 3.8} transform={`rotate(${a})`} fill={leaf2} />
      ))}
      {flower && (
        <g>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <circle key={a} cx="5.6" cy="0" r={dry ? 3.4 : 4.6} transform={`rotate(${a})`} fill={petal} />
          ))}
          <circle r={dry ? 2.4 : 3.1} fill={dry ? 'var(--leaf-dry-2)' : 'var(--flower-heart)'} />
        </g>
      )}
    </g>
  )
}
