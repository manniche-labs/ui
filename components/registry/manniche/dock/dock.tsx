// Based on Watermelon UI's “Dock” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten as a real toolbar with labels, arrow keys and a controlled value.
import { MotionConfig, motion } from 'motion/react'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type DockItem = { id: string; label: string; icon: ReactNode }

export type DockProps = {
  items: DockItem[]
  value: string | null
  onValueChange: (id: string) => void
  /** Accessible name for the toolbar. */
  label?: string
  className?: string
}

/** A row of app icons that lift on hover and bounce when picked. The open one gets a dot. */
export function Dock({ items, value, onValueChange, label = 'Dock', className }: DockProps) {
  const [bounce, setBounce] = useState<{ id: string; n: number } | null>(null)
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const pick = (id: string) => {
    onValueChange(id)
    setBounce((b) => ({ id, n: (b?.n ?? 0) + 1 }))
  }

  // One tab stop for the whole dock; the arrow keys move between icons.
  const keys = (e: KeyboardEvent, i: number) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    const to = step ? (i + step + items.length) % items.length : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : -1
    if (to < 0) return
    e.preventDefault()
    refs.current[to]?.focus()
  }

  const focusable = Math.max(0, items.findIndex((it) => it.id === value))

  return (
    <MotionConfig reducedMotion="user">
      <div
        role="toolbar"
        aria-label={label}
        className={cn('inline-flex items-end gap-2 rounded-3xl border bg-card px-2.5 pt-2.5 pb-1.5 shadow-sm', className)}
      >
        {items.map((it, i) => {
          const active = it.id === value
          return (
            <div key={it.id} className="group relative flex flex-col items-center">
              <span className="pointer-events-none absolute -top-9 rounded-lg bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-has-focus-visible:opacity-100">
                {it.label}
              </span>
              <motion.button
                ref={(el) => {
                  refs.current[i] = el
                }}
                type="button"
                aria-label={it.label}
                aria-pressed={active}
                tabIndex={i === focusable ? 0 : -1}
                onClick={() => pick(it.id)}
                onKeyDown={(e) => keys(e, i)}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 550, damping: 15, mass: 1.1 }}
                className="rounded-xl"
              >
                {/* A new key replays the bounce without remounting the button, so focus stays put. */}
                <motion.span
                  key={bounce?.id === it.id ? bounce.n : 0}
                  style={{ transformOrigin: 'bottom' }}
                  initial={bounce?.id === it.id ? { scale: 1.3, y: -8 } : false}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 550, damping: 15, mass: 1.1 }}
                  className={cn(
                    'grid size-11 place-items-center rounded-xl bg-muted transition-colors duration-200 [&_svg]:size-5',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {it.icon}
                </motion.span>
              </motion.button>
              <span
                aria-hidden
                className={cn('mt-1 size-1 rounded-full bg-foreground/50 transition-opacity duration-300', active ? 'opacity-100' : 'opacity-0')}
              />
            </div>
          )
        })}
      </div>
    </MotionConfig>
  )
}
