import { Check } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type HoldToConfirmProps = {
  /** Button label shown before and while the button is held. */
  children: ReactNode
  /** Milliseconds the button must be held. */
  duration?: number
  /** Called once when the button has been held long enough, or confirmed with a second click. */
  onConfirm: () => void
  /** Label shown on the button, and read aloud, once the action has fired. */
  doneLabel?: ReactNode
  /** Said to screen readers, since holding is not obvious. */
  hint?: string
  /** Visible and spoken text; `armed` replaces the label after a single click, which waits for a second one. */
  labels?: Partial<{ armed: string }>
  /** Classes for the button. */
  className?: string
}

/** Seconds a single click stays armed before it falls back. */
const ARMED_MS = 4000

/**
 * A button for actions that should not happen by accident: it fills while held and fires when full.
 * Letting go early drains it again. Space or Enter held down works the same way.
 * A lone click (from a screen reader or switch control) arms it, and a second click within a few seconds confirms.
 */
export function HoldToConfirm({ children, duration = 1200, onConfirm, doneLabel = 'Done', hint = 'Press and hold to confirm', labels = {}, className }: HoldToConfirmProps) {
  const { armed: armedLabel = 'Click again to confirm' } = labels
  const hintId = useId()
  const reduced = useReducedMotion()
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [armed, setArmed] = useState(false)
  const sawHold = useRef(false)
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
      setArmed(false)
      setDone(true)
      fire.current()
      return
    }
    if (value.current > 0 || holding.current) frame.current = requestAnimationFrame(loop(now))
  }

  const start = () => {
    if (done) return
    sawHold.current = true
    setArmed(false)
    holding.current = true
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(loop(performance.now()))
  }
  const stop = () => {
    holding.current = false
  }
  // Losing focus or leaving ends the hold and drains the fill at once.
  const reset = () => {
    holding.current = false
    sawHold.current = false
    cancelAnimationFrame(frame.current)
    if (!done) {
      value.current = 0
      setProgress(0)
    }
    setArmed(false)
  }
  // A click that no pointer or key press came before it (a screen reader, a switch) arms the button; the next one confirms.
  const click = () => {
    if (sawHold.current) {
      sawHold.current = false
      return
    }
    if (done) return
    if (!armed) {
      setArmed(true)
      return
    }
    setArmed(false)
    value.current = 1
    setProgress(1)
    setDone(true)
    fire.current()
  }

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), ARMED_MS)
    return () => clearTimeout(t)
  }, [armed])

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
  const label = armed ? armedLabel : done ? (
    <>
      <Check className="size-4" aria-hidden />
      {doneLabel}
    </>
  ) : (
    children
  )

  return (
    <>
    <button
      type="button"
      aria-describedby={hintId}
      onClick={click}
      onBlur={reset}
      onPointerDown={start}
      onPointerUp={() => {
        stop()
        // The click that follows a press has been seen by now; later lone clicks are not holds.
        setTimeout(() => (sawHold.current = false), 100)
      }}
      onPointerLeave={() => {
        stop()
        sawHold.current = false
      }}
      onPointerCancel={() => {
        stop()
        sawHold.current = false
      }}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault()
          start()
        }
      }}
      onKeyUp={(e) => {
        if (e.key !== ' ' && e.key !== 'Enter') return
        stop()
        setTimeout(() => (sawHold.current = false), 100)
      }}
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
        className="absolute inset-0 flex items-center justify-center gap-2 bg-destructive text-background"
        style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}
      >
        {label}
      </span>
    </button>
    <span id={hintId} hidden>
      {hint}
    </span>
    <span role="status" className="sr-only">
      {done ? doneLabel : armed ? armedLabel : ''}
    </span>
    </>
  )
}
