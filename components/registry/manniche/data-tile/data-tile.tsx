// The tile every data primitive sits in: a quiet card with a name, an optional control on the right, the figure,
// the chart and a footer with the fine print. One tile per question. `inverted` turns one tile dark on a light page
// (or light on a dark one) to mark the figure that matters most; every token inside it follows, charts included.
import { useId, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type DataTileProps = {
  /** The question the tile answers, as a short name: "Revenue", "Sleep". */
  title?: ReactNode
  /** The heading level of the title, to fit the page outline. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
  /** A control set at the right of the title row, such as a period switch. */
  action?: ReactNode
  /** The fine print under a line: what is counted, from when, by whom. */
  footer?: ReactNode
  /** Swap the tile to the opposite theme, to lift the one figure that matters most on a screen. */
  inverted?: boolean
  /** "compact" tightens the padding and gaps for dense dashboards. Default "comfortable". */
  density?: 'comfortable' | 'compact'
  /** Classes for the outer tile. */
  className?: string
  /** The tile body, such as a figure, a chart or a list. */
  children?: ReactNode
}

// Snapshots of the page's tokens, taken on the outer element so the inner one can swap them without a cycle.
const INVERT_OUTER = {
  '--tile-bg': 'var(--foreground)',
  '--tile-fg': 'var(--background)',
  '--tile-primary': 'var(--primary)',
  '--tile-success': 'var(--success)',
  '--tile-destructive': 'var(--destructive)',
  '--tile-chart-1': 'var(--chart-1)',
  '--tile-chart-2': 'var(--chart-2)',
  '--tile-chart-3': 'var(--chart-3)',
  '--tile-chart-4': 'var(--chart-4)',
  '--tile-chart-5': 'var(--chart-5)',
} as CSSProperties

// Colours are pulled a little towards the tile's text colour, so they keep their contrast on the swapped surface.
const toward = (name: string, amount: number) => `color-mix(in oklab, var(--tile-${name}) ${amount}%, var(--tile-fg))`
const INVERT_INNER = {
  '--card': 'var(--tile-bg)',
  '--card-foreground': 'var(--tile-fg)',
  '--foreground': 'var(--tile-fg)',
  '--background': 'var(--tile-bg)',
  '--muted': 'color-mix(in oklab, var(--tile-fg) 10%, var(--tile-bg))',
  '--muted-foreground': 'color-mix(in oklab, var(--tile-fg) 64%, var(--tile-bg))',
  '--border': 'color-mix(in oklab, var(--tile-fg) 15%, var(--tile-bg))',
  '--primary': toward('primary', 80),
  '--ring': toward('primary', 80),
  '--success': toward('success', 80),
  '--destructive': toward('destructive', 80),
  '--chart-1': toward('chart-1', 85),
  '--chart-2': toward('chart-2', 85),
  '--chart-3': toward('chart-3', 85),
  '--chart-4': toward('chart-4', 85),
  '--chart-5': toward('chart-5', 85),
} as CSSProperties

const DENSITY = {
  comfortable: { tile: 'px-6 pt-[18px]', body: 'mt-[22px]', foot: 'mt-[22px] pt-3.5 pb-[18px]', end: 'pb-6' },
  compact: { tile: 'px-[18px] pt-3', body: 'mt-3.5', foot: 'mt-3.5 pt-2.5 pb-3.5', end: 'pb-[18px]' },
}

export function DataTile({ title, headingLevel = 3, action, footer, inverted = false, density = 'comfortable', className, children }: DataTileProps) {
  const titleId = useId()
  const d = DENSITY[density]
  const Heading = `h${headingLevel}` as const
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      data-density={density}
      data-inverted={inverted || undefined}
      className={cn(
        'group/tile relative flex min-w-0 flex-col rounded-[calc(var(--radius)*2+2px)]',
        inverted
          ? 'bg-foreground text-background'
          : 'bg-card text-card-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]',
        className,
      )}
      style={inverted ? INVERT_OUTER : undefined}
    >
      <div
        className={cn('flex min-w-0 flex-1 flex-col', d.tile, !footer && d.end)}
        style={inverted ? INVERT_INNER : undefined}
      >
        {(title || action) && (
          <div className="flex min-h-11 flex-wrap items-center gap-3">
            {title && (
              <Heading id={titleId} className="text-[15px] leading-[1.2] font-medium tracking-[-0.01em]">
                {title}
              </Heading>
            )}
            {action && <div className="ml-auto flex flex-wrap items-center gap-2">{action}</div>}
          </div>
        )}
        <div className={cn('relative min-w-0 flex-1', (title || action) && d.body)}>{children}</div>
        {footer && (
          <div
            className={cn(
              'flex flex-wrap items-baseline gap-x-4 gap-y-1.5 border-t border-border text-[13.5px] leading-normal text-pretty text-muted-foreground',
              d.foot,
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </section>
  )
}

/** The figure block at the top of a tile: a small label over the big number, with a change pill or note beside it. */
export function TileFact({ label, children, aside }: { label?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      {label && <span className="text-sm leading-[1.3] font-medium text-muted-foreground">{label}</span>}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        {children}
        {aside && <span className="mb-[0.35em] inline-flex flex-wrap items-center gap-2">{aside}</span>}
      </div>
    </div>
  )
}

/** A key for charts where two or more series share a plot. Never needed for one series. */
export function TileLegend({ items, className }: { items: { label: string; color: string; shape?: 'square' | 'dot' | 'line' | 'dashed' }[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground', className)}>
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-[7px]">
          <i
            aria-hidden
            className={cn(
              'flex-none',
              it.shape === 'line' || it.shape === 'dashed' ? 'h-0 w-4 border-t-2' : 'size-2.5',
              it.shape === 'dashed' && 'border-dashed',
              it.shape === 'dot' ? 'rounded-full' : it.shape === 'square' || !it.shape ? 'rounded-[3px]' : '',
            )}
            style={it.shape === 'line' || it.shape === 'dashed' ? { borderColor: it.color } : { background: it.color }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  )
}
