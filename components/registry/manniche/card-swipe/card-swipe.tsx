// Based on Watermelon UI's “Card swipe” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten with buttons, arrow keys, dots and a width that follows the container.
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MotionConfig, motion, useMotionValue, useTransform, type MotionValue, type PanInfo } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type CardSwipeProps = {
  /** One node per card. */
  cards: ReactNode[]
  /** The name of the carousel, read by screen readers. Default “Cards”. */
  label?: string
  /** The accessible name of the previous button. Default “Previous”. */
  previousLabel?: string
  /** The accessible name of the next button. Default “Next”. */
  nextLabel?: string
  /** Words for slide names and the position announcement, e.g. “Card 2 of 5”. Keys: `slide`, `of`. */
  labels?: Partial<Record<'slide' | 'of', string>>
  /** Classes for the outer section. */
  className?: string
}

const GAP = 16

/** Cards in a row that turn away like pages as you swipe, drag, click or use the arrow keys. */
export function CardSwipe({ cards, label = 'Cards', previousLabel = 'Previous', nextLabel = 'Next', labels = {}, className }: CardSwipeProps) {
  const t = { slide: 'Card', of: 'of', ...labels }
  const [index, setIndex] = useState(0)
  const [width, setWidth] = useState(320)
  const frame = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const last = cards.length - 1

  useEffect(() => {
    const el = frame.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const go = (i: number) => setIndex(Math.max(0, Math.min(last, i)))

  const end = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -50 || info.velocity.x < -500) go(index + 1)
    else if (info.offset.x > 50 || info.velocity.x > 500) go(index - 1)
  }

  const arrow = 'grid size-11 place-items-center rounded-full border bg-card shadow-sm transition-opacity duration-150 disabled:opacity-30'

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 330, damping: 30 }}>
      <section
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        className={cn('mx-auto flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl', className)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(index + 1)
          if (e.key === 'ArrowLeft') go(index - 1)
        }}
      >
        <div ref={frame} className="w-full overflow-hidden">
          <motion.div
            drag="x"
            dragConstraints={{ left: -(width + GAP) * last, right: 0 }}
            onDragEnd={end}
            animate={{ x: -index * (width + GAP) }}
            style={{ x, gap: GAP, perspective: 1000 }}
            className="flex cursor-grab touch-pan-y active:cursor-grabbing"
          >
            {cards.map((card, i) => (
              <Card key={i} i={i} x={x} step={width + GAP} width={width} current={i === index} total={cards.length} labels={t}>
                {card}
              </Card>
            ))}
          </motion.div>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" aria-label={previousLabel} disabled={index === 0} onClick={() => go(index - 1)} className={arrow}>
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <div className="flex gap-1.5" aria-hidden>
            {cards.map((_, i) => (
              <motion.span key={i} animate={{ width: i === index ? 18 : 6 }} className={cn('h-1.5 rounded-full', i === index ? 'bg-foreground' : 'bg-border')} />
            ))}
          </div>
          <button type="button" aria-label={nextLabel} disabled={index === last} onClick={() => go(index + 1)} className={arrow}>
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
        <p role="status" className="sr-only">
          {t.slide} {index + 1} {t.of} {cards.length}
        </p>
      </section>
    </MotionConfig>
  )
}

type CardProps = { i: number; x: MotionValue<number>; step: number; width: number; current: boolean; total: number; labels: { slide: string; of: string }; children: ReactNode }

function Card({ i, x, step, width, current, total, labels, children }: CardProps) {
  // Turns 90° as it slides one full step away in either direction.
  const rotateY = useTransform(x, [-(i + 1) * step, -i * step, -(i - 1) * step], [90, 0, -90], { clamp: false })
  return (
    <motion.div
      role="group"
      aria-roledescription="slide"
      aria-label={`${labels.slide} ${i + 1} ${labels.of} ${total}`}
      aria-hidden={!current}
      inert={!current}
      style={{ width, rotateY }}
      className="shrink-0 select-none"
    >
      {children}
    </motion.div>
  )
}
