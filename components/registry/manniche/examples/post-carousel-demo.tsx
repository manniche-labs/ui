import type { ReactNode } from 'react'
import { PostCarousel } from '@/registry/manniche/post-carousel/post-carousel'

const f = (v: number) => v.toFixed(1)

// The drawing's pens, from the theme tokens.
const fg = 'fill-none stroke-foreground [stroke-width:1.25]'
const mid = 'fill-none stroke-muted-foreground [stroke-width:1]'
const sig = 'fill-none stroke-primary [stroke-width:2] [stroke-linecap:round]'

function Study({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 240 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="240" height="300" className="fill-muted" />
      {children}
    </svg>
  )
}

const studies = [
  // Horizon: stacked lines that settle towards a flat sea.
  <Study key="horizon">
    {Array.from({ length: 12 }, (_, k) => {
      let d = ''
      for (let x = 0; x <= 240; x += 4) d += `${x ? 'L' : 'M'}${x} ${f(70 + k * 16 + Math.sin(x / 26 + k) * (12 - k))}`
      return <path key={k} d={d} className={k === 5 ? sig : k % 2 ? mid : fg} />
    })}
  </Study>,
  // Bloom: petals from one centre.
  <Study key="bloom">
    {Array.from({ length: 10 }, (_, k) => (
      <ellipse key={k} cx="120" cy="150" rx="22" ry="92" transform={`rotate(${k * 18} 120 150)`} className={k === 3 ? sig : k % 2 ? mid : fg} />
    ))}
  </Study>,
  // Columns: a row of pillars of rising height.
  <Study key="columns">
    {Array.from({ length: 8 }, (_, k) => (
      <rect key={k} x={28 + k * 24} y={250 - 30 - k * 22} width="14" height={30 + k * 22} rx="2" className={k === 6 ? sig : fg} />
    ))}
    <path d="M16 250H224" className={mid} />
  </Study>,
  // Rings: circles drifting off centre.
  <Study key="rings">
    {Array.from({ length: 11 }, (_, k) => (
      <circle key={k} cx={120 + k * 3} cy={150 - k * 2} r={12 + k * 11} className={k === 7 ? sig : k % 2 ? mid : fg} />
    ))}
  </Study>,
  // Grid: a field of crosses, one picked out.
  <Study key="grid">
    {Array.from({ length: 9 * 11 }, (_, k) => {
      const x = 24 + (k % 9) * 24
      const y = 30 + Math.floor(k / 9) * 24
      return <path key={k} d={`M${x - 4} ${y}H${x + 4}M${x} ${y - 4}V${y + 4}`} className={k === 49 ? sig : mid} />
    })}
  </Study>,
]

export default function PostCarouselDemo() {
  return (
    <PostCarousel
      label="Post by Ada Lovelace"
      slides={studies}
      header={
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="grid size-9 place-items-center rounded-full bg-muted font-mono text-[11px] font-medium text-muted-foreground">
            AL
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold">Ada Lovelace</p>
            <p className="font-mono text-[11px] text-muted-foreground">Analyst</p>
          </div>
        </div>
      }
    >
      <p className="text-[13px] leading-snug text-pretty">
        <span className="font-medium">Ada Lovelace</span> <span className="text-muted-foreground">Five studies in line, drawn for the new notebook.</span>
      </p>
    </PostCarousel>
  )
}
