import { Check, Circle, LoaderCircle, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AgentStepStatus = 'pending' | 'running' | 'done' | 'error'

export type AgentStep = {
  id: string
  /** What the agent does, in plain words: "Reading the invoice". */
  label: string
  status: AgentStepStatus
  /** A short detail under the label, e.g. a file name or an error. */
  detail?: string
  /** How long the step took, in milliseconds. Shown when the step is done. */
  ms?: number
}

export type AgentActivityProps = {
  steps: AgentStep[]
  title?: string
  className?: string
}

const ICON = {
  pending: <Circle className="size-4 text-muted-foreground/60" aria-hidden />,
  running: <LoaderCircle className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden />,
  done: <Check className="size-4 text-success" aria-hidden />,
  error: <TriangleAlert className="size-4 text-destructive" aria-hidden />,
}

const SPOKEN: Record<AgentStepStatus, string> = { pending: 'waiting', running: 'in progress', done: 'done', error: 'failed' }

function seconds(ms: number) {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`
}

export function AgentActivity({ steps, title = 'Working', className }: AgentActivityProps) {
  const done = steps.filter((s) => s.status === 'done').length
  const running = steps.find((s) => s.status === 'running')

  return (
    <section className={cn('rounded-2xl border bg-card p-4 text-card-foreground shadow-sm', className)} aria-label={title}>
      <header className="mb-3 flex items-baseline justify-between gap-4">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground tabular-nums">
          {done} of {steps.length}
        </p>
      </header>

      {/* Only the step in progress is announced, so a screen reader is not flooded. */}
      <p className="sr-only" aria-live="polite">
        {running ? running.label : done === steps.length ? 'All steps done' : ''}
      </p>

      <ol className="relative">
        {steps.map((step, i) => (
          <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && (
              <span
                className={cn(
                  'absolute top-6 bottom-0 left-[9.5px] w-px transition-colors duration-300',
                  step.status === 'done' ? 'bg-success/50' : 'bg-border',
                )}
                aria-hidden
              />
            )}
            <span className="relative grid size-5 shrink-0 place-items-center pt-0.5">{ICON[step.status]}</span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-[0.9375rem] leading-6 transition-colors duration-200',
                  step.status === 'pending' && 'text-muted-foreground',
                  step.status === 'running' && 'font-medium',
                )}
              >
                {step.label}
                <span className="sr-only">, {SPOKEN[step.status]}</span>
              </p>
              {step.detail && (
                <p className={cn('truncate text-sm', step.status === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
                  {step.detail}
                </p>
              )}
            </div>
            {step.status === 'done' && step.ms !== undefined && (
              <span className="pt-0.5 text-sm text-muted-foreground tabular-nums">{seconds(step.ms)}</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
