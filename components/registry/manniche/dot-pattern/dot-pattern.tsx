import type { CSSProperties, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type DotPatternProps = HTMLAttributes<HTMLDivElement> & {
  /** Distance between dots in pixels. */
  spacing?: number
  /** Fade the dots out towards the edges. */
  vignette?: boolean
}

/**
 * A quiet dot grid behind content, drawn with CSS gradients only. No images, no motion.
 * The dots take the foreground colour at low strength, so they work in light and dark.
 */
export function DotPattern({ spacing = 18, vignette = true, className, style, children, ...rest }: DotPatternProps) {
  return (
    <div
      style={{ '--dot-gap': `${spacing}px`, ...style } as CSSProperties}
      className={cn(
        'relative isolate overflow-hidden rounded-2xl bg-card',
        'bg-[radial-gradient(color-mix(in_oklch,var(--color-foreground)_16%,transparent)_1px,transparent_1.5px)] bg-size-[var(--dot-gap)_var(--dot-gap)]',
        className,
      )}
      {...rest}
    >
      {vignette && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--color-card)_78%)]"
        />
      )}
      {children}
    </div>
  )
}
