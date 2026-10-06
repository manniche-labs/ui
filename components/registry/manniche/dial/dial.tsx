// Dial: a fat arc of rounded segments that light up to the value, with a small marker in the signal colour riding
// the outside and the figure in the middle. Give it `zones` and it becomes the smaller three-state gauge instead: the
// arc is coloured by zone, a needle points at the value, and a status line and zone chips sit beside it.
//
// How it works: the arc runs from -120° to +120° and is cut into `segments` pills. Segments up to the value light
// one after another (14 ms apart, never longer than 300 ms in all), and the marker or needle turns to the value. It
// is read-only by default. Pass `onValueChange` (or `adjustable`) and it becomes a slider: arrow keys step, Page Up
// and Page Down step ten times, Home and End jump to the ends, and dragging along the arc sets the value.
//
// Screen readers: read-only it is a meter, "Monthly budget used, 77 percent of the monthly budget"; adjustable it is
// a slider with the same value text, so each key press is read by the slider itself and nothing else is announced.
// The figure, the ends and the zone chips are hidden because the value text already says them.
//
// Motion: segments only change opacity and the marker only turns (transform). Under reduced motion the value is
// drawn at once.
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'
import { BigNumber } from '@/registry/manniche/chart-kit/chart-kit'
import { EASE_CSS, formatValue, seriesColor, type ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { useChartFrame } from '@/registry/manniche/chart-kit/use-chart'

export type DialZone = {
  /** The zone's name, shown on its chip and read with the value: "On track". */
  label: string
  /** Where the zone ends, in the dial's units. The first zone starts at `min`; the last should end at `max`. */
  to: number
  /** Any CSS colour. Defaults to the series colours in order; use --success and --destructive for good and bad. */
  color?: string
}

export type DialLabels = {
  /** The status line of a zoned dial. Default `${label}: ${zone}` with the zone in lower case. */
  status?: (zone: string, label: string) => string
}

export type DialProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'defaultValue' | 'onChange'> & {
  /** The value. Pass it with `onValueChange` to control an adjustable dial, or alone for a read-only gauge. */
  value?: number
  /** The starting value when uncontrolled. Default `min`. */
  defaultValue?: number
  /** Called with the new value when a key or a drag changes it. Passing it makes the dial adjustable. */
  onValueChange?: (value: number) => void
  /** Make the dial a slider even without `onValueChange` (uncontrolled). Default: true when `onValueChange` is set. */
  adjustable?: boolean
  /** What the dial measures, such as "Monthly budget used". Its accessible name. */
  label: string
  /** The value at the left end. Default 0. */
  min?: number
  /** The value at the right end. Default 100, or the end of the last zone. */
  max?: number
  /** How far one arrow key moves an adjustable dial. Default 1. */
  step?: number
  /** How the value is written. Default `{ suffix: '%' }`. */
  format?: ValueFormat
  /**
   * The small line under the figure ("of €1 800 budget"). On a zoned dial it follows the value on the second line
   * ("0.92× your daily budget so far").
   */
  caption?: ReactNode
  /** The labels under the two ends of the arc. Default `min` and `max` in `format`; false hides them. */
  ends?: [ReactNode, ReactNode] | false
  /** How many segments make the arc. Default 24. */
  segments?: number
  /** Turns the dial into the zoned gauge: arc coloured by zone, a needle, a status line and zone chips. */
  zones?: DialZone[]
  /** The value as words for screen readers. Default: the value in `format`, plus the zone when there is one. */
  valueText?: (value: number) => string
  /** Words for other languages. */
  labels?: DialLabels
  /** "compact" draws a smaller dial. Inside a compact DataTile this happens on its own. */
  density?: 'comfortable' | 'compact'
}

// The arc lives in a 220-wide box around a centre at (110, 112).
const CX = 110
const CY = 112
const A0 = -120
const A1 = 120
const f2 = (v: number) => Number(v.toFixed(2))
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function Dial({
  value,
  defaultValue,
  onValueChange,
  adjustable,
  label,
  min = 0,
  max: maxProp,
  step = 1,
  format = { suffix: '%' },
  caption,
  ends,
  segments = 24,
  zones,
  valueText,
  labels,
  density,
  className,
  ...rest
}: DialProps) {
  const max = maxProp ?? (zones?.length ? zones[zones.length - 1].to : 100)
  const span = max - min || 1
  const { ref, drawn, reduced } = useChartFrame<HTMLDivElement>()
  const [own, setOwn] = useState(() => clamp(defaultValue ?? min, min, max))
  const v = clamp(value ?? own, min, max)
  const canAdjust = adjustable ?? Boolean(onValueChange)
  const dragging = useRef(false)

  // Round to the step, counted from min, so 0.05 steps never drift to 0.9500000001.
  const decimals = (String(step).split('.')[1] ?? '').length
  const snap = (x: number) => clamp(Number((min + Math.round((x - min) / step) * step).toFixed(decimals)), min, max)
  const commit = (x: number) => {
    const next = snap(x)
    if (next === v) return
    if (value === undefined) setOwn(next)
    onValueChange?.(next)
  }

  const zoneOf = (x: number) => {
    if (!zones?.length) return -1
    const i = zones.findIndex((z) => x <= z.to + 1e-9)
    return i < 0 ? zones.length - 1 : i
  }
  const zi = zoneOf(v)
  const zone = zi >= 0 ? zones?.[zi] : undefined
  const text = valueText ? valueText(v) : `${formatValue(v, format)}${zone ? `, ${zone.label}` : ''}`

  // Lit segments, and where the last change started, so they light in order away from it.
  const shown = drawn ? v : min
  const lit = Math.round(((shown - min) / span) * segments)
  const [run, setRun] = useState({ lit, from: lit })
  if (run.lit !== lit) setRun({ lit, from: run.lit })
  const gap = Math.min(14, 300 / Math.max(1, Math.abs(run.lit - run.from)))
  const delayOf = (k: number) => {
    if (reduced) return 0
    if (run.lit > run.from && k >= run.from && k < run.lit) return Math.round((k - run.from) * gap)
    if (run.lit < run.from && k >= run.lit && k < run.from) return Math.round((run.from - 1 - k) * gap)
    return 0
  }
  const angle = A0 + ((A1 - A0) * (shown - min)) / span

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const by: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: step * 10,
      PageDown: -step * 10,
    }
    if (e.key === 'Home') commit(min)
    else if (e.key === 'End') commit(max)
    else if (e.key in by) commit(v + by[e.key])
    else return
    e.preventDefault()
  }

  const fromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const vb = e.currentTarget.viewBox.baseVal
    if (!box.width || !vb) return
    const x = ((e.clientX - box.left) / box.width) * vb.width - CX
    const y = ((e.clientY - box.top) / box.height) * vb.height - CY
    // 0° at the top, clockwise; below the centre it snaps to the nearer end.
    let a = (Math.atan2(x, -y) * 180) / Math.PI
    if (a > A1) a = a > 180 - (180 - A1) / 2 ? A0 : A1
    if (a < A0) a = a < -180 + (180 + A0) / 2 ? A1 : A0
    commit(min + ((a - A0) / (A1 - A0)) * span)
  }
  const pointer = canAdjust
    ? {
        onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
          if (e.button !== 0) return
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          ;(e.currentTarget.parentElement as HTMLElement | null)?.focus({ preventScroll: true })
          fromPointer(e)
        },
        onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
          if (dragging.current) fromPointer(e)
        },
        onPointerUp: () => {
          dragging.current = false
        },
        onPointerCancel: () => {
          dragging.current = false
        },
      }
    : {}

  // A drag that ends outside the window still lets go.
  useEffect(() => {
    const up = () => {
      dragging.current = false
    }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  const role = canAdjust
    ? {
        role: 'slider',
        tabIndex: 0,
        'aria-orientation': 'horizontal' as const,
        onKeyDown: onKey,
      }
    : { role: 'meter' }
  const aria = {
    'aria-label': label,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': f2(v),
    'aria-valuetext': text,
  }
  const turn = (deg: number): CSSProperties => ({
    transformBox: 'view-box',
    transformOrigin: `${CX}px ${CY}px`,
    transform: `rotate(${f2(deg)}deg)`,
    transition: reduced ? 'none' : `transform 300ms ${EASE_CSS}`,
  })

  const arc = (n: number, r0: number, len: number, w: number, fill: (k: number) => CSSProperties) =>
    Array.from({ length: n }, (_, k) => {
      const a = A0 + ((A1 - A0) * (k + 0.5)) / n
      return (
        <rect
          key={k}
          x={CX - w / 2}
          y={CY - r0 - len}
          width={w}
          height={len}
          rx={w / 2}
          transform={`rotate(${f2(a)} ${CX} ${CY})`}
          style={fill(k)}
        />
      )
    })

  if (zones?.length) {
    const status = labels?.status ?? ((z: string, l: string) => `${l}: ${z.toLowerCase()}`)
    return (
      <div ref={ref} className={cn('@container w-full min-w-0', className)} {...rest}>
        <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 [grid-template-areas:'fig_text'_'chips_chips'] @[22rem]:grid-cols-[132px_minmax(0,1fr)] @[22rem]:gap-x-[18px] @[22rem]:gap-y-2.5 @[22rem]:[grid-template-areas:'fig_text'_'fig_chips']">
          <div
            {...role}
            {...aria}
            className={cn('relative self-center rounded-2xl [grid-area:fig]', canAdjust && 'cursor-pointer touch-none select-none')}
          >
            <svg viewBox="0 0 220 150" aria-hidden className="block h-auto w-full overflow-visible" {...pointer}>
              {arc(segments, 66, 30, 13, (k) => {
                const z = zoneOf(min + ((k + 0.5) / segments) * span)
                return {
                  fill: zones[z].color ?? seriesColor(z),
                  opacity: drawn && z === zi ? 1 : 0.24,
                  transition: reduced ? 'none' : `opacity 200ms ${EASE_CSS}`,
                }
              })}
              <g style={turn(angle)}>
                <line x1={CX} y1={CY} x2={CX} y2={54} stroke="var(--foreground)" strokeWidth={7} strokeLinecap="round" />
                <circle cx={CX} cy={CY} r={11} fill="var(--foreground)" />
              </g>
            </svg>
          </div>
          <div className="min-w-0 self-center [grid-area:text] @[22rem]:self-end">
            <p className="text-[15px] leading-[1.35] font-medium">{zone ? status(zone.label, label) : label}</p>
            <p className="mt-0.5 text-[13px] leading-normal text-muted-foreground">
              <span className="tabular-nums">{formatValue(v, format)}</span>
              {caption ? <> {caption}</> : null}
            </p>
          </div>
          <div aria-hidden className="flex min-w-0 flex-wrap gap-1.5 self-start [grid-area:chips]">
            {zones.map((z, i) => (
              <span
                key={z.label}
                className="relative isolate inline-flex h-[26px] items-center gap-1.5 rounded-full pr-2.5 pl-2 text-[12.5px] leading-none font-medium text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]"
              >
                <span
                  className="absolute inset-0 -z-10 rounded-full bg-foreground transition-opacity duration-200 ease-out-quint motion-reduce:transition-none"
                  style={{ opacity: i === zi ? 1 : 0 }}
                />
                <i className="size-2 rounded-full" style={{ background: z.color ?? seriesColor(i) }} />
                <span className={cn(i === zi && 'text-card')}>{z.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const endLabels = ends === false ? null : (ends ?? [formatValue(min, format), formatValue(max, format)])
  return (
    <div ref={ref} className={cn('@container flex w-full min-w-0 flex-col items-center', className)} {...rest}>
      <div
        {...role}
        {...aria}
        className={cn(
          'relative @container w-[min(100%,330px)] rounded-3xl',
          'group-data-[density=compact]/tile:w-[min(100%,260px)]',
          density === 'compact' && 'w-[min(100%,260px)]',
          canAdjust && 'cursor-pointer touch-none select-none',
        )}
      >
        <svg viewBox="0 0 220 186" aria-hidden className="block h-auto w-full overflow-visible" {...pointer}>
          {arc(segments, 70, 30, 12, (k) => ({
            fill: 'var(--foreground)',
            opacity: k < lit ? 1 : 0.14,
            transition: reduced ? 'none' : `opacity 200ms ${EASE_CSS} ${delayOf(k)}ms`,
          }))}
          <g style={turn(angle)}>
            <path d="M110 2l7 -0.5 -7 9 -7 -9z" fill="var(--primary)" />
          </g>
        </svg>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[44%] grid justify-items-center text-center">
          <span style={{ ['--dl-num' as string]: 'clamp(34px, 19.4cqi, 64px)' }}>
            <BigNumber value={shown} format={format} size="xl" roll={drawn} className="text-[length:var(--dl-num)]" />
          </span>
          {caption && (
            <span className="mt-1.5 max-w-[80%] text-[13px] leading-[1.3] font-medium text-balance text-muted-foreground">
              {caption}
            </span>
          )}
        </div>
        {endLabels && (
          <div aria-hidden className="font-mono text-[11px] leading-none text-muted-foreground tabular-nums">
            <span className="absolute bottom-0 left-[15%] -translate-x-1/2">{endLabels[0]}</span>
            <span className="absolute bottom-0 left-[85%] -translate-x-1/2">{endLabels[1]}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dial
