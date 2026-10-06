// Donut: a thick ring of rounded segments with gaps between them, a centre figure and a legend list beside it.
// Point at a segment or a row and the segment steps out along its middle while the others fade back, and the
// centre reads that category's value and share; with nothing active it reads the total.
//
// How it works: the ring is one SVG arc per category (round caps, a fixed gap), drawn from twelve o'clock. Which
// segment is under the pointer is worked out from the angle and distance to the centre, so a mouse, a pen and a
// finger dragging across the ring all behave the same. The legend is a real list of buttons and the keyboard path:
// one Tab stop, arrow keys, Home and End move between rows, and the row and its segment light each other.
//
// Screen readers: the ring is one image named "<label>. Total €1,383."; the list is the data, so each row reads
// "Groceries: €415, 30 percent" as focus lands on it. Nothing else is announced, so nothing is read twice.
//
// Motion: on first view the segments fade in and turn a few degrees into place, one after another (all done in
// 540 ms); afterwards only the hovered segment moves (transform) and the rest fade (opacity). Under reduced motion
// everything is drawn in place at once and nothing moves.
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { cn } from '@/lib/utils'
import { BigNumber } from '@/registry/manniche/chart-kit/chart-kit'
import { EASE_CSS, formatValue, seriesColor, stepIndex, valueParts, type ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { useChartFrame } from '@/registry/manniche/chart-kit/use-chart'

export type DonutDatum = {
  /** The category's name, shown in the list and read aloud. Also the row's key, so keep it unique. */
  label: string
  /** The amount. Negative values count as zero. */
  value: number
  /** Any CSS colour. Defaults to the series colours --chart-1 … --chart-5 in order. */
  color?: string
}

export type DonutLabels = {
  /** The centre label when no category is active. Default "Total". */
  total?: string
  /** After the share in the centre, as in "30% of total". Default "of total". */
  ofTotal?: string
  /** The word after a share for screen readers, as in "30 percent". Default "percent". */
  percent?: string
}

export type DonutProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onSelect'> & {
  /** One entry per category, in the order the ring and the list show them: `{ label, value, color? }`. */
  data: DonutDatum[]
  /** What the chart shows, such as "Spending by category, last 30 days". Names the ring and the list. */
  label: string
  /** How values are written. Default: a plain whole number in en-GB. */
  format?: ValueFormat
  /**
   * The whole the shares are taken of. Leave it out to use the sum of `data`. A larger total (a budget, say)
   * leaves the rest of the ring empty.
   */
  total?: number
  /** "row" puts the list beside the ring, "stack" puts it under; "auto" (default) picks by the width available. */
  layout?: 'auto' | 'row' | 'stack'
  /** The highlighted category, or null for none. Pass it to control the highlight; leave it out to let the chart. */
  activeIndex?: number | null
  /** The highlighted category on first render when uncontrolled. Default null. */
  defaultActiveIndex?: number | null
  /** Called when the highlight moves by pointer, focus or keys, with null when it clears. */
  onActiveIndexChange?: (index: number | null) => void
  /** Called when a row is clicked or pressed with Enter or Space, for drilling into a category. */
  onSelect?: (index: number) => void
  /** Words for other languages. */
  labels?: DonutLabels
  /** "compact" draws a smaller ring and tighter gaps. Inside a compact DataTile this happens on its own. */
  density?: 'comfortable' | 'compact'
}

// The ring in a 200 × 200 box: radius 74, 30 wide, 5° between segments plus room for the round caps.
const C = 100
const R = 74
const SW = 30
const GAP = 5
const CAP = ((SW / 2 / R) * 180) / Math.PI
const rad = (deg: number) => (deg * Math.PI) / 180
const pt = (deg: number) => [C + R * Math.cos(rad(deg)), C + R * Math.sin(rad(deg))] as const
const f2 = (v: number) => v.toFixed(2)

