import { useState } from 'react'
import { NotchCard } from '@/registry/manniche/notch-card/notch-card'

// A small seeded random generator, so the drawing is the same on every render and on the server.
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A closed curve through the midpoints of the given points.
function smooth(pts: [number, number][]) {
  const n = pts.length
  const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const s = mid(pts[n - 1], pts[0])
  let d = `M${s[0].toFixed(1)} ${s[1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p = pts[i]
    const q = mid(p, pts[(i + 1) % n])
    d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${q[0].toFixed(1)} ${q[1].toFixed(1)}`
  }
  return d + 'Z'
}

// The agate's bands, mixed from the theme tokens.
const fills = {
  a0: 'fill-[color-mix(in_oklab,var(--primary)_80%,var(--card))]',
  a1: 'fill-[color-mix(in_oklab,var(--primary)_32%,var(--card))]',
  a2: 'fill-[color-mix(in_oklab,var(--success,var(--primary))_58%,var(--card))]',
  a3: 'fill-[color-mix(in_oklab,var(--card)_92%,var(--foreground))]',
  a4: 'fill-[color-mix(in_oklab,var(--destructive)_55%,var(--card))]',
  a5: 'fill-[color-mix(in_oklab,var(--primary)_55%,var(--foreground))]',
  a6: 'fill-accent',
} as const
const order = ['a5', 'a1', 'a0', 'a3', 'a2', 'a1', 'a4', 'a3', 'a0', 'a6', 'a5', 'a1', 'a3', 'a0', 'a2', 'a3', 'a6', 'a3'] as const

const W = 280
const H = 214
const bands = (() => {
  const rand = rng(11)
  const harm = [2, 3, 5, 7].map((f, j) => ({ f, a: (0.085 / (j + 1)) * (0.7 + rand() * 0.6), p: rand() * 6.283 }))
  const cx = W * 0.44
  const cy = H * 0.58
  return order.map((fill, k) => {
    const t = k / order.length
    const r0 = 190 * Math.pow(1 - t, 1.25) + 5
    const pts: [number, number][] = []
    for (let s = 0; s < 120; s++) {
      const th = (s / 120) * Math.PI * 2
      let m = 1
      harm.forEach((q, j) => {
        m += q.a * Math.sin(q.f * th + q.p + t * (j % 2 ? 0.8 : -0.6))
      })
      m += Math.sin(th * 13 + k) * 0.006
      pts.push([cx + Math.cos(th) * r0 * m * 1.1, cy + Math.sin(th) * r0 * m * 0.82])
    }
    return { fill, d: smooth(pts) }
  })
})()

// A cross-section of an agate, drawn in SVG from the theme tokens.
function Agate() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width={W} height={H} className="fill-muted" />
      {bands.map((b, k) => (
        <path key={k} d={b.d} className={`${fills[b.fill]} stroke-foreground/14 [stroke-width:0.6]`} />
      ))}
    </svg>
  )
}

export default function NotchCardDemo() {
  // A tap or click holds the colour, so it can be seen on touch screens too.
  const [held, setHeld] = useState(false)
  return (
    <div className="grid place-items-center py-4">
      <NotchCard
        className="min-h-96"
        image={<Agate />}
        eyebrow="specimen 05"
        title="Agate, cross-section"
        href="#notch-card"
        linkProps={{
          onClick: (e) => {
            e.preventDefault()
            setHeld((v) => !v)
          },
        }}
        bloom={held}
        footer={
          <>
            <span>drawn · demo</span>
            <span>tokens only</span>
          </>
        }
      >
        Drawn in SVG from the theme tokens. Grey at rest, in colour on hover or focus.
      </NotchCard>
    </div>
  )
}
