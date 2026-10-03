import { Check, ChevronDown, X } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type TaskStatus = 'queued' | 'running' | 'done' | 'failed'

export type Task = {
  id: string
  title: string
  status: TaskStatus
  /** Short count or result shown on the right, e.g. “12 suppliers”. */
  meta?: string
  /** Shown when the row is opened: steps, a log, a result. */
  detail?: ReactNode
}

export type TaskRowsProps = {
  tasks: Task[]
  labels?: Partial<Record<TaskStatus, string>>
  className?: string
}

const EN: Record<TaskStatus, string> = { queued: 'Waiting', running: 'Working', done: 'Done', failed: 'Failed' }

function Marker({ status, n }: { status: TaskStatus; n: number }) {
  if (status === 'done')
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success text-background">
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </span>
    )
  if (status === 'failed')
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-destructive text-background">
        <X className="size-3.5" strokeWidth={3} aria-hidden />
      </span>
    )
  return (
    <span className="relative grid size-6 shrink-0 place-items-center text-xs font-semibold tabular-nums">
      {status === 'running' ? (
        // A ring with a gap that turns while the agent works; reduced motion keeps it still.
        <svg viewBox="0 0 24 24" className="absolute inset-0 animate-spin text-foreground [animation-duration:1.4s] motion-reduce:animate-none" aria-hidden>
          <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="48 18" />
        </svg>
      ) : (
        <span className="absolute inset-0 rounded-full border" aria-hidden />
      )}
      {n}
    </span>
  )
}

/** Rows that show what an agent is doing, one task each, with the details tucked away until opened. */
export function TaskRows({ tasks, labels = {}, className }: TaskRowsProps) {
  const t = { ...EN, ...labels }
  const [open, setOpen] = useState<string | null>(null)
  const base = useId()

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>
      <ol className={cn('w-full space-y-2', className)}>
        {tasks.map((task, i) => {
          const isOpen = open === task.id
          const panel = `${base}-${task.id}`
          return (
            <motion.li key={task.id} layout style={{ borderRadius: 16 }} className="relative overflow-hidden rounded-2xl border bg-card text-card-foreground">
              <motion.button
                layout="position"
                type="button"
                aria-expanded={isOpen}
                aria-controls={panel}
                disabled={!task.detail}
                onClick={() => setOpen(isOpen ? null : task.id)}
                className="flex min-h-12 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted/60 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <Marker status={task.status} n={i + 1} />
                <span className={cn('min-w-0 flex-1 truncate text-sm font-medium', task.status === 'queued' && 'text-muted-foreground')}>{task.title}</span>
                {task.meta && <span className="hidden text-sm text-muted-foreground tabular-nums sm:inline">{task.meta}</span>}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={task.status}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      task.status === 'done' && 'bg-success/15 text-success',
                      task.status === 'failed' && 'bg-destructive/15 text-destructive',
                      task.status === 'running' && 'bg-muted text-foreground',
                      task.status === 'queued' && 'text-muted-foreground',
                    )}
                  >
                    {t[task.status]}
                  </motion.span>
                </AnimatePresence>
                {task.detail && (
                  <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} aria-hidden />
                )}
              </motion.button>
              {/* The row grows with a layout (transform) animation; the detail only fades. */}
              <AnimatePresence initial={false} mode="popLayout">
                {isOpen && (
                  <motion.div
                    id={panel}
                    key="detail"
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full text-sm text-muted-foreground"
                  >
                    <div className="border-t border-dashed px-4 py-3 pl-12">{task.detail}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          )
        })}
      </ol>
    </MotionConfig>
  )
}
