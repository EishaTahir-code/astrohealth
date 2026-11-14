import { useCallback, useEffect, useRef, useState } from 'react'
import { crewPerson } from '../data/crew'

// The shared crew garden: a forest garden at night with one stone-ringed bed per crew member.
// - The garden grows with the crew. Beds keep their size (no zooming out): when there are more
//   beds than fit, drag sideways (or swipe, use the arrows, the name dots or the keyboard) to explore.
// - Plants follow each person's garden stage, sway in a light breeze and bend when the
//   mouse or a finger moves through them.
// - Names are always on the wooden signs; details show only on hover, focus or tap.
const STAGE = {
  empty: { n: 11, kind: 'sprout', h: [6, 10] },
  wilting: { n: 9, kind: 'dry', h: [10, 18], droop: 0.6 },
  needsCare: { n: 10, h: [12, 22], flowers: 0.5 },
  growing: { n: 15, h: [16, 28], flowers: 0.8 },
  blooming: { n: 22, h: [18, 34], flowers: 1 },
}

const STAGE_TEXT = {
  empty: { title: 'Just planted', text: 'Seeds are in. The first check-in wakes them up.' },
  wilting: { title: 'Wilting', text: 'These flowers need some extra care right now.' },
  needsCare: { title: 'Needs a little care', text: 'Growing, with a few gaps. A good night’s sleep helps.' },
  growing: { title: 'Growing steadily', text: 'Healthy shoots and the first flowers opening.' },
  blooming: { title: 'In full bloom', text: 'A vibrant display of fresh flowers!' },
}

const bloomOf = (id) => crewPerson(id)?.bloom ?? 'blue'
const TILE = 512

