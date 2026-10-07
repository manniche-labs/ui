// A column chart for one value per period: chunky bars with round caps that rise from a solid baseline, dashed
// gridlines with their values at the right, and the current point (today) marked by a small dot in --primary.
// `compare` draws the period before as a pale bar beside each one. When the bars would get thinner than
// `minBarWidth`, the points are grouped into buckets (seven days become a week), counted back from the latest
// point, and the tooltip, the screen reader table and the announcements speak the buckets.
// The plot is one Tab stop. Arrow keys, Home and End step through the bars, Escape lets go; pointer hover and a finger
// scrubbing sideways show the same tooltip, and the page still scrolls up and down under a finger. Screen readers get
// the chart's name, a hint, one short sentence per step, and the whole series in a hidden table.
// Bars only move by transform and fade by opacity. On first view they rise in a short stagger (all done in 600 ms);
// a new period or turning compare on replays it, and new values on the same bars glide. Under reduced motion every
// bar stands at its height at once.
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'
import { ChartTooltip, SrTable, type TooltipRow } from '@/registry/manniche/chart-kit/chart-kit'
import {
  BASE,
  EASE_CSS,
  GRID,
  INK,
  INK_GHOST,
  formatTick,
  formatValue,
  niceScale,
  stepIndex,
  valueParts,
  type ValueFormat,
} from '@/registry/manniche/chart-kit/chart-utils'
import { useAnnounce, useChartFrame } from '@/registry/manniche/chart-kit/use-chart'
import { TileLegend } from '@/registry/manniche/data-tile/data-tile'

export type BarPoint = {
  /** The short name under the bar: "Thu", "14", "Oct". */
  label: string
  /** The full name for the tooltip, the table and screen readers: "Thu 8 Oct". Defaults to `label`. */
  title?: string
  /** The bar's value, 0 or more. */
  value: number
  /** The same slot in the period before, drawn beside the bar when `compare` is on. */
  previous?: number
}

export type BarChartLabels = {
  /** Added to the current point's name in the tooltip and when read: "Thu 8 Oct · today". Default "today". */
  current?: string
  /** The current point in the legend. Default "Today". */
  currentKey?: string
  /** The main series in the legend and the table. Default "This period". */
  value?: string
  /** The comparison series. Default "Period before". */
  previous?: string
  /** The change row in the tooltip. Default "Change". */
  change?: string
  /** The first column of the screen reader table. Default "Period". */
  point?: string
  /** Read after the chart's name. Default "Use the arrow keys to read each bar." */
  hint?: string
  /** Read while loading. Default "Loading". */
  loading?: string
  /** Shown when there is nothing to draw and no `placeholder` is given. Default "No data yet". */
  empty?: string
  /** Names a group of points from its first and last title. Default "Wed 9 Sep – Tue 15 Sep". */
  range?: (first: string, last: string) => string
}

const LABELS: Required<BarChartLabels> = {
  current: 'today',
  currentKey: 'Today',
  value: 'This period',
  previous: 'Period before',
  change: 'Change',
  point: 'Period',
  hint: 'Use the arrow keys to read each bar.',
  loading: 'Loading',
  empty: 'No data yet',
  range: (first, last) => `${first} – ${last}`,
}

