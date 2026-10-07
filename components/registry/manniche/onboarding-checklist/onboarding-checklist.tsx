// Based on Watermelon UI's “Onboarding checklist” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten with a real disclosure button and actionable steps.
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

export type ChecklistStep = {
  id: string
  title: string
  done?: boolean
  /** Runs when the person picks a step that is not done yet. */
  onSelect?: () => void
}

export type OnboardingChecklistProps = {
  /** The steps to list, in order. The first one not done is marked as next. */
  steps: ChecklistStep[]
  /** The text on the button that opens and closes the list. Default “Getting started”. */
  title?: string
  /** Start with the list open. Default false. */
  defaultOpen?: boolean
  /** Words for the progress meter and finished steps: `progress` (meter name), `of`, `done` (read as “2 of 5 done”) and `stepDone` (read before a finished step). */
  labels?: Partial<Record<'progress' | 'of' | 'done' | 'stepDone', string>>
  /** Classes for the outer section. */
  className?: string
}

const BARS = 14

/** A collapsible “getting started” card with a segmented progress meter. The first open step is marked as next. */
export function OnboardingChecklist({ steps, title = 'Getting started', defaultOpen = false, labels = {}, className }: OnboardingChecklistProps) {
  const t = { progress: 'Progress', of: 'of', done: 'done', stepDone: 'Done:', ...labels }
  const [open, setOpen] = useState(defaultOpen)
  const panel = useId()
  const done = steps.filter((s) => s.done).length
  const next = steps.find((s) => !s.done)?.id
  const spring = { type: 'spring', stiffness: 300, damping: 35 } as const

  return (
    <MotionConfig reducedMotion="user" transition={spring}>
      <motion.section layout style={{ borderRadius: 16 }} className={cn('relative w-full overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm', className)}>
        <motion.button
          layout="position"
          type="button"
          aria-expanded={open}
          aria-controls={panel}
          onClick={() => setOpen(!open)}
          className="flex min-h-14 w-full items-center gap-3 px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <ChevronDown className={cn('size-5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} aria-hidden />
          <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
          <span className="flex shrink-0 items-center gap-3">
            <span
              role="progressbar"
              aria-label={t.progress}
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={done}
              aria-valuetext={`${done} ${t.of} ${steps.length} ${t.done}`}
              className="flex gap-1 max-[399px]:sr-only"
            >
              {Array.from({ length: BARS }, (_, i) => (
                <span
                  key={i}
                  className={cn('h-4 w-1 rounded-full transition-colors duration-500 motion-reduce:transition-none', i < (done / Math.max(1, steps.length)) * BARS ? 'bg-primary' : 'bg-muted')}
                />
              ))}
            </span>
            <span className="font-mono text-sm text-muted-foreground tabular-nums">
              {done}/{steps.length}
            </span>
          </span>
        </motion.button>

        {/* The card grows with a layout (transform) animation; the list only fades. popLayout lets the card shrink while it fades out. */}
        <AnimatePresence initial={false} mode="popLayout">
          {open && (
            <motion.div
              id={panel}
              layout="position"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full border-t bg-background"
            >
              <ol className="space-y-1 p-2">
                {steps.map((step, i) => (
                  <li key={step.id}>
                    <button
                      type="button"
                      disabled={step.done}
                      onClick={step.onSelect}
                      aria-current={step.id === next ? 'step' : undefined}
                      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors duration-150 enabled:hover:bg-accent/60 disabled:cursor-default"
                    >
                      {step.done ? (
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3.5" strokeWidth={3} aria-hidden />
                          <span className="sr-only">{t.stepDone}</span>
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'grid size-6 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold',
                            step.id === next ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground',
                          )}
                        >
                          {i + 1}
                        </span>
                      )}
                      <span className={cn('min-w-0 flex-1 truncate text-sm font-medium', step.done && 'text-muted-foreground line-through decoration-muted-foreground/40')}>
                        {step.title}
                      </span>
                      {!step.done && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                    </button>
                  </li>
                ))}
              </ol>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </MotionConfig>
  )
}
