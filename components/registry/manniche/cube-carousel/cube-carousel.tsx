import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type CubeCarouselProps = {
  /** One slide per face. Only the four around the cube are used at a time, so any number works. */
  slides: ReactNode[]
  /** Read by screen readers, e.g. “New arrivals”. */
  label: string
  /** Screen reader and button text with English defaults. Keys: `previous`, `next` and `slide`. */
  labels?: Partial<Record<'previous' | 'next' | 'slide', string>>
  /** Classes for the outer section. */
  className?: string
}

const EN = { previous: 'Previous', next: 'Next', slide: 'Slide' }

/**
 * A carousel on the sides of a cube: each step turns it a quarter round.
 * Drag, swipe, the arrow keys or the buttons all turn it.
 */
export function CubeCarousel({ slides, label, labels = {}, className }: CubeCarouselProps) {
  const t = { ...EN, ...labels }
  const [turn, setTurn] = useState(0) // counts quarter turns, may go negative or past the end
  const reduce = useReducedMotion()
  const n = slides.length
  const index = ((turn % n) + n) % n
  const go = (d: number) => setTurn((v) => v + d)

  // The four faces around the current one: which slide each face shows, worked out from the turn count.
  const faces = [0, 1, 2, 3].map((face) => {
    const offset = (((face - turn) % 4) + 4) % 4 // 0 front, 1 right, 2 back, 3 left
    const step = offset === 3 ? -1 : offset
    return { face, slide: (((turn + step) % n) + n) % n, front: offset === 0 }
  })

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      className={cn('w-full max-w-sm rounded-2xl', className)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1)
        else if (e.key === 'ArrowLeft') go(-1)
      }}
    >
      {/* The frame is a size container, so the cube's depth (half a side) can be written as 50cqw. */}
      <motion.div
        className="@container relative aspect-[4/3] touch-pan-y [perspective:1100px]"
        onPanEnd={(_, info) => {
          if (Math.abs(info.offset.x) > 40) go(info.offset.x < 0 ? 1 : -1)
        }}
      >
        {/* Pull the cube back by half a side so the front face sits where the frame is. */}
        <div className="absolute inset-0 [transform:translateZ(-50cqw)] [transform-style:preserve-3d]">
          <motion.div
            className="absolute inset-0 [transform-style:preserve-3d]"
            initial={false}
            animate={{ rotateY: -turn * 90 }}
            transition={reduce ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.7 }}
          >
            {faces.map(({ face, slide, front }) => (
              <div
                key={face}
                role="group"
                aria-roledescription="slide"
                aria-label={`${t.slide} ${slide + 1} / ${n}`}
                aria-hidden={!front}
                inert={!front}
                className="absolute inset-0 overflow-hidden rounded-2xl border bg-card [backface-visibility:hidden]"
                style={{ transform: `rotateY(${face * 90}deg) translateZ(50cqw)` }}
              >
                {slides[slide]}
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" onClick={() => go(-1)} aria-label={t.previous} className="grid size-11 place-items-center rounded-full border transition-colors duration-150 hover:bg-muted">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
          {index + 1} / {n}
        </p>
        <button type="button" onClick={() => go(1)} aria-label={t.next} className="grid size-11 place-items-center rounded-full border transition-colors duration-150 hover:bg-muted">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
    </section>
  )
}
