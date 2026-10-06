import type { ReactNode } from 'react'
import { AccordionGallery, type AccordionGalleryItem } from '@/registry/manniche/accordion-gallery/accordion-gallery'

// A small seeded random generator, so the drawings are the same on every render and on the server.
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

// The drawing's pens, from the theme tokens.
const grid = 'fill-none stroke-foreground/14 [stroke-width:1]'
const fg = 'fill-none stroke-foreground [stroke-width:1.25]'
const mid = 'fill-none stroke-muted-foreground [stroke-width:1]'
const sig = 'fill-none stroke-primary [stroke-width:2] [stroke-linecap:round] [stroke-linejoin:round]'
const dot = 'fill-muted-foreground'
const dotp = 'fill-primary'

function Art({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 480 360" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {children}
    </svg>
  )
}

function Wave() {
  let g = ''
  for (let x = 0; x <= 480; x += 30) g += `M${x} 0V360`
  for (let y = 0; y <= 360; y += 30) g += `M0 ${y}H480`
  let a = ''
  let b = ''
  for (let x = 0; x <= 480; x += 3) {
    const t = (x / 480) * Math.PI * 2
    const y = 170 + Math.sin(t * 3) * 52 * Math.exp(-x / 520) + Math.sin(t * 11) * 9
    const z = 170 + Math.sin(t * 3 + 1.2) * 34
    a += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1)
    b += (x ? 'L' : 'M') + x + ' ' + z.toFixed(1)
  }
  return (
    <Art>
      <path className={grid} d={g} />
      <path className={mid} d="M0 170H480M240 0V360" />
      <path className={mid} d={b} strokeDasharray="3 4" />
      <path className={sig} d={a} />
    </Art>
  )
}

function Dial() {
  const cx = 240
  const cy = 200
  const R = 132
  let t = ''
  for (let k = 0; k <= 60; k++) {
    const a = Math.PI * (0.8 + (k / 60) * 1.4)
    const r1 = R - (k % 10 === 0 ? 22 : k % 5 === 0 ? 14 : 8)
    const c = Math.cos(a)
    const s = Math.sin(a)
    t += `M${(cx + c * R).toFixed(1)} ${(cy + s * R).toFixed(1)}L${(cx + c * r1).toFixed(1)} ${(cy + s * r1).toFixed(1)}`
  }
  const na = Math.PI * (0.8 + 0.62 * 1.4)
  return (
    <Art>
      {[40, 86].map((r) => (
        <circle key={r} className={grid} cx={cx} cy={cy} r={r} />
      ))}
      <circle className={mid} cx={cx} cy={cy} r={R + 10} />
      <path className={fg} d={t} />
      <path className={sig} d={`M${cx} ${cy}L${(cx + Math.cos(na) * (R - 30)).toFixed(1)} ${(cy + Math.sin(na) * (R - 30)).toFixed(1)}`} />
      <circle className="fill-card stroke-foreground/14" cx={cx} cy={cy} r="14" />
      <circle className={dotp} cx={cx} cy={cy} r="3" />
    </Art>
  )
}

function Contour() {
  const rand = rng(5)
  const harm = [2, 3, 4, 6].map((f, j) => ({ f, a: (0.12 / (j + 1)) * (0.6 + rand()), p: rand() * 6.28 }))
  const rings = Array.from({ length: 16 }, (_, k) => {
    const r0 = 22 + k * 15
    const pts: [number, number][] = []
    for (let s = 0; s < 100; s++) {
      const th = (s / 100) * Math.PI * 2
      let m = 1
      harm.forEach((q) => {
        m += q.a * Math.sin(q.f * th + q.p + k * 0.07)
      })
      pts.push([250 + Math.cos(th) * r0 * m * 1.15, 175 + Math.sin(th) * r0 * m * 0.85])
    }
    return smooth(pts)
  })
  return (
    <Art>
      {rings.map((d, k) => (
        <path key={k} d={d} className={k === 6 ? sig : k % 4 === 0 ? fg : mid} />
      ))}
    </Art>
  )
}

function Lattice() {
  const dots = []
  for (let y = 18; y < 360; y += 24)
    for (let x = 18; x < 480; x += 24) {
      const d = Math.hypot(x - 250, y - 170)
      const on = Math.abs(y - 30 - (x - 90) * 0.55) < 12 && x > 80 && x < 420
      dots.push(<circle key={`${x}-${y}`} className={on ? dotp : dot} cx={x} cy={y} r={on ? 3.4 : d < 120 ? 2.2 : 1.3} opacity={!on && d >= 120 ? 0.55 : undefined} />)
    }
  return <Art>{dots}</Art>
}

function Spectrum() {
  return (
    <Art>
      <path className={grid} d="M0 300H480M0 240H480M0 180H480M0 120H480M0 60H480" />
      {Array.from({ length: 34 }, (_, k) => {
        const x = (20 + k * 13.2).toFixed(1)
        const h = 40 + 150 * Math.abs(Math.sin(k * 0.37) * Math.cos(k * 0.11)) + 30 * Math.sin(k * 1.7) ** 2
        return (
          <g key={k}>
            <rect className="fill-[color-mix(in_oklab,var(--foreground)_72%,var(--muted))]" x={x} y={(300 - h).toFixed(1)} width="8" height={h.toFixed(1)} rx="1" />
            <path className={sig} d={`M${x} ${(300 - h - 10).toFixed(1)}h8`} />
          </g>
        )
      })}
    </Art>
  )
}

const items: AccordionGalleryItem[] = [
  { title: 'Waveform', description: 'A drawn trace on a ruled grid.', content: <Wave /> },
  { title: 'Dial', description: 'A sweep dial with an engraved scale.', content: <Dial /> },
  { title: 'Contour', description: 'Contour lines from one noise field.', content: <Contour /> },
  { title: 'Lattice', description: 'A dot lattice with one marked path.', content: <Lattice /> },
  { title: 'Spectrum', description: 'Bars from a fixed sine sum, not data.', content: <Spectrum /> },
].map((item, k) => ({ ...item, eyebrow: `slot ${k + 1} · demo` }))

export default function AccordionGalleryDemo() {
  return <AccordionGallery items={items} defaultIndex={1} />
}
