import type { CSSProperties, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type MovingBorderProps = HTMLAttributes<HTMLDivElement> & {
  /** Seconds for one lap of the light. */
  duration?: number
  /** Border width in pixels. */
  width?: number
}

/**
 * A frame whose border has a light running round it. Wrap a button, a card or a price.
 * Plain CSS: a large conic gradient turns behind the content, and only the border strip shows.
 * Under reduced motion the light stands still in one corner.
 */
export function MovingBorder({ duration = 4, width = 1.5, className, children, style, ...rest }: MovingBorderProps) {
  return (
    <div
      style={{ padding: width, ...style } as CSSProperties}
      className={cn('relative isolate inline-grid overflow-hidden rounded-2xl bg-border', className)}
      {...rest}
    >
      <span
        aria-hidden
        style={{ animationDuration: `${duration}s` }}
        className={cn(
          'pointer-events-none absolute top-1/2 left-1/2 -z-10 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2 animate-spin',
          'bg-[conic-gradient(from_0deg,transparent_0_70%,var(--color-primary)_85%,transparent_100%)]',
          'motion-reduce:animate-none motion-reduce:rotate-45',
        )}
      />
      <div className="rounded-[inherit] bg-card text-card-foreground">{children}</div>
    </div>
  )
}
