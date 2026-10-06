// A dot matrix: one dot per cell of a rows × columns grid (days × hours, say), where the dot grows and darkens
// with the value, so the pattern reads without colour. One cell can be marked as now with the --primary signal.
// Rows are named at the left and columns along the bottom, as many as fit.
//
// How it works: the grid is plain CSS grid with square cells, so its height follows its width and nothing jumps
// while it is measured. Values fall into five levels (0 plus four steps, quartiles of the largest value unless
// `levels` sets the steps) and each level is a fixed scale and opacity of the same INK dot. Which cell is under the
// pointer is worked out from the position, so a mouse, a pen and a finger scrubbing across the grid all behave the
// same, and the page still scrolls up and down under a finger.
//
// Screen readers: the grid is one image named by `label`, with a hint, and one Tab stop. Arrow keys walk the cells
// in both directions, Home and End go to the ends of the row, Ctrl+Home and Ctrl+End to the corners, and Escape
// lets go. Each step is read once ("Thu 14:00–15:00, now: 3 payments"). The whole grid is in a hidden table.
//
// Motion: on first view the dots grow in column by column (all done in under 600 ms); new values glide in 160 ms.
// Only transform and opacity move. Under reduced motion every dot is drawn at its size at once.
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'
import { ChartTooltip, SrTable } from '@/registry/manniche/chart-kit/chart-kit'
import { EASE_CSS, INK, formatValue, type ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { useAnnounce, useChartFrame } from '@/registry/manniche/chart-kit/use-chart'

export type DotMatrixLabels = {
  /** Added to the current cell's name in the tooltip and when read: "Thu 14:00–15:00 · now". Default "now". */
  current?: string
  /** The first column of the screen reader table, naming the rows. Default "Row". */
  row?: string
  /** Read after the chart's name. Default "Use the arrow keys to read each cell." */
  hint?: string
  /** The word after a value, muted in the tooltip and read aloud: (v) => v === 1 ? "payment" : "payments". Default none. */
  unit?: (value: number) => string
  /** A quiet line under the figure in the tooltip, such as "Over 4 weeks". Default none. */
  note?: string
  /** Read while loading. Default "Loading". */
  loading?: string
  /** Shown when there is nothing to draw and no `placeholder` is given. Default "No data yet". */
  empty?: string
}

const LABELS = {
  current: 'now',
  row: 'Row',
  hint: 'Use the arrow keys to read each cell.',
  loading: 'Loading',
  empty: 'No data yet',
}

export type DotMatrixProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** The values, one array per row with one number per column: `data[row][column]`. Missing cells count as 0. */
  data: number[][]
  /** The short row names at the left: "Mon" or "M". */
  rows: string[]
  /** The full row names for the tooltip, the table and screen readers: "Mon", "Monday". Default `rows`. */
  rowTitles?: string[]
  /** The short column names along the bottom: "07", "08". */
  columns: string[]
  /** The full column names for the tooltip, the table and screen readers: "07:00–08:00". Default `columns`. */
  columnTitles?: string[]
  /** The chart's accessible name, such as "Card payments per hour over the last 4 weeks". */
  label: string
  /** How values are written in the tooltip, the table and when read. Default a plain whole number. */
  format?: ValueFormat
  /**
   * The upper bounds of levels 0 to 3, ascending; anything above the last is the top level. The mockup's
   * `[0, 1, 3, 5]` puts 0 at the smallest dot, 1 next, 2–3, 4–5 and 6 or more at full size. Default: 0, then
   * quarters of the largest value.
   */
  levels?: [number, number, number, number]
  /** The cell marked as now in --primary, as `row * columns.length + column`. Default null, none. */
  current?: number | null
  /** Name every nth column, counted from the first. Default as many as fit, at most about six. */
  labelEvery?: number
  /** Show breathing skeleton dots instead of data. */
  loading?: boolean
  /** Shown over the empty grid when there is no data or every value is 0, such as a message and a next step. */
  placeholder?: ReactNode
  /** The highlighted cell as `row * columns.length + column`, or null. Pass it to control the highlight. */
  activeIndex?: number | null
  /** The highlighted cell to start with, when `activeIndex` is not controlled. Default null. */
  defaultActiveIndex?: number | null
  /** Called when hover, a finger or the keyboard picks another cell, and with null when it lets go. */
  onActiveIndexChange?: (index: number | null) => void
  /** "compact" draws smaller, flatter cells. Inside a compact DataTile this happens on its own. */
  density?: 'comfortable' | 'compact'
  /** Every visible and spoken string that is not data. */
  labels?: DotMatrixLabels
}

