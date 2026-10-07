// Based on Watermelon UI's “Pagination” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten with a nav landmark and labels.
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { RollingNumber } from '@/registry/manniche/rolling-number/rolling-number'
import { cn } from '@/lib/utils'

export type PaginationProps = {
  /** Number of pages. */
  total: number
  /** Controlled page, counted from 1. */
  page?: number
  /** Starting page when the control is not controlled, counted from 1. */
  defaultPage?: number
  /** Called with the new page number when previous or next is pressed. */
  onChange?: (page: number) => void
  /** The words, so the control speaks your language. */
  labels?: { nav?: string; previous?: string; next?: string; of?: string }
  /** Classes for the outer nav. */
  className?: string
}

export function Pagination({ total, page, defaultPage = 1, onChange, labels = {}, className }: PaginationProps) {
  const [own, setOwn] = useState(defaultPage)
  const current = page ?? own
  const { nav = 'Pages', previous = 'Previous page', next = 'Next page', of = 'of' } = labels

  const go = (to: number) => {
    const v = Math.min(total, Math.max(1, to))
    if (v === current) return
    setOwn(v)
    onChange?.(v)
  }

  const btn =
    'grid size-11 place-items-center rounded-xl bg-card text-foreground shadow-sm transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40'

  return (
    <nav aria-label={nav} className={cn('inline-flex items-center gap-3 rounded-2xl border bg-muted p-1.5', className)}>
      <button type="button" className={btn} onClick={() => go(current - 1)} disabled={current <= 1} aria-label={previous}>
        <ArrowLeft className="size-5" aria-hidden />
      </button>
      <p className="flex items-baseline gap-1.5 text-base font-semibold text-muted-foreground" aria-live="polite">
        <RollingNumber value={current} className="text-foreground" />
        <span>
          {of} {total}
        </span>
      </p>
      <button type="button" className={btn} onClick={() => go(current + 1)} disabled={current >= total} aria-label={next}>
        <ArrowRight className="size-5" aria-hidden />
      </button>
    </nav>
  )
}
