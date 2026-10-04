// Based on Watermelon UI's “List stack” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten so the list keeps its height, reads in order and opens with a real button.
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ListStackItem = { id: string; title: string; detail?: string; meta?: string; icon?: ReactNode }

export type ListStackProps = {
  items: ListStackItem[]
  showLabel?: string
  hideLabel?: string
  className?: string
}

const ROW = 64
const GAP = 8

/** A short list folded into a stack of cards. Open it and the cards fan out into rows. */
export function ListStack({ items, showLabel = 'Show all', hideLabel = 'Hide', className }: ListStackProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const n = items.length
  const height = open ? n * (ROW + GAP) : ROW + 2 * 8

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 200, damping: 24 }}>
      <div className={cn('mx-auto flex w-full max-w-xs flex-col items-center gap-3', className)}>
        <motion.ul id={id} initial={false} animate={{ height }} className="relative w-full [perspective:1000px]">
          {items.map((it, i) => {
            // The first item sits on top of the stack; the rest tuck in behind it, smaller.
            const depth = i
            return (
              <motion.li
                key={it.id}
                initial={false}
                animate={
                  open
                    ? { y: i * (ROW + GAP), scale: 1, opacity: 1 }
                    : { y: Math.min(depth, 2) * 8, scale: 1 - Math.min(depth, 3) * 0.05, opacity: depth > 2 ? 0 : 1 }
                }
                style={{ height: ROW, zIndex: n - i, transformOrigin: 'top center' }}
                aria-hidden={!open && i > 0}
                className="absolute inset-x-0 top-0 flex items-center gap-3 rounded-2xl border bg-card px-3 shadow-sm"
              >
                {it.icon && (
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground text-background [&_svg]:size-5">{it.icon}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{it.title}</span>
                  {it.detail && <span className="block truncate text-xs text-muted-foreground">{it.detail}</span>}
                </span>
                {it.meta && <span className="shrink-0 self-end pb-3 text-xs text-muted-foreground">{it.meta}</span>}
              </motion.li>
            )
          })}
        </motion.ul>
        <motion.button
          layout
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="min-h-11 overflow-hidden rounded-full border bg-card px-5 text-sm font-medium shadow-sm"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={String(open)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="block">
              {open ? hideLabel : `${showLabel} (${n})`}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </MotionConfig>
  )
}
