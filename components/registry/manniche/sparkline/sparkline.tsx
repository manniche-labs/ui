// Sparkline: a tiny trend line with no axes, meant to sit beside a number or inside a table cell. The line is drawn
// in ink and the latest point (or any `current` index) is marked with a small dot in --primary, the only signal.
//
// How it works: the values are scaled into the measured box (its own min to max, or a shared `domain` so several
// sparklines can be compared) and drawn as one smooth line that never overshoots its points. It fills its
// container's width unless `width` is given; the height is 30 px (24 in a compact tile) unless `height` is given.
// Pointer hover and a finger scrubbing sideways pick the nearest point and show the shared tooltip; the page still
// scrolls under a finger. The plot is one Tab stop, with a hit area of at least 44 px however thin the line is.
// Arrow keys, Home and End step through the points and Escape lets go.
//
// Screen readers: the sparkline is one image named "<label>, up 11.2 percent, from €4,752.22 to €5,470.58", with a
// hint; each step by keyboard is read once ("Thu 8 Oct, latest: €5,470.58"), and the points are in a hidden table
// unless `table` is off (as inside a table row, where the row already says what the line is about).
//
// Motion: on first view the line is wiped in from the left by scaling its clip shape (300 ms, after an optional
// `delay` of at most 300 ms, so all is done within 600 ms). New data redraws at once. Under reduced motion the line
// is there at once.
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { cn } from '@/lib/utils'
import { ChartTooltip, SrTable } from '@/registry/manniche/chart-kit/chart-kit'
import { EASE_CSS, GRID, INK, formatValue, smoothPath, stepIndex, valueParts, type ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { useAnnounce, useChartFrame, useSvgId } from '@/registry/manniche/chart-kit/use-chart'

export type SparkPoint = {
  /** The point's value. */
  value: number
  /** The point's name for the tooltip, the table and screen readers: "Thu 8 Oct". Default "3 of 30". */
  label?: string
}

export type SparklineSummary = {
  /** The first and last values, already formatted. */
  first: string
  last: string
  /** The change from the first to the last value in percent, or null when the first value is 0. */
  change: number | null
}

export type SparklineLabels = {
  /** Added to the current point's name in the tooltip and when read: "Thu 8 Oct · latest". Default "latest". */
  current?: string
  /** The first column of the hidden table. Default "Point". */
  point?: string
  /** The second column of the hidden table. Default "Value". */
  value?: string
  /** Names a point that has no label. Default "3 of 30". */
  position?: (index: number, count: number) => string
  /** The trend read after the chart's name. Default "up 11.2 percent, from €4,752.22 to €5,470.58". */
  summary?: (s: SparklineSummary) => string
  /** Read after the name. Default "Use the arrow keys to read each point." */
  hint?: string
  /** Read while loading. Default "Loading". */
  loading?: string
  /** Read when there is nothing to draw. Default "No data yet". */
  empty?: string
}

const LABELS: Required<SparklineLabels> = {
  current: 'latest',
  point: 'Point',
  value: 'Value',
  position: (i, n) => `${i + 1} of ${n}`,
  summary: ({ first, last, change }) => {
    const trend =
      change === null ? '' : Math.abs(change) < 0.05 ? 'unchanged, ' : `${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)} percent, `
    return `${trend}from ${first} to ${last}`
  },
  hint: 'Use the arrow keys to read each point.',
  loading: 'Loading',
  empty: 'No data yet',
}

export type SparklineProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** The values, oldest first: plain numbers or `{ value, label? }`. */
  data: readonly (number | SparkPoint)[]
  /** The chart's accessible name, such as "Savings, last 30 days". The trend is read after it. */
  label: string
  /** How values are written in the tooltip, the summary and the table. */
  format?: ValueFormat
  /** A fixed width in px. Default the container's full width. */
  width?: number
  /** The height in px. Default 30, and 24 in a compact tile. */
  height?: number
  /** The index of the point marked with the signal dot. Default the last point; null for none. */
  current?: number | null
  /** The values at the bottom and top of the box, to put several sparklines on one scale. Default each line's own min and max. */
  domain?: [number, number]
  /** Show a tooltip and read points by hover, touch and keyboard. Off draws a still image. Default true. */
  interactive?: boolean
  /** Put the points in a hidden table for screen readers. Turn it off inside a table row. Default true. */
  table?: boolean
  /** Wait this long (ms, at most 300) before the first-view wipe, to stagger several lines. Default 0. */
  delay?: number
  /** Show a breathing placeholder line instead of data. */
  loading?: boolean
  /** The highlighted point (an index into `data`), or null. */
  activeIndex?: number | null
  /** The highlighted point to start with, when `activeIndex` is not controlled. Default null. */
  defaultActiveIndex?: number | null
  /** Called when hover, a finger or the keyboard picks another point, and with null when it lets go. */
  onActiveIndexChange?: (index: number | null) => void
  /** Every visible and spoken string that is not data. */
  labels?: SparklineLabels
}

