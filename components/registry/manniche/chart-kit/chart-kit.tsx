// The shared grammar for the Tiles data primitives (bar-chart, donut, dial, area-chart and the rest): a size and
// draw-in hook, one tooltip anatomy, the big display number, a change pill, a pill switch and a hidden data table
// for screen readers. Formatting, scales and colours live in chart-utils.ts.
// There is no chart library. Each primitive draws its own SVG with these pieces, so the axes, tooltips and numbers
// look the same everywhere. Series colours come from --chart-1 … --chart-5 and the signal from --primary.
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'
import { EASE, formatValue, stepIndex, valueParts, type ValueFormat } from './chart-utils'

// Tooltip -------------------------------------------------------------------------------------------------------

export type TooltipRow = { label: string; value: string; color?: string }

export type ChartTooltipProps = {
  open: boolean
  /** Where the tooltip points, in px inside the chart's positioned wrapper. */
  x: number
  y: number
  /** The wrapper's width, so the tooltip stays inside it. */
  bounds: number
  /** Above the point by default; below when the point sits near the top. */
  below?: boolean
  /** The small label on top, such as the date. */
  title: string
  /** The figure itself. */
  value: ReactNode
  rows?: TooltipRow[]
}

/**
 * One tooltip anatomy for every chart: a dark chip with a mono label, the figure and optional rows with a colour
 * key. It is hidden from screen readers; the chart says the same through its live region. Moves glide only while
 * it is already open, so it never flies in from a corner.
 */
export function ChartTooltip({ open, x, y, bounds, below = false, title, value, rows = [] }: ChartTooltipProps) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [gliding, setGliding] = useState(false)

  // Resize notes arrive after layout and before paint, so a new size is in place before the frame is drawn.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // The first frame after opening snaps into place; moves after that glide.
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => setGliding(true))
    return () => {
      cancelAnimationFrame(id)
      setGliding(false)
    }
  }, [open])
  const { w, h } = size

  const tx = Math.max(-6, Math.min(bounds - w + 6, x - w / 2))
  const ty = below ? y + 12 : y - h - 12
  const origin = `${Math.max(10, Math.min(w - 10, x - tx))}px ${below ? '0%' : '100%'}`

  return (
    <div
      ref={box}
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-0 left-0 z-30 w-max max-w-60 rounded-[calc(var(--radius)+2px)] bg-foreground px-3 pt-2 pb-2.5 text-card',
        'shadow-[0_1px_2px_rgba(0,0,0,0.14),0_10px_24px_-10px_rgba(0,0,0,0.4)] ease-out-quint motion-reduce:transition-none',
        gliding ? 'transition-[opacity,transform] duration-150' : 'transition-opacity duration-150',
      )}
      style={{
        opacity: open ? 1 : 0,
        transform: `translate(${tx}px, ${ty}px) scale(${open ? 1 : 0.96})`,
        transformOrigin: origin,
      }}
    >
      <span className="block font-mono text-[11px] leading-tight tracking-[0.02em] text-[color-mix(in_oklab,var(--card)_60%,var(--foreground))]">
        {title}
      </span>
      <span className="mt-1 block text-[17px] leading-[1.1] font-semibold tracking-[-0.015em] tabular-nums">{value}</span>
      {rows.map((r) => (
        <span
          key={r.label}
          className="mt-1.5 flex items-center gap-2 text-[12.5px] leading-[1.3] text-[color-mix(in_oklab,var(--card)_82%,var(--foreground))] tabular-nums"
        >
          {r.color && <i className="size-2.5 flex-none rounded-[3px]" style={{ background: r.color }} />}
          {r.label}
          <b className="ml-auto pl-3 font-medium text-card">{r.value}</b>
        </span>
      ))}
    </div>
  )
}

// The display number --------------------------------------------------------------------------------------------

export type BigNumberProps = {
  value: number
  format?: ValueFormat
  /** xl for the one figure a tile is about, sm for a figure inside a chart. Default "lg". */
  size?: 'xl' | 'lg' | 'md' | 'sm'
  /** Roll the digits that change. Default true; never under reduced motion. */
  roll?: boolean
  className?: string
}

const SIZES = {
  xl: 'text-[clamp(50px,5.2vw,76px)]',
  lg: 'text-[clamp(36px,3.4vw,48px)]',
  md: 'text-[30px]',
  sm: 'text-[22px]',
}

/**
 * The big figure: heavy, tight and tabular, with the currency symbol and the decimals set small and muted. It uses
 * --font-display when the app defines one (Archivo at width 86 % is what it was drawn with) and the body face
 * otherwise. Screen readers get the whole value once.
 */
export function BigNumber({ value, format, size = 'lg', roll = true, className }: BigNumberProps) {
  const p = valueParts(value, format)
  const small = 'text-[0.46em] font-bold tracking-[-0.02em] text-muted-foreground'
  const unit = p.unit && (
    <span className={cn(small, p.unitAfter ? 'ml-[0.12em]' : 'mr-[0.12em] self-start pt-[0.12em]')}>{p.unit}</span>
  )
  return (
    <span
      className={cn(
        'inline-flex items-baseline leading-[0.95] font-extrabold tracking-[-0.045em] whitespace-nowrap tabular-nums',
        SIZES[size],
        className,
      )}
      style={{ fontFamily: 'var(--font-display, inherit)', fontStretch: '86%' }}
    >
      <span className="sr-only">{formatValue(value, format)}</span>
      <span aria-hidden className="inline-flex items-baseline">
        {p.sign}
        {!p.unitAfter && unit}
        <Digits text={p.whole} roll={roll} />
        {p.fraction && (
          <span className={small}>
            <Digits text={p.fraction} roll={roll} />
          </span>
        )}
        {p.unitAfter && unit}
        {p.suffix && <span className={cn(small, 'ml-[0.06em]')}>{p.suffix}</span>}
      </span>
    </span>
  )
}