function rng(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Where each bed sits in the garden world: a zig-zag (top, front, top, front…), like the reference.
function layoutWorld(ids, W, H) {
  const portrait = W / H < 1
  const rx = portrait ? Math.min(W * 0.34, 170) : Math.min(W * 0.16, 240)
  const step = portrait ? rx * 1.35 : W * 0.25
  const margin = portrait ? rx * 1.25 : W * 0.25
  const beds = ids.map((id, i) => ({ id, x: margin + i * step, y: (i % 2 ? (portrait ? 0.74 : 0.74) : portrait ? 0.38 : 0.4) * H, rx, ry: rx * 0.46 }))
  const worldW = Math.max(W, margin * 2 + (ids.length - 1) * step)
  return { beds, worldW, step }
}

// A flower head with its glow, drawn once and reused every frame.
function headSprite(kind, dpr) {
  const S = 48
  const c = document.createElement('canvas')
  c.width = c.height = S * dpr
  const g = c.getContext('2d')
  g.scale(dpr, dpr)
  g.translate(S / 2, S / 2)
  const petals = (n, len, wid, fill, edge, glow) => {
    g.shadowColor = glow
    g.shadowBlur = glow ? 10 : 0
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
    g.shadowBlur = 0
  }
  const centre = (r, fill) => {
    g.fillStyle = fill
    g.beginPath()
    g.arc(0, 0, r, 0, Math.PI * 2)
    g.fill()
  }
  if (kind === 'blue') {
    petals(5, 11, 5, '#7f95ef', 'rgba(200,212,255,0.7)', 'rgba(127,149,239,0.75)')
    centre(2.6, '#f0c95a')
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
    g.shadowBlur = 0
    centre(2, '#e6c25a')
  } else if (kind === 'violet') {
    petals(5, 8, 3.6, '#a98be0', 'rgba(220,205,250,0.6)', 'rgba(169,139,224,0.75)')
    centre(1.8, '#f3e7a2')
  } else if (kind === 'sun') {
    petals(10, 10, 2.6, '#f0c95a', 'rgba(255,236,170,0.6)', 'rgba(240,201,90,0.7)')
    centre(3.4, '#8a5a1c')
  } else if (kind === 'pink') {
    petals(5, 10, 4.6, '#f2a7c3', 'rgba(255,220,235,0.7)', 'rgba(242,167,195,0.7)')
    centre(2.4, '#fff2a8')
  } else if (kind === 'star') {
    petals(6, 12, 1.9, '#cfeeff', 'rgba(230,248,255,0.7)', 'rgba(191,233,255,0.8)')
    centre(2, '#dfe99a')
  } else if (kind === 'coral') {
    petals(6, 9, 4, '#ffb48a', 'rgba(255,220,200,0.6)', 'rgba(255,180,138,0.7)')
    centre(2.4, '#f7e08a')
  } else if (kind === 'bell') {
    petals(5, 9, 3.4, '#b9a6ff', 'rgba(225,215,255,0.6)', 'rgba(185,166,255,0.75)')
    centre(2.2, '#5b4b9a')
  } else if (kind === 'dry') {
    petals(5, 7, 3, 'rgba(143,138,106,0.85)', 'rgba(90,86,66,0.8)', '')
    centre(1.8, '#5c5640')
  }
  return c
}

function buildPlants(beds, stages) {
  return beds.map((bed, bi) => {
    const look = STAGE[stages[bi]] ?? STAGE.empty
    const r = rng(500 + bi * 131 + look.n)
    const plants = []
    for (let i = 0; i < look.n; i++) {
      const t = (i + 0.5) / look.n
      const ang = i * 2.39996 + r() * 0.3
      const rad = Math.sqrt(t) * 0.78
      plants.push({
        ux: Math.cos(ang) * rad,
        uy: Math.sin(ang) * rad,
        h: look.h[0] + r() * (look.h[1] - look.h[0]),
        flower: look.kind === 'sprout' || look.kind === 'dry' ? look.kind : r() < (look.flowers ?? 0) ? bloomOf(bed.id) : 'leaf',
        lean: look.droop ? (r() < 0.5 ? -1 : 1) * look.droop * (0.6 + r() * 0.5) : (r() - 0.5) * 0.15,
        k: 30 + r() * 12,
        phase: r() * Math.PI * 2,
        angle: 0,
        vel: 0,
      })
    }
    plants.sort((a, b) => a.uy - b.uy)
    const stones = []
    const count = Math.round(20 + r() * 4)
    for (let i = 0; i < count; i++) {
      const pts = []
      for (let k = 0; k < 7; k++) pts.push(0.75 + r() * 0.35)
      stones.push({ a: (i / count) * Math.PI * 2 + r() * 0.08, size: 0.085 + r() * 0.05, pts, tone: 0.8 + r() * 0.35 })
    }
    return { plants, stones }
  })
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
  grad.addColorStop(0, `rgb(${Math.round(92 * tone)},${Math.round(106 * tone)},${Math.round(112 * tone)})`)
  grad.addColorStop(1, `rgb(${Math.round(36 * tone)},${Math.round(44 * tone)},${Math.round(50 * tone)})`)
  g.fillStyle = grad
  g.fill()
  g.strokeStyle = 'rgba(0,0,0,0.45)'
  g.lineWidth = 1
  g.stroke()
}

// One piece of ground (moss, wildflowers, loose rocks, foliage at the garden's ends), drawn once.
function buildTile(index, H, worldW) {
  const W = TILE
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  const base = g.createLinearGradient(0, 0, 0, H)
  base.addColorStop(0, '#0b1a12')
  base.addColorStop(0.5, '#132a1c')
  base.addColorStop(1, '#0a160f')
  g.fillStyle = base
  g.fillRect(0, 0, W, H)
  const r = rng(9000 + index * 97)
  for (let i = 0; i < (W * H) / 140; i++) {
    const x = r() * W
    const y = r() * H
    g.strokeStyle = `rgba(${40 + r() * 40},${80 + r() * 60},${50 + r() * 40},${0.12 + r() * 0.22})`
    g.lineWidth = 0.8
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (r() - 0.5) * 2, y - 2 - r() * 4)
    g.stroke()
  }
  const tints = ['rgba(236,240,230,', 'rgba(140,160,240,', 'rgba(175,150,230,']
  for (let i = 0; i < (W * H) / 7000; i++) {
    const x = r() * W
    const y = r() * H
    const tint = tints[(r() * tints.length) | 0]
    for (let k = 0; k < 6; k++) {
      g.fillStyle = `${tint}${0.35 + r() * 0.5})`
      g.beginPath()
      g.arc(x + (r() - 0.5) * 16, y + (r() - 0.5) * 10, 0.9 + r() * 1.3, 0, Math.PI * 2)
      g.fill()
    }
  }
  for (let i = 0; i < 2; i++) drawStone(g, r() * W, r() * H, 10 + r() * 14, [0.8, 1, 0.9, 1.05, 0.85, 0.95, 1], 0.85)
  // dense foliage at both ends of the garden
  const left = index * W
  for (const [edgeX, n] of [[0, 30], [worldW, 30]]) {
    if (Math.abs(edgeX - (left + W / 2)) > W) continue
    for (let i = 0; i < n; i++) {
      const x = edgeX - left + (r() - 0.5) * 160
      const y = r() * H
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
      g.restore()
    }
  }
  return c
}

