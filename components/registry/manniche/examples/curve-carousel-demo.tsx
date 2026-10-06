import { useState, type ReactNode } from 'react'
import { CurveCarousel } from '@/registry/manniche/curve-carousel/curve-carousel'
import { curveLayouts, type CurveLayoutName } from '@/registry/manniche/curve-carousel/layouts'
import { cn } from '@/lib/utils'

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

const f = (v: number) => v.toFixed(1)
const line = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('')

// The drawing's pens, from the theme tokens.
const fg = 'fill-none stroke-foreground [stroke-width:1.25]'
const mid = 'fill-none stroke-muted-foreground [stroke-width:1]'
const sig = 'fill-none stroke-primary [stroke-width:2] [stroke-linecap:round] [stroke-linejoin:round]'

function Plate({ no, title, children }: { no: number; title: string; children: ReactNode }) {
  return (
    <figure className="relative m-0 size-full bg-muted">
      {/* A little wider than the card and moved by --curve-shift, so the shingle layout can pan it. */}
      <svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice" aria-hidden className="absolute inset-y-0 -inset-x-[14%] h-full w-[128%] [translate:var(--curve-shift,0px)_0]">
        {children}
      </svg>
      <figcaption className="absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-2 bg-card px-3 py-2.5 shadow-[inset_0_1px_0_var(--border)]">
        <span className="truncate text-[13px] leading-none font-medium tracking-[-0.005em]">{title}</span>
        <span className="font-mono text-[10.5px] leading-none font-medium text-muted-foreground tabular-nums">{String(no).padStart(2, '0')}</span>
      </figcaption>
    </figure>
  )
}

function Contour() {
  const r = rng(3)
  const rings = Array.from({ length: 9 }, (_, k) => {
    const pts: [number, number][] = []
    for (let a = 0; a <= 64; a++) {
      const t = (a / 64) * Math.PI * 2
      const w = 1 + 0.18 * Math.sin(t * 3 + k * 0.4) + 0.08 * Math.sin(t * 5 + r())
      pts.push([150 + Math.cos(t) * (16 + k * 15) * w, 128 + Math.sin(t) * (12 + k * 12) * w])
    }
    return line(pts) + 'Z'
  })
  return rings.map((d, k) => <path key={k} d={d} className={k === 4 ? sig : k % 2 ? mid : fg} />)
}

function Wave() {
  return Array.from({ length: 7 }, (_, k) => {
    const pts: [number, number][] = []
    for (let x = 0; x <= 300; x += 4) pts.push([x, 60 + k * 26 + Math.sin(x / 34 + k * 0.7) * (8 + k * 2.5)])
    return <path key={k} d={line(pts)} className={k === 3 ? sig : k % 2 ? mid : fg} />
  })
}

function Orbit() {
  return (
    <>
      {[40, 72, 104, 136].map((rx, k) => (
        <ellipse key={rx} cx="150" cy="128" rx={rx} ry={rx * 0.42} transform={`rotate(-18 150 128)`} className={k % 2 ? mid : fg} />
      ))}
      <circle cx="150" cy="128" r="9" className={fg} />
      <circle cx={150 + 104 * Math.cos(0.6)} cy={128 - 104 * 0.42 * Math.sin(0.6) - 26} r="5" className="fill-primary" />
    </>
  )
}

function Lattice() {
  let d = ''
  for (let i = 0; i <= 12; i++) {
    const v: [number, number][] = []
    const h: [number, number][] = []
    for (let j = 0; j <= 24; j++) {
      const u = j / 24
      const bend = (x: number, y: number): [number, number] => {
        const dx = x - 150
        const dy = y - 128
        const k = 1 + 0.5 * Math.exp(-(dx * dx + dy * dy) / 9000)
        return [150 + dx * k, 128 + dy * k]
      }
      v.push(bend(i * 25, u * 300))
      h.push(bend(u * 300, i * 25))
    }
    d += line(v) + line(h)
  }
  return (
    <>
      <path d={d} className={mid} />
      <circle cx="150" cy="128" r="22" className={sig} />
    </>
  )
}

function Ridges() {
  const r = rng(11)
  const seeds = Array.from({ length: 6 }, () => r() * 300)
  return Array.from({ length: 11 }, (_, k) => {
    const pts: [number, number][] = []
    for (let x = 0; x <= 300; x += 5) {
      const peak = seeds.reduce((s, c, i) => s + Math.exp(-((x - c) ** 2) / (300 + i * 140)) * (10 + ((k * 7 + i * 5) % 13)), 0)
      pts.push([x, 40 + k * 20 - peak])
    }
    return <path key={k} d={line(pts)} className={k === 6 ? sig : fg} />
  })
}

