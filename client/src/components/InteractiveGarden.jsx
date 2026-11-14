import { useEffect, useRef } from 'react'

// The shared crew garden as an interactive night meadow (inspired by layered, mouse-reactive
// space sites). One zone per crew member; how full and bright it is follows their garden stage.
//
// - Flowers sway in a gentle breeze, and bend when the mouse (or a finger) moves through them:
//   each stem is a little spring that is pushed by the pointer's movement and springs back.
// - Layers (stars, planet, haze, grass, flowers, foreground) shift by different amounts as the
//   pointer moves and as the page scrolls, which gives depth.
// - Fireflies drift and scatter away from the pointer.
// - "Reduce motion" turns all movement off and shows one still picture.
const STAGE = {
  empty: { n: 5, h: [10, 22], size: 0.55, glow: 0.5, sprout: true },
  wilting: { n: 12, h: [40, 90], size: 0.7, glow: 0.15, droop: 0.55, dry: true },
  needsCare: { n: 16, h: [60, 130], size: 0.8, glow: 0.6 },
  growing: { n: 22, h: [80, 180], size: 0.95, glow: 0.85 },
  blooming: { n: 30, h: [100, 230], size: 1.1, glow: 1, fireflies: true },
}
const KINDS = ['daisy', 'umbel', 'daisy', 'seed', 'umbel', 'bud', 'daisy', 'ghost', 'umbel', 'daisy', 'seed', 'umbel']

