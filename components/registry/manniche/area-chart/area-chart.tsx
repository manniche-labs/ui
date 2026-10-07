// A smooth line over a soft tint for a value that moves day by day, such as an account balance. The line is a monotone
// curve (it never overshoots a point), the tint fills down to zero, and an optional comparison series is drawn as a
// dashed line in BASE. The current point (today) is marked with a dot in --primary. Gridlines are dashed with their
// values at the right and the zero line is solid. A value below zero dips under the baseline into room the scale
// makes for it, instead of running into the labels.
// The plot is one Tab stop. A crosshair follows the pointer, a finger scrubbing sideways or the arrow keys (Home and
// End jump to the ends, Page Up and Page Down by one label step), and the tooltip reads both series and the
// difference; Escape lets go, and the page still scrolls up and down under a finger. Screen readers get the chart's
// name, a hint, one sentence per step and the whole series in a hidden table.
// Only transform and opacity move. On first view, and when the data changes, a clip wipes the lines in from the left
// (300 ms), the tint fades up behind them and the end dot settles last (all done in 600 ms). Under reduced motion the
// whole chart stands at once and the crosshair jumps instead of gliding.
import { useCallback, useContext, useEffect, useId, useMemo, useState, type ComponentProps, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChartTooltip, SrTable, StaticPlots, type TooltipRow } from '@/registry/manniche/chart-kit/chart-kit'
import {
  BASE,
  EASE_CSS,
  GRID,
  INK,
  formatTick,
  formatValue,
  niceScale,
  smoothPath,
  stepIndex,
  valueParts,
  type ValueFormat,
} from '@/registry/manniche/chart-kit/chart-utils'
import { STATIC_STEPS, StaticChartFrame, useAnnounce, useChartFrame, useSvgId } from '@/registry/manniche/chart-kit/use-chart'

export type AreaPoint = {
  /** The short name on the axis: "14 Sep", "Today". */
  label: string
  /** The full name for the tooltip, the table and screen readers: "Mon 14 Sep". Defaults to `label`. */
  title?: string
  /** The value at this point. May be negative. */
  value: number
  /** The same point in the period before, drawn as the dashed line. */
  previous?: number
}

export type AreaChartLabels = {
  /** Added to the current point's name in the tooltip and when read: "Thu 8 Oct · today". Default "today". */
  current?: string
  /** The main series in the table. Default "This period". */
  value?: string
  /** The comparison series in the tooltip, the table and when read. Default "Period before". */
  previous?: string
  /** The difference row in the tooltip. Default "Difference". */
  difference?: string
  /** The first column of the screen reader table. Default "Day". */
  point?: string
  /** Read after the chart's name. */
  hint?: string
  /** Read while loading. Default "Loading". */
  loading?: string
  /** Shown when there is no data and no `placeholder` is given. Default "No data yet". */
  empty?: string
}

const LABELS: Required<AreaChartLabels> = {
  current: 'today',
  value: 'This period',
  previous: 'Period before',
  difference: 'Difference',
  point: 'Day',
  hint: 'Use the arrow keys to read each point. Page Up and Page Down jump further.',
  loading: 'Loading',
  empty: 'No data yet',
}

export type AreaChartProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** One object per point, oldest first: `{ label, title?, value, previous? }`. */
  data: AreaPoint[]
  /** The chart's accessible name, such as "Everyday account balance, last 30 days". */
  label: string
  /** How values are written in the tooltip, the table and on the axis. */
  format?: ValueFormat
  /** Draw each point's `previous` value as a dashed comparison line. Default on when any point has one. */
  compare?: boolean
  /** The index of the current point (today), marked with the signal dot. Default the last point; null for none. */
  current?: number | null
  /** The chart's height in px, axis labels included. Default 300, 200 when narrower than 560 px, less when compact. */
  height?: number
  /** Label every nth point, counted back from the last. Also the Page Up / Page Down step. Default as many as fit, about six. */
  tickEvery?: number
  /** Show a breathing skeleton instead of data. */
  loading?: boolean
  /** Shown over the empty frame when there is no data, such as a message and a next step. */
  placeholder?: ReactNode
  /** The highlighted point (an index into `data`), or null. */
  activeIndex?: number | null
  /** The highlighted point to start with, when `activeIndex` is not controlled. Default null. */
  defaultActiveIndex?: number | null
  /** Called when hover, a finger or the keyboard picks another point, and with null when it lets go. */
  onActiveIndexChange?: (index: number | null) => void
  /** Every visible and spoken string that is not data. */
  labels?: AreaChartLabels
}

