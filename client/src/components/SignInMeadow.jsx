import { useEffect, useRef } from 'react'

// The sign-in artwork, drawn live: glowing wildflowers at night under a planet's edge
// (same look as design/night-garden-plate-1.png). Every stem is a small spring, so the
// flowers sway in a light breeze and bend when the pointer moves through them.
// With "reduce motion" switched on, it draws one still picture.
const KINDS = ['daisy', 'umbel', 'daisy', 'seed', 'umbel', 'bud', 'daisy', 'umbel']

function rng(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sprite(kind, dpr) {
  const S = 96
  const c = document.createElement('canvas')
  c.width = c.height = S * dpr
  const g = c.getContext('2d')
  g.scale(dpr, dpr)
  g.translate(S / 2, S / 2)
  g.globalCompositeOperation = 'lighter'
  if (kind === 'daisy') {
    g.shadowColor = 'rgba(223,233,154,0.35)'
    g.shadowBlur = 8
    for (let i = 0; i < 14; i++) {
      g.save()
      g.rotate((i / 14) * Math.PI * 2)
      g.fillStyle = 'rgba(243,246,234,0.42)'
      g.beginPath()
      g.ellipse(0, -10, 1.7, 8, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
    g.fillStyle = '#dfe99a'
    g.beginPath()
    g.arc(0, 0, 3.6, 0, Math.PI * 2)
    g.fill()
  } else if (kind === 'umbel') {
    g.strokeStyle = 'rgba(200,226,190,0.3)'
    g.lineWidth = 0.6
    for (let i = 0; i < 13; i++) {
      const a = -Math.PI / 2 + (i / 12 - 0.5) * 2.5
      const ex = Math.cos(a) * 24
      const ey = Math.sin(a) * 13 - 5
      g.beginPath()
      g.moveTo(0, 6)
      g.lineTo(ex, ey)
      g.stroke()
      g.shadowColor = 'rgba(243,246,234,0.8)'
      g.shadowBlur = 6
      g.fillStyle = 'rgba(243,246,234,0.85)'
      for (let k = 0; k < 6; k++) {
        g.beginPath()
        g.arc(ex + Math.cos(k * 1.7) * 3.5, ey + Math.sin(k * 2.3) * 2, 1.2, 0, Math.PI * 2)
        g.fill()
      }
      g.shadowBlur = 0
    }
  } else if (kind === 'seed') {
    g.strokeStyle = 'rgba(232,240,236,0.32)'
    g.lineWidth = 0.5
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(Math.cos(a) * 20, Math.sin(a) * 20)
      g.stroke()
      g.fillStyle = 'rgba(243,246,234,0.7)'
      g.beginPath()
      g.arc(Math.cos(a) * 20, Math.sin(a) * 20, 0.8, 0, Math.PI * 2)
      g.fill()
    }
    g.fillStyle = '#dfe99a'
    g.beginPath()
    g.arc(0, 0, 2.4, 0, Math.PI * 2)
    g.fill()
  } else if (kind === 'ghost') {
    for (let i = 0; i < 5; i++) {
      g.save()
      g.rotate((i / 5) * Math.PI * 2 - Math.PI / 2 + 0.2)
      const L = i === 0 ? 40 : 32
      const grad = g.createRadialGradient(0, -L * 0.5, 1, 0, -L * 0.5, L * 0.75)
      grad.addColorStop(0, 'rgba(243,246,234,0.08)')
      grad.addColorStop(0.7, 'rgba(190,232,240,0.15)')
      grad.addColorStop(1, 'rgba(190,232,240,0.02)')
      g.fillStyle = grad
      g.strokeStyle = 'rgba(232,244,246,0.55)'
      g.lineWidth = 0.9
      g.shadowColor = 'rgba(190,232,240,0.6)'
      g.shadowBlur = 10
      g.beginPath()
      g.moveTo(0, 0)
      g.bezierCurveTo(-17, -L * 0.3, -12, -L, 0, -L)
      g.bezierCurveTo(12, -L, 17, -L * 0.3, 0, 0)
      g.fill()
      g.stroke()
      g.restore()
    }
    g.shadowColor = '#f3f6ea'
    g.shadowBlur = 16
    g.fillStyle = '#f3f6ea'
    g.beginPath()
    g.arc(0, 0, 4, 0, Math.PI * 2)
    g.fill()
  } else {
    g.shadowColor = '#dfe99a'
    g.shadowBlur = 12
    g.fillStyle = 'rgba(223,233,154,0.85)'
    g.beginPath()
    g.ellipse(0, 0, 3, 5, 0, 0, Math.PI * 2)
    g.fill()
  }
  return c
}

export default function SignInMeadow() {
  const box = useRef(null)
  const canvas = useRef(null)

  useEffect(() => {
    const el = canvas.current
    const wrap = box.current
    const ctx = el.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const sprites = Object.fromEntries(['daisy', 'umbel', 'seed', 'ghost', 'bud'].map((k) => [k, sprite(k, dpr)]))
    const s = { W: 0, H: 0, stars: null, plants: [], flies: [], t: 0, last: performance.now(), raf: 0, pointer: { x: -9999, y: -9999, vx: 0, active: false, lastX: null, lastT: 0 } }

    function build() {
      const r = rng(214)
      // stars, drawn once per size
      const c = document.createElement('canvas')
      c.width = s.W * dpr
      c.height = s.H * dpr
      const g = c.getContext('2d')
      g.scale(dpr, dpr)
      for (let i = 0; i < (s.W * s.H) / 700; i++) {
        const x = r() * s.W
        const y = Math.pow(r(), 1.35) * s.H * 0.7
        g.fillStyle = `rgba(232,240,236,${(0.15 + r() * 0.7) * (1 - y / (s.H * 0.8))})`
        g.beginPath()
        g.arc(x, y, Math.pow(r(), 3) * 1.4 + 0.25, 0, Math.PI * 2)
        g.fill()
      }
      s.stars = c
      // stems: a dense meadow, taller in the middle, with two ghost orchids as the focus
      const n = Math.round(s.W / 13)
      s.plants = []
      for (let i = 0; i < n; i++) {
        const x = (i / n) * (s.W + 40) - 20 + (r() - 0.5) * 20
        const tall = 0.45 + 0.55 * Math.sin((x / s.W) * Math.PI * 1.1 + 0.3) ** 2
        s.plants.push({ x, h: (s.H * 0.2 + r() * s.H * 0.25) * tall + 30, kind: KINDS[(r() * KINDS.length) | 0], size: 0.75 + r() * 0.5, k: 24 + r() * 12, phase: r() * 6.28, angle: 0, vel: 0, lean: (r() - 0.5) * 0.12, tipX: 0, tipY: 0 })
      }
      s.plants.push({ x: s.W * 0.34, h: s.H * 0.55, kind: 'ghost', size: 1.15, k: 22, phase: 1, angle: 0, vel: 0, lean: -0.05, tipX: 0, tipY: 0, label: '[ BLOOM / 01 ]' })
      s.plants.push({ x: s.W * 0.76, h: s.H * 0.46, kind: 'ghost', size: 0.95, k: 24, phase: 2, angle: 0, vel: 0, lean: 0.05, tipX: 0, tipY: 0, label: '[ SIGNAL : CALM ]' })
      s.plants.sort((a, b) => a.h - b.h)
      s.flies = Array.from({ length: 36 }, () => ({ x: r() * s.W, y: s.H * (0.45 + r() * 0.5), vx: 0, vy: 0, seed: r() * 100 }))
    }

    function resize() {
      const rect = wrap.getBoundingClientRect()
      s.W = Math.max(280, rect.width)
      s.H = Math.max(240, rect.height)
      el.width = s.W * dpr
      el.height = s.H * dpr
      el.style.width = `${s.W}px`
      el.style.height = `${s.H}px`
      build()
      if (reduce) draw(0)
    }

    function draw(dt) {
      const { W, H } = s
      s.t += dt
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, '#03070f')
      sky.addColorStop(0.45, '#081628')
      sky.addColorStop(0.7, '#0e2e3e')
      sky.addColorStop(0.84, '#123a47')
      sky.addColorStop(1, '#040a0d')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H)
      if (s.stars) ctx.drawImage(s.stars, 0, 0, W, H)

      // planet limb with rim light
      const pr = Math.max(W, H) * 1.7
      const pcx = W * 0.72
      const pcy = -pr + H * 0.26
      ctx.save()
      ctx.beginPath()
      ctx.arc(pcx, pcy, pr, 0, Math.PI * 2)
      ctx.fillStyle = '#040a14'
      ctx.fill()
      ctx.strokeStyle = 'rgba(127,214,208,0.07)'
      ctx.lineWidth = 22
      ctx.stroke()
      ctx.strokeStyle = 'rgba(190,240,232,0.8)'
      ctx.lineWidth = 1.4
      ctx.shadowColor = 'rgba(159,227,220,0.9)'
      ctx.shadowBlur = 14
      ctx.stroke()
      ctx.restore()

      const haze = ctx.createRadialGradient(W * 0.48, H * 0.82, 10, W * 0.48, H * 0.82, W * 0.7)
      haze.addColorStop(0, 'rgba(42,106,128,0.42)')
      haze.addColorStop(1, 'rgba(42,106,128,0)')
      ctx.fillStyle = haze
      ctx.fillRect(0, 0, W, H)

      // stems and flowers
      const p = s.pointer
      const ground = H + 6
      for (const f of s.plants) {
        const idle = reduce ? 0 : Math.sin(s.t * 0.9 + f.phase + f.x * 0.004) * 0.05
        let force = 0
        if (p.active && !reduce) {
          const dx = f.tipX - p.x
          const dy = f.tipY - p.y
          const near = Math.exp(-(dx * dx + dy * dy) / (2 * 110 * 110))
          force = (p.vx * 0.001 + Math.sign(dx || 1) * 0.5 * near * Math.min(1, Math.abs(p.vx) * 0.003 + 0.2)) * near
        }
        if (!reduce) {
          f.vel += (-f.k * (f.angle - (f.lean + idle)) - 4.5 * f.vel + force * 60) * dt
          f.angle = Math.max(-0.8, Math.min(0.8, f.angle + f.vel * dt))
        } else f.angle = f.lean
        const a = f.angle
        f.tipX = f.x + Math.sin(a) * f.h
        f.tipY = ground - Math.cos(a) * f.h
        ctx.strokeStyle = 'rgba(96,150,104,0.75)'
        ctx.lineWidth = 1.2 * f.size
        ctx.beginPath()
        ctx.moveTo(f.x, ground)
        ctx.quadraticCurveTo(f.x + Math.sin(a * 0.4) * f.h * 0.5, ground - f.h * 0.55, f.tipX, f.tipY)
        ctx.stroke()
        const size = 96 * f.size * (f.kind === 'ghost' ? 1.4 : 0.7)
        ctx.save()
        ctx.translate(f.tipX, f.tipY)
        ctx.rotate(a * 0.8)
        ctx.drawImage(sprites[f.kind], -size / 2, -size / 2, size, size)
        ctx.restore()
      }

      // fireflies scatter from the pointer
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (const fl of s.flies) {
        if (!reduce) {
          fl.vx += Math.sin(s.t * 0.7 + fl.seed) * 4 * dt
          fl.vy += Math.cos(s.t * 0.9 + fl.seed) * 4 * dt
          if (p.active) {
            const dx = fl.x - p.x
            const dy = fl.y - p.y
            const d = Math.hypot(dx, dy)
            if (d < 130) {
              fl.vx += (dx / (d + 1)) * (1 - d / 130) * 110 * dt
              fl.vy += (dy / (d + 1)) * (1 - d / 130) * 110 * dt
            }
          }
          fl.vx *= 0.96
          fl.vy *= 0.96
          fl.x = (fl.x + fl.vx + W) % W
          fl.y = Math.max(H * 0.3, Math.min(H * 0.98, fl.y + fl.vy))
        }
        const flick = 0.55 + 0.45 * Math.sin(s.t * 2.3 + fl.seed * 7)
        const g = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, 9)
        g.addColorStop(0, `rgba(223,233,154,${0.9 * flick})`)
        g.addColorStop(1, 'rgba(223,233,154,0)')
        ctx.fillStyle = g
        ctx.fillRect(fl.x - 9, fl.y - 9, 18, 18)
      }
      ctx.restore()

      // specimen labels on the two orchids
      ctx.font = '12px "DM Mono", ui-monospace, monospace'
      ctx.textBaseline = 'middle'
      for (const f of s.plants) {
        if (!f.label || W < 420) continue
        const dir = f.tipX > W * 0.6 ? -1 : 1
        const lx = f.tipX + dir * 90
        const ly = Math.max(24, f.tipY - 60)
        ctx.strokeStyle = 'rgba(223,233,154,0.45)'
        ctx.lineWidth = 1
        ctx.setLineDash([2, 4])
        ctx.beginPath()
        ctx.arc(f.tipX, f.tipY, 30, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(f.tipX + dir * 21, f.tipY - 21)
        ctx.lineTo(lx, ly)
        ctx.lineTo(lx + dir * 26, ly)
        ctx.stroke()
        ctx.fillStyle = 'rgba(223,233,154,0.82)'
        ctx.textAlign = dir > 0 ? 'left' : 'right'
        ctx.fillText(f.label, lx + dir * 32, ly)
      }
    }

    function loop(now) {
      const dt = Math.min(0.05, (now - s.last) / 1000)
      s.last = now
      s.pointer.vx *= 0.9
      draw(dt)
      s.raf = requestAnimationFrame(loop)
    }
    function move(e) {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const p = s.pointer
      const now = performance.now()
      if (p.lastX != null) p.vx = p.vx * 0.5 + ((x - p.lastX) / Math.max(8, now - p.lastT)) * 1000 * 0.5
      p.lastX = x
      p.lastT = now
      p.x = x
      p.y = e.clientY - rect.top
      p.active = true
    }
    function leave() {
      s.pointer.active = false
      s.pointer.lastX = null
    }

    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    if (!reduce) s.raf = requestAnimationFrame(loop)
    else document.fonts?.ready.then(() => draw(0))
    return () => {
      cancelAnimationFrame(s.raf)
      ro.disconnect()
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <div ref={box} className="signin-meadow">
      <canvas ref={canvas} role="img" aria-label="A meadow of glowing white wildflowers at night under a planet's edge. Move the pointer to make them sway." />
    </div>
  )
}
