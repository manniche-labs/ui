import { motion, useMotionValue, useSpring, useTransform, useVelocity } from 'motion/react'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type JellySliderProps = {
  /** Controlled value. */
  value?: number
  /** Starting value when the slider is not controlled. */
  defaultValue?: number
  /** Called with the new value while it is dragged or moved with the keys. */
  onValueChange?: (value: number) => void
  /** Lowest value. */
  min?: number
  /** Highest value. */
  max?: number
  /** Size of one step. */
  step?: number
  /** Read by screen readers. */
  label: string
  /** Turns the value into text for screen readers, e.g. “40 %”. */
  format?: (value: number) => string
  /** Classes for the slider track. */
  className?: string
}

/**
 * A slider with a soft thumb: it stretches in the direction you drag it, squashes to keep its volume,
 * and wobbles back into shape when you let go.
 */
export function JellySlider({ value, defaultValue = 50, onValueChange, min = 0, max = 100, step = 1, label, format, className }: JellySliderProps) {
  const [inner, setInner] = useState(defaultValue)
  const current = value ?? inner
  const track = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  const pct = (v: number) => ((v - min) / (max - min)) * 100
  const target = useMotionValue(pct(current))
  const pos = useSpring(target, { stiffness: 600, damping: 45 })
  const speed = useVelocity(pos) // percent per second
  // Faster means longer and flatter. Volume stays the same, so the squash is 1 / stretch.
  const stretch = useSpring(
    useTransform(speed, (v) => (reduce ? 1 : 1 + Math.min(0.7, Math.abs(v) / 350))),
    { stiffness: 420, damping: 11 },
  )
  const squash = useTransform(stretch, (s) => 1 / s)
  const fill = useTransform(pos, (p) => p / 100)
  const width = useMotionValue(0)
  const x = useTransform(() => (pos.get() / 100) * width.get())

  // The thumb moves in px, measured from the track, so nothing sticks out past it while it travels.
  useEffect(() => {
    const el = track.current!
    const ro = new ResizeObserver(() => width.set(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])

  useEffect(() => {
    target.set(pct(current))
    if (reduce) pos.jump(pct(current))
  })

  const set = (raw: number) => {
    const snapped = Math.round((raw - min) / step) * step + min
    const next = Math.min(max, Math.max(min, Number(snapped.toFixed(10))))
    if (next === current) return
    if (value === undefined) setInner(next)
    onValueChange?.(next)
  }

  const fromPointer = (e: PointerEvent) => {
    const r = track.current!.getBoundingClientRect()
    set(min + ((e.clientX - r.left) / r.width) * (max - min))
  }

  const onKey = (e: KeyboardEvent) => {
    const big = Math.max(step, (max - min) / 10)
    const moves: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: big,
      PageDown: -big,
      Home: min - current,
      End: max - current,
    }
    if (!(e.key in moves)) return
    e.preventDefault()
    set(current + moves[e.key])
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={current}
      aria-valuetext={format?.(current)}
      aria-orientation="horizontal"
      onKeyDown={onKey}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        fromPointer(e)
      }}
      onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e)}
      className={cn('group relative flex h-11 w-full cursor-grab touch-none items-center rounded-full px-3.5 outline-none select-none active:cursor-grabbing', className)}
    >
      <div ref={track} className="relative h-2.5 w-full rounded-full bg-muted">
        <motion.span className="absolute inset-0 origin-left rounded-full bg-primary" style={{ scaleX: fill }} />
        <motion.span
          aria-hidden
          className="absolute top-1/2 left-0 -mt-3.5 -ml-3.5 size-7 rounded-full border bg-background shadow-[0_2px_8px_-2px_rgb(0_0_0/0.35)] ring-ring/50 transition-shadow duration-150 group-focus-visible:ring-4"
          style={{ x, scaleX: stretch, scaleY: squash }}
        />
      </div>
    </div>
  )
}
