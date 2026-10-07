// Based on Watermelon UI's “Stepper” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten with keyboard support and labels.
import { Minus, Plus } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { RollingNumber } from '@/registry/manniche/rolling-number/rolling-number'
import { cn } from '@/lib/utils'

export type StepperProps = {
  /** Controlled value. Leave it out and the stepper keeps its own. */
  value?: number
  /** Starting value when the stepper is not controlled. */
  defaultValue?: number
  /** Lowest value; the minus button turns off there. */
  min?: number
  /** Highest value; the plus button turns off there. */
  max?: number
  /** Amount added or taken away per press. */
  step?: number
  /** Read aloud by screen readers, e.g. "Guests". */
  label: string
  /** Called with the new value after each press. */
  onChange?: (value: number) => void
  /** Classes for the outer box around the buttons and value. */
  className?: string
}

export function Stepper({ value, defaultValue = 0, min = 0, max = 99, step = 1, label, onChange, className }: StepperProps) {
  const [own, setOwn] = useState(defaultValue)
  const current = value ?? own

  const set = (next: number) => {
    const v = Math.min(max, Math.max(min, next))
    if (v === current) return
    setOwn(v)
    onChange?.(v)
  }

  // The number is a spinbutton, so arrow keys, Home and End work as in a native number input.
  const onKey = (e: KeyboardEvent) => {
    const to: Record<string, number> = {
      ArrowUp: current + step,
      ArrowRight: current + step,
      ArrowDown: current - step,
      ArrowLeft: current - step,
      Home: min,
      End: max,
    }
    if (e.key in to) {
      e.preventDefault()
      set(to[e.key])
    }
  }

  const btn =
    'grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-foreground transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40'

  return (
    <div className={cn('inline-flex items-center gap-2 rounded-2xl border bg-card p-1.5 shadow-sm', className)}>
      <button type="button" className={btn} onClick={() => set(current - step)} disabled={current <= min} aria-label={`Fewer: ${label}`}>
        <Minus className="size-4" aria-hidden />
      </button>
      <div
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuenow={current}
        aria-valuemin={min}
        aria-valuemax={max}
        onKeyDown={onKey}
        className="min-w-12 rounded-lg px-1 text-center text-2xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RollingNumber value={current} />
      </div>
      <button type="button" className={btn} onClick={() => set(current + step)} disabled={current >= max} aria-label={`More: ${label}`}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  )
}
