// Lollipop: a ranked list where each row is a name, a thin stem and a round head at its value, with the figure at
// the right. Sort it by value or by name and every row slides to its new place; the rank (01, 02 …) always counts by
// value, so it stays with its row. Point at a row, tap it or land on it with the keyboard and its head turns to the
// signal colour and a tooltip opens over the head with the rank and any extra lines the row carries.
//
// How it works: the rows are a real list of buttons in the order they are shown, so the reading order, the arrow
// keys and the eye agree. One Tab stop; arrow up and down, Home and End move between rows, Escape lets go. A new
// order is animated FLIP-style: each row is measured before and after and slides the difference by transform. Below
// 400 px of width the name and figure share a line and the stem runs full width under them.
//
// Screen readers: the list is named by `label` and is the data itself. Each row reads "1. Harbour Market: €289.20,
// Visits 6" as focus lands on it, so nothing else is announced and nothing is read twice. The axis and the tooltip
// are hidden from them.
//
// Motion: on first view the stems grow from the left by transform and the heads slide out with them, one row after
// another (all done in 600 ms). New values glide in 300 ms, and a new order slides the rows. Under reduced motion
// every stem stands at its length at once and rows jump to their places.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'
import { ChartTooltip } from '@/registry/manniche/chart-kit/chart-kit'
import { BASE, EASE_CSS, INK, formatTick, formatValue, niceScale, stepIndex, valueParts, type ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { useChartFrame } from '@/registry/manniche/chart-kit/use-chart'

export type LollipopDatum = {
  /** The row's name, shown and read aloud. Also its key, so keep it unique. */
  label: string
  /** The amount, 0 or more. Negative values count as zero. */
  value: number
  /** Extra lines for the tooltip and the spoken row, such as `{ label: 'Visits', value: '6' }`. */
  details?: { label: string; value: string }[]
}

export type LollipopLabels = {
  /** After the name in the tooltip: "rank 2 of 6". */
  rank?: (rank: number, count: number) => string
  /** Read while loading. Default "Loading". */
  loading?: string
  /** Shown when there is nothing to draw and no `placeholder` is given. Default "No data yet". */
  empty?: string
}

const LABELS: Required<LollipopLabels> = {
  rank: (rank, count) => `rank ${rank} of ${count}`,
  loading: 'Loading',
  empty: 'No data yet',
}

export type LollipopProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onSelect'> & {
  /** One entry per row, in any order: `{ label, value, details? }`. */
  data: LollipopDatum[]
  /** What the list shows, such as "Top merchants by spend, last 30 days". Names the list. */
  label: string
  /** How values are written in the rows, the tooltip and on the axis. */
  format?: ValueFormat
  /** "value" puts the largest first, "label" sorts by name, "none" keeps the order of `data`. Default "value". */
  sort?: 'value' | 'label' | 'none'
  /** Show only the largest n rows. Default all. */
  limit?: number
  /** Show the value ticks under the list. Default true. */
  axis?: boolean
  /** The highlighted row (an index into `data`), or null for none. Pass it to control the highlight. */
  activeIndex?: number | null
  /** The highlighted row on first render when uncontrolled. Default null. */
  defaultActiveIndex?: number | null
  /** Called when the highlight moves by pointer, focus or keys, with null when it clears. */
  onActiveIndexChange?: (index: number | null) => void
  /** Called when a row is clicked or pressed with Enter or Space, with its index into `data`. */
  onSelect?: (index: number) => void
  /** Show breathing skeleton rows instead of data. */
  loading?: boolean
  /** Shown in place of the rows when there is no data or every value is 0, such as a message and a next step. */
  placeholder?: ReactNode
  /** Words for other languages. */
  labels?: LollipopLabels
  /** "compact" tightens the rows and columns. Inside a compact DataTile this happens on its own. */
  density?: 'comfortable' | 'compact'
}

/** Where an element sits inside `root`, by layout (transforms ignored), so a sliding row reports where it lands. */
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0
  let y = 0
  let n: HTMLElement | null = el
  while (n && n !== root) {
    x += n.offsetLeft
    y += n.offsetTop
    n = n.offsetParent as HTMLElement | null
  }
  return n === root ? { x, y } : null
}

const SKELETON = [86, 62, 48, 40, 34, 26]

