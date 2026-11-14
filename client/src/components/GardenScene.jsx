import { useEffect, useRef, useState } from 'react'

// The shared crew garden as a forest garden at night (reference: three stone-ringed beds with
// wooden name signs and lanterns). One bed per crew member; what grows in it follows their
// garden stage. Plants sway in a light breeze and bend when the mouse or a finger moves through
// them. Names are always on the wooden signs; details appear only on hover, focus or tap.
const STAGE = {
  empty: { n: 11, kind: 'sprout', h: [6, 10] },
  wilting: { n: 9, kind: 'dry', h: [10, 18], droop: 0.6 },
  needsCare: { n: 10, h: [12, 22], flowers: 0.5 },
  growing: { n: 15, h: [16, 28], flowers: 0.8 },
  blooming: { n: 22, h: [18, 34], flowers: 1 },
}

// What each person grows (reference: blue flowers for Leo, white lilies for Sara).
const BLOOM = { a1: 'violet', a2: 'blue', a3: 'lily' }

const STAGE_TEXT = {
  empty: { title: 'Just planted', text: 'Seeds are in. The first check-in wakes them up.' },
  wilting: { title: 'Wilting', text: 'These flowers need some extra care right now.' },
  needsCare: { title: 'Needs a little care', text: 'Growing, with a few gaps. A good night’s sleep helps.' },
  growing: { title: 'Growing steadily', text: 'Healthy shoots and the first flowers opening.' },
  blooming: { title: 'In full bloom', text: 'A vibrant display of fresh flowers!' },
}

function rng(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Bed positions as fractions of the scene: Maya top-left, Leo front-centre, Sara top-right.
// Phones (tall scenes) stack them in a zig-zag.
function layoutBeds(ids, W, H) {
  const portrait = W / H < 1
  const spots = portrait
    ? { a1: [0.4, 0.24], a2: [0.5, 0.82], a3: [0.6, 0.53] }
    : { a1: [0.25, 0.4], a2: [0.5, 0.74], a3: [0.76, 0.4] }
  const rx = portrait ? Math.min(W * 0.36, 190) : Math.min(W * 0.16, 240)
  return ids.map((id, i) => {
    const [fx, fy] = spots[id] ?? [(i + 0.5) / ids.length, 0.55]
    return { id, x: fx * W, y: fy * H, rx, ry: rx * 0.46 }
  })
}

// A flower head with its glow, drawn once and reused every frame.
function headSprite(kind, dpr) {
  const S = 48
  const c = document.createElement('canvas')
  c.width = c.height = S * dpr
  const g = c.getContext('2d')
  g.scale(dpr, dpr)
  g.translate(S / 2, S / 2)
  const petals = (n, len, wid, fill, edge) => {
    for (let i = 0; i < n; i++) {
      g.save()
      g.rotate((i / n) * Math.PI * 2)
      g.fillStyle = fill
      g.strokeStyle = edge
      g.lineWidth = 0.6
      g.beginPath()
      g.ellipse(0, -len / 2, wid, len / 2, 0, 0, Math.PI * 2)
      g.fill()
      g.stroke()
      g.restore()
    }
  }
  if (kind === 'blue') {
    g.shadowColor = 'rgba(127,149,239,0.75)'
    g.shadowBlur = 10
    petals(5, 11, 5, '#7f95ef', 'rgba(200,212,255,0.7)')
    g.shadowBlur = 4
    g.fillStyle = '#f0c95a'
    g.beginPath()
    g.arc(0, 0, 2.6, 0, Math.PI * 2)
    g.fill()
  } else if (kind === 'lily') {
    g.shadowColor = 'rgba(243,240,226,0.7)'
    g.shadowBlur = 10
    for (let i = 0; i < 6; i++) {
      g.save()
      g.rotate((i / 6) * Math.PI * 2)
      g.fillStyle = '#efe9d6'
      g.beginPath()
      g.moveTo(0, 0)
      g.quadraticCurveTo(-4.5, -7, 0, -14)
      g.quadraticCurveTo(4.5, -7, 0, 0)
      g.fill()
      g.restore()
    }
    g.fillStyle = '#e6c25a'
    g.beginPath()
    g.arc(0, 0, 2, 0, Math.PI * 2)
    g.fill()
  } else if (kind === 'violet') {
    g.shadowColor = 'rgba(169,139,224,0.75)'
    g.shadowBlur = 9
    petals(5, 8, 3.6, '#a98be0', 'rgba(220,205,250,0.6)')
    g.fillStyle = '#f3e7a2'
    g.beginPath()
    g.arc(0, 0, 1.8, 0, Math.PI * 2)
    g.fill()
  } else if (kind === 'dry') {
    petals(5, 7, 3, 'rgba(143,138,106,0.85)', 'rgba(90,86,66,0.8)')
    g.fillStyle = '#5c5640'
    g.beginPath()
    g.arc(0, 0, 1.8, 0, Math.PI * 2)
    g.fill()
  }
  return c
}

function buildPlants(beds, stages) {
  return beds.map((bed, bi) => {
    const look = STAGE[stages[bi]] ?? STAGE.empty
    const r = rng(500 + bi * 131 + look.n)
    const plants = []
    for (let i = 0; i < look.n; i++) {
      // spread over the bed (sunflower-seed pattern), kept inside the stone ring
      const t = (i + 0.5) / look.n
      const ang = i * 2.39996 + r() * 0.3
      const rad = Math.sqrt(t) * 0.78
      plants.push({
        ux: Math.cos(ang) * rad,
        uy: Math.sin(ang) * rad,
        h: look.h[0] + r() * (look.h[1] - look.h[0]),
        flower: look.kind === 'sprout' || look.kind === 'dry' ? look.kind : r() < (look.flowers ?? 0) ? BLOOM[bed.id] ?? 'blue' : 'leaf',
        lean: look.droop ? (r() < 0.5 ? -1 : 1) * look.droop * (0.6 + r() * 0.5) : (r() - 0.5) * 0.15,
        k: 30 + r() * 12,
        phase: r() * Math.PI * 2,
        angle: 0,
        vel: 0,
      })
    }
    plants.sort((a, b) => a.uy - b.uy) // back to front
    // stones around the rim
    const stones = []
    const count = Math.round(20 + r() * 4)
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + r() * 0.08
      const pts = []
      const sides = 7
      for (let k = 0; k < sides; k++) pts.push(0.75 + r() * 0.35)
      stones.push({ a, size: 0.085 + r() * 0.05, pts, tone: 0.8 + r() * 0.35 })
    }
    return { plants, stones }
  })
}

