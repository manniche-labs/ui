import { ChevronDown, X } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StackedNotification = {
  id: string
  title: string
  body?: string
  /** Already formatted, e.g. “2 min ago”. */
  time?: string
  icon?: ReactNode
}

export type NotificationStackProps = {
  /** The notifications, in order. The first one is the top card when the pile is folded. */
  items: StackedNotification[]
  /** Called with the notification id when its dismiss button is pressed. Without it there are no dismiss buttons. */
  onDismiss?: (id: string) => void
  /** Visible and screen reader text with English defaults. Keys: `title`, `show`, `hide`, `dismiss` and `empty`. */
  labels?: Partial<Record<'title' | 'show' | 'hide' | 'dismiss' | 'empty', string>>
  /** Classes for the outer section. */
  className?: string
}

const EN = { title: 'Notifications', show: 'Show all', hide: 'Show less', dismiss: 'Dismiss', empty: 'All caught up' }
const PEEK = 3 // cards visible behind the first one when folded

/** Notifications folded into a neat pile that fans out into a list when opened. */
export function NotificationStack({ items, onDismiss, labels = {}, className }: NotificationStackProps) {
  const t = { ...EN, ...labels }
  const [open, setOpen] = useState(false)
  const list = useId()
  const folded = !open && items.length > 1
  const known = useRef(new Set(items.map((n) => n.id)))
  // The count keys the text, so the same words twice in a row are still read out the second time.
  const [announced, setAnnounced] = useState({ n: 0, text: '' })

  // A new notification is read out once, by a hidden status that is in the DOM from the first render.
  useEffect(() => {
    const fresh = items.filter((n) => !known.current.has(n.id))
    known.current = new Set(items.map((n) => n.id))
    if (fresh.length) setAnnounced((a) => ({ n: a.n + 1, text: fresh.map((n) => [n.title, n.body].filter(Boolean).join('. ')).join('. ') }))
  }, [items])

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 380, damping: 38 }}>
      <section aria-label={t.title} className={cn('w-full min-w-0 max-w-sm', className)}>
        <p role="status" className="sr-only">
          <span key={announced.n}>{announced.text}</span>
        </p>
        <header className="mb-2 flex min-h-11 items-center justify-between px-1">
          <h2 className="text-sm font-semibold">
            {t.title} <span className="font-normal text-muted-foreground tabular-nums">{items.length}</span>
          </h2>
          {items.length > 1 && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={list}
              onClick={() => setOpen(!open)}
              className="inline-flex min-h-10 relative after:inset-x-0 after:-inset-y-0.5 after:absolute after:content-[''] items-center gap-1 rounded-full px-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground motion-reduce:transition-none"
            >
              {open ? t.hide : t.show}
              <ChevronDown className={cn('size-4 transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} aria-hidden />
            </button>
          )}
        </header>

        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          // Folded, every card sits in the same grid cell; open, they become a column. Layout animation moves between the two.
          <motion.ol id={list} layout className={cn('relative', folded ? 'grid pb-[22px]' : 'flex flex-col gap-2')}>
            <AnimatePresence initial={false} mode="popLayout">
              {items.map((n, i) => {
                const hidden = folded && i > PEEK - 1
                return (
                  <motion.li
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: hidden ? 0 : 1, y: folded ? i * 11 : 0, scale: folded ? 1 - i * 0.05 : 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    aria-hidden={folded && i > 0 ? true : undefined}
                    style={{ zIndex: items.length - i, borderRadius: 16, gridArea: folded ? '1 / 1' : undefined, transformOrigin: 'top center' }}
                    className={cn('flex items-start gap-3 border bg-card p-3 text-card-foreground shadow-sm', hidden && 'pointer-events-none')}
                  >
                    {n.icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted [&_svg]:size-4">{n.icon}</span>}
                    <motion.div layout="position" className="min-w-0 flex-1">
                      <p className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{n.title}</span>
                        {n.time && <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>}
                      </p>
                      {n.body && <p className={cn('mt-0.5 text-sm text-muted-foreground', folded ? 'line-clamp-1' : 'line-clamp-2')}>{n.body}</p>}
                    </motion.div>
                    {onDismiss && (!folded || i === 0) && (
                      <button
                        type="button"
                        aria-label={`${t.dismiss}: ${n.title}`}
                        onClick={() => onDismiss(n.id)}
                        className="-mt-1 -mr-1 grid size-9 relative after:-inset-1 after:absolute after:content-[''] shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground motion-reduce:transition-none"
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    )}
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </motion.ol>
        )}
      </section>
    </MotionConfig>
  )
}