function Rays() {
  return (
    <>
      {Array.from({ length: 36 }, (_, k) => {
        const a = (k / 36) * Math.PI * 2
        const r1 = k % 3 ? 30 : 22
        return <line key={k} x1={150 + Math.cos(a) * r1} y1={128 + Math.sin(a) * r1} x2={150 + Math.cos(a) * 190} y2={128 + Math.sin(a) * 190} className={k === 7 ? sig : mid} />
      })}
      <circle cx="150" cy="128" r="16" className={fg} />
    </>
  )
}

function Spiral() {
  const pts: [number, number][] = []
  for (let t = 0; t < 34; t += 0.08) pts.push([150 + Math.cos(t) * t * 4.2, 128 + Math.sin(t) * t * 4.2])
  const tail = pts.slice(-60)
  return (
    <>
      <path d={line(pts)} className={fg} />
      <path d={line(tail)} className={sig} />
    </>
  )
}

function Halftone() {
  const dots: ReactNode[] = []
  for (let y = 12; y < 300; y += 14)
    for (let x = 12 + ((y / 14) % 2) * 7; x < 300; x += 14) {
      const v = Math.exp(-((x - 190) ** 2 + (y - 100) ** 2) / 12000)
      if (v > 0.05) dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={f(0.6 + v * 5.4)} className={v > 0.85 ? 'fill-primary' : 'fill-foreground'} />)
    }
  return dots
}

function Knot() {
  const pts: [number, number][] = []
  for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.02) pts.push([150 + Math.sin(3 * t + 0.5) * 108, 128 + Math.sin(4 * t) * 92])
  return (
    <>
      <path d={line(pts)} className={fg} />
      <circle cx={150 + Math.sin(0.5) * 108} cy="128" r="5" className="fill-primary" />
    </>
  )
}

function Moire() {
  return (
    <>
      {Array.from({ length: 14 }, (_, k) => (
        <circle key={`a${k}`} cx="124" cy="128" r={10 + k * 11} className={mid} />
      ))}
      {Array.from({ length: 14 }, (_, k) => (
        <circle key={`b${k}`} cx="182" cy="118" r={10 + k * 11} className={k === 5 ? sig : fg} />
      ))}
    </>
  )
}

function Flow() {
  const r = rng(29)
  return Array.from({ length: 26 }, (_, k) => {
    let x = r() * 300
    let y = r() * 260
    const pts: [number, number][] = [[x, y]]
    for (let s = 0; s < 34; s++) {
      const a = Math.sin(x / 60) + Math.cos(y / 48) * 1.3
      x += Math.cos(a) * 6
      y += Math.sin(a) * 6
      pts.push([x, y])
    }
    return <path key={k} d={line(pts)} className={k === 9 ? sig : k % 3 ? mid : fg} />
  })
}

function Steps() {
  return (
    <>
      {Array.from({ length: 9 }, (_, k) => (
        <rect key={k} x={36 + k * 26} y={220 - k * 20} width="26" height={k * 20 + 20} className={k === 6 ? sig : fg} />
      ))}
      <path d="M20 240H280" className={mid} />
    </>
  )
}

const PLATES: [string, () => ReactNode][] = [
  ['Contour', Contour],
  ['Wave', Wave],
  ['Orbit', Orbit],
  ['Lattice', Lattice],
  ['Ridges', Ridges],
  ['Rays', Rays],
  ['Spiral', Spiral],
  ['Halftone', Halftone],
  ['Knot', Knot],
  ['Moiré', Moire],
  ['Flow', Flow],
  ['Steps', Steps],
]

const slides = PLATES.map(([title, Art], i) => (
  <Plate key={title} no={i + 1} title={title}>
    <Art />
  </Plate>
))

const NAMES = Object.keys(curveLayouts) as CurveLayoutName[]

export default function CurveCarouselDemo() {
  const [layout, setLayout] = useState<CurveLayoutName>('coverflow')
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-5">
      <div role="group" aria-label="Layout" className="flex flex-wrap justify-center gap-1">
        {NAMES.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={name === layout}
            onClick={() => setLayout(name)}
            className={cn(
              'h-11 cursor-pointer rounded-[4px] px-3 font-mono text-[11.5px] font-medium tracking-[0.02em] text-muted-foreground [-webkit-tap-highlight-color:transparent] hover:text-foreground',
              'aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-[inset_0_0_0_1px_var(--border)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            )}
          >
            {name}
          </button>
        ))}
      </div>
      {/* A new key per layout, so each one starts from its first card. */}
      <CurveCarousel key={layout} layout={layout} slides={slides} label="Plates" defaultIndex={curveLayouts[layout].loop ? 0 : 5} />
    </div>
  )
}
