// ScoreDrop: a rounded card that asks a question and answers it with a score. A fine tick ruler bends over the
// middle with a needle that points at the value, and the score sits big at the bottom. When the card comes into view,
// or the value changes, the digits drop in from above one after another and land with a springy bounce. In dark
// mode a warm light rises from the bottom of the card, and it grows with the value; in light mode the card stays
// clean and white.
//
// How it works: the ruler is a shallow arc of hairline ticks around a pivot far below the card, so it reads as a
// ruler, not a gauge. Ticks up to the value are drawn in ink, the rest faint, and both fade towards the ends. Pass
// `interactive` (or `onValueChange`) and the ruler and score become one slider: arrow keys step, Page Up and Page
// Down step ten times, Home and End jump to the ends, and dragging sideways over it sets the value. Changes made by
// hand swap the digits with a short, calm drop, so a drag never turns into a shower of bouncing numbers.
//
// Screen readers: read-only it is a meter, interactive a slider. Both are named by the title (or `label`) and carry
// the value as text ("58 out of 100"). The digits, the ruler and the end labels are hidden, because the value text
// already says them.
//
// Motion: digits use Motion springs; the needle turns and the light grows with CSS transitions on transform and
// opacity only. Under reduced motion the final state is drawn at once: no drop, no turn, no grow.
import { AnimatePresence, motion, useInView } from 'motion/react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type ScoreDropProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title' | 'onChange'> & {
  /** The score. With `onValueChange` it is controlled; with `interactive` alone it is only the starting value. */
  value: number
  /** Called with the new value when a key or a drag changes it. Passing it makes the card interactive. */
  onValueChange?: (value: number) => void
  /** Turn the ruler into a slider you can drag or key. Default: true when `onValueChange` is set. */
  interactive?: boolean
  /** The question or title at the top. Wrap words in `<strong>` to set them in full ink: `How <strong>calm</strong> was it?` */
  title: ReactNode
  /** The accessible name, when the title is not plain enough to read out. Default: the title's text. */
  label?: string
  /** A small line under the ruler, such as "out of 100". */
  caption?: ReactNode
  /** The value at the left end of the ruler. Default 0. */
  min?: number
  /** The value at the right end of the ruler. Default 100. */
  max?: number
  /** How far one arrow key or one tick of a drag moves the value. Default 1. */
  step?: number
  /** Any CSS colour for the light that rises in dark mode and the needle's tip. Default `var(--primary)`. */
  glow?: string
  /** The labels under the two ends of the ruler. Default `min` and `max`; false hides them. */
  ends?: [ReactNode, ReactNode] | false
  /** The value as words for screen readers. Default `${value} out of ${max}`. */
  valueText?: (value: number) => string
}

// The ruler lives in a 240 × 74 box. Its pivot sits far below, so the arc is shallow.
const CX = 120
const CY = 214
const R = 200
const SPAN = 32
const TICKS = 41
const MAJOR = 5
const BOUNCE = 'cubic-bezier(0.34, 1.45, 0.64, 1)'
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'
const f2 = (v: number) => Number(v.toFixed(2))
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// A full drop from above the card on view and on new values; a short one for changes made by hand.
// Damped so the bounce lands about a sixth of a digit past its line and never leaves the card.
const DROP = { from: '-240%', spring: { type: 'spring' as const, stiffness: 400, damping: 26, mass: 1 }, gap: 0.085 }
const NUDGE = { from: '-45%', spring: { type: 'spring' as const, stiffness: 760, damping: 38, mass: 0.7 }, gap: 0 }

