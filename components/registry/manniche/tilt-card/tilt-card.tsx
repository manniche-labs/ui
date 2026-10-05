import { useRef, type CSSProperties, type HTMLAttributes, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'

export type TiltCardProps = HTMLAttributes<HTMLDivElement> & {
  /** The largest tilt in degrees, reached at the card's edges. */
  max?: number
  /** A soft glare that follows the pointer. */
  glare?: boolean
}

/**
 * A card that tilts towards the mouse in 3D. Children with `data-depth="1"` to `"3"` float above the card.
 * The angles are written straight to CSS variables, so React does not re-render on move.
 * On touch screens and under reduced motion it is a flat card.
 */
export function TiltCard({ max = 10, glare = true, className, children, onPointerMove, onPointerLeave, style, ...rest }: TiltCardProps) {
  const el = useRef<HTMLDivElement>(null)

  function move(e: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(e)
    if (e.pointerType !== 'mouse' || !el.current) return
    const r = el.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.current.style.setProperty('--tilt-x', `${(0.5 - y) * 2 * max}deg`)
    el.current.style.setProperty('--tilt-y', `${(x - 0.5) * 2 * max}deg`)
    el.current.style.setProperty('--glare-x', `${x * 100}%`)
    el.current.style.setProperty('--glare-y', `${y * 100}%`)
  }

  function leave(e: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(e)
    el.current?.style.setProperty('--tilt-x', '0deg')
    el.current?.style.setProperty('--tilt-y', '0deg')
  }

  return (
    <div className="[perspective:900px]">
      <div
        ref={el}
        onPointerMove={move}
        onPointerLeave={leave}
        style={style as CSSProperties}
        className={cn(
          'group/tilt relative isolate rounded-2xl border bg-card p-6 text-card-foreground shadow-sm [transform-style:preserve-3d]',
          '[transform:rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] transition-transform duration-200 ease-out',
          // The depth layers lift off the card only while it can tilt.
          'motion-safe:[&_[data-depth="1"]]:[transform:translateZ(20px)] motion-safe:[&_[data-depth="2"]]:[transform:translateZ(40px)] motion-safe:[&_[data-depth="3"]]:[transform:translateZ(60px)]',
          'motion-reduce:transform-none motion-reduce:transition-none',
          className,
        )}
        {...rest}
      >
        {glare && (
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-300',
              'bg-[radial-gradient(circle_at_var(--glare-x,50%)_var(--glare-y,50%),rgb(255_255_255/0.14),transparent_60%)]',
              'group-hover/tilt:opacity-100 motion-reduce:hidden',
            )}
          />
        )}
        {children}
      </div>
    </div>
  )
}
