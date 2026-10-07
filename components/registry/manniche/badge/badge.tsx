// A small label that says what kind of thing sits next to it: its tier, its category, that it is new, or that the
// figures around it are example data. One family: same height, same corner, one quiet look per meaning. It is never
// a button and never takes focus; when the label matters to a link, point the link's aria-describedby at its id.
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant = 'neutral' | 'free' | 'pro' | 'new' | 'demo'

export type BadgeProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  /**
   * What the label means, which sets how loud it is:
   * - `neutral`: a category or any plain tag ("controls", "surfaces"), set in mono on a faint fill. The default.
   * - `free`: free or open source ("Free", "MIT"), a hairline outline that steps back.
   * - `pro`: the paid tier ("Pro"), inverted to the page's text colour, so it is the one label that stands out.
   * - `new`: recently added ("New"), a raised key with a small success dot. The word carries the meaning, not the dot.
   * - `demo`: marks example data ("Demo data"), a dashed outline, so made-up figures never pass for real ones.
   */
  variant?: BadgeVariant
  /** The visible text. Keep it to a word or two. */
  children: ReactNode
  className?: string
}

const VARIANT: Record<BadgeVariant, string> = {
  neutral: 'bg-foreground/[0.06] px-[7px] font-mono text-[11.5px] text-muted-foreground',
  free: 'px-2 text-muted-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_16%,transparent)]',
  pro: 'bg-foreground px-2 text-background shadow-[inset_0_1px_0_color-mix(in_oklab,var(--background)_35%,transparent),inset_0_-1.5px_0_rgb(0_0_0/0.2)]',
  new: 'gap-1.5 bg-muted px-2 text-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_7%,transparent),inset_0_-1.5px_0_rgb(0_0_0/0.14),0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)] dark:shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_7%,transparent),inset_0_-1.5px_0_rgb(0_0_0/0.45),0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)]',
  demo: 'border border-dashed border-foreground/25 px-[7px] text-muted-foreground',
}

/** A small, calm label for a tier, a category, something new or example data. Not interactive. */
export function Badge({ variant = 'neutral', children, className, ...rest }: BadgeProps) {
  return (
    <span
      data-variant={variant}
      className={cn(
        'inline-flex h-[22px] flex-none items-center rounded-[6px] text-xs leading-none font-medium whitespace-nowrap',
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {variant === 'new' && <span aria-hidden className="size-1.5 flex-none rounded-full bg-success" />}
      {children}
    </span>
  )
}
