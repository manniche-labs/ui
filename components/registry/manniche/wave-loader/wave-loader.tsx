import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type WaveLoaderProps = {
  /** Number of bars. */
  bars?: number
  /** Read by screen readers. */
  label?: string
  /** Classes for the outer span. */
  className?: string
}

const W = 8 // bar width
const GAP = 6
const H = 28 // bar height
const BALL = 10
const HOP = 26 // how high the ball jumps
const HOP_TIME = 0.34 // seconds per hop

/**
 * A loader where a ball hops from bar to bar, and each landing sends a wave through the row.
 * The bars are a tiny spring chain: every bar pulls on its neighbours, so the push travels and fades.
 */
export function WaveLoader({ bars = 9, label = 'Loading', className }: WaveLoaderProps) {
  const reduce = useReducedMotion()
  const barRefs = useRef<(HTMLSpanElement | null)[]>([])
  const ball = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (reduce) return
    const n = bars
    const u = new Float32Array(n) // how far each bar is pushed down, in px
    const v = new Float32Array(n)
    let from = 0
    let dir = 1
    let t = 0
    let last = performance.now()
    let raf = 0

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now

      // Spring chain: neighbours pull on each other (the wave), each bar pulls home, friction calms it.
      for (let s = 0; s < 2; s++) {
        const h = dt / 2
        for (let i = 0; i < n; i++) {
          const l = u[i - 1] ?? u[i]
          const r = u[i + 1] ?? u[i]
          v[i] += (260 * (l + r - 2 * u[i]) - 90 * u[i] - 7 * v[i]) * h
        }
        for (let i = 0; i < n; i++) u[i] += v[i] * h
      }

      t += dt / HOP_TIME
      if (t >= 1) {
        t -= 1
        from += dir
        v[from] += 120 // the landing pushes the bar down
        if (from === n - 1 || from === 0) dir = -dir
      }
      const to = from + dir

      for (let i = 0; i < n; i++) barRefs.current[i]?.style.setProperty('transform', `translateY(${u[i].toFixed(2)}px)`)
      const x = (from + (to - from) * t) * (W + GAP) + W / 2 - BALL / 2
      const surface = u[from] + (u[to] - u[from]) * t
      const y = surface - Math.sin(Math.PI * t) * HOP - BALL - 2
      ball.current?.style.setProperty('transform', `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [bars, reduce])

  return (
    <span role="status" aria-label={label} className={cn('relative inline-block', className)} style={{ width: bars * (W + GAP) - GAP, height: H + HOP + BALL + 6 }}>
      <span aria-hidden className="absolute inset-x-0 bottom-0 flex items-end" style={{ gap: GAP, height: H }}>
        {Array.from({ length: bars }, (_, i) => (
          <span
            key={i}
            ref={(el) => {
              barRefs.current[i] = el
            }}
            className="block shrink-0 rounded-full bg-foreground/80 will-change-transform"
            // With reduced motion the row rests in a gentle, still wave.
            style={{ width: W, height: H, transform: reduce ? `translateY(${(Math.sin((i / (bars - 1)) * Math.PI * 2) * 4).toFixed(2)}px)` : undefined }}
          />
        ))}
      </span>
      <span
        ref={ball}
        aria-hidden
        className="absolute left-0 block rounded-full bg-primary will-change-transform"
        style={{ width: BALL, height: BALL, top: HOP + BALL + 6, transform: reduce ? `translate(${(W - BALL) / 2}px, ${-BALL - 2}px)` : undefined }}
      />
    </span>
  )
}
