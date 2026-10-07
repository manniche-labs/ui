import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type TextRevealProps = {
  /** Plain text. Each word lights up as the paragraph scrolls past. */
  children: string
  /** Classes for the paragraph. */
  className?: string
}

/**
 * Words go from half strength to full as the reader scrolls through the paragraph. The unlit words keep enough contrast to read as large text.
 * The text is always in the DOM in full, so screen readers and search engines read it normally.
 * Under reduced motion every word is at full strength from the start.
 */
export function TextReveal({ children, className }: TextRevealProps) {
  const reduced = useReducedMotion()
  const el = useRef<HTMLParagraphElement>(null)
  const words = children.split(/(\s+)/)
  const count = words.filter((w) => !/^\s+$/.test(w)).length
  const [lit, setLit] = useState(count)

  useEffect(() => {
    if (reduced) {
      setLit(count)
      return
    }
    let frame = 0
    const run = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const p = el.current
        if (!p) return
        const r = p.getBoundingClientRect()
        const t = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)))
        setLit(Math.round(t * count))
      })
    }
    run()
    addEventListener('scroll', run, { passive: true })
    addEventListener('resize', run)
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('scroll', run)
      removeEventListener('resize', run)
    }
  }, [reduced, count])

  let i = 0
  return (
    <p ref={el} className={cn('text-pretty', className)}>
      {words.map((w, j) => {
        if (/^\s+$/.test(w)) return w
        const on = i++ < lit
        return (
          <span key={j} className={cn('transition-opacity duration-200 motion-reduce:transition-none', on ? 'opacity-100' : 'opacity-50')}>
            {w}
          </span>
        )
      })}
    </p>
  )
}
