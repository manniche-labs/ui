import { Check, ChevronRight, ShieldAlert, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type ToolApprovalState = 'pending' | 'approved' | 'denied'

export type ToolApprovalProps = {
  /** The tool the agent wants to call, e.g. "send_email". */
  tool: string
  /** One sentence in plain words about what will happen. */
  summary: string
  /** The arguments, shown as JSON so nothing is hidden. */
  args?: Record<string, unknown>
  /** Mark a call that changes something outside the app. */
  risky?: boolean
  /** Controlled state. Leave it out and the card keeps its own. */
  state?: ToolApprovalState
  /** Called when the person approves the call. */
  onApprove?: () => void
  /** Called when the person denies the call. */
  onDeny?: () => void
  /** Visible text and screen reader text; defaults to English. `name` comes before the tool name in the card's accessible name. */
  labels?: {
    name?: string
    wants?: string
    arguments?: string
    deny?: string
    approve?: string
    approveRisky?: string
    approved?: string
    denied?: string
  }
  /** Classes for the outer section. */
  className?: string
}

export function ToolApproval({ tool, summary, args, risky = false, state, onApprove, onDeny, labels = {}, className }: ToolApprovalProps) {
  const {
    name = 'Approve',
    wants = 'The agent wants to use',
    arguments: argumentsText = 'Arguments',
    deny = 'Deny',
    approve = 'Approve',
    approveRisky = 'Approve anyway',
    approved = 'Approved',
    denied = 'Denied. The agent was told not to run it.',
  } = labels
  const [own, setOwn] = useState<ToolApprovalState>('pending')
  const current = state ?? own
  const ref = useRef<HTMLElement>(null)

  const decide = (next: Exclude<ToolApprovalState, 'pending'>) => {
    setOwn(next)
    if (next === 'approved') onApprove?.()
    else onDeny?.()
    // The buttons leave the page, so focus moves to the card instead of falling back to the top of the page.
    requestAnimationFrame(() => ref.current?.focus())
  }

  return (
    <section ref={ref} tabIndex={-1} aria-label={`${name} ${tool}`} className={cn('overflow-hidden outline-none rounded-2xl border bg-card text-card-foreground shadow-sm', className)}>
      <header className="flex items-start gap-3 p-4">
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-xl',
            risky ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground',
          )}
          aria-hidden
        >
          <ShieldAlert className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {wants}{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground">{tool}</code>
          </p>
          <p className="mt-1 font-medium text-pretty">{summary}</p>
        </div>
      </header>

      {args && (
        <details className="group border-t">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 px-4 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-4 transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none" aria-hidden />
            {argumentsText}
          </summary>
          <pre className="max-h-64 overflow-auto bg-muted/60 px-4 py-3 font-mono text-[0.8125rem] leading-5">{JSON.stringify(args, null, 2)}</pre>
        </details>
      )}

      <footer className="flex items-center justify-end gap-2 border-t bg-muted/40 p-3">
        {/* Always in the DOM, so the decision is read out when it lands. It never wraps the buttons. */}
        <p role="status" className="sr-only">
          {current === 'approved' ? approved : current === 'denied' ? denied : ''}
        </p>
        {current === 'pending' ? (
          <>
            <button
              type="button"
              onClick={() => decide('denied')}
              className="min-h-11 rounded-xl border bg-card px-4 text-sm font-medium transition-[background-color,transform] duration-150 ease-out-quint hover:bg-muted active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {deny}
            </button>
            <button
              type="button"
              onClick={() => decide('approved')}
              className={cn(
                'min-h-11 rounded-xl px-4 text-sm font-medium transition-[filter,transform] duration-150 ease-out-quint hover:brightness-110 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100',
                risky ? 'bg-destructive text-background' : 'bg-primary text-primary-foreground',
              )}
            >
              {risky ? approveRisky : approve}
            </button>
          </>
        ) : (
          <p
            aria-hidden
            className={cn(
              'flex min-h-11 items-center gap-1.5 text-sm font-medium',
              current === 'approved' ? 'text-success' : 'text-muted-foreground',
            )}
          >
            {current === 'approved' ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
            {current === 'approved' ? approved : denied}
          </p>
        )}
      </footer>
    </section>
  )
}
