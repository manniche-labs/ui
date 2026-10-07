import { Pause, Play } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type MarqueeProps = {
  /** The items that scroll. Rendered twice for a seamless loop. */
  children: ReactNode
  /** Seconds for one full loop. */
  duration?: number
  /** Gap between items in pixels. */
  gap?: number
  /** Scrolls the other way. */
  reverse?: boolean
  /** Accessible name for the region, e.g. "Customers". */
  label: string
  /** Visible button text and screen reader text. Keys: `pause` and `play` (the name of the pause button). */
  labels?: { pause?: string; play?: string }
  /** Classes for the outer region, which holds the strip and the pause button. */
  className?: string
}

/**
 * Items scroll sideways in an endless loop with soft edges. A button next to the strip pauses and resumes it,
 * and it also pauses while hovered or focused.
 * The items are rendered twice for a seamless loop; the copy is hidden from screen readers and the keyboard.
 * Under reduced motion the items wrap onto lines and stand still, and the button is gone.
 */
export function Marquee({ children, duration = 30, gap = 14, reverse = false, label, labels = {}, className }: MarqueeProps) {
  const { pause = 'Pause', play = 'Play' } = labels
  const [paused, setPaused] = useState(false)
  const vars = { '--mq-duration': `${duration}s`, '--mq-gap': `${gap}px` } as CSSProperties

  return (
    <div role="region" aria-label={label} style={vars} className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'group/mq min-w-0 flex-1 overflow-hidden mask-[linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]',
          'motion-reduce:mask-none',
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
            paused && '[animation-play-state:paused]',
            'motion-reduce:w-auto motion-reduce:flex-wrap motion-reduce:animate-none',
          )}
        >
          <div className="flex shrink-0 gap-(--mq-gap) motion-reduce:shrink motion-reduce:flex-wrap">{children}</div>
          <div className="flex shrink-0 gap-(--mq-gap) motion-reduce:hidden" aria-hidden inert>
            {children}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? play : pause}
        title={paused ? play : pause}
        className="grid size-11 shrink-0 place-items-center rounded-full border bg-card text-foreground transition-colors duration-150 hover:bg-muted motion-reduce:hidden motion-reduce:transition-none"
      >
        {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
      </button>
    </div>
  )
}