export function ScoreDrop({
  value,
  onValueChange,
  interactive,
  title,
  label,
  caption,
  min = 0,
  max = 100,
  step = 1,
  glow = 'var(--primary)',
  ends,
  valueText,
  className,
  ...rest
}: ScoreDropProps) {
  const span = max - min || 1
  const canAdjust = interactive ?? Boolean(onValueChange)
  const controlled = !canAdjust || Boolean(onValueChange)
  const [own, setOwn] = useState(() => clamp(value, min, max))
  const v = clamp(controlled ? value : own, min, max)

  const root = useRef<HTMLDivElement>(null)
  const ruler = useRef<SVGSVGElement>(null)
  const inView = useInView(root, { once: true, amount: 0.35 })
  const reduced = useReducedMotion()
  const seen = inView || reduced
  const titleId = useId()
  const captionId = useId()

  // The last value set by a key or a drag. While the value is that one, the digits swap calmly instead of dropping
  // from the top; a new value from outside drops in again.
  const [hand, setHand] = useState<number | null>(null)
  const byHand = hand !== null && hand === v
  const dragging = useRef(false)

  const decimals = (String(step).split('.')[1] ?? '').length
  const snap = (x: number) => clamp(Number((min + Math.round((x - min) / step) * step).toFixed(decimals)), min, max)
  const commit = (x: number) => {
    const next = snap(x)
    if (next === v) return
    setHand(next)
    if (!controlled) setOwn(next)
    onValueChange?.(next)
  }

  const shown = seen ? v : min
  const t = (shown - min) / span
  const angle = -SPAN + 2 * SPAN * t
  const text = valueText ? valueText(v) : `${f2(v)} out of ${max}`
  const motionKind = byHand ? NUDGE : DROP

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

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const svg = ruler.current
    if (!svg) return
    const box = svg.getBoundingClientRect()
    const vb = svg.viewBox.baseVal
    if (!box.width || !vb) return
    const x = ((e.clientX - box.left) / box.width) * vb.width - CX
    const y = CY - ((e.clientY - box.top) / box.height) * vb.height
    const a = clamp((Math.atan2(x, Math.max(1, y)) * 180) / Math.PI, -SPAN, SPAN)
    commit(min + ((a + SPAN) / (2 * SPAN)) * span)
  }
  const pointer = canAdjust
    ? {
        onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
          if (e.button !== 0) return
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          e.currentTarget.focus({ preventScroll: true })
          fromPointer(e)
        },
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
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
    ? { role: 'slider', tabIndex: 0, 'aria-orientation': 'horizontal' as const, onKeyDown: onKey }
    : { role: 'meter' }

  const still = reduced ? 'none' : undefined
  const turn: CSSProperties = {
    transformBox: 'view-box',
    transformOrigin: `${CX}px ${CY}px`,
    transform: `rotate(${f2(angle)}deg)`,
    transition: still ?? (byHand ? `transform 140ms ${EASE}` : `transform 760ms ${BOUNCE} 120ms`),
  }
  const rise: CSSProperties = {
    transform: `scaleY(${f2(0.3 + 0.7 * t)})`,
    opacity: f2(seen ? 0.28 + 0.72 * t : 0),
    transition: still ?? `transform 700ms ${EASE}, opacity 700ms ${EASE}`,
  }

  const chars = v.toFixed(decimals).split('')
  const endLabels = ends === false ? null : (ends ?? [min, max])

  return (
    <div ref={root} className={cn('relative isolate w-full max-w-80', className)} {...rest}>
      {/* The light that spills out under the card in dark mode. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[10%] -bottom-4 -z-10 hidden h-2/5 rounded-full blur-2xl dark:block"
        style={{
          background: `color-mix(in oklab, ${glow} 70%, transparent)`,
          opacity: f2(seen ? 0.12 + 0.5 * t : 0),
          transition: still ?? `opacity 700ms ${EASE}`,
        }}
      />
      <div
        className={cn(
          // Near square: the card grows if a long title needs more room, never shrinks the number.
          '@container relative flex aspect-[20/21] flex-col items-center overflow-hidden rounded-[calc(var(--radius)*2+2px)] bg-card px-5 pt-6 pb-5 text-card-foreground',
          'shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]',
          'forced-colors:border forced-colors:border-[CanvasText]',
        )}
      >
        {/* The rising light. Dark mode only; its height and strength follow the value. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[72%] origin-bottom dark:block"
          style={{
            ...rise,
            background: [
              `linear-gradient(to top, color-mix(in oklab, ${glow} 55%, white) 0%, color-mix(in oklab, ${glow} 80%, transparent) 9%, transparent 30%)`,
              `radial-gradient(130% 80% at 50% 100%, color-mix(in oklab, ${glow} 75%, transparent) 0%, color-mix(in oklab, ${glow} 28%, transparent) 45%, transparent 78%)`,
            ].join(', '),
          }}
        />

        <p
          id={titleId}
          className={cn(
            'relative max-w-[17rem] text-center text-[14.5px] leading-[1.35] font-medium text-balance text-muted-foreground',
            '[&_b]:font-semibold [&_b]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground',
          )}
        >
          {title}
        </p>

        <div
          {...role}
          aria-label={label}
          aria-labelledby={label ? undefined : titleId}
          aria-describedby={caption ? captionId : undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={f2(v)}
          aria-valuetext={text}
          className={cn(
            'relative mt-3 flex w-full flex-1 flex-col items-center rounded-2xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring',
            canAdjust && 'cursor-ew-resize touch-none select-none',
          )}
          {...pointer}
        >
          <div aria-hidden className="relative w-full">
            <svg ref={ruler} viewBox="0 0 240 74" className="block h-auto w-full overflow-visible">
              {Array.from({ length: TICKS }, (_, k) => {
                const a = -SPAN + (2 * SPAN * k) / (TICKS - 1)
                const major = k % MAJOR === 0
                const len = major ? 15 : 9
                const edge = Math.abs(k - (TICKS - 1) / 2) / ((TICKS - 1) / 2)
                const fade = 1 - edge * edge * 0.65
                const on = k / (TICKS - 1) <= t + 1e-9 && seen
                return (
                  <line
                    key={k}
                    x1={CX}
                    x2={CX}
                    y1={CY - R}
                    y2={CY - R + len}
                    stroke="var(--foreground)"
                    strokeWidth={major ? 1.6 : 1.1}
                    strokeLinecap="round"
                    transform={`rotate(${f2(a)} ${CX} ${CY})`}
                    style={{
                      opacity: f2((on ? 0.8 : 0.2) * fade),
                      transition: still ?? `opacity 240ms ${EASE} ${byHand ? 0 : Math.round(k * 9)}ms`,
                    }}
                  />
                )
              })}
              <g style={turn}>
                <line x1={CX} x2={CX} y1={CY - R - 6} y2={CY - R + 30} stroke="var(--foreground)" strokeWidth={2.2} strokeLinecap="round" />
                <circle cx={CX} cy={CY - R - 6} r={3.4} fill={glow} />
              </g>
            </svg>
            {endLabels && (
              <div className="font-mono text-[11px] leading-none text-muted-foreground tabular-nums">
                <span className="absolute top-[70%] left-[5.5%] -translate-x-1/2">{endLabels[0]}</span>
                <span className="absolute top-[70%] left-[94.5%] -translate-x-1/2">{endLabels[1]}</span>
              </div>
            )}
          </div>

          {caption && (
            <p id={captionId} className="relative -mt-1 text-center text-[12.5px] leading-[1.3] text-muted-foreground">
              {caption}
            </p>
          )}

          <span
            aria-hidden
            className={cn(
              'relative mt-auto flex justify-center pt-2 text-[clamp(60px,36cqi,112px)] leading-none font-semibold tracking-[-0.045em] tabular-nums',
              // In dark the digits pick up a little of the light at their feet.
              'dark:[--sd-ink:linear-gradient(to_bottom,var(--foreground)_45%,color-mix(in_oklab,var(--sd-glow)_35%,var(--foreground)))]',
            )}
            style={{ ['--sd-glow' as string]: glow }}
          >
            {reduced ? (
              <span className="dark:bg-(image:--sd-ink) dark:bg-clip-text dark:text-transparent">{chars.join('')}</span>
            ) : (
              chars.map((ch, i) => {
                // Count from the right, so the ones stay the ones when the score grows a digit.
                const place = chars.length - i
                return (
                  <span key={place} className="relative inline-flex justify-center">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        key={ch}
                        initial={{ y: motionKind.from, opacity: 0 }}
                        animate={seen ? { y: '0%', opacity: 1 } : { y: DROP.from, opacity: 0 }}
                        exit={{ y: byHand ? '35%' : '60%', opacity: 0, transition: { duration: 0.16, ease: [0.23, 1, 0.32, 1] } }}
                        transition={{
                          y: { ...motionKind.spring, delay: i * motionKind.gap },
                          opacity: { duration: 0.18, delay: i * motionKind.gap },
                        }}
                        className="inline-block dark:bg-(image:--sd-ink) dark:bg-clip-text dark:text-transparent"
                      >
                        {ch}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                )
              })
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ScoreDrop
