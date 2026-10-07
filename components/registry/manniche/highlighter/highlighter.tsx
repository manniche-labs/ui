import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type HighlighterProps = {
  /** The text to mark. */
  children: ReactNode
  /** Delay in milliseconds after the phrase enters the view. */
  delay?: number
  /** Classes for the mark element. */
  className?: string
}

/**
 * A marker stroke draws behind a phrase the first time it scrolls into view.
 * The stroke colour is the text colour of `--highlight`, or the primary colour at low strength.
 * Under reduced motion the stroke is simply there.
 */
export function Highlighter({ children, delay = 200, className }: HighlighterProps) {
  const el = useRef<HTMLElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (on || !el.current) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.6 })
    io.observe(el.current)
    return () => io.disconnect()
  }, [on])

  return (
    <mark
      ref={el}
      data-on={on}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'bg-transparent bg-no-repeat px-0.5 text-inherit [background-position:0_88%]',
        '[background-image:linear-gradient(var(--highlight,color-mix(in_oklch,var(--color-primary)_24%,transparent)),var(--highlight,color-mix(in_oklch,var(--color-primary)_24%,transparent)))]',
        '[background-size:0%_40%] transition-[background-size] duration-900 ease-out-quint data-[on=true]:[background-size:100%_40%]',
        'motion-reduce:[background-size:100%_40%] motion-reduce:transition-none',
        '[box-decoration-break:clone]',
        className,
      )}
    >
      {children}
    </mark>
  )
}
