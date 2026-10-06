// Bento steps: a process in three to five tiles. Each tile has a mono number ("01"), a title, a sentence and an
// optional duration chip. On wide boxes the steps sit in one row; on narrow ones they stack in a vertical list with a
// thin line joining the tiles. `current` marks where the reader is: steps before it say "Done" with a check mark, the
// current one says "Now" with the page's one `--primary` dot and ring, and the rest are quiet.
//
// Screen readers: one `h2` and an ordered list (`<ol>`), so the count and position are announced. Each step reads
// its number, title and sentence, then its state in words ("Done", "Now", "Up next"); the current step also has
// `aria-current="step"`. The check mark, dot and connecting line are hidden from them.
// Motion: none. Nothing animates, so reduced motion changes nothing.
import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BentoStep = {
  /** A stable key for the step. */
  id: string
  /** The step's name, shown as an `h3`. */
  title: ReactNode
  /** One sentence about what happens in this step. */
  description: ReactNode
  /** How long the step takes, as a short chip: "1 week", "2 days". */
  duration?: string
}

export type BentoStepsLabels = {
  /** Shown on steps before the current one. Default "Done". */
  done?: string
  /** Shown on the current step. Default "Now". */
  now?: string
  /** Read aloud on the steps after the current one. Not shown. Default "Up next". */
  upcoming?: string
}

export type BentoStepsProps = Omit<ComponentProps<'section'>, 'children' | 'title'> & {
  /** The section's `h2`. */
  heading: ReactNode
  /** A short line under the heading. */
  intro?: ReactNode
  /** A small mono label above the heading. */
  eyebrow?: ReactNode
  /** The steps, three to five. */
  steps: readonly BentoStep[]
  /** The index (from 0) of the step that is happening now. Steps before it are done. Leave it out to show no progress. */
  current?: number
  /** Every visible and spoken string that is not content. */
  labels?: BentoStepsLabels
}

const COLS: Record<number, string> = {
  2: '@3xl:grid-cols-2',
  3: '@3xl:grid-cols-3',
  4: '@3xl:grid-cols-4',
  5: '@3xl:grid-cols-5',
}

const DEFAULT_LABELS = { done: 'Done', now: 'Now', upcoming: 'Up next' } satisfies Required<BentoStepsLabels>

export function BentoSteps({ heading, intro, eyebrow, steps, current, labels, className, ...rest }: BentoStepsProps) {
  const headingId = useId()
  const t = { ...DEFAULT_LABELS, ...labels }
  return (
    <section aria-labelledby={headingId} className={cn('@container w-full py-12 @3xl:py-20', className)} {...rest}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mb-8 grid max-w-2xl gap-3 @3xl:mb-12">
          {eyebrow && <p className="font-mono text-xs tracking-[0.04em] text-muted-foreground tabular-nums">{eyebrow}</p>}
          <h2
            id={headingId}
            className="text-[clamp(30px,5.4cqw,52px)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance text-foreground"
            style={{ fontFamily: 'var(--font-display, inherit)', fontStretch: '86%' }}
          >
            {heading}
          </h2>
          {intro && <p className="text-base leading-relaxed text-pretty text-muted-foreground">{intro}</p>}
        </header>
        <ol className={cn('grid list-none grid-cols-1 gap-6 p-0 @3xl:gap-4', COLS[steps.length] ?? '@3xl:grid-cols-4')}>
          {steps.map((s, i) => {
            const done = current !== undefined && i < current
            const now = current === i
            const state = done ? t.done : now ? t.now : null
            return (
              <li
                key={s.id}
                aria-current={now ? 'step' : undefined}
                className="relative flex min-w-0 after:absolute after:top-full after:left-[34px] after:h-6 after:w-px after:bg-border last:after:hidden @3xl:after:hidden data-[done]:after:bg-foreground/40"
                data-done={done || undefined}
              >
                <div
                  className={cn(
                    'flex w-full min-w-0 flex-col gap-4 rounded-[calc(var(--radius)*2+2px)] bg-card p-[18px] text-card-foreground @3xl:p-6',
                    now
                      ? 'shadow-[0_0_0_2px_var(--primary)]'
                      : 'shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]',
                  )}
                >
                  <div className="flex min-h-7 items-center justify-between gap-3">
                    <span className="font-mono text-[12px] tracking-[0.04em] text-muted-foreground tabular-nums">
                      <span className="sr-only">Step </span>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {state ? (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.04em] text-foreground uppercase">
                        {done ? (
                          <svg
                            viewBox="0 0 12 12"
                            aria-hidden
                            className="size-3 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
                          >
                            <path d="m2.5 6.5 2.5 2.5 4.5-5.5" />
                          </svg>
                        ) : (
                          <i aria-hidden className="size-2 rounded-full bg-primary" />
                        )}
                        {state}
                      </span>
                    ) : (
                      current !== undefined && <span className="sr-only">{t.upcoming}</span>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <h3 className="text-[19px] leading-[1.15] font-semibold tracking-[-0.02em] text-balance">{s.title}</h3>
                    <p className="text-[15px] leading-normal text-pretty text-muted-foreground">{s.description}</p>
                  </div>
                  {s.duration && (
                    <span className="mt-auto w-fit rounded-full bg-muted px-2.5 py-1 font-mono text-[11.5px] leading-none text-muted-foreground tabular-nums">
                      {s.duration}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
