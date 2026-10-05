import { TriangleAlert } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type DangerZoneAction = {
  id: string
  title: string
  /** What happens and whether it can be undone. */
  description: ReactNode
  /** The button, usually a ConfirmDialog trigger or HoldToConfirm. */
  action: ReactNode
}

export type DangerZoneProps = {
  title?: string
  actions: DangerZoneAction[]
  className?: string
}

/**
 * The last section of a settings page: a red frame with a heading, one row per action that cannot
 * easily be undone. Keeping them together and at the bottom means nobody meets them by accident.
 */
export function DangerZone({ title = 'Danger zone', actions, className }: DangerZoneProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={cn('grid gap-3', className)}>
      <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold text-destructive">
        <TriangleAlert className="size-4" aria-hidden />
        {title}
      </h2>
      <ul className="divide-y divide-destructive/20 overflow-hidden rounded-2xl border border-destructive/40 bg-card">
        {actions.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 p-4">
            <div className="grid min-w-0 flex-1 basis-60 gap-0.5">
              <h3 className="text-sm font-medium">{a.title}</h3>
              <p className="text-sm text-pretty text-muted-foreground">{a.description}</p>
            </div>
            <div className="shrink-0">{a.action}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The outlined red button that fits a danger-zone row. Turns solid red only on hover. */
export const dangerButton =
  'inline-flex min-h-11 items-center rounded-xl border border-destructive/40 bg-card px-4 text-sm font-medium text-destructive transition-[background-color,color,transform] duration-150 ease-out-quint hover:bg-destructive hover:text-white active:scale-[0.97]'