/** Scale and opacity per level, as in the mockup. */
const SCALE = [0.22, 0.42, 0.6, 0.8, 1]
const OPACITY = [0.3, 0.5, 0.7, 0.88, 1]

function useControllable(controlled: number | null | undefined, initial: number | null, onChange?: (v: number | null) => void) {
  const [inner, setInner] = useState(initial)
  const isControlled = controlled !== undefined
  const value = isControlled ? controlled : inner
  const set = useCallback(
    (v: number | null) => {
      if (v === value) return
      if (!isControlled) setInner(v)
      onChange?.(v)
    },
    [value, isControlled, onChange],
  )
  return [value, set] as const
}

function levelOf(v: number, steps: readonly number[]) {
  if (!(v > steps[0])) return 0
  for (let k = 1; k < steps.length; k++) if (v <= steps[k]) return k
  return steps.length
}

/** Cell and dot sizes. The gutter for the row names narrows in a small container, as in the mockup under 560 px. */
const GRID_COLS = 'grid-cols-[28px_repeat(var(--dm-cols),minmax(0,1fr))] @min-[448px]:grid-cols-[34px_repeat(var(--dm-cols),minmax(0,1fr))]'
const COMPACT_COLS = 'grid-cols-[24px_repeat(var(--dm-cols),minmax(0,1fr))]'

