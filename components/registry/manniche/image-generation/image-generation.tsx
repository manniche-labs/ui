import { Check, Sparkles } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ImageGenerationProps = {
  /** 0 to 1. At 1 the result is shown. */
  progress: number
  /** The finished image, usually an <img>. Rendered behind the blur while it sharpens. */
  children?: ReactNode
  /** The prompt that made the image. It names the image for screen readers once it is ready. */
  prompt?: string
  /** A small badge in the corner, e.g. “1024 × 1024”. */
  size?: string
  /** Screen reader text with English defaults. Keys: `working` and `ready`. */
  labels?: Partial<Record<'working' | 'ready', string>>
  /** Classes for the outer figure. */
  className?: string
}

const EN = { working: 'Creating image', ready: 'Image ready' }

/** A tile that shows an image being made: a soft glow that sharpens into the result as progress rises. */
export function ImageGeneration({ progress, children, prompt, size, labels = {}, className }: ImageGenerationProps) {
  const t = { ...EN, ...labels }
  const p = Math.min(1, Math.max(0, progress))
  const done = p >= 1

  return (
    <MotionConfig reducedMotion="user">
      <figure className={cn('w-full max-w-xs', className)}>
        <div
          role="img"
          aria-label={done ? (prompt ?? t.ready) : `${t.working}, ${Math.round(p * 100)}%`}
          className="relative isolate aspect-square overflow-hidden rounded-3xl border bg-muted"
        >
          {/* The result sits underneath from the start and comes into focus as progress rises. */}
          <motion.div
            className="absolute inset-0"
            initial={false}
            animate={{ filter: `blur(${done ? 0 : 28 - p * 20}px)`, scale: done ? 1 : 1.12 - p * 0.06, opacity: done ? 1 : 0.15 + p * 0.55 }}
            transition={{ type: 'spring', bounce: 0, duration: done ? 0.9 : 0.6 }}
          >
            {children}
          </motion.div>

          {/* Drifting light while the image is being made. */}
          <AnimatePresence>
            {!done && (
              <motion.div key="glow" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.6 } }}>
                <span className="absolute -inset-1/4 animate-[spin_9s_linear_infinite] bg-[conic-gradient(from_0deg,transparent,color-mix(in_oklch,var(--color-primary)_35%,transparent),transparent_40%,color-mix(in_oklch,var(--color-foreground)_18%,transparent),transparent_75%)] blur-2xl motion-reduce:animate-none" />
                <span className="absolute inset-x-0 bottom-0 h-1 bg-foreground/10">
                  <motion.span className="block h-full origin-left bg-foreground/70" initial={false} animate={{ scaleX: p }} transition={{ type: 'spring', bounce: 0, duration: 0.5 }} />
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {size && <span className="absolute top-2.5 right-2.5 rounded-full bg-background/70 px-2 py-0.5 font-mono text-[11px] text-muted-foreground backdrop-blur">{size}</span>}
        </div>

        <figcaption className="mt-3" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={done ? 'ready' : 'working'}
              initial={{ opacity: 0, y: 6, filter: 'blur(2px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(2px)' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="flex items-center gap-2 text-sm font-medium"
            >
              {done ? <Check className="size-4" aria-hidden /> : <Sparkles className="size-4 animate-pulse motion-reduce:animate-none" aria-hidden />}
              {done ? t.ready : t.working}
              {!done && <span aria-hidden className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">{Math.round(p * 100)}%</span>}
            </motion.p>
          </AnimatePresence>
          {prompt && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">“{prompt}”</p>}
        </figcaption>
      </figure>
    </MotionConfig>
  )
}
