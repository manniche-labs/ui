import { Clock, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type ScheduledDeletionProps = {
  /** What is going away, e.g. “The project Spring sale”. */
  subject: string
  /** When it was marked for deletion. */
  deletedAt: Date
  /** Days it stays recoverable. */
  graceDays?: number
  /** Called when the restore button is pressed. */
  onRestore: () => void
  /** Text on the restore button. */
  restoreLabel?: string
  /** Locale for the deletion date, such as "da-DK". Defaults to the browser locale. */
  locale?: string
  /** Classes for the outer status box. */
  className?: string
}

const DAY = 86_400_000

/**
 * A banner for something that is deleted but still recoverable: it says the date it goes for good,
 * how many days are left, and offers to restore it. The server does the real deletion when the time is up.
 */
export function ScheduledDeletion({
  subject,
  deletedAt,
  graceDays = 14,
  onRestore,
  restoreLabel = 'Restore',
  locale,
  className,
}: ScheduledDeletionProps) {
  const [now, setNow] = useState(() => Date.now())
  // Once an hour is enough to keep the day count right on a tab left open.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 3_600_000)
    return () => clearInterval(t)
  }, [])

  const goneAt = new Date(deletedAt.getTime() + graceDays * DAY)
  const left = Math.max(0, Math.ceil((goneAt.getTime() - now) / DAY))
  const used = Math.min(1, Math.max(0, (now - deletedAt.getTime()) / (graceDays * DAY)))
  const date = goneAt.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div role="status" className={cn('grid gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-60 gap-3">
          <Clock className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <p className="text-sm text-pretty">
            {subject} is deleted for good on <strong className="font-medium">{date}</strong>.{' '}
            <span className="text-muted-foreground">
              {left === 0 ? 'That is today.' : left === 1 ? '1 day left to restore it.' : `${left} days left to restore it.`}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onRestore}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-[background-color,transform] duration-150 ease-out-quint hover:bg-primary/90 active:scale-[0.97]"
        >
          <RotateCcw className="size-4" aria-hidden />
          {restoreLabel}
        </button>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-destructive/15" aria-hidden>
        <div className="h-full origin-left rounded-full bg-destructive/60" style={{ transform: `scaleX(${used})` }} />
      </div>
    </div>
  )
}
