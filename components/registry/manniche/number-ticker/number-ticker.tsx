import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type NumberTickerProps = {
  /** The number it counts to. A new value counts on from the one shown. */
  value: number
  /** Where the count starts the first time. */
  from?: number
  /** Milliseconds for one count. */
  duration?: number
  /** Passed to Intl.NumberFormat, e.g. "da-DK". Defaults to the browser's language. */
  locale?: string
  /** Intl.NumberFormat options, e.g. a currency or a number of decimals. */
  format?: Intl.NumberFormatOptions
  /** Start counting first when the number scrolls into view. */
  startOnView?: boolean
  /** Classes for the outer span. */
  className?: string
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4)

export function NumberTicker({
  value,
  from = 0,
  duration = 1200,
  locale,
  format,
  startOnView = true,
  className,
}: NumberTickerProps) {
  const reduced = useReducedMotion()
  const el = useRef<HTMLSpanElement>(null)
  const shown = useRef(from)
  const [display, setDisplay] = useState(from)
  const [seen, setSeen] = useState(!startOnView)

  useEffect(() => {
    if (seen || !el.current) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.4 })
    io.observe(el.current)
    return () => io.disconnect()
  }, [seen])

  useEffect(() => {
    // Under reduced motion the final number is shown at once, even before it is in view.
    if (reduced) {
      shown.current = value
      setDisplay(value)
      return
    }
    if (!seen) return
    const start = shown.current
    const t0 = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration)
      const v = start + (value - start) * easeOut(t)
      shown.current = v
      setDisplay(v)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, seen, reduced, duration])

  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0, ...format })

  return (
    <span ref={el} className={cn('tabular-nums', className)}>
      {/* Screen readers get the final number, not every step on the way. */}
      <span aria-hidden>{fmt.format(display)}</span>
      <span className="sr-only">{fmt.format(value)}</span>
    </span>
  )
}