/** A heat map of dots in a rows × columns grid, where size and shade carry the value and one cell can be now. */
export function DotMatrix({
  data,
  rows,
  rowTitles,
  columns,
  columnTitles,
  label,
  format,
  levels,
  current = null,
  labelEvery,
  loading = false,
  placeholder,
  activeIndex,
  defaultActiveIndex = null,
  onActiveIndexChange,
  density,
  labels: labelsProp,
  className,
  style,
  ...rest
}: DotMatrixProps) {
  const labels = { ...LABELS, ...labelsProp }
  const { ref: frameRef, ...frame } = useChartFrame<HTMLDivElement>()
  const { say, region } = useAnnounce()
  const hintId = useId()
  const [active, setActive] = useControllable(activeIndex, defaultActiveIndex, onActiveIndexChange)

  const nRows = rows.length
  const nCols = columns.length
  const count = nRows * nCols
  const value = (r: number, c: number) => Math.max(0, data[r]?.[c] ?? 0)
  const max = useMemo(() => Math.max(0, ...data.flatMap((r) => r.map((v) => (v > 0 ? v : 0)))), [data])
  const steps = levels ?? [0, max / 4, max / 2, (max * 3) / 4]
  const empty = !loading && (count === 0 || max === 0)
  const compact = density === 'compact'

  const at = active !== null && active >= 0 && active < count && !empty ? active : -1
  const now = current !== null && current >= 0 && current < count ? current : -1

  // First view grows the dots in; afterwards changes glide quickly.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (!frame.drawn || settled) return
    const t = window.setTimeout(() => setSettled(true), frame.reduced ? 0 : 620)
    return () => window.clearTimeout(t)
  }, [frame.drawn, settled, frame.reduced])

  // A cell that no longer exists lets go.
  useEffect(() => {
    if (active !== null && (active < 0 || active >= count)) setActive(null)
  }, [active, count, setActive])

  const rowName = (r: number) => rowTitles?.[r] ?? rows[r]
  const colName = (c: number) => columnTitles?.[c] ?? columns[c]
  const name = (i: number) => `${rowName(Math.floor(i / nCols))} ${colName(i % nCols)}`
  const spoken = (v: number) => {
    const unit = labels.unit?.(v)
    return unit ? `${formatValue(v, format)} ${unit}` : formatValue(v, format)
  }
  const describe = (i: number) => {
    const v = value(Math.floor(i / nCols), i % nCols)
    return `${name(i)}${i === now ? `, ${labels.current}` : ''}: ${spoken(v)}`
  }
  const pick = (i: number, announce: boolean) => {
    setActive(i)
    if (announce) say(describe(i))
  }

  // Geometry, from the measured width: the gutter is the first grid track.
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [gut, setGut] = useState(34)
  const width = frame.width
  const cellW = nCols ? (width - gut) / nCols : 0
  const cellH = nRows ? frame.height / nRows : 0

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (empty || loading || !nCols) return
    const el = e.currentTarget
    const g = parseFloat(getComputedStyle(el).gridTemplateColumns) || gut
    if (g !== gut) setGut(g)
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left - g
    if (x < 0) return
    const c = Math.min(nCols - 1, Math.floor(x / ((r.width - g) / nCols)))
    const row = Math.max(0, Math.min(nRows - 1, Math.floor((e.clientY - r.top) / (r.height / nRows))))
    const i = row * nCols + c
    if (i !== at) pick(i, false)
  }
  useEffect(() => {
    // Keep the gutter in step with the container query and density that set it.
    const node = gridRef.current
    if (!node || !width) return
    const g = parseFloat(getComputedStyle(node).gridTemplateColumns)
    if (g && g !== gut) setGut(g)
  }, [width, gut, compact])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (empty || !count) return
    if (e.key === 'Escape') {
      if (at < 0) return
      e.preventDefault()
      setActive(null)
      return
    }
    const from = at < 0 ? (now >= 0 ? now : 0) : at
    let r = Math.floor(from / nCols)
    let c = from % nCols
    if (e.key === 'ArrowRight') c = Math.min(nCols - 1, c + 1)
    else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1)
    else if (e.key === 'ArrowDown') r = Math.min(nRows - 1, r + 1)
    else if (e.key === 'ArrowUp') r = Math.max(0, r - 1)
    else if (e.key === 'Home') {
      c = 0
      if (e.ctrlKey || e.metaKey) r = 0
    } else if (e.key === 'End') {
      c = nCols - 1
      if (e.ctrlKey || e.metaKey) r = nRows - 1
    } else return
    e.preventDefault()
    pick(r * nCols + c, true)
  }

  // Column names: as many as fit, and no more than about six, counted from the first.
  const longest = Math.max(1, ...columns.map((c) => c.length))
  const fit = cellW > 0 ? Math.ceil((longest * 6.8 + 12) / cellW) : 1
  const every = Math.max(1, labelEvery ?? Math.max(fit, Math.ceil(nCols / 6)))

  const stagger = Math.min(16, 260 / Math.max(1, nCols - 1))
  const dotStyle = (r: number, c: number, lvl: number): CSSProperties => {
    const shown = frame.drawn
    const isNow = r * nCols + c === now
    return {
      background: isNow ? 'var(--primary)' : INK,
      // The now dot stays at full strength so it can be found even when its value is low.
      opacity: shown ? (isNow ? 1 : OPACITY[lvl]) : 0,
      transform: `scale(${shown ? SCALE[lvl] : 0})`,
      transition: frame.reduced
        ? 'none'
        : settled
          ? `transform 160ms ${EASE_CSS}, opacity 160ms ${EASE_CSS}`
          : `transform 300ms ${EASE_CSS} ${Math.round(c * stagger)}ms, opacity 300ms ${EASE_CSS} ${Math.round(c * stagger)}ms`,
    }
  }

  const cols = compact ? COMPACT_COLS : cn(GRID_COLS, 'group-data-[density=compact]/tile:grid-cols-[24px_repeat(var(--dm-cols),minmax(0,1fr))]')
  const cellClass = cn(
    // The height is capped so a wide tile keeps a compact grid instead of growing square cells.
    'relative grid place-items-center min-h-3.5',
    compact ? 'aspect-[5/4] max-h-9' : 'aspect-square max-h-12 group-data-[density=compact]/tile:aspect-[5/4] group-data-[density=compact]/tile:max-h-9',
  )
  const dotClass = cn(
    'block aspect-square w-[76%] rounded-full',
    compact ? 'max-w-3.5' : 'max-w-[18px] group-data-[density=compact]/tile:max-w-3.5',
  )
  const rowLabel = 'font-mono text-[11px] leading-none whitespace-nowrap text-muted-foreground'
  const tipAt = at >= 0 && width > 0 ? at : -1
  const tipR = Math.floor(tipAt / nCols)
  const tipC = tipAt % nCols
  const tipV = tipAt >= 0 ? value(tipR, tipC) : 0
  const tipUnit = tipAt >= 0 ? labels.unit?.(tipV) : ''

  return (
    <div
      className={cn('@container relative min-w-0', className)}
      style={{ ['--dm-cols' as string]: loading && !nCols ? 16 : Math.max(1, nCols), ...style }}
      aria-busy={loading || undefined}
      {...rest}
    >
      <div
        ref={(el) => {
          frameRef(el)
          gridRef.current = el
        }}
        tabIndex={empty || loading ? undefined : 0}
        role={empty || loading ? undefined : 'img'}
        aria-label={empty || loading ? undefined : label}
        aria-describedby={empty || loading ? undefined : hintId}
        aria-hidden={loading || undefined}
        onPointerDown={fromPointer}
        onPointerMove={fromPointer}
        onPointerLeave={(e) => {
          if (e.pointerType !== 'mouse') return
          if (!e.currentTarget.matches(':focus-visible')) setActive(null)
        }}
        onFocus={(e) => {
          // A press focuses the grid too; only keyboard focus picks a cell.
          if (!e.currentTarget.matches(':focus-visible')) return
          if (at >= 0) {
            say(describe(at))
            return
          }
          pick(now >= 0 ? now : 0, true)
        }}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
        className={cn(
          'relative grid items-center rounded-[14px] outline-offset-4 select-none [touch-action:pan-y]',
          cols,
          !empty && !loading && 'cursor-crosshair',
          loading && 'motion-safe:animate-pulse',
        )}
      >
        {Array.from({ length: Math.max(nRows, loading ? 7 : 0) }, (_, r) => (
          <Fragment key={r}>
            <span aria-hidden className={cn(rowLabel, r === tipR && tipAt >= 0 && 'text-foreground')}>
              {loading ? '' : rows[r]}
            </span>
            {Array.from({ length: Math.max(nCols, loading ? 16 : 0) }, (_, c) => {
              const i = r * nCols + c
              const lvl = loading || empty ? 0 : levelOf(value(r, c), steps)
              return (
                <span key={c} aria-hidden className={cellClass}>
                  {loading ? (
                    <i className={cn(dotClass, 'scale-[0.6] bg-muted')} />
                  ) : (
                    <i className={dotClass} style={empty ? { background: INK, opacity: 0.18, transform: 'scale(0.22)' } : dotStyle(r, c, lvl)} />
                  )}
                  {i === at && (
                    <span className="pointer-events-none absolute top-1/2 left-1/2 aspect-square h-[min(100%,40px)] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_var(--ring)]" />
                  )}
                </span>
              )
            })}
          </Fragment>
        ))}
        {empty && (
          <div className="absolute inset-0 grid place-content-center justify-items-center gap-1.5 px-4 text-center">
            {placeholder ?? <span className="rounded-full bg-card px-3 py-1 text-[13.5px] text-muted-foreground">{labels.empty}</span>}
          </div>
        )}
      </div>
      <span id={hintId} hidden>
        {labels.hint}
      </span>
      <div aria-hidden className={cn('mt-1.5 grid h-[11px] group-data-[density=compact]/tile:mt-1', cols, compact && 'mt-1')}>
        <span />
        {!loading &&
          width > 0 &&
          columns.map((c, k) => (
            <span
              key={k}
              className={cn(
                'text-center font-mono text-[11px] leading-none whitespace-nowrap tabular-nums',
                k === tipC && tipAt >= 0 ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {tipAt >= 0 && k === tipC ? c : k % every === 0 && !(tipAt >= 0 && Math.abs(k - tipC) < fit) ? c : ''}
            </span>
          ))}
      </div>
      {loading && <span className="sr-only">{labels.loading}</span>}
      {!loading && !empty && (
        <>
          <ChartTooltip
            open={tipAt >= 0}
            x={tipAt >= 0 ? gut + (tipC + 0.5) * cellW : 0}
            // Near the top the tooltip opens below the cell, so it does not cover the title and figure above the grid.
            y={tipAt >= 0 ? (tipR * cellH < 70 ? (tipR + 0.86) * cellH : tipR * cellH + cellH * 0.14) : 0}
            below={tipAt >= 0 && tipR * cellH < 70}
            bounds={width}
            title={tipAt >= 0 ? (tipAt === now ? `${name(tipAt)} · ${labels.current}` : name(tipAt)) : ''}
            value={
              tipAt >= 0 ? (
                <>
                  {formatValue(tipV, format)}
                  {tipUnit && <span className="font-medium text-[color-mix(in_oklab,var(--card)_60%,var(--foreground))]"> {tipUnit}</span>}
                </>
              ) : (
                ''
              )
            }
            rows={labels.note ? [{ label: labels.note, value: '' }] : []}
          />
          <SrTable
            caption={label}
            head={[labels.row, ...columns.map((_, c) => colName(c))]}
            rows={rows.map((_, r) => [
              rowName(r),
              ...columns.map((_, c) => {
                const v = spoken(value(r, c))
                return r * nCols + c === now ? `${v} (${labels.current})` : v
              }),
            ])}
          />
          {region}
        </>
      )}
    </div>
  )
}

/** The key for a dot matrix, for the tile's title row: a small dot growing to a full one between two words. */
export function DotMatrixKey({ fewer = 'Fewer', more = 'More', className }: { fewer?: string; more?: string; className?: string }) {
  const keys: [number, number][] = [
    [0.3, 0.4],
    [0.5, 0.6],
    [0.7, 0.8],
    [0.85, 0.92],
    [1, 1],
  ]
  return (
    <span aria-hidden className={cn('inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground', className)}>
      {fewer}
      {keys.map(([s, o]) => (
        <i key={s} className="size-3 rounded-full" style={{ background: INK, opacity: o, transform: `scale(${s})` }} />
      ))}
      {more}
    </span>
  )
}

export default DotMatrix
