// Bento metrics: a heading with a one-line intro over a grid of figure tiles. Each tile is a label, the big figure
// (`BigNumber`), an optional change pill, a short note and, when it has a `trend`, a `Sparkline`. One tile can be
// inverted to lift the figure that matters most. `note` under the heading is where a section says what the numbers
// are, so a demo can say "Example data." in plain sight.
//
// Signature: the figures roll in when the section first comes into view. Until then (and on the server) the real
// values are in the page, so nothing depends on the animation; with reduced motion they simply stay put.
//
// Screen readers: one `h2`, a real list of tiles, each with an `h3` label. Every figure is read once, with its
// change ("up" or "down") and its trend sentence from the sparkline. The roll is hidden from them: they always
// hear the final value, never a half-counted one.
import { useId, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { BigNumber, DeltaPill } from '@/registry/manniche/chart-kit/chart-kit'
import { formatValue, type ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { DataTile, TileFact } from '@/registry/manniche/data-tile/data-tile'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { Sparkline } from '@/registry/manniche/sparkline/sparkline'

export type BentoMetric = {
  /** A stable key for the tile. */
  id: string
  /** What the figure is, shown as the tile's `h3`: "Projects shipped". */
  label: string
  /** The figure. */
  value: number
  /** How the figure is written: currency, decimals, suffix. */
  format?: ValueFormat
  /** The change in the figure, shown as a pill (a percentage by default). Leave it out for none. */
  delta?: number
  /** How the change is written. Default one decimal and a percent sign. */
  deltaFormat?: ValueFormat
  /** Which direction of the change is good. "down" for things like refunds. Default "up". */
  goodWhen?: 'up' | 'down'
  /** Values for a small trend line, oldest first. Leave it out for none. */
  trend?: readonly number[]
  /** The trend's accessible name, such as "Projects shipped, last 8 months". Default the label. */
  trendLabel?: string
  /** A short line of context under the figure: what is counted and over which period. */
  note?: ReactNode
  /** Swap this tile to the opposite theme. Use it on one tile. */
  inverted?: boolean
}

export type BentoMetricsProps = Omit<ComponentProps<'section'>, 'children' | 'title'> & {
  /** The section's `h2`. */
  heading: ReactNode
  /** A short line under the heading. */
  intro?: ReactNode
  /** A small mono label above the heading. */
  eyebrow?: ReactNode
  /** A fine-print line under the grid, such as "Example data." or the source and date of real figures. */
  note?: ReactNode
  /** The figure tiles, two to six. */
  metrics: readonly BentoMetric[]
  /** Roll the figures in when the section first comes into view. Never under reduced motion. Default true. */
  roll?: boolean
}

const COLS = {
  2: '@4xl:grid-cols-2',
  3: '@4xl:grid-cols-3',
  4: '@4xl:grid-cols-2',
} as const

export function BentoMetrics({ heading, intro, eyebrow, note, metrics, roll = true, className, ...rest }: BentoMetricsProps) {
  const headingId = useId()
  const reduced = useReducedMotion()
  const root = useRef<HTMLElement>(null)
  // "armed" shows the figures at zero until the section is seen; the real values are rendered until then.
  const [armed, setArmed] = useState(false)
  useLayoutEffect(() => {
    const node = root.current
    if (!roll || reduced || !node || typeof IntersectionObserver === 'undefined') return
    setArmed(true)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setArmed(false)
          io.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [roll, reduced])

  const cols = COLS[metrics.length as 2 | 3 | 4] ?? '@4xl:grid-cols-3'
  return (
    <section
      ref={root}
      aria-labelledby={headingId}
      className={cn('@container w-full py-12 @3xl:py-20', className)}
      {...rest}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mb-8 grid max-w-2xl gap-3 @3xl:mb-12">
          {eyebrow && <p className="font-mono text-xs tracking-[0.04em] text-muted-foreground tabular-nums">{eyebrow}</p>}
          <h2
            id={headingId}
            className="text-[clamp(30px,5.4cqw,52px)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance text-foreground"
            style={{ fontFamily: 'var(--font-display, inherit)', fontStretch: '86%' }}
          >
            {heading}
          </h2>
          {intro && <p className="text-base leading-relaxed text-pretty text-muted-foreground">{intro}</p>}
        </header>
        <ul className={cn('grid list-none grid-cols-1 gap-3 p-0 @2xl:grid-cols-2 @2xl:gap-4', cols)}>
          {metrics.map((m) => (
            <li key={m.id} className="flex min-w-0">
              <DataTile title={m.label} inverted={m.inverted} className="w-full">
                <div className="grid h-full content-between gap-5">
                  <div className="grid gap-2">
                    <TileFact
                      aside={
                        m.delta !== undefined && (
                          <DeltaPill value={m.delta} format={m.deltaFormat} goodWhen={m.goodWhen} />
                        )
                      }
                    >
                      {/* The figure is spoken once, in full, whatever the roll is doing. */}
                      <span className="sr-only">{formatValue(m.value, m.format)}</span>
                      <span aria-hidden>
                        <BigNumber value={armed ? 0 : m.value} format={m.format} size="lg" roll={roll} />
                      </span>
                    </TileFact>
                    {m.note && <p className="text-[13.5px] leading-normal text-pretty text-muted-foreground">{m.note}</p>}
                  </div>
                  {m.trend && m.trend.length > 1 && (
                    <Sparkline data={m.trend} label={m.trendLabel ?? m.label} format={m.format} height={36} />
                  )}
                </div>
              </DataTile>
            </li>
          ))}
        </ul>
        {note && <p className="mt-4 font-mono text-xs text-muted-foreground tabular-nums">{note}</p>}
      </div>
    </section>
  )
}