export type BarChartProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** One object per period, oldest first: `{ label, title?, value, previous? }`. */
  data: BarPoint[]
  /** The chart's accessible name, such as "Spending, last 7 days". */
  label: string
  /** How values are written in the tooltip, the table and on the axis. */
  format?: ValueFormat
  /** Draw each point's `previous` value as a pale bar beside it, with a legend. Default false. */
  compare?: boolean
  /** The index of the current point (today), marked with the signal dot. Default the last point; null for none. */
  current?: number | null
  /** The plot's height in px. Default 208, 170 when narrow, and lower in a compact tile. */
  height?: number
  /** The thinnest a bar may be drawn, in px. Thinner bars are grouped instead. Default 10. */
  minBarWidth?: number
  /** How many points make one group when bars get too thin, such as 7 for days into weeks. False never groups. Default 7. */
  bucket?: number | false
  /** Names a group for the tooltip, the table and screen readers: "Week of 14 Sep". Gets the points and the first one's index. */
  bucketTitle?: (points: BarPoint[], start: number) => string
  /** The short name under a group's bar. Default the first point's label. */
  bucketLabel?: (points: BarPoint[], start: number) => string
  /** Label every nth bar, counted back from the last. Default as many as fit, at most about ten. */
  tickEvery?: number
  /** Show breathing skeleton bars instead of data. */
  loading?: boolean
  /** Shown over the empty frame when there is no data or every value is 0, such as a message and a next step. */
  placeholder?: ReactNode
  /** Show the key under the chart: the series drawn and the current-point dot. Default on when there is a
   * comparison or a current point to explain; a series that is not drawn is never listed. */
  legend?: boolean
  /** The highlighted point (an index into `data`), or null. When grouped, the first index of the group. */
  activeIndex?: number | null
  /** The highlighted point to start with, when `activeIndex` is not controlled. Default null. */
  defaultActiveIndex?: number | null
  /** Called when hover, a finger or the keyboard picks another point, and with null when it lets go. */
  onActiveIndexChange?: (index: number | null) => void
  /** Every visible and spoken string that is not data. */
  labels?: BarChartLabels
}

/** The space at the right for the value labels, as in the mockup. */
const GUT = 46
const SKELETON = [46, 78, 58, 30, 50, 24, 66]

type Slot = { label: string; title: string; value: number; previous?: number; start: number; end: number }

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

/** Bar width and gap for n slots across the plot. */
function measure(n: number, plot: number, compare: boolean) {
  const slot = plot / Math.max(1, n)
  const gap = Math.max(3, Math.min(10, Math.round(slot * 0.12)))
  const inner = slot - gap
  const bar = compare ? Math.min(26, inner * 0.44) : Math.min(48, inner * 0.64)
  return { slot, bar }
}

/**
 * A column chart with round-capped bars, a signal dot on the current point and an optional comparison period.
 * Groups the points into buckets when the bars would be too thin to read.
 */
