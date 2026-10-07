import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BlurFadeProps = {
  /** The content that fades in. */
  children: ReactNode
  /** Delay in milliseconds. Use small steps (40 to 80 ms) to stagger a group. */
  delay?: number
  /** How far it rises, in pixels. */
  offset?: number
  /** Show at once instead of waiting for the element to scroll into view. */
  immediate?: boolean
  /** The element it renders as. */
  as?: 'div' | 'section' | 'li' | 'span'
  /** Classes for the rendered element. */
  className?: string
}

/**
 * Fades an element up out of a soft blur the first time it enters the view.
 * Under reduced motion it is simply there.
 */
export function BlurFade({ children, delay = 0, offset = 12, immediate = false, as: Tag = 'div', className }: BlurFadeProps) {
  const el = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(immediate)

  useEffect(() => {
    if (shown || !el.current) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el.current)
    return () => io.disconnect()
  }, [shown])

  return (
    <Tag
      ref={el as never}
      data-shown={shown}
      style={{ '--bf-delay': `${delay}ms`, '--bf-offset': `${offset}px` } as CSSProperties}
      className={cn(
        'transition-[opacity,filter,transform] delay-(--bf-delay) duration-700 ease-out-quint',
        'data-[shown=false]:translate-y-(--bf-offset) data-[shown=false]:opacity-0 data-[shown=false]:blur-sm',
        'motion-reduce:translate-y-0! motion-reduce:opacity-100! motion-reduce:blur-none! motion-reduce:transition-none',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