// Room around the line: the stroke's round caps at the left, the signal dot at the right, and a little at the top
// and bottom so the dot and the hover ring are never cut.
const PAD_X = 2
const PAD_DOT = 6
const PAD_Y = 4
// A gentle placeholder shape, in 0…1 of the box.
const SKELETON = [0.62, 0.5, 0.56, 0.38, 0.44, 0.3, 0.36]

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

/** A tiny trend line with the latest point marked, for beside a number or inside a table cell. */
export function Sparkline({
  data,
  label,
  format,
  width: widthProp,
  height,
  current,
  domain,
  interactive = true,
  table = true,
  delay = 0,
  loading = false,
  activeIndex,
  defaultActiveIndex = null,
  onActiveIndexChange,
  labels: labelsProp,
  className,
  style,
  ...rest
}: SparklineProps) {
  const labels = { ...LABELS, ...labelsProp }
  const { ref: frameRef, ...frame } = useChartFrame<HTMLDivElement>()
  const { say, region } = useAnnounce()
  const hintId = useId()
  const clipId = useSvgId('spark')
  const [rawActive, setActive] = useControllable(activeIndex, defaultActiveIndex, onActiveIndexChange)

  const points = data.map((d, i) => {
    const p = typeof d === 'number' ? { value: d } : d
    return { value: p.value, title: p.label ?? labels.position(i, data.length) }
  })
  const n = points.length
  const nowIndex = current === undefined ? n - 1 : current !== null && current >= 0 && current < n ? current : -1
  const at = rawActive !== null && rawActive >= 0 && rawActive < n ? rawActive : -1
  const empty = !loading && n === 0
  const live = interactive && !loading && !empty

  const W = frame.width
  const H = frame.height
  const x0 = PAD_X
  const x1 = Math.max(x0, W - (nowIndex >= 0 ? PAD_DOT : PAD_X))
  const values = points.map((p) => p.value)
  const lo = domain ? domain[0] : Math.min(...values)
  const hi = domain ? domain[1] : Math.max(...values)
  const xOf = (i: number) => (n < 2 ? (x0 + x1) / 2 : x0 + (i / (n - 1)) * (x1 - x0))
  const yOf = (v: number) => (hi === lo ? H / 2 : PAD_Y + (1 - (v - lo) / (hi - lo)) * Math.max(0, H - PAD_Y * 2))
  const pts = points.map((p, i) => [xOf(i), yOf(p.value)] as [number, number])

  // The first view wipes the line in once; later data just redraws.
  const ready = frame.drawn && W > 0 && H > 0
  const [played, setPlayed] = useState(false)
  const shown = frame.reduced ? ready : played
  useEffect(() => {
    if (!ready || played || frame.reduced) return
    let b = 0
    const a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => setPlayed(true))
    })
    return () => {
      cancelAnimationFrame(a)
      cancelAnimationFrame(b)
    }
  }, [ready, played, frame.reduced])

  // A point that no longer exists lets go.
  useEffect(() => {
    if (rawActive !== null && (rawActive < 0 || rawActive >= n)) setActive(null)
  }, [rawActive, n, setActive])

  const name = (i: number) => (i === nowIndex ? `${points[i].title}, ${labels.current}` : points[i].title)
  const describe = (i: number) => `${name(i)}: ${formatValue(points[i].value, format)}`
  const pick = (i: number, announce: boolean) => {
    setActive(i)
    if (announce) say(describe(i))
  }

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!live || n < 1) return
    const r = e.currentTarget.getBoundingClientRect()
    const t = n < 2 ? 0 : (e.clientX - r.left - x0) / Math.max(1, x1 - x0)
    const i = Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))))
    if (i !== at) pick(i, false)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!live) return
    if (e.key === 'Escape') {
      if (at < 0) return
      e.preventDefault()
      setActive(null)
      return
    }
    const to = stepIndex(e.key, at < 0 ? (nowIndex >= 0 ? nowIndex : n - 1) : at, n)
    if (to === null) return
    e.preventDefault()
    pick(to, true)
  }

  const first = n ? points[0].value : 0
  const last = n ? points[n - 1].value : 0
  const summary = n
    ? labels.summary({
        first: formatValue(first, format),
        last: formatValue(last, format),
        change: first === 0 || n < 2 ? null : ((last - first) / Math.abs(first)) * 100,
      })
    : ''
  const name0 = loading ? `${label}, ${labels.loading}` : empty ? `${label}, ${labels.empty}` : `${label}, ${summary}`

  const wipe = Math.max(0, Math.min(300, delay))
  const tip = live && at >= 0 && W > 0 ? points[at] : null
  const dotNow = nowIndex >= 0 ? pts[nowIndex] : null

  return (
    <div
      className={cn('relative min-w-0', widthProp === undefined ? 'block w-full' : 'inline-block align-middle', className)}
      style={{ width: widthProp, ...style }}
      aria-busy={loading || undefined}
      {...rest}
    >
      <div
        ref={frameRef}
        role="img"
        aria-label={name0}
        aria-describedby={live ? hintId : undefined}
        tabIndex={live ? 0 : undefined}
        onPointerDown={live ? fromPointer : undefined}
        onPointerMove={live ? fromPointer : undefined}
        onPointerLeave={
          live
            ? (e) => {
                if (e.pointerType !== 'mouse') return
                if (!e.currentTarget.matches(':focus-visible')) setActive(null)
              }
            : undefined
        }
        onFocus={
          live
            ? (e) => {
                // A press focuses the line too; only keyboard focus picks the current point.
                if (!e.currentTarget.matches(':focus-visible')) return
                if (at >= 0) {
                  say(describe(at))
                  return
                }
                pick(nowIndex >= 0 ? nowIndex : n - 1, true)
              }
            : undefined
        }
        onBlur={live ? () => setActive(null) : undefined}
        onKeyDown={live ? onKeyDown : undefined}
        className={cn(
          'relative h-[30px] rounded-lg outline-offset-4 select-none group-data-[density=compact]/tile:h-6',
          live &&
            // However thin the line, the hit area is at least 44 px tall.
            'cursor-crosshair [touch-action:pan-y] before:absolute before:inset-x-0 before:top-[min(0px,calc(50%-22px))] before:bottom-[min(0px,calc(50%-22px))] before:content-[""]',
        )}
        style={{ height }}
      >
        {W > 0 && H > 0 && (
          <svg aria-hidden width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 block overflow-visible">
            {loading ? (
              <path
                d={smoothPath(SKELETON.map((v, i) => [x0 + (i / (SKELETON.length - 1)) * (W - 2 * PAD_X), PAD_Y + v * (H - 2 * PAD_Y)]))}
                fill="none"
                stroke="var(--muted)"
                strokeWidth={3}
                strokeLinecap="round"
                className="motion-safe:animate-pulse"
              />
            ) : empty ? (
              <line x1={x0} x2={W - PAD_X} y1={H / 2} y2={H / 2} stroke={GRID} strokeWidth={1.5} strokeDasharray="2 4" strokeLinecap="round" />
            ) : (
              <>
                <defs>
                  <clipPath id={clipId}>
                    <rect
                      x={0}
                      y={-PAD_Y * 2}
                      width={W + PAD_X}
                      height={H + PAD_Y * 4}
                      style={{
                        transformBox: 'view-box',
                        transformOrigin: '0px 0px',
                        transform: `scaleX(${shown ? 1 : 0})`,
                        transition:
                          shown && !frame.reduced ? `transform 300ms ${EASE_CSS} ${wipe}ms` : 'none',
                      }}
                    />
                  </clipPath>
                </defs>
                <g clipPath={`url(#${clipId})`}>
                  {n > 1 && (
                    <path d={smoothPath(pts)} fill="none" stroke={INK} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
                  )}
                  {n === 1 && <circle cx={pts[0][0]} cy={pts[0][1]} r={2.5} fill={INK} />}
                  {dotNow && <circle cx={dotNow[0]} cy={dotNow[1]} r={3.5} fill="var(--primary)" stroke="var(--card)" strokeWidth={2.5} />}
                </g>
                {tip && (
                  <g>
                    <line
                      x1={pts[at][0]}
                      x2={pts[at][0]}
                      y1={Math.min(0, pts[at][1] - 8)}
                      y2={Math.max(H, pts[at][1] + 8)}
                      stroke="var(--foreground)"
                      strokeOpacity={0.35}
                      strokeWidth={1}
                      shapeRendering="crispEdges"
                    />
                    {at === nowIndex ? (
                      <circle cx={pts[at][0]} cy={pts[at][1]} r={3.5} fill="var(--primary)" stroke="var(--card)" strokeWidth={2.5} />
                    ) : (
                      <circle cx={pts[at][0]} cy={pts[at][1]} r={3.5} fill="var(--foreground)" stroke="var(--card)" strokeWidth={2.5} />
                    )}
                  </g>
                )}
              </>
            )}
          </svg>
        )}
      </div>
      {live && (
        <>
          <span id={hintId} hidden>
            {labels.hint}
          </span>
          <ChartTooltip
            open={!!tip}
            x={tip ? pts[at][0] : 0}
            y={-4}
            bounds={W}
            title={tip ? (at === nowIndex ? `${tip.title} · ${labels.current}` : tip.title) : ''}
            value={tip ? <TipValue value={tip.value} format={format} /> : ''}
          />
          {region}
        </>
      )}
      {table && !loading && !empty && (
        <SrTable
          caption={label}
          head={[labels.point, labels.value]}
          rows={points.map((p, i) => [i === nowIndex ? `${p.title} (${labels.current})` : p.title, formatValue(p.value, format)])}
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