export function BarChart({
  data,
  label,
  format,
  compare = false,
  current,
  height,
  minBarWidth = 10,
  bucket = 7,
  bucketTitle,
  bucketLabel,
  tickEvery,
  loading = false,
  placeholder,
  legend,
  activeIndex,
  defaultActiveIndex = null,
  onActiveIndexChange,
  labels: labelsProp,
  className,
  style,
  ...rest
}: BarChartProps) {
  const labels = { ...LABELS, ...labelsProp }
  const { ref: frameRef, ...frame } = useChartFrame<HTMLDivElement>({ height: height ?? 208 })
  const { say, region } = useAnnounce()
  const hintId = useId()
  const [active, setActive] = useControllable(activeIndex, defaultActiveIndex, onActiveIndexChange)
  const nowIndex = current === undefined ? data.length - 1 : current
  const width = frame.width
  const plotW = Math.max(0, width - GUT)
  // The frame holds the plot and the 20 px row of labels under it.
  const plotH = Math.max(0, frame.height - 20)

  // Group the points when the bars would be thinner than promised. Groups are counted back from the last point,
  // so the newest group is always whole and the oldest may be short.
  const size = useMemo(() => {
    if (!plotW || !bucket || bucket < 2) return 1
    let s = 1
    for (let k = 1; k < 64; k++) {
      if (measure(Math.ceil(data.length / s), plotW, compare).bar >= minBarWidth || Math.ceil(data.length / s) <= 1) break
      s = bucket * k
    }
    return s
  }, [plotW, bucket, data.length, compare, minBarWidth])

  const range = labelsProp?.range ?? LABELS.range
  const slots: Slot[] = useMemo(() => {
    const n = data.length
    if (size === 1)
      return data.map((d, i) => ({ label: d.label, title: d.title ?? d.label, value: d.value, previous: d.previous, start: i, end: i }))
    const out: Slot[] = []
    for (let end = n - 1; end >= 0; end -= size) {
      const start = Math.max(0, end - size + 1)
      const pts = data.slice(start, end + 1)
      const hasPrev = pts.some((p) => p.previous !== undefined)
      const first = pts[0].title ?? pts[0].label
      const last = pts[pts.length - 1].title ?? pts[pts.length - 1].label
      out.unshift({
        label: bucketLabel ? bucketLabel(pts, start) : pts[0].label,
        title: bucketTitle ? bucketTitle(pts, start) : pts.length === 1 ? first : range(first, last),
        value: pts.reduce((s, p) => s + p.value, 0),
        previous: hasPrev ? pts.reduce((s, p) => s + (p.previous ?? 0), 0) : undefined,
        start,
        end,
      })
    }
    return out
  }, [data, size, bucketTitle, bucketLabel, range])

  const n = slots.length
  const slotOf = (index: number | null) => (index === null || index < 0 ? -1 : slots.findIndex((s) => index >= s.start && index <= s.end))
  const nowSlot = nowIndex === null ? -1 : slotOf(nowIndex)
  const at = slotOf(active)
  const empty = !loading && (n === 0 || slots.every((s) => !s.value && !(compare && s.previous)))

  const max = Math.max(0, ...slots.map((s) => Math.max(s.value, compare ? (s.previous ?? 0) : 0)))
  const scale = niceScale(max || 1, 2)
  const top = scale.max
  const ticks = empty ? [0, 0.5, 1] : scale.ticks.map((t) => t / top)
  const { slot, bar } = measure(n, plotW, compare)
  // In a static file the plot's width is a guess, so positions are written as shares of it and follow the real box.
  const along = (px: number) => (frame.fit && plotW ? `${((px / plotW) * 100).toFixed(3)}%` : px)

  // First view and every new shape (period, grouping, compare) rise from the baseline; new values on the same bars glide.
  const shape = `${n}|${compare}|${size}`
  const [played, setPlayed] = useState<string | null>(null)
  const ready = frame.drawn && width > 0
  const risen = frame.reduced ? ready : played === shape
  useEffect(() => {
    if (!ready || played === shape || frame.reduced) return
    let b = 0
    const a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => setPlayed(shape))
    })
    return () => {
      cancelAnimationFrame(a)
      cancelAnimationFrame(b)
    }
  }, [ready, played, shape, frame.reduced])

  // A point that no longer exists lets go.
  useEffect(() => {
    if (active !== null && (active < 0 || active >= data.length)) setActive(null)
  }, [active, data.length, setActive])

  const describe = (i: number) => {
    const s = slots[i]
    const head = i === nowSlot ? `${s.title}, ${labels.current}` : s.title
    const prev = compare && s.previous !== undefined ? `. ${labels.previous}: ${formatValue(s.previous, format)}` : ''
    return `${head}: ${formatValue(s.value, format)}${prev}`
  }
  const pick = (i: number, announce: boolean) => {
    setActive(slots[i].start)
    if (announce) say(describe(i))
  }

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!n || empty || loading) return
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left) / Math.max(1, slot))))
    if (i !== at) pick(i, false)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!n || empty) return
    if (e.key === 'Escape') {
      if (at < 0) return
      e.preventDefault()
      setActive(null)
      return
    }
    const to = stepIndex(e.key, at < 0 ? (nowSlot >= 0 ? nowSlot : n - 1) : at, n)
    if (to === null) return
    e.preventDefault()
    pick(to, true)
  }

  // Ticks: as many labels as fit, counted back from the last bar so the current one is always named.
  const longest = Math.max(1, ...slots.map((s) => s.label.length))
  const fit = Math.ceil((longest * 6.8 + 10) / Math.max(1, slot))
  const every = Math.max(1, fit, size === 1 && tickEvery ? tickEvery : size === 1 ? Math.ceil(n / 10) : 1)

  const tip = at >= 0 && !empty && !loading && width > 0 ? slots[at] : null
  const tipRows: TooltipRow[] = []
  if (tip && compare && tip.previous !== undefined) {
    tipRows.push({ label: labels.previous, value: formatValue(tip.previous, format), color: INK_GHOST })
    if (tip.previous)
      tipRows.push({
        label: labels.change,
        value: formatValue(((tip.value - tip.previous) / tip.previous) * 100, { locale: format?.locale, decimals: 1, sign: true, suffix: '%' }),
      })
  }
  const tipY = tip
    ? Math.min(
        plotH * (1 - tip.value / top) - (at === nowSlot ? 18 : 0),
        compare && tip.previous !== undefined ? plotH * (1 - tip.previous / top) : Infinity,
      )
    : 0

  const showLegend = (legend ?? (compare || nowSlot >= 0)) && !loading && !empty
  const stagger = Math.min(26, 300 / Math.max(1, n))
  const glide = (k: number, extra = 0) =>
    risen && !frame.reduced
      ? {
          transitionProperty: 'transform, opacity',
          transitionDuration: '300ms, 160ms',
          transitionTimingFunction: EASE_CSS,
          transitionDelay: `${Math.round(k * stagger + extra)}ms, 0ms`,
        }
      : { transition: 'none' }

  const heightClass =
    'h-[170px] @min-[448px]:h-[208px] group-data-[density=compact]/tile:h-[132px] @min-[448px]:group-data-[density=compact]/tile:h-[150px]'

  return (
    <div className={cn('@container relative min-w-0', className)} style={style} aria-busy={loading || undefined} {...rest}>
      {loading ? (
        <div aria-hidden>
          <div
            className={cn('flex items-end gap-2 border-b motion-safe:animate-pulse', heightClass)}
            style={{ marginRight: GUT, borderColor: GRID, height }}
          >
            {(data.length ? data.slice(-12) : SKELETON).map((_, i) => (
              <span key={i} className="flex h-full flex-1 items-end justify-center">
                <i className="block w-[64%] max-w-12 rounded-[999px_999px_3px_3px] bg-muted" style={{ height: `${SKELETON[i % 7]}%` }} />
              </span>
            ))}
          </div>
          <div className="mt-[9px] flex gap-2" style={{ marginRight: GUT }}>
            {(data.length ? data.slice(-12) : SKELETON).map((_, i) => (
              <span key={i} className="flex flex-1 justify-center">
                <i className="block h-[9px] w-6 rounded-[10px] bg-muted motion-safe:animate-pulse" />
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div
          ref={frameRef}
          tabIndex={empty ? undefined : 0}
          role={empty ? undefined : 'img'}
          aria-label={empty ? undefined : label}
          aria-describedby={empty ? undefined : hintId}
          onPointerDown={fromPointer}
          onPointerMove={fromPointer}
          onPointerLeave={(e) => {
            if (e.pointerType !== 'mouse') return
            if (!e.currentTarget.matches(':focus-visible')) setActive(null)
          }}
          onFocus={(e) => {
            // A press focuses the plot too; only keyboard focus picks the current point.
            if (!e.currentTarget.matches(':focus-visible')) return
            if (at >= 0) {
              say(describe(at))
              return
            }
            const i = nowSlot >= 0 ? nowSlot : n - 1
            if (i >= 0) pick(i, true)
          }}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
          className={cn('relative rounded-xl outline-offset-4 select-none [touch-action:pan-y]', !empty && 'cursor-crosshair')}
        >
          <div className={cn('relative', heightClass)} style={{ marginRight: GUT, height }}>
            {/* Gridlines with their values at the right; the baseline is solid. */}
            {ticks.map((t, i) => (
              <div
                key={`${i}-${t}`}
                aria-hidden
                className="absolute left-0 h-0 border-t"
                style={{
                  bottom: `${t * 100}%`,
                  right: 0,
                  borderTopStyle: t === 0 ? 'solid' : 'dashed',
                  borderTopColor: t === 0 ? BASE : GRID,
                }}
              >
                {!empty && (
                  <span
                    className="absolute top-[-6px] font-mono text-[11px] leading-none whitespace-nowrap text-muted-foreground tabular-nums"
                    style={{ left: `calc(100% + 8px)` }}
                  >
                    {formatTick(t * top, format)}
                  </span>
                )}
              </div>
            ))}
            {!empty &&
              width > 0 &&
              slots.map((s, i) => {
                const isNow = i === nowSlot
                const dim = at >= 0 && at !== i
                const v = risen ? Math.max(0, s.value) / top : 0
                const p = risen ? Math.max(0, s.previous ?? 0) / top : 0
                const two = compare && s.previous !== undefined
                const groupW = two ? bar * 2 + 3 : bar
                return (
                  <div
                    key={i}
                    aria-hidden
                    className="absolute top-0 bottom-0 flex justify-center gap-[3px]"
                    style={{ left: along(i * slot + slot / 2 - groupW / 2), width: along(groupW) }}
                  >
                    {two && (
                      <span className="relative block h-full overflow-hidden rounded-b-[3px]" style={{ width: frame.fit ? `${(bar / groupW) * 100}%` : bar }}>
                        <i
                          className="absolute inset-0 rounded-[999px_999px_3px_3px]"
                          style={{ background: INK_GHOST, transform: `translateY(${(1 - p) * 100}%)`, opacity: dim ? 0.42 : 1, ...glide(i) }}
                        />
                      </span>
                    )}
                    <span className="relative block h-full" style={{ width: frame.fit ? `${(bar / groupW) * 100}%` : bar }}>
                      <span className="absolute inset-0 overflow-hidden rounded-b-[3px]">
                        <i
                          className="absolute inset-0 rounded-[999px_999px_3px_3px]"
                          style={{ background: INK, transform: `translateY(${(1 - v) * 100}%)`, opacity: dim ? 0.42 : 1, ...glide(i) }}
                        />
                      </span>
                      {isNow && (
                        <span
                          className="absolute inset-0"
                          style={{ transform: `translateY(${(1 - v) * 100}%)`, ...glide(i) }}
                        >
                          <span
                            className="absolute top-[-18px] left-1/2 -ml-[5px] block size-2.5 rounded-full bg-primary shadow-[0_0_0_3px_var(--card)]"
                            style={
                              frame.reduced
                                ? undefined
                                : {
                                    opacity: risen ? 1 : 0,
                                    transform: risen ? 'none' : 'translateY(6px)',
                                    transitionProperty: risen ? 'opacity, transform' : 'none',
                                    transitionDuration: '300ms',
                                    transitionTimingFunction: EASE_CSS,
                                    transitionDelay: '300ms',
                                  }
                            }
                          />
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            {empty && (
              <div className="absolute inset-0 grid place-content-center justify-items-center gap-1.5 px-4 text-center" style={{ marginRight: -GUT }}>
                {placeholder ?? <span className="text-[13.5px] text-muted-foreground">{labels.empty}</span>}
              </div>
            )}
          </div>
          {/* The bars hide below the baseline by sliding down inside a clip, and contrast checkers that skip the clip
              read them as the labels' background. The card colour under the labels, the surface the chart already
              assumes for the now dot's ring, shows them the real one and changes nothing on screen. */}
          <div aria-hidden className="relative mt-[9px] h-[11px] bg-card" style={{ marginRight: GUT }}>
            {width > 0 &&
              slots.map((s, i) =>
                (n - 1 - i) % every === 0 ? (
                  <span
                    key={i}
                    className={cn(
                      'absolute top-0 -translate-x-1/2 font-mono text-[11px] leading-none whitespace-nowrap tabular-nums',
                      i === nowSlot ? 'font-medium text-foreground' : 'text-muted-foreground',
                    )}
                    style={{ left: along(i * slot + slot / 2) }}
                  >
                    {s.label}
                  </span>
                ) : null,
              )}
          </div>
        </div>
      )}
      <span id={hintId} hidden>
        {labels.hint}
      </span>
      {loading && <span className="sr-only">{labels.loading}</span>}
      {!loading && !empty && (
        <>
          <ChartTooltip
            open={!!tip}
            x={tip ? at * slot + slot / 2 : 0}
            y={tipY}
            bounds={width}
            title={tip ? (at === nowSlot ? `${tip.title} · ${labels.current}` : tip.title) : ''}
            value={tip ? <TipValue value={tip.value} format={format} /> : ''}
            rows={tipRows}
          />
          {showLegend && (
            <TileLegend
              className="mt-3"
              items={[
                { label: labels.value, color: INK },
                ...(compare ? [{ label: labels.previous, color: INK_GHOST }] : []),
                ...(nowSlot >= 0 ? [{ label: labels.currentKey, color: 'var(--primary)', shape: 'dot' as const }] : []),
              ]}
            />
          )}
          <SrTable
            caption={label}
            head={compare ? [labels.point, labels.value, labels.previous] : [labels.point, labels.value]}
            rows={slots.map((s) => {
              const name = slots.indexOf(s) === nowSlot ? `${s.title} (${labels.current})` : s.title
              return compare ? [name, formatValue(s.value, format), s.previous === undefined ? '' : formatValue(s.previous, format)] : [name, formatValue(s.value, format)]
            })}
          />
          {region}
        </>
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
