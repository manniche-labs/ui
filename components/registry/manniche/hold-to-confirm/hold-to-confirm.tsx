import { Check } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type HoldToConfirmProps = {
  children: ReactNode
  /** Milliseconds the button must be held. */
  duration?: number
  onConfirm: () => void
  doneLabel?: ReactNode
  /** Said to screen readers, since holding is not obvious. */
  hint?: string
  className?: string
}

/**
 * A button for actions that should not happen by accident: it fills while held and fires when full.
 * Letting go early drains it again. Space or Enter held down works the same way.
 */
export function HoldToConfirm({ children, duration = 1200, onConfirm, doneLabel = 'Done', hint = 'Press and hold to confirm', className }: HoldToConfirmProps) {
  const reduced = useReducedMotion()
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const holding = useRef(false)
  const value = useRef(0)
  const frame = useRef(0)
  const fire = useRef(onConfirm)
  useEffect(() => {
    fire.current = onConfirm
  })

  const loop = (prev: number) => (now: number) => {
    const dt = now - prev
    // Fill at the set speed while held; drain twice as fast when let go.
    value.current = Math.min(1, Math.max(0, value.current + (holding.current ? dt / duration : (-2 * dt) / duration)))
    setProgress(value.current)
    if (value.current >= 1) {
      holding.current = false
      setDone(true)
      fire.current()
      return
    }
    if (value.current > 0 || holding.current) frame.current = requestAnimationFrame(loop(now))
  }

  const start = () => {
    if (done) return
    holding.current = true
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(loop(performance.now()))
  }
  const stop = () => {
    holding.current = false
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => {
      setDone(false)
      value.current = 0
      setProgress(0)
    }, 2000)
    return () => clearTimeout(t)
  }, [done])

  // Under reduced motion the fill jumps in steps of a quarter instead of sliding.
  const fill = done ? 1 : reduced ? Math.floor(progress * 4) / 4 : progress
  const label = done ? (
    <>
      <Check className="size-4" aria-hidden />
      {doneLabel}
    </>
  ) : (
    children
  )

  return (
    <button
      type="button"
      aria-description={hint}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault()
          start()
        }
      }}
      onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && stop()}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        'relative isolate inline-flex min-h-11 touch-none items-center justify-center overflow-hidden rounded-full bg-destructive/10 px-6 font-medium text-destructive select-none',
        className,
      )}
    >
      <span className="flex items-center gap-2">{label}</span>
      {/* A white copy of the label sits on the fill and is clipped to the filled part. */}
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center gap-2 bg-destructive text-white"
        style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}
      >
        {label}
      </span>
      <span className="sr-only" aria-live="polite">
        {done ? doneLabel : ''}
      </span>
    </button>
  )
}
