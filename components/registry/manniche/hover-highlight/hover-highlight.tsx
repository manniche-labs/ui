import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react'
import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type HoverHighlightItem = {
  title: string
  text: ReactNode
  href?: string
}

export type HoverHighlightProps = {
  /** The cards, each with a title, a text and an optional href that makes it a link. */
  items: HoverHighlightItem[]
  /** Classes for the list. */
  className?: string
}

/**
 * A grid of cards where one soft highlight glides to the card under the pointer or with keyboard focus.
 * Under reduced motion the highlight appears on the card without sliding.
 */
export function HoverHighlight({ items, className }: HoverHighlightProps) {
  const [on, setOn] = useState<number | null>(null)
  const group = useId()

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id={group}>
        <ul className={cn('grid gap-2 sm:grid-cols-2 lg:grid-cols-3', className)} onPointerLeave={() => setOn(null)}>
          {items.map((item, i) => {
            const Tag = item.href ? 'a' : 'div'
            return (
              <li key={item.title} className="relative" onPointerEnter={() => setOn(i)}>
                <AnimatePresence>
                  {on === i && (
                    <motion.span
                      layoutId="highlight"
                      aria-hidden
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{
                        opacity: 0,
                        transition: { duration: 0.15, delay: 0.1 },
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 36,
                      }}
                      className="absolute inset-0 rounded-2xl bg-muted"
                    />
                  )}
                </AnimatePresence>
                <Tag
                  {...(item.href ? { href: item.href } : {})}
                  onFocus={() => setOn(i)}
                  onBlur={() => setOn(null)}
                  className="relative grid h-full gap-1 rounded-2xl border bg-card/60 p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-medium">{item.title}</span>
                  <span className="text-sm text-muted-foreground">{item.text}</span>
                </Tag>
              </li>
            )
          })}
        </ul>
      </LayoutGroup>
    </MotionConfig>
  )
}
