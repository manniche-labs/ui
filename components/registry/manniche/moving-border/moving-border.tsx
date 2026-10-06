import type { CSSProperties, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type MovingBorderProps = HTMLAttributes<HTMLDivElement> & {
  /** Seconds for one lap of the light. Defaults to 4 for `light` and 9 for `iridescent`. */
  duration?: number
  /** Border width in pixels. */
  width?: number
  /** `light`: one primary-coloured light runs round. `iridescent`: a thin-film ring whose hue shifts along the border, around the primary hue. */
  variant?: 'light' | 'iridescent'
}

// Thin film: a closed band of hues a little either side of the primary hue, lighter and less saturated in places,
// like coated glass. Relative colour keeps it tied to any --primary in light and dark; older browsers mix towards
// neighbouring tokens instead.
const FILM = cn(
  '[--f1:color-mix(in_oklab,var(--color-primary)_70%,var(--color-success,var(--color-primary)))]',
  '[--f2:color-mix(in_oklab,var(--color-primary)_70%,var(--color-card))]',
  '[--f3:var(--color-primary)]',
  '[--f4:color-mix(in_oklab,var(--color-primary)_60%,var(--color-destructive,var(--color-primary)))]',
  '[--f5:color-mix(in_oklab,var(--color-primary)_25%,var(--color-card))]',
  '[--f6:color-mix(in_oklab,var(--color-primary)_60%,var(--color-success,var(--color-primary)))]',
  'supports-[color:oklch(from_red_l_c_h)]:[--f1:oklch(from_var(--color-primary)_calc(l_+_0.06)_calc(c_*_0.62)_calc(h_-_30))]',
  'supports-[color:oklch(from_red_l_c_h)]:[--f2:oklch(from_var(--color-primary)_calc(l_+_0.12)_calc(c_*_0.72)_calc(h_-_14))]',
  'supports-[color:oklch(from_red_l_c_h)]:[--f4:oklch(from_var(--color-primary)_calc(l_+_0.05)_calc(c_*_0.55)_calc(h_+_22))]',
  'supports-[color:oklch(from_red_l_c_h)]:[--f5:oklch(from_var(--color-primary)_calc(l_+_0.26)_calc(c_*_0.12)_h)]',
  'supports-[color:oklch(from_red_l_c_h)]:[--f6:oklch(from_var(--color-primary)_calc(l_+_0.1)_calc(c_*_0.7)_calc(h_-_24))]',
  'bg-[conic-gradient(from_0deg,var(--f1),var(--f2)_14%,var(--f3)_27%,var(--f4)_40%,var(--f5)_52%,var(--f6)_66%,var(--f3)_80%,var(--f2)_90%,var(--f1))]',
)

/**
 * A frame whose border has a light running round it. Wrap a button, a card or a price.
 * Plain CSS: a large conic gradient turns behind the content, and only the border strip shows.
 * The `iridescent` variant lights the whole ring with a thin-film band of hues that slowly travels round, and draws the
 * focus ring on the frame when something inside has keyboard focus. Neither variant glows.
 * Under reduced motion the light stands still in one corner.
 */
export function MovingBorder({ duration, width = 1.5, variant = 'light', className, children, style, ...rest }: MovingBorderProps) {
  const film = variant === 'iridescent'
  return (
    <div
      style={{ padding: width, ...style } as CSSProperties}
      className={cn(
        'relative isolate inline-grid overflow-hidden rounded-[calc(var(--radius)*2+2px)] bg-[color-mix(in_oklab,var(--foreground)_10%,var(--card))] shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
        film && 'has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-ring',
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        style={{ animationDuration: `${duration ?? (film ? 9 : 4)}s` }}
        className={cn(
          'pointer-events-none absolute top-1/2 left-1/2 -z-10 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2 animate-spin',
          film ? FILM : 'bg-[conic-gradient(from_0deg,transparent_0_70%,var(--color-primary)_85%,transparent_100%)]',
          'motion-reduce:animate-none motion-reduce:rotate-45',
        )}
      />
      <div className="rounded-[inherit] bg-card text-card-foreground">{children}</div>
    </div>
  )
}