/** Digits that roll up when they grow and down when they shrink, counted from the right so places stay put. */
export function Digits({ text, roll = true }: { text: string; roll?: boolean }) {
  const reduced = useReducedMotion()
  const [last, setLast] = useState({ text, dir: 1 })
  const dir = last.text === text ? last.dir : Number(text.replace(/\D/g, '')) >= Number(last.text.replace(/\D/g, '')) ? 1 : -1
  if (last.text !== text) setLast({ text, dir })
  if (!roll || reduced) return <>{text}</>
  const chars = text.split('')
  return (
    <span className="inline-flex">
      {chars.map((ch, i) => {
        const place = chars.length - i
        return (
          <span key={place} className="relative -my-[0.08em] inline-flex overflow-hidden py-[0.08em]">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.span
                key={ch}
                initial={{ y: `${dir * 60}%`, opacity: 0, filter: 'blur(2px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ y: `${dir * -60}%`, opacity: 0, filter: 'blur(2px)' }}
                transition={{ duration: 0.3, ease: EASE, delay: Math.min(place, 6) * 0.015 }}
                className="inline-block"
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        )
      })}
    </span>
  )
}

/** A change as a small pill with an arrow. Green when it went the good way; set `goodWhen` to "down" for costs. */
export function DeltaPill({
  value,
  format = { decimals: 1, suffix: '%' },
  goodWhen = 'up',
  className,
}: {
  value: number
  format?: ValueFormat
  goodWhen?: 'up' | 'down'
  className?: string
}) {
  const up = value > 0
  const flat = Number(Math.abs(value).toFixed(format.decimals ?? 0)) === 0
  const good = flat ? null : up === (goodWhen === 'up')
  const tone = good === null ? null : good ? 'var(--success)' : 'var(--destructive)'
  return (
    <span
      className={cn(
        'inline-flex h-[26px] items-center gap-1 rounded-full pr-2.5 pl-2 text-[12.5px] leading-none font-medium whitespace-nowrap tabular-nums',
        className,
      )}
      style={
        tone
          ? {
              background: `color-mix(in oklab, ${tone} ${good ? 15 : 13}%, var(--card))`,
              color: `color-mix(in oklab, ${tone} ${good ? 80 : 85}%, var(--foreground))`,
            }
          : { background: 'var(--muted)', color: 'var(--muted-foreground)' }
      }
    >
      {!flat && (
        <svg
          viewBox="0 0 12 12"
          className="size-3 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
          aria-hidden
        >
          <path d={up ? 'M6 10V2M2.5 5.5 6 2l3.5 3.5' : 'M6 2v8M2.5 6.5 6 10l3.5-3.5'} />
        </svg>
      )}
      {formatValue(Math.abs(value), format)}
      <span className="sr-only">{flat ? ', unchanged' : up ? ', up' : ', down'}</span>
    </span>
  )
}

// Controls ------------------------------------------------------------------------------------------------------

export type PillOption = { id: string; label: string }

/** A segment switch: a dark pill slides to the picked option. A radio group with arrow keys, Home and End. */
export function Pills({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: PillOption[]
  value: string
  onChange: (id: string) => void
  /** Read aloud for the group, e.g. "Period". */
  label: string
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const index = Math.max(0, options.findIndex((o) => o.id === value))
  const onKey = (e: KeyboardEvent, i: number) => {
    // Radio groups take both axes: down and right go forward, up and left go back.
    const key = e.key === 'ArrowDown' ? 'ArrowRight' : e.key === 'ArrowUp' ? 'ArrowLeft' : e.key
    const to = stepIndex(key, i, options.length, { loop: true })
    if (to === null) return
    e.preventDefault()
    refs.current[to]?.focus()
    onChange(options[to].id)
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('relative isolate inline-grid auto-cols-fr grid-flow-col rounded-full bg-muted p-1', className)}
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 -z-10 rounded-full bg-foreground transition-transform duration-[260ms] ease-out-quint motion-reduce:transition-none"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o, i) => (
        <button
          key={o.id}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          onClick={() => onChange(o.id)}
          onKeyDown={(e) => onKey(e, i)}
          className={cn(
            'relative min-h-9 cursor-pointer rounded-full px-3.5 text-[13.5px] font-medium whitespace-nowrap focus-visible:outline-offset-0',
            // The visible pill is 36 px; the hit area reaches the 44 px of the track.
            'before:absolute before:inset-x-0 before:-inset-y-1 before:content-[""]',
            i === index ? 'text-card' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Screen readers ------------------------------------------------------------------------------------------------

/** The chart's data as a table only screen readers see. The first column is read as the row heading. */
export function SrTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) =>
                j ? (
                  <td key={j}>{c}</td>
                ) : (
                  <th key={j} scope="row">
                    {c}
                  </th>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