export default function GardenScene({ zones, hovered, pinned, onHover, onPick }) {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const overlay = useRef(null)
  const hoverRef = useRef(null)
  const cb = useRef({ onHover, onPick })
  const [layout, setLayout] = useState({ beds: [], W: 0 })
  const key = zones.map((z) => `${z.id}:${z.stage}`).join('|')

  useEffect(() => {
    hoverRef.current = hovered ?? pinned ?? null
  }, [hovered, pinned])
  useEffect(() => {
    cb.current = { onHover, onPick }
  }, [onHover, onPick])

  useEffect(() => {
    const el = canvas.current
    const box = wrap.current
    const ctx = el.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const ids = zones.map((z) => z.id)
    const stages = zones.map((z) => z.stage)
    const s = {
      W: 0,
      H: 0,
      beds: [],
      flora: [],
      ground: null,
      sprites: {},
      pointer: { x: -9999, y: -9999, vx: 0, active: false, lastX: null, lastT: 0 },
      par: { x: 0, y: 0, tx: 0, ty: 0 },
      flies: [],
      t: 0,
      last: performance.now(),
      raf: 0,
      visible: true,
      hoverId: null,
    }
    for (const k of ['blue', 'lily', 'violet', 'dry']) s.sprites[k] = headSprite(k, dpr)

    // Ground, moss, scattered wildflowers and dark foliage: drawn once per size.
    function buildGround() {
      const pad = 40
      const c = document.createElement('canvas')
      const W = s.W + pad * 2
      const H = s.H + pad * 2
      c.width = W * dpr
      c.height = H * dpr
      const g = c.getContext('2d')
      g.scale(dpr, dpr)
      const base = g.createRadialGradient(W * 0.55, H * 0.45, 40, W * 0.5, H * 0.5, Math.max(W, H) * 0.75)
      base.addColorStop(0, '#16301f')
      base.addColorStop(0.55, '#0e2117')
      base.addColorStop(1, '#060e0a')
      g.fillStyle = base
      g.fillRect(0, 0, W, H)
      const r = rng(77)
      // moss texture: many short blades
      for (let i = 0; i < (W * H) / 140; i++) {
        const x = r() * W
        const y = r() * H
        const l = 2 + r() * 4
        g.strokeStyle = `rgba(${40 + r() * 40},${80 + r() * 60},${50 + r() * 40},${0.12 + r() * 0.22})`
        g.lineWidth = 0.8
        g.beginPath()
        g.moveTo(x, y)
        g.lineTo(x + (r() - 0.5) * 2, y - l)
        g.stroke()
      }
      // wildflower clusters (white, blue, violet), more towards the edges
      const tints = ['rgba(236,240,230,', 'rgba(140,160,240,', 'rgba(175,150,230,']
      for (let i = 0; i < (W * H) / 5200; i++) {
        const x = r() * W
        const y = r() * H
        const cx = Math.abs(x / W - 0.5) * 2
        const cy = Math.abs(y / H - 0.5) * 2
        if (Math.max(cx, cy) < 0.35 && r() < 0.7) continue
        const tint = tints[(r() * tints.length) | 0]
        for (let k = 0; k < 6; k++) {
          g.fillStyle = `${tint}${0.35 + r() * 0.5})`
          g.beginPath()
          g.arc(x + (r() - 0.5) * 16, y + (r() - 0.5) * 10, 0.9 + r() * 1.3, 0, Math.PI * 2)
          g.fill()
        }
      }
      // a few loose rocks
      for (let i = 0; i < 9; i++) {
        const x = r() * W
        const y = r() * H
        drawStone(g, x, y, 10 + r() * 16, [0.8, 1, 0.9, 1.05, 0.85, 0.95, 1], 0.85)
      }
      // dark foliage in the corners
      for (const [cx, cy, n] of [[0, 0, 26], [W, H, 22], [0, H, 18], [W, 0, 12]]) {
        for (let i = 0; i < n; i++) {
          const a = r() * Math.PI * 2
          const d = r() * Math.min(W, H) * 0.22
          const x = cx + Math.cos(a) * d
          const y = cy + Math.sin(a) * d
          const L = 30 + r() * 40
          g.save()
          g.translate(x, y)
          g.rotate(r() * Math.PI * 2)
          g.fillStyle = `rgba(${12 + r() * 14},${34 + r() * 26},${22 + r() * 14},0.95)`
          g.beginPath()
          g.moveTo(0, 0)
          g.quadraticCurveTo(L * 0.5, -L * 0.28, L, 0)
          g.quadraticCurveTo(L * 0.5, L * 0.28, 0, 0)
          g.fill()
          g.strokeStyle = 'rgba(90,140,100,0.18)'
          g.lineWidth = 0.8
          g.beginPath()
          g.moveTo(2, 0)
          g.lineTo(L - 4, 0)
          g.stroke()
          g.restore()
        }
      }
      s.ground = { c, pad }
      s.flies = Array.from({ length: 30 }, () => ({ x: r() * s.W, y: r() * s.H, vx: 0, vy: 0, seed: r() * 100 }))
    }

    function drawStone(g, x, y, size, pts, tone) {
      const n = pts.length
      g.beginPath()
      for (let k = 0; k <= n; k++) {
        const a = (k / n) * Math.PI * 2
        const rr = size * pts[k % n]
        const px = x + Math.cos(a) * rr
        const py = y + Math.sin(a) * rr * 0.72
        if (k === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.closePath()
      const grad = g.createLinearGradient(x, y - size, x, y + size)
      grad.addColorStop(0, `rgba(${Math.round(92 * tone)},${Math.round(106 * tone)},${Math.round(112 * tone)},1)`)
      grad.addColorStop(1, `rgba(${Math.round(36 * tone)},${Math.round(44 * tone)},${Math.round(50 * tone)},1)`)
      g.fillStyle = grad
      g.fill()
      g.strokeStyle = 'rgba(0,0,0,0.45)'
      g.lineWidth = 1
      g.stroke()
    }

    function resize() {
      const rect = box.getBoundingClientRect()
      s.W = Math.max(320, rect.width)
      s.H = Math.max(420, rect.height)
      el.width = s.W * dpr
      el.height = s.H * dpr
      el.style.width = `${s.W}px`
      el.style.height = `${s.H}px`
      s.beds = layoutBeds(ids, s.W, s.H)
      s.flora = buildPlants(s.beds, stages)
      buildGround()
      setLayout({ beds: s.beds, W: s.W })
      if (reduce) draw(0)
    }

    function hitBed(x, y) {
      for (const b of s.beds) {
        const dx = (x + s.par.x * 14 - b.x) / (b.rx * 1.15)
        const dy = (y + s.par.y * 8 - b.y) / (b.ry * 1.6)
        if (dx * dx + dy * dy <= 1) return b.id
      }
      return null
    }

    function draw(dt) {
      const { W, H } = s
      s.t += dt
      s.par.x += (s.par.tx - s.par.x) * Math.min(1, dt * 3)
      s.par.y += (s.par.ty - s.par.y) * Math.min(1, dt * 3)
      const px = s.par.x
      const py = s.par.y
      const hot = hoverRef.current
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // ground (moves least)
      if (s.ground) ctx.drawImage(s.ground.c, -s.ground.pad - px * 8, -s.ground.pad - py * 6, W + s.ground.pad * 2, H + s.ground.pad * 2)

      // moonlight rays from the top right
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 4; i++) {
        const sway = reduce ? 0 : Math.sin(s.t * 0.15 + i) * 0.04
        const a = 0.035 + 0.02 * Math.sin(s.t * 0.3 + i * 2)
        const x0 = W * (0.72 + i * 0.07)
        const g = ctx.createLinearGradient(x0, 0, x0 - W * 0.35, H)
        g.addColorStop(0, `rgba(160,210,230,${reduce ? 0.04 : a})`)
        g.addColorStop(1, 'rgba(160,210,230,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(x0, -10)
        ctx.lineTo(x0 + 50, -10)
        ctx.lineTo(x0 - W * (0.32 + sway) + 140, H)
        ctx.lineTo(x0 - W * (0.32 + sway), H)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()

      const ox = -px * 14
      const oy = -py * 8
      const p = s.pointer
      s.beds.forEach((b, bi) => {
        const bx = b.x + ox
        const by = b.y + oy
        const { plants, stones } = s.flora[bi]
        const isHot = hot === b.id
        const dim = hot && !isHot ? 0.55 : 1

        // soft glow under the bed being hovered
        if (isHot) {
          const glow = ctx.createRadialGradient(bx, by, b.rx * 0.2, bx, by, b.rx * 1.5)
          glow.addColorStop(0, 'rgba(223,233,154,0.16)')
          glow.addColorStop(1, 'rgba(223,233,154,0)')
          ctx.fillStyle = glow
          ctx.fillRect(bx - b.rx * 1.5, by - b.rx * 1.5, b.rx * 3, b.rx * 3) // covers the whole glow, so it has no hard edge
        }
        // soil
        ctx.save()
        ctx.globalAlpha = dim
        const soil = ctx.createRadialGradient(bx, by - b.ry * 0.3, 4, bx, by, b.rx)
        soil.addColorStop(0, '#2a2119')
        soil.addColorStop(1, '#130e0a')
        ctx.fillStyle = soil
        ctx.beginPath()
        ctx.ellipse(bx, by, b.rx, b.ry, 0, 0, Math.PI * 2)
        ctx.fill()
        // back stones
        for (const st of stones) if (Math.sin(st.a) < 0) drawStone(ctx, bx + Math.cos(st.a) * b.rx, by + Math.sin(st.a) * b.ry, b.rx * st.size, st.pts, st.tone)

        // plants: spring physics, pushed by the pointer's movement
        for (const pl of plants) {
          const baseX = bx + pl.ux * b.rx * 0.95
          const baseY = by + pl.uy * b.ry * 0.95
          const scale = b.rx / 200
          const h = pl.h * scale * 2.2
          const idle = reduce ? 0 : Math.sin(s.t * 1.1 + pl.phase + baseX * 0.01) * 0.07
          let force = 0
          if (p.active && !reduce) {
            const dx = baseX - p.x
            const dy = baseY - h - p.y
            const near = Math.exp(-(dx * dx + dy * dy) / (2 * 90 * 90))
            force = (p.vx * 0.0012 + Math.sign(dx || 1) * 0.5 * near * Math.min(1, Math.abs(p.vx) * 0.003 + 0.15)) * near
          }
          if (!reduce) {
            const acc = -pl.k * (pl.angle - (pl.lean + idle)) - 5 * pl.vel + force * 70
            pl.vel += acc * dt
            pl.angle = Math.max(-0.9, Math.min(0.9, pl.angle + pl.vel * dt))
          } else pl.angle = pl.lean
          const a = pl.angle
          const tipX = baseX + Math.sin(a) * h
          const tipY = baseY - Math.cos(a) * h
          // leaves at the base
          const leaf = pl.flower === 'dry' ? 'rgba(98,92,64,0.9)' : '#2f5a3a'
          const leafHi = pl.flower === 'dry' ? 'rgba(120,112,80,0.9)' : '#4b8656'
          const L = (pl.flower === 'sprout' ? 5 : 8) * scale * 2.2
          for (let k = 0; k < (pl.flower === 'sprout' ? 2 : 4); k++) {
            const la = (pl.flower === 'sprout' ? [-0.6, 0.6][k] : -1.2 + k * 0.8) + a * 0.5
            ctx.fillStyle = k % 2 ? leaf : leafHi
            ctx.beginPath()
            ctx.ellipse(baseX + Math.sin(la) * L * 0.6, baseY - (pl.flower === 'sprout' ? h : 0) - Math.cos(la) * L * 0.25, L * 0.62, L * 0.28, la, 0, Math.PI * 2)
            ctx.fill()
          }
          if (pl.flower === 'sprout') continue
          // stem
          ctx.strokeStyle = pl.flower === 'dry' ? '#6d6a4f' : '#4f8a5c'
          ctx.lineWidth = 1.3 * Math.max(0.8, scale * 1.3)
          ctx.beginPath()
          ctx.moveTo(baseX, baseY)
          ctx.quadraticCurveTo(baseX + Math.sin(a * 0.5) * h * 0.5, baseY - h * 0.6, tipX, tipY)
          ctx.stroke()
          if (pl.flower === 'leaf') {
            ctx.fillStyle = leafHi
            ctx.beginPath()
            ctx.ellipse(tipX, tipY, L * 0.45, L * 0.22, a - 0.5, 0, Math.PI * 2)
            ctx.fill()
            continue
          }
          const img = s.sprites[pl.flower]
          const size = 30 * scale * 2.1 * (pl.flower === 'violet' ? 0.8 : 1)
          ctx.save()
          ctx.translate(tipX, tipY)
          ctx.rotate(a * 0.7)
          ctx.drawImage(img, -size / 2, -size / 2, size, size)
          ctx.restore()
        }
        // front stones
        for (const st of stones) if (Math.sin(st.a) >= 0) drawStone(ctx, bx + Math.cos(st.a) * b.rx, by + Math.sin(st.a) * b.ry, b.rx * st.size, st.pts, st.tone)
        ctx.restore()
      })

      // lanterns on posts, next to Maya's and Sara's beds
      const left = s.beds[0]
      const right = s.beds[s.beds.length - 1]
      for (const [b, side] of [[left, -1], [right, 1]]) {
        if (!b) continue
        const lx = Math.max(30, Math.min(W - 30, b.x + ox + side * b.rx * 1.1)) // stays inside the scene
        const ly = b.y + oy - b.ry * 0.2
        const flicker = reduce ? 1 : 0.85 + 0.15 * Math.sin(s.t * 7 + side) * Math.sin(s.t * 3.1)
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const g = ctx.createRadialGradient(lx, ly - 64, 0, lx, ly - 64, 120)
        g.addColorStop(0, `rgba(240,197,106,${0.35 * flicker})`)
        g.addColorStop(1, 'rgba(240,197,106,0)')
        ctx.fillStyle = g
        ctx.fillRect(lx - 120, ly - 184, 240, 240)
        ctx.restore()
        ctx.strokeStyle = '#2b2119'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(lx, ly + 20)
        ctx.lineTo(lx, ly - 86)
        ctx.lineTo(lx - side * 18, ly - 86)
        ctx.stroke()
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(lx - side * 18, ly - 86)
        ctx.lineTo(lx - side * 18, ly - 78)
        ctx.stroke()
        ctx.fillStyle = '#1d1712'
        ctx.fillRect(lx - side * 18 - 7, ly - 79, 14, 4)
        ctx.fillStyle = `rgba(255,214,140,${0.9 * flicker})`
        ctx.shadowColor = 'rgba(255,200,120,0.9)'
        ctx.shadowBlur = 16
        ctx.fillRect(lx - side * 18 - 5, ly - 75, 10, 14)
        ctx.shadowBlur = 0
        ctx.fillStyle = '#1d1712'
        ctx.fillRect(lx - side * 18 - 7, ly - 61, 14, 3)
      }

      // fireflies scatter from the pointer
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (const f of s.flies) {
        if (!reduce) {
          f.vx += Math.sin(s.t * 0.6 + f.seed) * 3 * dt
          f.vy += Math.cos(s.t * 0.8 + f.seed * 1.4) * 3 * dt
          if (p.active) {
            const dx = f.x - p.x
            const dy = f.y - p.y
            const d = Math.hypot(dx, dy)
            if (d < 130) {
              f.vx += (dx / (d + 1)) * (1 - d / 130) * 90 * dt
              f.vy += (dy / (d + 1)) * (1 - d / 130) * 90 * dt
            }
          }
          f.vx *= 0.95
          f.vy *= 0.95
          f.x = (f.x + f.vx + W) % W
          f.y = (f.y + f.vy + H) % H
        }
        const flick = 0.5 + 0.5 * Math.sin(s.t * 2.2 + f.seed * 5)
        const g = ctx.createRadialGradient(f.x - px * 20, f.y - py * 12, 0, f.x - px * 20, f.y - py * 12, 8)
        g.addColorStop(0, `rgba(223,233,154,${0.85 * flick})`)
        g.addColorStop(1, 'rgba(223,233,154,0)')
        ctx.fillStyle = g
        ctx.fillRect(f.x - px * 20 - 8, f.y - py * 12 - 8, 16, 16)
      }
      ctx.restore()

      // vignette
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75)
      v.addColorStop(0, 'rgba(0,0,0,0)')
      v.addColorStop(1, 'rgba(0,0,0,0.55)')
      ctx.fillStyle = v
      ctx.fillRect(0, 0, W, H)

      // the signs layer follows the beds' parallax
      if (overlay.current) overlay.current.style.transform = `translate(${ox}px, ${oy}px)`
    }

    function loop(now) {
      const dt = Math.min(0.05, (now - s.last) / 1000)
      s.last = now
      s.pointer.vx *= 0.9
      if (s.visible) draw(dt)
      s.raf = requestAnimationFrame(loop)
    }

    function move(e) {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const p = s.pointer
      const now = performance.now()
      if (p.lastX != null) p.vx = p.vx * 0.5 + ((x - p.lastX) / Math.max(8, now - p.lastT)) * 1000 * 0.5
      p.lastX = x
      p.lastT = now
      p.x = x
      p.y = y
      p.active = true
      s.par.tx = x / s.W - 0.5
      s.par.ty = y / s.H - 0.5
      const id = hitBed(x, y)
      if (id !== s.hoverId) {
        s.hoverId = id
        cb.current.onHover?.(id)
      }
      el.style.cursor = id ? 'pointer' : 'default'
      if (reduce) draw(0)
    }
    function leave(e) {
      s.pointer.active = false
      s.pointer.lastX = null
      s.par.tx = 0
      s.par.ty = 0
      if (s.hoverId) {
        s.hoverId = null
        // Moving onto a wooden sign is not leaving the garden: the sign shows its own details.
        const into = e?.relatedTarget
        if (!(into && box.contains(into))) cb.current.onHover?.(null)
      }
    }
    function click(e) {
      const rect = el.getBoundingClientRect()
      cb.current.onPick?.(hitBed(e.clientX - rect.left, e.clientY - rect.top))
    }

    const ro = new ResizeObserver(resize)
    ro.observe(box)
    resize()
    const io = new IntersectionObserver(([entry]) => {
      s.visible = entry.isIntersecting
    })
    io.observe(box)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('pointercancel', leave)
    el.addEventListener('click', click)
    if (!reduce) s.raf = requestAnimationFrame(loop)
    // with reduced motion, redraw when the hovered bed changes
    const redraw = reduce ? setInterval(() => draw(0), 250) : null

    return () => {
      cancelAnimationFrame(s.raf)
      clearInterval(redraw)
      ro.disconnect()
      io.disconnect()
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('pointercancel', leave)
      el.removeEventListener('click', click)
    }
    // key captures who is in the garden and their stages
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const shown = hovered ?? pinned
  return (
    <div ref={wrap} className="garden-scene">
      <canvas ref={canvas} aria-hidden="true" />
      <div ref={overlay} className="garden-overlay">
        {layout.beds.map((b) => {
          const z = zones.find((x) => x.id === b.id)
          if (!z) return null
          const info = STAGE_TEXT[z.stage] ?? STAGE_TEXT.empty
          const open = shown === b.id
          const signX = b.x - (b.id === 'a2' ? 0 : b.rx * 0.28)
          const signY = b.y - b.ry * 0.62
          return (
            <div key={b.id}>
              <button
                type="button"
                className={`bed-sign ${open ? 'open' : ''}`}
                style={{ left: signX, top: signY, '--tilt': b.id === 'a1' ? '-3deg' : b.id === 'a3' ? '4deg' : '0deg' }}
                aria-expanded={open}
                aria-describedby={`bed-info-${b.id}`}
                onPointerEnter={() => onHover(b.id)}
                onPointerLeave={() => onHover(null)}
                onFocus={() => onHover(b.id)}
                onBlur={() => onHover(null)}
                onClick={() => onPick(b.id)}
              >
                <span className="board">
                  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                    <path d="M12 21V10" stroke="#7fbf6a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                    <path d="M12 12c-4.5 0-6.8-2.6-7.3-6.6 4.5 0 6.8 2.4 7.3 6.6zM12 15c4 0 6.2-2.3 6.6-5.9-4 0-6.2 2.2-6.6 5.9z" fill="#5fa152" />
                  </svg>
                  <span className="board-text">
                    <strong>{z.fullName}</strong>
                    <em>{z.role}</em>
                  </span>
                </span>
                <span className="posts" aria-hidden="true">
                  <i />
                  <i />
                </span>
              </button>
              <div
                id={`bed-info-${b.id}`}
                className={`bed-pop ${open ? 'show' : ''}`}
                style={{ left: Math.max(150, Math.min(b.x + b.rx * 0.15, layout.W - 150)), top: b.y + b.ry * 0.05 }}
                role="status"
              >
                <BloomIcon kind={z.stage === 'empty' ? 'sprout' : z.stage === 'wilting' ? 'dry' : BLOOM[z.id]} />
                <span>
                  <strong>{info.title}</strong>
                  <span>{info.text}</span>
                  {z.support && <span className="pop-support">{z.support}</span>}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BloomIcon({ kind }) {
  const colors = { blue: '#7f95ef', lily: '#efe9d6', violet: '#a98be0', dry: '#8f8a6a', sprout: '#5fa152' }
  const c = colors[kind] ?? '#7f95ef'
  return (
    <svg viewBox="0 0 40 48" width="40" height="48" aria-hidden="true" className="pop-icon">
      <path d="M20 46V24" stroke="#4f8a5c" strokeWidth="2" fill="none" />
      <path d="M20 36c-6 0-9-3-10-8 6 0 9 3 10 8zM20 32c5 0 8-2.6 8.6-7-5 0-8 2.5-8.6 7z" fill="#4b8656" />
      {kind === 'sprout' ? (
        <path d="M20 24c-5 0-7-3-7.5-7 5 0 7 3 7.5 7zM20 24c5 0 7-3 7.5-7-5 0-7 3-7.5 7z" fill={c} />
      ) : (
        <g transform="translate(20 14)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-6" rx="4.4" ry="6" transform={`rotate(${a})`} fill={c} opacity={kind === 'dry' ? 0.8 : 0.95} />
          ))}
          <circle r="3" fill={kind === 'dry' ? '#5c5640' : '#f0c95a'} />
        </g>
      )}
    </svg>
  )
}
