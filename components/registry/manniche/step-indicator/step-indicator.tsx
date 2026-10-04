// Based on Watermelon UI's “Step indicator” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten with a current step, one moving label and no hidden measuring row.
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StepIndicatorStep = { id: string; label: string; icon?: ReactNode }

export type StepIndicatorProps = {
  steps: StepIndicatorStep[]
  /** Index of the step the person is on. Earlier steps are filled. */
  current: number
  onStepChange?: (index: number) => void
  label?: string
  className?: string
}

/** A row of bars for a multi-step flow. Hover or focus a bar and its name slides over to it. */
export function StepIndicator({ steps, current, onStepChange, label = 'Progress', className }: StepIndicatorProps) {
  const [hover, setHover] = useState<number | null>(null)
  const [x, setX] = useState(0)
  const row = useRef<HTMLDivElement>(null)
  const bars = useRef<(HTMLButtonElement | null)[]>([])
  const [slide, setSlide] = useState(false)

  const show = (i: number) => {
    const b = bars.current[i]
    const r = row.current
    if (!b || !r) return
    setSlide(hover !== null)
    setX(b.offsetLeft + b.offsetWidth / 2)
    setHover(i)
  }

  const step = hover === null ? null : steps[hover]

  return (
    <MotionConfig reducedMotion="user">
      <nav aria-label={label} className={cn('w-full', className)}>
        <div ref={row} className="relative flex h-3 items-center gap-2.5" onPointerLeave={() => setHover(null)}>
          <AnimatePresence>
            {step && (
              <motion.div
                key="tip"
                aria-hidden
                initial={{ opacity: 0, x, y: 4 }}
                animate={{ opacity: 1, x, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ type: 'spring', bounce: 0, duration: slide ? 0.4 : 0 }}
                className="pointer-events-none absolute bottom-6 left-0"
              >
                <div className="-translate-x-1/2 overflow-hidden rounded-full bg-foreground px-4 py-2 text-background">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={step.id}
                      initial={{ opacity: 0, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, filter: 'blur(4px)' }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center gap-2 text-sm font-medium whitespace-nowrap [&_svg]:size-4"
                    >
                      {step.icon}
                      {step.label}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {steps.map((s, i) => (
            <button
              key={s.id}
              ref={(el) => {
                bars.current[i] = el
              }}
              type="button"
              aria-label={`${i + 1}. ${s.label}`}
              aria-current={i === current ? 'step' : undefined}
              onPointerEnter={() => show(i)}
              onFocus={() => show(i)}
              onBlur={() => setHover(null)}
              onClick={() => onStepChange?.(i)}
              className="group relative h-3 flex-1 outline-none before:absolute before:-inset-y-3 before:inset-x-0"
            >
              <span
                className={cn(
                  'absolute inset-0 rounded-full transition-colors duration-300',
                  'group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background',
                  i <= current ? 'bg-foreground' : 'bg-muted',
                  hover === i && i > current && 'bg-muted-foreground/40',
                )}
              />
            </button>
          ))}
        </div>
      </nav>
    </MotionConfig>
  )
}