function rng(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Canvas cannot read CSS variables, so look the colours up once.
function resolveColor(value) {
  const m = /var\((--[\w-]+)\)/.exec(value ?? '')
  if (!m) return value
  return getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#f3f6ea'
}

// A flower head with its glow drawn once into a small picture, then reused every frame (fast).
function headSprite(kind, color, glow, dpr) {
  const S = 72
  const c = document.createElement('canvas')
  c.width = c.height = S * dpr
  const g = c.getContext('2d')
  g.scale(dpr, dpr)
  g.translate(S / 2, S / 2)
  g.shadowColor = `rgba(223,233,154,${0.7 * glow})`
  g.shadowBlur = 12 * glow
  const lime = '#dfe99a'
  if (kind === 'daisy') {
    for (let i = 0; i < 14; i++) {
      g.save()
      g.rotate((i / 14) * Math.PI * 2)
      g.fillStyle = color
      g.globalAlpha = 0.55
      g.beginPath()
      g.ellipse(0, -9, 1.8, 7.5, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
    g.globalAlpha = 1
    g.fillStyle = lime
    g.beginPath()
    g.arc(0, 0, 3.2, 0, Math.PI * 2)
    g.fill()
  } else if (kind === 'umbel') {
    g.strokeStyle = 'rgba(200,226,190,0.35)'
    g.lineWidth = 0.6
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI / 2 + (i / 10 - 0.5) * 2.4
      const ex = Math.cos(a) * 16
      const ey = Math.sin(a) * 9 - 3
      g.beginPath()
      g.moveTo(0, 8)
      g.lineTo(ex, ey)
      g.stroke()
      g.fillStyle = color
      for (let k = 0; k < 5; k++) {
        g.beginPath()
        g.arc(ex + Math.cos(k * 1.3) * 2.6, ey + Math.sin(k * 1.9) * 1.6, 1.1, 0, Math.PI * 2)
        g.fill()
      }
    }
  } else if (kind === 'seed') {
    g.strokeStyle = color
    g.globalAlpha = 0.5
    g.lineWidth = 0.5
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(Math.cos(a) * 13, Math.sin(a) * 13)
      g.stroke()
    }
    g.globalAlpha = 1
    g.fillStyle = lime
    g.beginPath()
    g.arc(0, 0, 2, 0, Math.PI * 2)
    g.fill()
  } else if (kind === 'ghost') {
    for (let i = 0; i < 5; i++) {
      g.save()
      g.rotate((i / 5) * Math.PI * 2)
      g.fillStyle = 'rgba(190,232,240,0.13)'
      g.strokeStyle = 'rgba(232,244,246,0.6)'
      g.lineWidth = 0.8
      g.beginPath()
      g.moveTo(0, 0)
      g.bezierCurveTo(-9, -6, -7, -20, 0, -21)
      g.bezierCurveTo(7, -20, 9, -6, 0, 0)
      g.fill()
      g.stroke()
      g.restore()
    }
    g.fillStyle = color
    g.beginPath()
    g.arc(0, 0, 3, 0, Math.PI * 2)
    g.fill()
  } else {
    g.fillStyle = lime
    g.beginPath()
    g.ellipse(0, 0, 2.8, 4.6, 0, 0, Math.PI * 2)
    g.fill()
  }
  return c
}

// Builds the flowers for every crew zone. Positions are fractions of the width, so resizing keeps the layout.
function buildFlowers(zones) {
  const flowers = []
  zones.forEach((z, zi) => {
    const look = STAGE[z.stage] ?? STAGE.empty
    const r = rng(1000 + zi * 77 + look.n)
    for (let i = 0; i < look.n; i++) {
      const depth = 0.55 + r() * 0.45
      flowers.push({
        zone: zi,
        fx: (zi + 0.08 + (0.84 * (i + r() * 0.8)) / look.n) / zones.length,
        h: (look.h[0] + r() * (look.h[1] - look.h[0])) * (0.75 + depth * 0.35),
        depth,
        kind: look.sprout ? 'bud' : KINDS[(i + zi * 3) % KINDS.length],
        size: look.size * (0.7 + depth * 0.45),
        lean: look.droop ? (r() < 0.5 ? -1 : 1) * look.droop * (0.6 + r() * 0.6) : (r() - 0.5) * 0.12,
        dry: Boolean(look.dry),
        glow: look.glow,
        k: 26 + r() * 10, // spring stiffness (how fast it springs back)
        phase: r() * Math.PI * 2,
        angle: 0,
        vel: 0,
        tipX: 0,
        tipY: 0,
      })
    }
  })
  return flowers.sort((a, b) => a.depth - b.depth)
}

export default function InteractiveGarden({ zones, onSelect, label }) {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const state = useRef(null)
  const zonesKey = zones.map((z) => `${z.id}:${z.stage}`).join('|')

  useEffect(() => {
    const el = canvas.current
    const box = wrap.current
    const ctx = el.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const s = {
      W: 0,
      H: 0,
      flowers: buildFlowers(zones),
      sprites: new Map(),
      pointer: { x: -9999, y: -9999, vx: 0, active: false, lastX: null, lastT: 0 },
      par: { x: 0, y: 0, tx: 0, ty: 0 }, // parallax position, eased towards the target
      hoverZone: -1,
      flies: [],
      stars: null,
      raf: 0,
      visible: true,
      t: 0,
      last: performance.now(),
    }
    state.current = s
    const colors = zones.map((z) => resolveColor(z.color))
    const dryColor = '#8f9c8a'

    function sprite(kind, zi, dry, glow) {
      const key = `${kind}|${zi}|${dry}`
      if (!s.sprites.has(key)) s.sprites.set(key, headSprite(kind, dry ? dryColor : colors[zi], dry ? 0.1 : glow, dpr))
      return s.sprites.get(key)
    }

    // Stars and the planet are drawn once per size into their own layer (slightly larger than the
    // view, so they can slide for parallax without showing an edge).
    function buildBackdrop() {
      const pad = 60
      const c = document.createElement('canvas')
      c.width = (s.W + pad * 2) * dpr
      c.height = (s.H + pad * 2) * dpr
      const g = c.getContext('2d')
      g.scale(dpr, dpr)
      const r = rng(214)
      for (let i = 0; i < (s.W * s.H) / 900; i++) {
        const x = r() * (s.W + pad * 2)
        const y = Math.pow(r(), 1.4) * (s.H * 0.8)
        g.fillStyle = `rgba(234,240,230,${0.15 + r() * 0.65})`
        g.beginPath()
        g.arc(x, y, Math.pow(r(), 3) * 1.4 + 0.3, 0, Math.PI * 2)
        g.fill()
      }
      s.stars = { canvas: c, pad }
      s.flies = Array.from({ length: zones.some((z) => STAGE[z.stage]?.fireflies) ? 34 : 14 }, () => ({
        x: r() * s.W,
        y: s.H * (0.45 + r() * 0.45),
        vx: 0,
        vy: 0,
        seed: r() * 100,
      }))
    }

    function resize() {
      const rect = box.getBoundingClientRect()
      s.W = Math.max(320, rect.width)
      s.H = Math.max(360, rect.height)
      el.width = s.W * dpr
      el.height = s.H * dpr
      el.style.width = `${s.W}px`
      el.style.height = `${s.H}px`
      buildBackdrop()
      if (reduce) draw(0.016)
    }

    const ground = () => s.H * 0.9

    function draw(dt) {
      const { W, H } = s
      s.t += dt
      // ease the parallax towards the pointer (and the page scroll)
      const rect = box.getBoundingClientRect()
      const scroll = Math.max(-1, Math.min(1, -rect.top / H))
      s.par.x += (s.par.tx - s.par.x) * Math.min(1, dt * 4)
      s.par.y += (s.par.ty + scroll * 0.6 - s.par.y) * Math.min(1, dt * 4)
      const px = s.par.x
      const py = s.par.y

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, '#03070f')
      sky.addColorStop(0.5, '#091a2d')
      sky.addColorStop(0.8, '#123a47')
      sky.addColorStop(1, '#06121a')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H)

      // stars (far: moves least)
      if (s.stars) ctx.drawImage(s.stars.canvas, -s.stars.pad - px * 12, -s.stars.pad - py * 10, W + s.stars.pad * 2, H + s.stars.pad * 2)

      // planet limb with rim light
      const pcx = W * 0.78 - px * 26
      const pcy = -H * 1.9 - py * 40
      const pr = H * 2.25
      ctx.save()
      ctx.beginPath()
      ctx.arc(pcx, pcy, pr, 0, Math.PI * 2)
      ctx.fillStyle = '#050c17'
      ctx.fill()
      ctx.strokeStyle = 'rgba(127,214,208,0.08)'
      ctx.lineWidth = 18
      ctx.stroke()
      ctx.strokeStyle = 'rgba(190,240,232,0.75)'
      ctx.lineWidth = 1.4
      ctx.shadowColor = 'rgba(159,227,220,0.9)'
      ctx.shadowBlur = 14
      ctx.stroke()
      ctx.restore()

      // a crescent moon (deep layer) and the space station drifting across the sky
      const mx = W * 0.86 - px * 34
      const my = H * 0.17 - py * 24
      ctx.save()
      ctx.fillStyle = 'rgba(243,246,234,0.9)'
      ctx.shadowColor = 'rgba(243,246,234,0.6)'
      ctx.shadowBlur = 18
      ctx.beginPath()
      ctx.arc(mx, my, 22, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#071322'
      ctx.beginPath()
      ctx.arc(mx - 9, my - 5, 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      const issX = ((s.t * 14) % (W + 160)) - 80 - px * 22
      const issY = H * 0.12 + Math.sin(s.t * 0.05) * 6 - py * 16
      ctx.save()
      ctx.translate(issX, issY)
      ctx.rotate(-0.08)
      ctx.strokeStyle = 'rgba(223,233,154,0.85)'
      ctx.fillStyle = 'rgba(74,157,179,0.55)'
      ctx.lineWidth = 0.8
      for (const sx of [-15, 9]) {
        ctx.fillRect(sx, -7, 6, 5)
        ctx.fillRect(sx, 2, 6, 5)
        ctx.strokeRect(sx, -7, 6, 5)
        ctx.strokeRect(sx, 2, 6, 5)
      }
      ctx.beginPath()
      ctx.moveTo(-15, 0)
      ctx.lineTo(15, 0)
      ctx.stroke()
      ctx.fillStyle = 'rgba(243,246,234,0.9)'
      ctx.fillRect(-4, -1.5, 8, 3)
      ctx.restore()

      // horizon haze
      const haze = ctx.createRadialGradient(W * 0.5 - px * 20, H * 0.86, 10, W * 0.5 - px * 20, H * 0.86, W * 0.65)
      haze.addColorStop(0, 'rgba(42,106,128,0.45)')
      haze.addColorStop(1, 'rgba(42,106,128,0)')
      ctx.fillStyle = haze
      ctx.fillRect(0, 0, W, H)

      // distant grass
      ctx.fillStyle = '#06121a'
      ctx.beginPath()
      ctx.moveTo(0, H)
      for (let x = 0; x <= W + 20; x += 20) {
        ctx.lineTo(x - px * 30, ground() - 14 - Math.sin(x / 90) * 6 - Math.sin(x / 37) * 3)
      }
      ctx.lineTo(W, H)
      ctx.closePath()
      ctx.fill()

      // flowers: spring physics, pushed by the pointer.
      // On narrow screens the flowers are shorter, so they stay below the headline.
      const narrow = W < 600
      const hScale = narrow ? 0.55 : Math.min(1, (H * 0.5) / 230)
      const p = s.pointer
      const breeze = Math.sin(s.t * 0.5) * 0.5 + 0.5
      for (const f of s.flowers) {
        const depthShift = 20 + f.depth * 26
        const baseX = f.fx * W - px * depthShift
        const baseY = ground() + (f.depth - 0.8) * 36
        const idle = reduce ? 0 : Math.sin(s.t * (0.9 + f.depth * 0.4) + f.phase + baseX * 0.004) * 0.05 * (0.4 + breeze)
        let force = 0
        if (p.active && !reduce) {
          const dx = f.tipX - p.x
          const dy = f.tipY - p.y
          const near = Math.exp(-(dx * dx + dy * dy) / (2 * 120 * 120))
          // the pointer's movement brushes the stems along, and they lean away from it a little
          force = (p.vx * 0.001 + Math.sign(dx || 1) * 0.55 * near * Math.min(1, Math.abs(p.vx) * 0.003 + 0.2)) * near
        }
        const target = f.lean + idle
        const acc = -f.k * (f.angle - target) - 4.5 * f.vel + force * 60
        f.vel += acc * dt
        f.angle = Math.max(-0.85, Math.min(0.85, f.angle + f.vel * dt))

        const a = f.angle
        const fh = f.h * hScale
        f.tipX = baseX + Math.sin(a) * fh
        f.tipY = baseY - Math.cos(a) * fh
        const cx = baseX + Math.sin(a * 0.45) * fh * 0.5
        const cy = baseY - fh * 0.55
        ctx.globalAlpha = 0.45 + f.depth * 0.55
        ctx.strokeStyle = f.dry ? '#5f6b58' : '#5f9a68'
        ctx.lineWidth = 0.8 + f.depth * 0.9
        ctx.beginPath()
        ctx.moveTo(baseX, baseY + 6)
        ctx.quadraticCurveTo(cx, cy, f.tipX, f.tipY)
        ctx.stroke()
        // a leaf
        ctx.fillStyle = f.dry ? 'rgba(95,107,88,0.6)' : 'rgba(80,135,92,0.7)'
        ctx.beginPath()
        const lx = baseX + Math.sin(a * 0.3) * fh * 0.3
        const ly = baseY - fh * 0.3
        const side = f.phase > Math.PI ? 1 : -1
        ctx.moveTo(lx, ly)
        ctx.quadraticCurveTo(lx + side * 12 * f.depth, ly - 10, lx + side * 20 * f.depth, ly - 22 * f.depth)
        ctx.quadraticCurveTo(lx + side * 6, ly - 6, lx, ly)
        ctx.fill()
        // the head, turned with the stem
        const img = sprite(f.kind, f.zone, f.dry, f.glow * (s.hoverZone === f.zone ? 1.25 : 1))
        const size = 72 * f.size * (0.6 + f.depth * 0.5) * (narrow ? 0.75 : 1)
        ctx.save()
        ctx.translate(f.tipX, f.tipY)
        ctx.rotate(a * 0.8)
        ctx.globalAlpha = (f.dry ? 0.55 : 0.75 + f.depth * 0.25) * (s.hoverZone >= 0 && s.hoverZone !== f.zone ? 0.6 : 1)
        ctx.drawImage(img, -size / 2, -size / 2, size, size)
        ctx.restore()
      }
      ctx.globalAlpha = 1

      // fireflies scatter from the pointer
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      if (p.active && !reduce) {
        const lantern = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 90)
        lantern.addColorStop(0, 'rgba(223,233,154,0.13)')
        lantern.addColorStop(1, 'rgba(223,233,154,0)')
        ctx.fillStyle = lantern
        ctx.fillRect(p.x - 90, p.y - 90, 180, 180)
      }
      for (const fly of s.flies) {
        if (!reduce) {
          fly.vx += Math.sin(s.t * 0.7 + fly.seed) * 4 * dt
          fly.vy += Math.cos(s.t * 0.9 + fly.seed * 1.3) * 4 * dt
          if (p.active) {
            const dx = fly.x - p.x
            const dy = fly.y - p.y
            const d2 = dx * dx + dy * dy
            if (d2 < 140 * 140) {
              const push = (1 - Math.sqrt(d2) / 140) * 120 * dt
              fly.vx += (dx / (Math.sqrt(d2) + 1)) * push
              fly.vy += (dy / (Math.sqrt(d2) + 1)) * push
            }
          }
          fly.vx *= 0.96
          fly.vy *= 0.96
          fly.x += fly.vx
          fly.y += fly.vy
          if (fly.x < -20) fly.x = W + 20
          if (fly.x > W + 20) fly.x = -20
          fly.y = Math.max(H * 0.25, Math.min(H * 0.97, fly.y))
        }
        const flicker = 0.55 + 0.45 * Math.sin(s.t * 2.3 + fly.seed * 7)
        const g = ctx.createRadialGradient(fly.x - px * 40, fly.y, 0, fly.x - px * 40, fly.y, 9)
        g.addColorStop(0, `rgba(223,233,154,${0.9 * flicker})`)
        g.addColorStop(1, 'rgba(223,233,154,0)')
        ctx.fillStyle = g
        ctx.fillRect(fly.x - px * 40 - 9, fly.y - 9, 18, 18)
      }
      ctx.restore()

      // foreground blades (near: move most)
      ctx.strokeStyle = 'rgba(8,22,24,0.95)'
      ctx.lineWidth = 2.2
      for (let i = 0; i < W / 9; i++) {
        const x = i * 9 + ((i * 37) % 7) - px * 60
        const h = 14 + ((i * 53) % 22)
        const bend = s.pointer.active && !reduce ? Math.max(-1, Math.min(1, s.pointer.vx * 0.01)) * Math.exp(-((x - s.pointer.x) ** 2) / 20000) * 10 : 0
        ctx.beginPath()
        ctx.moveTo(x, H + 2)
        ctx.quadraticCurveTo(x + bend * 0.4, H - h * 0.5, x + bend + Math.sin(s.t + i) * (reduce ? 0 : 1.2), H - h)
        ctx.stroke()
      }

      // specimen labels: one per crew member, tied to their tallest flower
      // (left out on narrow screens, where the bed cards below show the same thing)
      if (narrow) return
      ctx.font = '12px "DM Mono", ui-monospace, monospace'
      ctx.textBaseline = 'middle'
      zones.forEach((z, zi) => {
        const mine = s.flowers.filter((f) => f.zone === zi)
        if (!mine.length) return
        const top = mine.reduce((a, b) => (b.tipY < a.tipY ? b : a))
        const hot = s.hoverZone === zi
        const text = `[ ${z.name.toUpperCase()} / ${z.label.toUpperCase()} ]`
        const width = ctx.measureText(text).width
        const tx = Math.min(W - 24, Math.max(24, top.tipX))
        // point the label right, unless it would run off the right edge
        const lx = tx + (tx + 60 + width > W - 10 ? -1 : 1) * 30
        const ly = Math.max(28, top.tipY - 46)
        ctx.strokeStyle = `rgba(223,233,154,${hot ? 0.9 : 0.5})`
        ctx.lineWidth = 1
        ctx.setLineDash([2, 4])
        ctx.beginPath()
        ctx.arc(top.tipX, top.tipY, 16, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(top.tipX + (lx > tx ? 11 : -11), top.tipY - 11)
        ctx.lineTo(lx, ly)
        ctx.lineTo(lx + (lx > tx ? 22 : -22), ly)
        ctx.stroke()
        ctx.fillStyle = `rgba(223,233,154,${hot ? 1 : 0.8})`
        ctx.textAlign = lx > tx ? 'left' : 'right'
        const textX = lx + (lx > tx ? 28 : -28)
        const safeX = ctx.textAlign === 'left' ? Math.min(textX, W - width - 10) : Math.max(textX, width + 10)
        ctx.fillText(text, safeX, ly)
      })
    }

    function loop(now) {
      const dt = Math.min(0.05, (now - s.last) / 1000)
      s.last = now
      // the pointer's speed fades when it stops moving
      s.pointer.vx *= 0.9
      if (s.visible) draw(dt)
      s.raf = requestAnimationFrame(loop)
    }

    function zoneAt(x) {
      return Math.max(0, Math.min(zones.length - 1, Math.floor(((x + s.par.x * 46) / s.W) * zones.length)))
    }

    function move(e) {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const now = performance.now()
      const p = s.pointer
      if (p.lastX != null) {
        const dtm = Math.max(8, now - p.lastT)
        p.vx = p.vx * 0.5 + ((x - p.lastX) / dtm) * 1000 * 0.5 // pixels per second, smoothed
      }
      p.lastX = x
      p.lastT = now
      p.x = x
      p.y = y
      p.active = true
      s.par.tx = x / s.W - 0.5
      s.par.ty = y / s.H - 0.5
      const zone = y > s.H * 0.35 ? zoneAt(x) : -1
      s.hoverZone = zone
      el.style.cursor = zone >= 0 && onSelect ? 'pointer' : 'default'
      if (reduce) draw(0)
    }
    function leave() {
      s.pointer.active = false
      s.pointer.lastX = null
      s.hoverZone = -1
      s.par.tx = 0
      s.par.ty = 0
    }
    function click(e) {
      const rect = el.getBoundingClientRect()
      const y = e.clientY - rect.top
      if (onSelect && y > s.H * 0.35) onSelect(zones[zoneAt(e.clientX - rect.left)].id)
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
    else document.fonts?.ready.then(() => draw(0))

    return () => {
      cancelAnimationFrame(s.raf)
      ro.disconnect()
      io.disconnect()
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('pointercancel', leave)
      el.removeEventListener('click', click)
    }
    // zonesKey captures what matters about zones (who and which stage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zonesKey, onSelect])

  return (
    <div ref={wrap} className="meadow">
      <canvas ref={canvas} role="img" aria-label={label} />
    </div>
  )
}