export function Lollipop({
  data,
  label,
  format,
  sort = 'value',
  limit,
  axis = true,
  activeIndex,
  defaultActiveIndex = null,
  onActiveIndexChange,
  onSelect,
  loading = false,
  placeholder,
  labels: labelsProp,
  density,
  className,
  style,
  ...rest
}: LollipopProps) {
  const labels = { ...LABELS, ...labelsProp }
  const { ref, width, drawn, reduced } = useChartFrame<HTMLDivElement>()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [own, setOwn] = useState<number | null>(defaultActiveIndex)
  const [cursor, setCursor] = useState(0)
  const [settled, setSettled] = useState(false)
  const [tipAt, setTipAt] = useState<{ x: number; y: number } | null>(null)
  const items = useRef(new Map<string, HTMLLIElement>())
  const tracks = useRef(new Map<string, HTMLSpanElement>())
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const values = data.map((d) => Math.max(0, d.value))
  // Rank by value (ties keep their order in `data`), then keep the top `limit`.
  const byValue = data.map((_, i) => i).sort((a, b) => values[b] - values[a] || a - b)
  const shown = limit !== undefined ? byValue.slice(0, Math.max(0, limit)) : byValue
  const rankOf = new Map(shown.map((i, k) => [i, k + 1]))
  const order =
    sort === 'value' ? shown : sort === 'label' ? [...shown].sort((a, b) => data[a].label.localeCompare(data[b].label)) : [...shown].sort((a, b) => a - b)
  const n = order.length
  const max = shown.length ? values[shown[0]] : 0
  const empty = !loading && (n === 0 || max <= 0)
  const scale = niceScale(max > 0 ? max : 1, 3)
  const top = scale.max
  const orderKey = order.map((i) => data[i].label).join('\u0000')

  const raw = activeIndex !== undefined ? activeIndex : own
  const active = raw !== null && rankOf.has(raw) && !empty ? raw : null
  const set = (i: number | null) => {
    if (i === active) return
    if (activeIndex === undefined) setOwn(i)
    onActiveIndexChange?.(i)
  }
  const latest = useRef(set)
  useEffect(() => {
    latest.current = set
  })

  // After the entrance, value changes drop the stagger delay.
  useEffect(() => {
    if (!drawn || settled) return
    const t = window.setTimeout(() => setSettled(true), reduced ? 0 : 620)
    return () => window.clearTimeout(t)
  }, [drawn, settled, reduced])

  // A tap that left a row lit on a touch screen clears when the next tap lands outside the list.
  const sticky = active !== null
  useEffect(() => {
    if (!sticky) return
    const off = (e: globalThis.PointerEvent) => {
      const root = rootRef.current
      if (root && !root.contains(e.target as Node)) latest.current(null)
    }
    document.addEventListener('pointerdown', off)
    return () => document.removeEventListener('pointerdown', off)
  }, [sticky])

  // FLIP: when the order changes, each row starts where it was drawn (mid-slide included) and slides to its place.
  const tops = useRef(new Map<string, number>())
  const lastOrder = useRef(orderKey)
  useLayoutEffect(() => {
    const moved = lastOrder.current !== orderKey
    lastOrder.current = orderKey
    const next = new Map<string, number>()
    items.current.forEach((el, key) => {
      const now = el.offsetTop
      next.set(key, now)
      const was = tops.current.get(key)
      if (!moved || reduced || was === undefined) return
      const t = getComputedStyle(el).transform
      const inFlight = t && t !== 'none' ? new DOMMatrixReadOnly(t).m42 : 0
      const dy = was + inFlight - now
      if (Math.abs(dy) < 0.5) return
      el.style.transition = 'none'
      el.style.transform = `translateY(${dy}px)`
      void el.offsetWidth
      el.style.transition = `transform 300ms ${EASE_CSS}`
      el.style.transform = ''
    })
    tops.current = next
  }, [orderKey, width, reduced])

  // The tooltip points at the active head, measured by layout so it goes straight to where a sliding row lands.
  const activeKey = active === null ? null : data[active].label
  const activeShare = active === null ? 0 : values[active] / top
  useLayoutEffect(() => {
    const root = rootRef.current
    const track = activeKey === null ? undefined : tracks.current.get(activeKey)
    const at = root && track ? offsetIn(track, root) : null
    // The head is 26 px tall on a 20 px track, so its top sits 3 px above the track.
    setTipAt(at ? { x: at.x + activeShare * track!.offsetWidth, y: at.y - 3 } : null)
  }, [activeKey, activeShare, orderKey, width])

  const focusedRow = () => {
    const k = buttons.current.findIndex((b) => b && b === document.activeElement)
    return k < 0 ? null : order[k]
  }

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, k: number) => {
    if (e.key === 'Escape') {
      if (active === null) return
      e.preventDefault()
      set(null)
      return
    }
    const to = stepIndex(e.key, k, n, { vertical: true })
    if (to === null) return
    e.preventDefault()
    buttons.current[to]?.focus()
  }

  const compact = density === 'compact'
  const stagger = n > 1 ? Math.min(50, 300 / (n - 1)) : 0
  const tabStop = Math.max(0, Math.min(active !== null ? order.indexOf(active) : cursor, n - 1))
  const longest = Math.max(4, ...order.map((i) => formatValue(values[i], format).length))
  const cols = { ['--lp-v' as string]: `max(${compact ? 4.5 : 5.2}rem, ${longest + 0.5}ch)` } as CSSProperties

  // One grid for the rows and the axis, so the stems and the ticks line up. Under 400 px: name and figure on one
  // line, the stem under them.
  const grid = cn(
    'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-1.5',
    '@min-[400px]:grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_var(--lp-v)] @min-[400px]:gap-x-3.5',
    'group-data-[density=compact]/tile:@min-[400px]:grid-cols-[minmax(0,8rem)_minmax(0,1fr)_var(--lp-v)] group-data-[density=compact]/tile:@min-[400px]:gap-x-3',
    compact && '@min-[400px]:grid-cols-[minmax(0,8rem)_minmax(0,1fr)_var(--lp-v)] @min-[400px]:gap-x-3',
  )
  const trackPlace = 'col-span-2 row-start-2 mx-2.5 @min-[400px]:col-span-1 @min-[400px]:col-start-2 @min-[400px]:row-start-1 @min-[400px]:mx-0'
  const rowHeight = cn(
    'min-h-[58px] gap-y-1 py-2 @min-[400px]:min-h-[46px] @min-[400px]:py-0',
    'group-data-[density=compact]/tile:min-h-[54px] group-data-[density=compact]/tile:py-1.5 group-data-[density=compact]/tile:@min-[400px]:min-h-11 group-data-[density=compact]/tile:@min-[400px]:py-0',
    compact && 'min-h-[54px] py-1.5 @min-[400px]:min-h-11 @min-[400px]:py-0',
  )
  const nameText = cn('text-sm group-data-[density=compact]/tile:text-[13.5px]', compact && 'text-[13.5px]')

  return (
    <div
      ref={(el) => {
        ref(el)
        rootRef.current = el
      }}
      className={cn('@container relative w-full min-w-0', className)}
      style={{ ...cols, ...style }}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <div aria-hidden className="grid motion-safe:animate-pulse">
          {(data.length ? data.slice(0, limit ?? data.length) : SKELETON).map((_, k) => (
            <div key={k} className={cn(grid, rowHeight)}>
              <i className="block h-3 w-[70%] rounded-full bg-muted" />
              <i className="col-start-2 row-start-1 block h-3 w-12 justify-self-end rounded-full bg-muted @min-[400px]:col-start-3" />
              <span className={cn(trackPlace, 'relative h-5')}>
                <i className="absolute top-[9px] left-0 block h-0.5 rounded-full bg-muted" style={{ width: `${SKELETON[k % SKELETON.length]}%` }} />
                <i
                  className="absolute top-0 block size-5 -translate-x-1/2 rounded-full bg-muted"
                  style={{ left: `${SKELETON[k % SKELETON.length]}%` }}
                />
              </span>
            </div>
          ))}
        </div>
      ) : empty ? (
        <div className="grid min-h-[188px] place-content-center justify-items-center gap-1.5 px-4 text-center group-data-[density=compact]/tile:min-h-[140px]">
          {placeholder ?? <span className="text-[13.5px] text-muted-foreground">{labels.empty}</span>}
        </div>
      ) : (
        <ul
          aria-label={label}
          className="grid"
          onPointerLeave={(e) => {
            if (e.pointerType !== 'touch') set(focusedRow())
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) set(null)
          }}
        >
          {order.map((i, k) => {
            const d = data[i]
            const on = i === active
            const rank = rankOf.get(i) ?? k + 1
            const v = values[i] / top
            const p = valueParts(values[i], format)
            const unit = p.unit && <span className="font-normal text-muted-foreground">{p.unit}</span>
            const extra = d.details?.length ? `, ${d.details.map((x) => `${x.label} ${x.value}`).join(', ')}` : ''
            const motion = reduced
              ? 'none'
              : settled
                ? `transform 300ms ${EASE_CSS}`
                : `transform 300ms ${EASE_CSS} ${Math.round(k * stagger)}ms`
            return (
              <li
                key={d.label}
                ref={(el) => {
                  if (el) items.current.set(d.label, el)
                  else items.current.delete(d.label)
                }}
                className="relative min-w-0"
              >
                <button
                  ref={(el) => {
                    buttons.current[k] = el
                  }}
                  type="button"
                  tabIndex={k === tabStop ? 0 : -1}
                  aria-label={`${rank}. ${d.label}: ${formatValue(values[i], format)}${extra}`}
                  onPointerEnter={() => set(i)}
                  onPointerDown={() => set(i)}
                  onFocus={() => {
                    setCursor(k)
                    set(i)
                  }}
                  onClick={(e) => {
                    // Safari does not focus a button on click; focusing it keeps the row lit like everywhere else.
                    e.currentTarget.focus()
                    set(i)
                    onSelect?.(i)
                  }}
                  onKeyDown={(e) => onKey(e, k)}
                  className={cn(
                    grid,
                    rowHeight,
                    'relative isolate w-full cursor-pointer touch-pan-y rounded-xl text-left focus-visible:outline-offset-0',
                    'before:absolute before:inset-0 before:-z-10 before:rounded-xl before:bg-muted before:opacity-0 before:transition-opacity before:duration-150 before:ease-out-quint before:content-[""] hover:before:opacity-100 motion-reduce:before:transition-none',
                    on && 'before:opacity-100',
                  )}
                >
                  <span aria-hidden className={cn('col-start-1 row-start-1 truncate', nameText)}>
                    <small className="mr-2 font-mono text-[11px] leading-none text-muted-foreground tabular-nums">
                      {String(rank).padStart(2, '0')}
                    </small>
                    {d.label}
                  </span>
                  <span
                    ref={(el) => {
                      if (el) tracks.current.set(d.label, el)
                      else tracks.current.delete(d.label)
                    }}
                    aria-hidden
                    className={cn(trackPlace, 'relative h-5')}
                  >
                    <span
                      className="absolute inset-x-0 top-[9px] h-0.5 origin-left rounded-full"
                      style={{ background: BASE, transform: `scaleX(${drawn ? v : 0})`, transition: motion }}
                    />
                    <span
                      className="pointer-events-none absolute inset-0"
                      style={{ transform: `translateX(${((drawn ? v : 0) - 1) * 100}%)`, transition: motion }}
                    >
                      <span
                        className="absolute top-[-3px] right-[-13px] size-[26px] rounded-full border-[3px] border-card"
                        style={{ background: INK }}
                      >
                        <span
                          className="absolute inset-0 rounded-full bg-primary transition-opacity duration-150 ease-out-quint motion-reduce:transition-none"
                          style={{ opacity: on ? 1 : 0 }}
                        />
                      </span>
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'col-start-2 row-start-1 text-right font-medium whitespace-nowrap tabular-nums @min-[400px]:col-start-3',
                      nameText,
                    )}
                  >
                    {p.sign}
                    {!p.unitAfter && unit}
                    {p.whole}
                    {p.fraction}
                    {p.unitAfter && <> {unit}</>}
                    {p.suffix}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {axis && !loading && !empty && (
        <div aria-hidden className={cn(grid, 'pt-1.5')}>
          <span className="hidden @min-[400px]:block" />
          <span className={cn('relative col-span-2 mx-2.5 h-[11px] @min-[400px]:col-span-1 @min-[400px]:mx-0')}>
            {scale.ticks.map((t) => (
              <span
                key={t}
                className="absolute top-0 -translate-x-1/2 font-mono text-[11px] leading-none whitespace-nowrap text-muted-foreground tabular-nums"
                style={{ left: `${(t / top) * 100}%` }}
              >
                {formatTick(t, format)}
              </span>
            ))}
          </span>
        </div>
      )}
      {loading && <span className="sr-only">{labels.loading}</span>}
      {!loading && !empty && (
        <ChartTooltip
          open={!!tipAt && active !== null}
          x={tipAt?.x ?? 0}
          y={tipAt?.y ?? 0}
          bounds={width}
          title={active === null ? '' : `${data[active].label} · ${labels.rank(rankOf.get(active) ?? 0, n)}`}
          value={active === null ? '' : <TipValue value={values[active]} format={format} />}
          rows={active === null ? [] : (data[active].details ?? [])}
        />
      )}
    </div>
  )
}

/** The tooltip figure with its unit set muted, as on the big number. */
function TipValue({ value, format }: { value: number; format?: ValueFormat }) {
  const p = valueParts(value, format)
  const unit = <span className="font-medium text-[color-mix(in_oklab,var(--card)_60%,var(--foreground))]">{p.unit}</span>
  return (
    <>
      {p.sign}
      {!p.unitAfter && unit}
      {p.whole}
      {p.fraction}
      {p.unitAfter && <> {unit}</>}
      {p.suffix}
    </>
  )
}

export default Lollipop