/** Room at the right for the value labels, above for the top dot and below for the date labels, as in the mockup. */
const GR = 52
const PT = 10
const PB = 24
const FILL = 'color-mix(in oklab, var(--foreground) 7%, transparent)'

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

/** A smooth line chart with a soft fill, a dashed comparison line, a crosshair and the current point marked. */
export function AreaChart({ className, style, ...props }: AreaChartProps) {
  const still = useContext(StaticChartFrame)
  if (!still || still.height !== undefined) return <AreaChartPlot className={className} style={style} {...props} />
  // A static file: the plot at a phone, column, tablet and desktop width, at the heights the CSS gives each.
  const plots = [300, 460, 640, 880].map((width, i) => ({ width, height: props.height ?? (i < 2 ? 200 : 300), className: STATIC_STEPS[i] }))
  return (
    <StaticPlots plots={plots} className={className} style={style}>
      {(c) => <AreaChartPlot {...props} className={c} />}
    </StaticPlots>
  )
}

function AreaChartPlot({
  data,
  label,
  format,
  compare: compareProp,
  current,
  height,
  tickEvery,
  loading = false,
  placeholder,
  activeIndex,
  defaultActiveIndex = null,
  onActiveIndexChange,
  labels: labelsProp,
  className,
  style,
  ...rest
}: AreaChartProps) {
  const labels = { ...LABELS, ...labelsProp }
  const { ref: frameRef, ...frame } = useChartFrame<HTMLDivElement>({ height: height ?? 300 })
  const { say, region } = useAnnounce()
  const hintId = useId()
  const clipId = useSvgId('area-reveal')
  const [active, setActive] = useControllable(activeIndex, defaultActiveIndex, onActiveIndexChange)

  const n = data.length
  const compare = compareProp ?? data.some((d) => d.previous !== undefined)
  const nowIndex = current === undefined ? n - 1 : current !== null && current >= 0 && current < n ? current : -1
  const at = active !== null && active >= 0 && active < n ? active : -1
  const empty = !loading && n === 0
  const W = frame.width
  const H = frame.height
  const pw = Math.max(0, W - GR)
  const ph = Math.max(0, H - PT - PB)

  // The scale. Ticks only ever cover zero and up, unless the data is mostly below zero; a small dip gets room under
  // the baseline instead of a whole empty tick.
  const { lo, hi, ticks } = useMemo(() => {
    const vals = data.flatMap((d) => (compare && d.previous !== undefined ? [d.value, d.previous] : [d.value]))
    const top = Math.max(0, ...vals)
    const bottom = Math.min(0, ...vals)
    const up = niceScale(top || 1, 3)
    if (bottom < 0 && (top === 0 || -bottom > up.max * 0.25)) {
      const s = niceScale(top, 3, bottom)
      return { lo: s.min, hi: s.max, ticks: s.ticks }
    }
    return { lo: bottom < 0 ? bottom - up.max * 0.04 : 0, hi: up.max, ticks: up.ticks }
  }, [data, compare])

  const X = (i: number) => (n > 1 ? (i / (n - 1)) * pw : pw / 2)
  const Y = (v: number) => PT + (1 - (v - lo) / (hi - lo || 1)) * ph

  const paths = useMemo(() => {
    if (!pw || !ph || !n) return null
    const xs = (i: number) => (n > 1 ? (i / (n - 1)) * pw : pw / 2)
    const ys = (v: number) => PT + (1 - (v - lo) / (hi - lo || 1)) * ph
    const a = data.map((d, i) => [xs(i), ys(d.value)] as [number, number])
    const line = smoothPath(a)
    const zero = ys(0)
    const fill = `${line}L${a[a.length - 1][0]} ${zero}L${a[0][0]} ${zero}Z`
    const withPrev = data.map((d, i) => (d.previous === undefined ? null : ([xs(i), ys(d.previous)] as [number, number])))
    const b = compare ? smoothPath(withPrev.filter((p): p is [number, number] => p !== null)) : ''
    return { line, fill, b }
  }, [data, pw, ph, lo, hi, n, compare])

  // The wipe replays whenever the drawing changes: first view, new data, compare on or off.
  const shape = useMemo(() => `${compare}|${data.map((d) => `${d.value},${d.previous ?? ''}`).join(';')}`, [data, compare])
  const [played, setPlayed] = useState<string | null>(null)
  const ready = frame.drawn && W > 0
  const shown = frame.reduced ? ready : played === shape
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
    if (active !== null && (active < 0 || active >= n)) setActive(null)
  }, [active, n, setActive])

  const title = (i: number) => data[i].title ?? data[i].label
  const describe = (i: number) => {
    const d = data[i]
    const head = i === nowIndex ? `${title(i)}, ${labels.current}` : title(i)
    const prev = compare && d.previous !== undefined ? ` ${labels.previous}: ${formatValue(d.previous, format)}.` : ''
    return `${head}: ${formatValue(d.value, format)}.${prev}`
  }
  const pick = (i: number, announce: boolean) => {
    setActive(i)
    if (announce) say(describe(i))
  }

  // Axis labels: as many as fit, counted back from the last point so today is always named.
  const longest = Math.max(1, ...data.map((d) => d.label.length))
  const need = longest * 6.8 + 16
  const dx = n > 1 ? pw / (n - 1) : pw
  const every = Math.max(1, Math.ceil(need / Math.max(1, dx)), tickEvery ?? Math.ceil((n - 1) / 6))
  const page = tickEvery ?? every

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!n || !pw) return
    const r = e.currentTarget.getBoundingClientRect()
    const i = n > 1 ? Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / pw) * (n - 1)))) : 0
    if (i !== at) pick(i, false)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!n) return
    if (e.key === 'Escape') {
      if (at < 0) return
      e.preventDefault()
      setActive(null)
      return
    }
    const from = at < 0 ? (nowIndex >= 0 ? nowIndex : n - 1) : at
    const to =
      e.key === 'PageUp' ? Math.max(0, from - page) : e.key === 'PageDown' ? Math.min(n - 1, from + page) : stepIndex(e.key, from, n)
    if (to === null) return
    e.preventDefault()
    pick(to, true)
  }

  const tip = at >= 0 && paths ? data[at] : null
  const tipRows: TooltipRow[] = []
  if (tip && compare && tip.previous !== undefined) {
    tipRows.push({ label: labels.previous, value: formatValue(tip.previous, format), color: BASE })
    tipRows.push({ label: labels.difference, value: formatValue(tip.value - tip.previous, { ...format, sign: true }) })
  }
  const tipY = tip ? Math.min(Y(tip.value), compare && tip.previous !== undefined ? Y(tip.previous) : Infinity) - 6 : 0

  const glide = frame.reduced ? 'none' : `transform 110ms ${EASE_CSS}`
  const heightClass =
    'h-[200px] @min-[560px]:h-[300px] group-data-[density=compact]/tile:h-[150px] @min-[560px]:group-data-[density=compact]/tile:h-[200px]'
  const zeroY = Math.round(Y(0)) + 0.5

  return (
    <div className={cn('@container relative min-w-0', className)} style={style} aria-busy={loading || undefined} {...rest}>
      {loading ? (
        <div aria-hidden className={cn('relative', heightClass)} style={{ height }}>
          <div className="absolute inset-x-0 border-t border-dashed" style={{ top: PT, right: GR, borderColor: GRID }} />
          <div
            className="absolute left-0 h-[46%] rounded-t-[18px] bg-muted motion-safe:animate-pulse"
            style={{ right: GR, bottom: PB }}
          />
          <div className="absolute left-0 border-t" style={{ right: GR, bottom: PB, borderColor: BASE }} />
          <div className="absolute bottom-0 left-0 flex h-[11px] justify-between" style={{ right: GR }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <i key={i} className="block h-[9px] w-10 rounded-[10px] bg-muted motion-safe:animate-pulse" />
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
            if (at >= 0) say(describe(at))
            else if (n) pick(nowIndex >= 0 ? nowIndex : n - 1, true)
          }}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
          className={cn('relative rounded-[10px] outline-offset-4 select-none [touch-action:pan-y]', !empty && 'cursor-crosshair', heightClass)}
          style={{ height }}
        >
          {W > 0 && H > 0 && (
            <svg aria-hidden width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={cn('absolute inset-0 block overflow-visible', frame.fit && 'h-full w-full')}>
              <defs>
                <clipPath id={clipId}>
                  <rect
                    x={-8}
                    y={-8}
                    width={pw + 16}
                    height={H + 16}
                    style={{
                      transformBox: 'fill-box',
                      transformOrigin: '0 0',
                      transform: `scaleX(${shown ? 1 : 0})`,
                      transition: shown && !frame.reduced ? `transform 300ms ${EASE_CSS}` : 'none',
                    }}
                  />
                </clipPath>
              </defs>
              {/* Gridlines with their values at the right; the zero line is solid. */}
              {(empty ? [0, 0.5, 1].map((t) => lo + t * (hi - lo)) : ticks).map((t) => {
                const y = Math.round(Y(t)) + 0.5
                return (
                  <g key={t}>
                    <line x1={0} x2={pw} y1={y} y2={y} stroke={t === 0 ? BASE : GRID} strokeDasharray={t === 0 ? undefined : '2 4'} />
                    {!empty && (
                      <text x={pw + 10} y={y + 3.5} className="fill-muted-foreground font-mono text-[11px] tabular-nums">
                        {formatTick(t, format)}
                      </text>
                    )}
                  </g>
                )
              })}
              {!ticks.includes(0) && !empty && <line x1={0} x2={pw} y1={zeroY} y2={zeroY} stroke={BASE} />}
              {paths && (
                <g clipPath={`url(#${clipId})`}>
                  <path
                    d={paths.fill}
                    fill={FILL}
                    style={{
                      opacity: shown ? 1 : 0,
                      transition: shown && !frame.reduced ? `opacity 300ms ${EASE_CSS} 60ms` : 'none',
                    }}
                  />
                  {paths.b && (
                    <path d={paths.b} fill="none" stroke={BASE} strokeWidth={1.75} strokeDasharray="5 5" strokeLinecap="round" />
                  )}
                  <path d={paths.line} fill="none" stroke={INK} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
                </g>
              )}
              {/* The current point's signal dot settles once the line has reached it. */}
              {paths && nowIndex >= 0 && (
                <circle
                  cx={X(nowIndex)}
                  cy={Y(data[nowIndex].value)}
                  r={5.5}
                  fill="var(--primary)"
                  stroke="var(--card)"
                  strokeWidth={3}
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    opacity: shown ? 1 : 0,
                    transform: shown ? 'none' : 'scale(0.4)',
                    transition: shown && !frame.reduced ? `opacity 300ms ${EASE_CSS} 260ms, transform 300ms ${EASE_CSS} 260ms` : 'none',
                  }}
                />
              )}
              {/* Date labels, counted back from the last point. Labels at the edges anchor inwards. */}
              {pw > 0 &&
                data.map((d, i) => {
                  if ((n - 1 - i) % every !== 0) return null
                  const x = X(i)
                  const w = d.label.length * 6.8
                  const anchor = n > 1 && x < w / 2 ? 'start' : n > 1 && x > pw - w / 2 ? 'end' : 'middle'
                  return (
                    <text
                      key={i}
                      x={x}
                      y={H - 6}
                      textAnchor={anchor}
                      className={cn(
                        'font-mono text-[11px] tabular-nums',
                        i === nowIndex ? 'fill-foreground font-medium' : 'fill-muted-foreground',
                      )}
                    >
                      {d.label}
                    </text>
                  )
                })}
              {/* The crosshair: a hairline and a dot on each series, gliding between points. */}
              {paths && (
                <g style={{ opacity: tip ? 1 : 0, transition: frame.reduced ? 'none' : `opacity 140ms ${EASE_CSS}` }}>
                  <line
                    x1={0}
                    x2={0}
                    y1={PT}
                    y2={H - PB}
                    stroke="var(--foreground)"
                    strokeOpacity={0.35}
                    style={{ transform: `translateX(${X(Math.max(0, at))}px)`, transition: glide }}
                  />
                  {compare && tip?.previous !== undefined && (
                    <circle
                      r={4.5}
                      fill="var(--card)"
                      stroke={BASE}
                      strokeWidth={2}
                      style={{ transform: `translate(${X(at)}px, ${Y(tip.previous)}px)`, transition: glide }}
                    />
                  )}
                  <circle
                    r={6}
                    fill="var(--foreground)"
                    stroke="var(--card)"
                    strokeWidth={3}
                    style={{ transform: `translate(${X(Math.max(0, at))}px, ${Y(tip ? tip.value : 0)}px)`, transition: glide }}
                  />
                </g>
              )}
            </svg>
          )}
          {empty && (
            <div className="absolute inset-0 grid place-content-center justify-items-center gap-1.5 px-4 text-center" style={{ bottom: PB }}>
              {placeholder ?? <span className="text-[13.5px] text-muted-foreground">{labels.empty}</span>}
            </div>
          )}
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
            x={tip ? X(at) : 0}
            y={tipY}
            below={tipY < 20}
            bounds={W}
            title={tip ? (at === nowIndex ? `${title(at)} · ${labels.current}` : title(at)) : ''}
            value={tip ? <TipValue value={tip.value} format={format} /> : ''}
            rows={tipRows}
          />
          <SrTable
            caption={label}
            head={compare ? [labels.point, labels.value, labels.previous] : [labels.point, labels.value]}
            rows={data.map((d, i) => {
              const name = i === nowIndex ? `${title(i)} (${labels.current})` : title(i)
              return compare
                ? [name, formatValue(d.value, format), d.previous === undefined ? '' : formatValue(d.previous, format)]
                : [name, formatValue(d.value, format)]
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
