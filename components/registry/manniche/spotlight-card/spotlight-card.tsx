import { useRef, type CSSProperties, type HTMLAttributes, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'

export type SpotlightCardProps = HTMLAttributes<HTMLDivElement> & {
  /** Radius of the light in pixels. */
  size?: number
}

/**
 * A card with a soft light that follows the pointer. Only opacity animates;
 * the position is written straight to CSS variables, so React does not re-render on move.
 * On touch screens and under reduced motion the card is a plain card.
 */
export function SpotlightCard({ size = 340, className, children, onPointerMove, style, ...rest }: SpotlightCardProps) {
  const el = useRef<HTMLDivElement>(null)

  function move(e: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(e)
    if (e.pointerType !== 'mouse' || !el.current) return
    const r = el.current.getBoundingClientRect()
    el.current.style.setProperty('--spot-x', `${e.clientX - r.left}px`)
    el.current.style.setProperty('--spot-y', `${e.clientY - r.top}px`)
  }

  return (
    <div
      ref={el}
      onPointerMove={move}
      style={{ '--spot-size': `${size}px`, ...style } as CSSProperties}
      className={cn(
        'group/spot relative isolate overflow-hidden rounded-2xl border bg-card p-6 text-card-foreground shadow-sm',
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300',
          'bg-[radial-gradient(var(--spot-size)_circle_at_var(--spot-x,50%)_var(--spot-y,50%),color-mix(in_oklch,var(--color-primary)_14%,transparent),transparent_65%)]',
          'group-hover/spot:opacity-100 motion-reduce:hidden',
        )}
      />
      {children}
    </div>
  )
}
