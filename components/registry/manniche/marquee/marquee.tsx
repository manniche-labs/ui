import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type MarqueeProps = {
  children: ReactNode
  /** Seconds for one full loop. */
  duration?: number
  /** Gap between items in pixels. */
  gap?: number
  reverse?: boolean
  /** Accessible name for the list, e.g. "Customers". */
  label?: string
  className?: string
}

/**
 * Items scroll sideways in an endless loop with soft edges. It pauses while hovered or focused.
 * The items are rendered twice for a seamless loop; the copy is hidden from screen readers and the keyboard.
 * Under reduced motion the items wrap onto lines and stand still.
 */
export function Marquee({ children, duration = 30, gap = 14, reverse = false, label, className }: MarqueeProps) {
  const vars = { '--mq-duration': `${duration}s`, '--mq-gap': `${gap}px` } as CSSProperties

  return (
    <div
      role="region"
      aria-label={label}
      style={vars}
      className={cn(
        'group/mq overflow-hidden mask-[linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]',
        'motion-reduce:mask-none',
        className,
      )}
    >
      <style href="manniche-marquee" precedence="default">
        {'@keyframes manniche-marquee { to { transform: translateX(calc(-50% - var(--mq-gap) / 2)) } }'}
      </style>
      <div
        className={cn(
          'flex w-max gap-(--mq-gap) animate-[manniche-marquee_var(--mq-duration)_linear_infinite]',
          reverse && '[animation-direction:reverse]',
          'group-hover/mq:[animation-play-state:paused] group-focus-within/mq:[animation-play-state:paused]',
          'motion-reduce:w-auto motion-reduce:flex-wrap motion-reduce:animate-none',
        )}
      >
        <div className="flex shrink-0 gap-(--mq-gap) motion-reduce:shrink motion-reduce:flex-wrap">{children}</div>
        <div className="flex shrink-0 gap-(--mq-gap) motion-reduce:hidden" aria-hidden inert>
          {children}
        </div>
      </div>
    </div>
  )
}