export default function GardenScene({ zones, hovered, pinned, onHover, onPick }) {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const overlay = useRef(null)
  const hoverRef = useRef(null)
  const cb = useRef({ onHover, onPick })
  const api = useRef({})
  const [layout, setLayout] = useState({ beds: [], W: 0, worldW: 0 })
  const [view, setView] = useState({ first: 0, last: 0, atStart: true, atEnd: true, moved: false })
  // the sign that has keyboard focus keeps its card open, whatever the mouse does
  const [focused, setFocused] = useState(null)
  const key = zones.map((z) => `${z.id}:${z.stage}`).join('|')

  useEffect(() => {
    hoverRef.current = hovered ?? focused ?? pinned ?? null
  }, [hovered, focused, pinned])
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
      worldW: 0,
      step: 0,
      flora: [],
      tiles: new Map(),
      sprites: {},
      cam: { x: 0, target: 0, vel: 0 },
      drag: null,
      pointer: { x: -9999, y: -9999, vx: 0, active: false, lastX: null, lastT: 0 },
      par: { x: 0, y: 0, tx: 0, ty: 0 },
      flies: [],
      t: 0,
      last: performance.now(),
      raf: 0,
      visible: true,
      hoverId: null,
      viewKey: '',
      moved: false,
    }
    for (const k of ['blue', 'lily', 'violet', 'sun', 'pink', 'star', 'coral', 'bell', 'dry']) s.sprites[k] = headSprite(k, dpr)
    const maxCam = () => Math.max(0, s.worldW - s.W)
    const clampCam = (x) => Math.max(0, Math.min(maxCam(), x))

    function resize() {
      const rect = box.getBoundingClientRect()
      s.W = Math.max(320, rect.width)
      s.H = Math.max(420, rect.height)
      el.width = s.W * dpr
      el.height = s.H * dpr
      el.style.width = `${s.W}px`
      el.style.height = `${s.H}px`
      const L = layoutWorld(ids, s.W, s.H)
      s.beds = L.beds
      s.worldW = L.worldW
      s.step = L.step
      s.flora = buildPlants(s.beds, stages)
      s.tiles.clear()
      s.cam.x = s.cam.target = clampCam(s.cam.x)
      const r = rng(31)
      s.flies = Array.from({ length: Math.round(s.worldW / 40) }, () => ({ x: r() * s.worldW, y: r() * s.H, vx: 0, vy: 0, seed: r() * 100 }))
      setLayout({ beds: s.beds, W: s.W, worldW: s.worldW })
      report()
      if (reduce) draw(0)
    }

    // Tells React which beds are in view (for the arrows and name dots), only when it changes.
    function report() {
      const first = s.beds.findIndex((b) => b.x + b.rx > s.cam.x)
      let last = s.beds.length - 1
      while (last > 0 && s.beds[last].x - s.beds[last].rx > s.cam.x + s.W) last--
      const v = { first: Math.max(0, first), last, atStart: s.cam.x <= 1, atEnd: s.cam.x >= maxCam() - 1, moved: s.moved }
      const k = JSON.stringify(v)
      if (k !== s.viewKey) {
        s.viewKey = k
        setView(v)
      }
    }

    function tile(i) {
      if (!s.tiles.has(i)) s.tiles.set(i, buildTile(i, s.H + 40, s.worldW))
      return s.tiles.get(i)
    }

    function hitBed(sx, sy) {
      const wx = sx + s.cam.x + s.par.x * 14
      const wy = sy + s.par.y * 8
      for (const b of s.beds) {
        const dx = (wx - b.x) / (b.rx * 1.15)
        const dy = (wy - b.y) / (b.ry * 1.6)
        if (dx * dx + dy * dy <= 1) return b.id
      }
      return null
    }

    function draw(dt) {
      const { W, H } = s
      s.t += dt
      // camera: follows a drag directly, otherwise glides towards its target
      if (!s.drag) {
        if (Math.abs(s.cam.vel) > 5) {
          s.cam.target = clampCam(s.cam.target + s.cam.vel * dt)
          s.cam.vel *= Math.pow(0.04, dt)
        }
        s.cam.x += (s.cam.target - s.cam.x) * (reduce ? 1 : Math.min(1, dt * 8))
      }
      s.par.x += (s.par.tx - s.par.x) * Math.min(1, dt * 3)
      s.par.y += (s.par.ty - s.par.y) * Math.min(1, dt * 3)
      const cx = s.cam.x
      const px = s.par.x
      const py = s.par.y
      const hot = hoverRef.current
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // ground, in tiles (moves a little less than the beds, for depth)
      const gx = cx - px * 8
      for (let i = Math.floor(gx / TILE) - 1; i * TILE < gx + W + TILE; i++) {
        ctx.drawImage(tile(i), i * TILE - gx, -20 - py * 6, TILE, H + 40)
      }

      // moonlight rays (fixed to the screen)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 4; i++) {
        const a = reduce ? 0.04 : 0.035 + 0.02 * Math.sin(s.t * 0.3 + i * 2)
        const x0 = W * (0.72 + i * 0.07)
        const g = ctx.createLinearGradient(x0, 0, x0 - W * 0.35, H)
        g.addColorStop(0, `rgba(160,210,230,${a})`)
        g.addColorStop(1, 'rgba(160,210,230,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(x0, -10)
        ctx.lineTo(x0 + 50, -10)
        ctx.lineTo(x0 - W * 0.32 + 140, H)
        ctx.lineTo(x0 - W * 0.32, H)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()

      const ox = -cx - px * 14
      const oy = -py * 8
      const p = s.pointer
      s.beds.forEach((b, bi) => {
        const bx = b.x + ox
        const by = b.y + oy
        if (bx + b.rx * 1.6 < 0 || bx - b.rx * 1.6 > W) return // off screen
        const { plants, stones } = s.flora[bi]
        const isHot = hot === b.id
        const dim = hot && !isHot ? 0.55 : 1
        if (isHot) {
          const glow = ctx.createRadialGradient(bx, by, b.rx * 0.2, bx, by, b.rx * 1.5)
          glow.addColorStop(0, 'rgba(223,233,154,0.16)')
          glow.addColorStop(1, 'rgba(223,233,154,0)')
          ctx.fillStyle = glow
          ctx.fillRect(bx - b.rx * 1.5, by - b.rx * 1.5, b.rx * 3, b.rx * 3)
        }
        ctx.save()
        ctx.globalAlpha = dim
        const soil = ctx.createRadialGradient(bx, by - b.ry * 0.3, 4, bx, by, b.rx)
        soil.addColorStop(0, '#2a2119')
        soil.addColorStop(1, '#130e0a')
        ctx.fillStyle = soil
        ctx.beginPath()
        ctx.ellipse(bx, by, b.rx, b.ry, 0, 0, Math.PI * 2)
        ctx.fill()
        for (const st of stones) if (Math.sin(st.a) < 0) drawStone(ctx, bx + Math.cos(st.a) * b.rx, by + Math.sin(st.a) * b.ry, b.rx * st.size, st.pts, st.tone)
        const scale = b.rx / 200
        for (const pl of plants) {
          const baseX = bx + pl.ux * b.rx * 0.95
          const baseY = by + pl.uy * b.ry * 0.95
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
            pl.vel += (-pl.k * (pl.angle - (pl.lean + idle)) - 5 * pl.vel + force * 70) * dt
            pl.angle = Math.max(-0.9, Math.min(0.9, pl.angle + pl.vel * dt))
          } else pl.angle = pl.lean
          const a = pl.angle
          const tipX = baseX + Math.sin(a) * h
          const tipY = baseY - Math.cos(a) * h
          const dry = pl.flower === 'dry'
          const sprout = pl.flower === 'sprout'
          const L = (sprout ? 5 : 8) * scale * 2.2
          for (let k = 0; k < (sprout ? 2 : 4); k++) {
            const la = (sprout ? [-0.6, 0.6][k] : -1.2 + k * 0.8) + a * 0.5
            ctx.fillStyle = k % 2 ? (dry ? 'rgba(98,92,64,0.9)' : '#2f5a3a') : dry ? 'rgba(120,112,80,0.9)' : '#4b8656'
            ctx.beginPath()
            ctx.ellipse(baseX + Math.sin(la) * L * 0.6, baseY - (sprout ? h : 0) - Math.cos(la) * L * 0.25, L * 0.62, L * 0.28, la, 0, Math.PI * 2)
            ctx.fill()
          }
          if (sprout) continue
          ctx.strokeStyle = dry ? '#6d6a4f' : '#4f8a5c'
          ctx.lineWidth = 1.3 * Math.max(0.8, scale * 1.3)
          ctx.beginPath()
          ctx.moveTo(baseX, baseY)
          ctx.quadraticCurveTo(baseX + Math.sin(a * 0.5) * h * 0.5, baseY - h * 0.6, tipX, tipY)
          ctx.stroke()
          if (pl.flower === 'leaf') {
            ctx.fillStyle = '#4b8656'
            ctx.beginPath()
            ctx.ellipse(tipX, tipY, L * 0.45, L * 0.22, a - 0.5, 0, Math.PI * 2)
            ctx.fill()
            continue
          }
          const size = 30 * scale * 2.1 * (pl.flower === 'violet' ? 0.8 : 1)
          ctx.save()
          ctx.translate(tipX, tipY)
          ctx.rotate(a * 0.7)
          ctx.drawImage(s.sprites[pl.flower] ?? s.sprites.blue, -size / 2, -size / 2, size, size)
          ctx.restore()
        }
        for (const st of stones) if (Math.sin(st.a) >= 0) drawStone(ctx, bx + Math.cos(st.a) * b.rx, by + Math.sin(st.a) * b.ry, b.rx * st.size, st.pts, st.tone)
        ctx.restore()

        // a lantern beside every bed in the back row
        if (bi % 2 === 0) {
          const lx = bx - b.rx * 1.1
          const ly = by - b.ry * 0.2
          const flicker = reduce ? 1 : 0.85 + 0.15 * Math.sin(s.t * 7 + bi) * Math.sin(s.t * 3.1)
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          const g = ctx.createRadialGradient(lx, ly - 64, 0, lx, ly - 64, 120)
          g.addColorStop(0, `rgba(240,197,106,${0.33 * flicker})`)
          g.addColorStop(1, 'rgba(240,197,106,0)')
          ctx.fillStyle = g
          ctx.fillRect(lx - 120, ly - 184, 240, 240)
          ctx.restore()
          ctx.strokeStyle = '#2b2119'
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.moveTo(lx, ly + 20)
          ctx.lineTo(lx, ly - 86)
          ctx.lineTo(lx + 18, ly - 86)
          ctx.stroke()
          ctx.fillStyle = `rgba(255,214,140,${0.9 * flicker})`
          ctx.shadowColor = 'rgba(255,200,120,0.9)'
          ctx.shadowBlur = 16
          ctx.fillRect(lx + 13, ly - 75, 10, 14)
          ctx.shadowBlur = 0
          ctx.fillStyle = '#1d1712'
          ctx.fillRect(lx + 11, ly - 79, 14, 4)
          ctx.fillRect(lx + 11, ly - 61, 14, 3)
        }
      })

      // fireflies (in the world), scattering from the pointer
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (const f of s.flies) {
        const sx = f.x - cx - px * 20
        if (!reduce) {
          f.vx += Math.sin(s.t * 0.6 + f.seed) * 3 * dt
          f.vy += Math.cos(s.t * 0.8 + f.seed * 1.4) * 3 * dt
          if (p.active) {
            const dx = sx - p.x
            const dy = f.y - p.y
            const d = Math.hypot(dx, dy)
            if (d < 130) {
              f.vx += (dx / (d + 1)) * (1 - d / 130) * 90 * dt
              f.vy += (dy / (d + 1)) * (1 - d / 130) * 90 * dt
            }
          }
          f.vx *= 0.95
          f.vy *= 0.95
          f.x = (f.x + f.vx + s.worldW) % s.worldW
          f.y = (f.y + f.vy + H) % H
        }
        if (sx < -10 || sx > W + 10) continue
        const flick = 0.5 + 0.5 * Math.sin(s.t * 2.2 + f.seed * 5)
        const g = ctx.createRadialGradient(sx, f.y - py * 12, 0, sx, f.y - py * 12, 8)
        g.addColorStop(0, `rgba(223,233,154,${0.85 * flick})`)
        g.addColorStop(1, 'rgba(223,233,154,0)')
        ctx.fillStyle = g
        ctx.fillRect(sx - 8, f.y - py * 12 - 8, 16, 16)
      }
      ctx.restore()

      // vignette, plus a soft fade on any side where more garden continues
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75)
      v.addColorStop(0, 'rgba(0,0,0,0)')
      v.addColorStop(1, 'rgba(0,0,0,0.5)')
      ctx.fillStyle = v
      ctx.fillRect(0, 0, W, H)

      if (overlay.current) overlay.current.style.transform = `translate(${ox}px, ${oy}px)`
      report()
    }

    function loop(now) {
      const dt = Math.min(0.05, (now - s.last) / 1000)
      s.last = now
      s.pointer.vx *= 0.9
      if (s.visible) draw(dt)
      s.raf = requestAnimationFrame(loop)
    }

    function pos(e) {
      const rect = el.getBoundingClientRect()
      return [e.clientX - rect.left, e.clientY - rect.top]
    }
    function down(e) {
      const [x] = pos(e)
      s.drag = { startX: x, startCam: s.cam.x, moved: false, lastX: x, lastT: performance.now(), vel: 0, id: e.pointerId }
    }
    function move(e) {
      const [x, y] = pos(e)
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
      const d = s.drag
      if (d) {
        if (!d.moved && Math.abs(x - d.startX) > 6 && maxCam() > 0) {
          d.moved = true
          el.setPointerCapture?.(e.pointerId)
          el.classList.add('dragging')
        }
        if (d.moved) {
          s.cam.x = s.cam.target = clampCam(d.startCam - (x - d.startX))
          d.vel = d.vel * 0.6 + ((d.lastX - x) / Math.max(8, now - d.lastT)) * 1000 * 0.4
          d.lastX = x
          d.lastT = now
          if (!s.moved) s.moved = true
        }
      }
      const id = s.drag?.moved ? null : hitBed(x, y)
      if (id !== s.hoverId) {
        s.hoverId = id
        cb.current.onHover?.(id)
      }
      el.style.cursor = s.drag?.moved ? 'grabbing' : id ? 'pointer' : maxCam() > 0 ? 'grab' : 'default'
      if (reduce) draw(0)
    }
    function up(e) {
      const d = s.drag
      s.drag = null
      el.classList.remove('dragging')
      if (!d) return
      if (d.moved) {
        s.cam.vel = reduce ? 0 : d.vel // glide a little after letting go
      } else {
        const [x, y] = pos(e)
        cb.current.onPick?.(hitBed(x, y))
      }
    }
    function leave(e) {
      if (s.drag?.moved) return
      s.drag = null
      s.pointer.active = false
      s.pointer.lastX = null
      s.par.tx = 0
      s.par.ty = 0
      if (s.hoverId) {
        s.hoverId = null
        const into = e?.relatedTarget
        if (!(into && box.contains(into))) cb.current.onHover?.(null)
      }
    }
    // Sideways scrolling on a trackpad (or Shift + wheel) moves through the garden too.
    function wheel(e) {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0
      if (!dx || maxCam() === 0) return
      e.preventDefault()
      s.cam.vel = 0
      s.cam.target = clampCam(s.cam.target + dx)
      if (reduce) s.cam.x = s.cam.target
      s.moved = true
    }

    // Used by the arrows, the name dots and keyboard focus on a sign.
    api.current = {
      reveal(id) {
        const b = s.beds.find((x) => x.id === id)
        if (!b) return
        if (b.x - b.rx * 1.3 < s.cam.x || b.x + b.rx * 1.3 > s.cam.x + s.W) {
          s.cam.vel = 0
          s.cam.target = clampCam(b.x - s.W / 2)
          s.moved = true
          if (reduce) draw(0)
        }
      },
      page(dir) {
        s.cam.vel = 0
        s.cam.target = clampCam(s.cam.target + dir * Math.max(s.step, s.W * 0.6))
        s.moved = true
        if (reduce) {
          s.cam.x = s.cam.target
          draw(0)
        }
      },
    }

    const ro = new ResizeObserver(resize)
    ro.observe(box)
    resize()
    const io = new IntersectionObserver(([entry]) => {
      s.visible = entry.isIntersecting
    })
    io.observe(box)
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', leave)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('wheel', wheel, { passive: false })
    if (!reduce) s.raf = requestAnimationFrame(loop)
    const redraw = reduce ? setInterval(() => draw(0), 250) : null

    return () => {
      cancelAnimationFrame(s.raf)
      clearInterval(redraw)
      ro.disconnect()
      io.disconnect()
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', leave)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('wheel', wheel)
    }
    // key captures who is in the garden and their stages
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const reveal = useCallback((id) => api.current.reveal?.(id), [])
  const shown = hovered ?? focused ?? pinned
  const scrollable = layout.worldW > layout.W + 1

  return (
    <div ref={wrap} className="garden-scene">
      <canvas ref={canvas} aria-hidden="true" />
      <div ref={overlay} className="garden-overlay">
        {layout.beds.map((b, i) => {
          const z = zones.find((x) => x.id === b.id)
          if (!z) return null
          const info = STAGE_TEXT[z.stage] ?? STAGE_TEXT.empty
          const open = shown === b.id
          return (
            <div key={b.id}>
              <button
                type="button"
                className={`bed-sign ${open ? 'open' : ''}`}
                style={{ left: b.x - (i % 2 ? 0 : b.rx * 0.28), top: b.y - b.ry * 0.62, '--tilt': `${[-3, 0, 4, 2, -2, 0, 3, -1][i % 8]}deg` }}
                aria-expanded={open}
                aria-describedby={`bed-info-${b.id}`}
                onPointerEnter={() => onHover(b.id)}
                onPointerLeave={() => onHover(null)}
                onFocus={() => {
                  reveal(b.id)
                  setFocused(b.id)
                }}
                onBlur={() => setFocused(null)}
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
                style={{ left: Math.max(150, Math.min(b.x + b.rx * 0.15, layout.worldW - 150)), top: b.y + b.ry * 0.05 }}
                role="status"
              >
                <BloomIcon kind={z.stage === 'empty' ? 'sprout' : z.stage === 'wilting' ? 'dry' : bloomOf(z.id)} />
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

      {scrollable && (
        <>
          <button type="button" className="garden-arrow left" onClick={() => api.current.page?.(-1)} disabled={view.atStart} aria-label="Show beds to the left">
            ‹
          </button>
          <button type="button" className="garden-arrow right" onClick={() => api.current.page?.(1)} disabled={view.atEnd} aria-label="Show beds to the right">
            ›
          </button>
          <nav className="garden-dots" aria-label="Go to a crew member’s bed">
            {layout.beds.map((b, i) => (
              <button
                key={b.id}
                type="button"
                className={i >= view.first && i <= view.last ? 'in-view' : ''}
                onClick={() => api.current.reveal?.(b.id)}
                aria-label={zones.find((z) => z.id === b.id)?.fullName}
                title={zones.find((z) => z.id === b.id)?.fullName}
              />
            ))}
          </nav>
          {!view.moved && <span className="garden-drag-hint" aria-hidden="true">Drag to explore the garden</span>}
        </>
      )}
    </div>
  )
}

function BloomIcon({ kind }) {
  const colors = { blue: '#7f95ef', lily: '#efe9d6', violet: '#a98be0', sun: '#f0c95a', pink: '#f2a7c3', star: '#cfeeff', coral: '#ffb48a', bell: '#b9a6ff', dry: '#8f8a6a', sprout: '#5fa152' }
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
