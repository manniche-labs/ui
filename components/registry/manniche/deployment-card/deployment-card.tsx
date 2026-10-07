// Based on Watermelon UI's “Deployment card” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten as a controlled card: you pass the steps, it animates what changes.
import { Check, ChevronDown, CircleAlert, GitBranch, LoaderCircle, TriangleAlert } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type DeploymentStepStatus = 'pending' | 'running' | 'success' | 'warning' | 'error'

export type DeploymentStep = {
  id: string
  label: string
  status: DeploymentStepStatus
  /** 0 to 1. Drawn as the bar under the step. */
  progress: number
  duration?: string
  /** Shown when the step is opened, for logs or numbers. */
  details?: ReactNode
}

export type DeploymentCardProps = {
  /** The name of the project, shown as the heading. */
  title: string
  /** The small line above the title, such as the environment name. */
  environment: string
  /** The branch name, shown in monospace under the title. */
  branch: string
  /** The commit id, shown after the branch. */
  commit: string
  /** The commit message, shown on one line under the branch. */
  message: string
  /** The steps to list, in order; each gets a status, a bar and optional details. */
  steps: DeploymentStep[]
  /** Overall state in the header. */
  state: 'building' | 'ready' | 'failed'
  /** The text shown for each overall state in the header, with English defaults. */
  stateLabels?: Record<DeploymentCardProps['state'], string>
  /** Screen reader text for each step status, plus `progress`, the word added to each step's progress bar name. */
  labels?: Partial<Record<DeploymentStepStatus | 'progress', string>>
  /** Buttons for the footer, aligned to the right. The footer is left out without them. */
  actions?: ReactNode
  /** Classes for the outer article. */
  className?: string
}

const tone: Record<DeploymentStepStatus, string> = {
  pending: 'text-muted-foreground',
  running: 'text-foreground',
  success: 'text-success',
  warning: 'text-amber-500',
  error: 'text-destructive',
}
const bar: Record<DeploymentStepStatus, string> = {
  pending: 'bg-border',
  running: 'bg-foreground',
  success: 'bg-success',
  warning: 'bg-amber-500',
  error: 'bg-destructive',
}

const EN = { pending: 'Pending', running: 'Running', success: 'Succeeded', warning: 'Finished with warnings', error: 'Failed', progress: 'progress' }

function StepIcon({ status }: { status: DeploymentStepStatus }) {
  const cls = 'size-4'
  if (status === 'running') return <LoaderCircle className={cn(cls, 'animate-spin motion-reduce:animate-none')} aria-hidden />
  if (status === 'success') return <Check className={cls} strokeWidth={3} aria-hidden />
  if (status === 'warning') return <TriangleAlert className={cls} aria-hidden />
  if (status === 'error') return <CircleAlert className={cls} aria-hidden />
  return <span className="block size-2 rounded-full bg-current opacity-50" aria-hidden />
}

/** A build and deploy card: status in the header, one animated bar per step, and details that fold out. */
export function DeploymentCard({
  title,
  environment,
  branch,
  commit,
  message,
  steps,
  state,
  stateLabels = { building: 'Building', ready: 'Ready', failed: 'Failed' },
  labels = {},
  actions,
  className,
}: DeploymentCardProps) {
  const t = { ...EN, ...labels }
  const [openId, setOpenId] = useState<string | null>(null)
  const dot = state === 'ready' ? 'bg-success' : state === 'failed' ? 'bg-destructive' : 'bg-amber-500'

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
      <article className={cn('w-full max-w-md overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-sm', className)}>
        <header className="flex items-start gap-3 border-b p-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{environment}</p>
            <h3 className="truncate font-semibold">{title}</h3>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="size-3.5" aria-hidden />
              <span className="font-mono">{branch}</span>
              <span aria-hidden>·</span>
              <span className="font-mono">{commit}</span>
            </p>
            <p className="mt-1 truncate text-sm">{message}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium" role="status">
            <span className="relative flex size-2">
              {state === 'building' && <span className={cn('absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:animate-none', dot)} />}
              <span className={cn('relative size-2 rounded-full transition-colors duration-300 motion-reduce:transition-none', dot)} />
            </span>
            {stateLabels[state]}
          </span>
        </header>
        <ol className="divide-y">
          {steps.map((s) => {
            const open = openId === s.id
            const pct = Math.round(Math.max(0, Math.min(1, s.progress)) * 100)
            return (
              <li key={s.id} className="relative transition-colors duration-150 motion-reduce:transition-none has-[button:enabled]:hover:bg-muted/50">
                <div className="flex items-center gap-3 px-5 py-3.5">
                  <span className={cn('grid size-6 shrink-0 place-items-center rounded-full bg-muted transition-colors duration-300 motion-reduce:transition-none', tone[s.status])}>
                    <StepIcon status={s.status} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <button
                      type="button"
                      aria-expanded={s.details ? open : undefined}
                      disabled={!s.details}
                      onClick={() => setOpenId(open ? null : s.id)}
                      className="flex w-full items-center justify-between gap-2 text-left text-sm focus-visible:outline-none after:absolute after:inset-0 focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                    >
                      <span className={cn('truncate font-medium', s.status === 'pending' && 'text-muted-foreground')}>
                        {s.label}
                        <span className="sr-only">: {t[s.status]}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{s.duration}</span>
                    </button>
                    <span
                      role="progressbar"
                      aria-label={`${s.label} ${t.progress}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={pct}
                      className="mt-2 block h-1 overflow-hidden rounded-full bg-muted"
                    >
                      <motion.span
                        className={cn('block h-full origin-left rounded-full transition-colors duration-300 motion-reduce:transition-none', bar[s.status])}
                        initial={false}
                        animate={{ scaleX: pct / 100 }}
                      />
                    </span>
                  </span>
                  {s.details && (
                    <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} aria-hidden />
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-5 pb-4 pl-14 text-sm text-muted-foreground">{s.details}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ol>
        {actions && <footer className="flex justify-end gap-2 border-t bg-muted/30 p-3">{actions}</footer>}
      </article>
    </MotionConfig>
  )
}