type Seg = { d: string; mid: number; from: number; to: number }

function geometry(values: number[], whole: number): Seg[] {
  let a0 = -90
  return values.map((v) => {
    const span = whole > 0 ? (v / whole) * 360 : 0
    const s0 = a0 + CAP + GAP / 2
    const s1 = a0 + span - CAP - GAP / 2
    // A slice too thin for its caps is drawn as a dot in its middle.
    const start = s1 > s0 ? s0 : a0 + span / 2 - 0.25
    const end = Math.max(s1, start + 0.5)
    const [x0, y0] = pt(start)
    const [x1, y1] = pt(end)
    const seg = {
      d: span > 0 ? `M${f2(x0)} ${f2(y0)}A${R} ${R} 0 ${end - start > 180 ? 1 : 0} 1 ${f2(x1)} ${f2(y1)}` : '',
      mid: (start + end) / 2,
      from: a0,
      to: a0 + span,
    }
    a0 += span
    return seg
  })
}

/** The figure in the centre is sized to the ring and shrinks for long numbers, so it always fits the hole. */
function centreSize(text: string) {
  // Rough widths in em: digits 0.6, separators 0.28, the small currency sign 0.3. The hole is 52 % of the figure.
  const em = [...text].reduce((w, ch) => w + (/\d/.test(ch) ? 0.6 : /[\s.,'’]/.test(ch) ? 0.28 : 0.3), 0)
  return `clamp(18px, min(17cqi, ${f2(52 / Math.max(em, 2))}cqi), 36px)`
}

export function Donut({
  data,
  label,
  format,
  total,
  layout = 'auto',
  activeIndex,
  defaultActiveIndex = null,
  onActiveIndexChange,
  onSelect,
  labels,
  density,
  className,
  style,
  ...rest
}: DonutProps) {
  const { total: totalWord = 'Total', ofTotal = 'of total', percent = 'percent' } = labels ?? {}
  const { ref, drawn, reduced } = useChartFrame<HTMLDivElement>()
  const [own, setOwn] = useState<number | null>(defaultActiveIndex)
  const raw = activeIndex !== undefined ? activeIndex : own
  const active = raw !== null && raw >= 0 && raw < data.length ? raw : null
  const rootRef = useRef<HTMLDivElement | null>(null)
  const rows = useRef<(HTMLButtonElement | null)[]>([])
  // Where Tab lands: the last row the keyboard used, else the active row, else the first.
  const [cursor, setCursor] = useState(0)
  const [settled, setSettled] = useState(false)

  const values = data.map((d) => Math.max(0, d.value))
  const sum = values.reduce((a, b) => a + b, 0)
  const whole = Math.max(total ?? sum, sum)
  const segs = geometry(values, whole)
  const share = (v: number) => (whole > 0 ? Math.round((v / whole) * 100) : 0)
  const pct = (v: number) => formatValue(share(v), { locale: format?.locale, suffix: '%' })

  const set = (i: number | null) => {
    if (i === active) return
    if (activeIndex === undefined) setOwn(i)
    onActiveIndexChange?.(i)
  }
  const latest = useRef(set)
  useEffect(() => {
    latest.current = set
  })

  // After the entrance, hover moves drop the stagger delay.
  useEffect(() => {
    if (!drawn || settled) return
    const t = window.setTimeout(() => setSettled(true), reduced ? 0 : 620)
    return () => window.clearTimeout(t)
  }, [drawn, settled, reduced])

  // A tap that left a segment lit on a touch screen clears when the next tap lands outside the chart.
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

  const focusedRow = () => {
    const i = rows.current.findIndex((r) => r && r === document.activeElement)
    return i < 0 ? null : i
  }

  const onRingPointer = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    if (!box.width) return
    const x = ((e.clientX - box.left) / box.width) * 200 - C
    const y = ((e.clientY - box.top) / box.height) * 200 - C
    const dist = Math.hypot(x, y)
    if (dist < R - SW / 2 - 6 || dist > R + SW / 2 + 10) return
    let deg = (Math.atan2(y, x) * 180) / Math.PI
    if (deg < -90) deg += 360
    const i = segs.findIndex((s) => deg >= s.from && deg < s.to)
    if (i >= 0) set(i)
  }
  const onRingLeave = (e: PointerEvent<SVGSVGElement>) => {
    // A finger lifting keeps its segment; a mouse leaving lets go unless a row has focus.
    if (e.pointerType === 'touch') return
    set(focusedRow())
  }

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === 'Escape') {
      if (active === null) return
      e.preventDefault()
      set(null)
      return
    }
    const key = e.key === 'ArrowDown' ? 'ArrowRight' : e.key === 'ArrowUp' ? 'ArrowLeft' : e.key
    const to = stepIndex(key, i, data.length)
    if (to === null) return
    e.preventDefault()
    rows.current[to]?.focus()
  }

  const stagger = data.length > 1 ? Math.min(60, 240 / (data.length - 1)) : 0
  const tabStop = Math.min(active ?? cursor, Math.max(0, data.length - 1))
  const centreValue = active === null ? (total ?? sum) : values[active]
  const centreText = formatValue(centreValue, format)

  return (
    <div
      ref={(el) => {
        ref(el)
        rootRef.current = el
      }}
      className={cn('@container w-full min-w-0', className)}
      style={style}
      {...rest}
    >
      <div
        data-layout={layout}
        className={cn(
          'grid grid-cols-1 items-center justify-center justify-items-center gap-4',
          'group-data-[density=compact]/tile:gap-3',
          density === 'compact' && 'gap-3',
          layout === 'row' && 'grid-cols-[minmax(150px,210px)_minmax(0,24rem)] gap-6',
          layout === 'row' && 'group-data-[density=compact]/tile:grid-cols-[minmax(120px,168px)_minmax(0,24rem)] group-data-[density=compact]/tile:gap-4',
          layout === 'row' && density === 'compact' && 'grid-cols-[minmax(120px,168px)_minmax(0,24rem)] gap-4',
          layout === 'auto' && '@[26rem]:grid-cols-[minmax(150px,210px)_minmax(0,24rem)] @[26rem]:gap-6',
          layout === 'auto' &&
            'group-data-[density=compact]/tile:@[26rem]:grid-cols-[minmax(120px,168px)_minmax(0,24rem)] group-data-[density=compact]/tile:@[26rem]:gap-4',
          layout === 'auto' && density === 'compact' && '@[26rem]:grid-cols-[minmax(120px,168px)_minmax(0,24rem)] @[26rem]:gap-4',
        )}
      >
        <div
          role="img"
          aria-label={`${label}. ${totalWord} ${formatValue(total ?? sum, format)}.`}
          className={cn(
            'relative @container aspect-square w-[min(100%,200px)] justify-self-center',
            'group-data-[density=compact]/tile:w-[min(100%,168px)]',
            density === 'compact' && 'w-[min(100%,168px)]',
            layout !== 'stack' && '@[26rem]:w-full',
            layout === 'row' && 'w-full',
          )}
        >
          <svg
            viewBox="0 0 200 200"
            aria-hidden
            className="block size-full touch-pan-y overflow-visible"
            onPointerMove={onRingPointer}
            onPointerDown={onRingPointer}
            onPointerLeave={onRingLeave}
          >
            {segs.map((s, k) => {
              const hot = k === active
              const m = rad(s.mid)
              const moves = [
                hot ? `translate(${f2(Math.cos(m) * 6)}px, ${f2(Math.sin(m) * 6)}px)` : '',
                drawn ? '' : 'rotate(-28deg)',
              ].join(' ')
              const segStyle: CSSProperties = {
                stroke: data[k].color ?? seriesColor(k),
                transformBox: 'view-box',
                transformOrigin: '100px 100px',
                transform: moves.trim() || 'none',
                opacity: !drawn ? 0 : active !== null && !hot ? 0.26 : 1,
                transition: reduced
                  ? 'none'
                  : settled
                    ? `transform 260ms ${EASE_CSS}, opacity 200ms ${EASE_CSS}`
                    : `transform 300ms ${EASE_CSS} ${Math.round(k * stagger)}ms, opacity 300ms ${EASE_CSS} ${Math.round(k * stagger)}ms`,
              }
              return s.d ? (
                <path key={data[k].label} d={s.d} fill="none" strokeWidth={SW} strokeLinecap="round" style={segStyle} />
              ) : null
            })}
          </svg>
          <div aria-hidden className="pointer-events-none absolute inset-0 grid place-content-center justify-items-center text-center">
            <span className="max-w-[11ch] text-[12.5px] leading-[1.2] font-medium text-balance text-muted-foreground">
              {active === null ? totalWord : data[active].label}
            </span>
            <span className="mt-1" style={{ ['--dn-num' as string]: centreSize(centreText) }}>
              <BigNumber value={centreValue} format={format} size="md" roll={drawn} className="text-[length:var(--dn-num)]" />
            </span>
            <span className="mt-1 min-h-[11px] font-mono text-[11px] leading-none font-medium text-muted-foreground tabular-nums">
              {active === null ? '' : `${pct(values[active])} ${ofTotal}`}
            </span>
          </div>
        </div>

        <ul
          aria-label={label}
          className="grid w-full max-w-sm min-w-0 gap-0.5"
          onPointerLeave={(e) => {
            if (e.pointerType !== 'touch') set(focusedRow())
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) set(null)
          }}
        >
          {data.map((d, k) => {
            const on = k === active
            const p = valueParts(values[k], format)
            const unit = p.unit && <span className="font-normal text-muted-foreground">{p.unit}</span>
            return (
              <li key={d.label} className="min-w-0">
                <button
                  ref={(el) => {
                    rows.current[k] = el
                  }}
                  type="button"
                  tabIndex={k === tabStop ? 0 : -1}
                  aria-label={`${d.label}: ${formatValue(values[k], format)}, ${share(values[k])} ${percent}`}
                  onPointerEnter={() => set(k)}
                  onFocus={() => {
                    setCursor(k)
                    set(k)
                  }}
                  onClick={(e) => {
                    // Safari does not focus a button on click; focusing it keeps the row lit like everywhere else.
                    e.currentTarget.focus()
                    set(k)
                    onSelect?.(k)
                  }}
                  onKeyDown={(e) => onKey(e, k)}
                  className={cn(
                    'relative isolate grid min-h-11 w-full min-w-0 cursor-pointer grid-cols-[12px_minmax(0,1fr)_auto_40px] items-center gap-2.5 rounded-xl px-2.5 text-left text-sm focus-visible:outline-offset-0',
                    'before:absolute before:inset-0 before:-z-10 before:rounded-xl before:bg-muted before:opacity-0 before:transition-opacity before:duration-150 before:ease-out-quint before:content-[""] hover:before:opacity-100 motion-reduce:before:transition-none',
                    on && 'before:opacity-100',
                  )}
                >
                  <i aria-hidden className="size-3 rounded-[4px]" style={{ background: d.color ?? seriesColor(k) }} />
                  <span className="truncate">{d.label}</span>
                  <span aria-hidden className="font-medium whitespace-nowrap tabular-nums">
                    {p.sign}
                    {!p.unitAfter && unit}
                    {p.whole}
                    {p.fraction}
                    {p.unitAfter && <> {unit}</>}
                    {p.suffix}
                  </span>
                  <span aria-hidden className="text-right font-mono text-[11.5px] leading-none text-muted-foreground tabular-nums">
                    {pct(values[k])}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default Donut
