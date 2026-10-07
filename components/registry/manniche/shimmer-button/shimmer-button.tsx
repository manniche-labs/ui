import { useRef, type ButtonHTMLAttributes, type PointerEvent } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type ShimmerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Lean a few pixels towards the pointer. */
  magnetic?: boolean
}

/**
 * A primary button with a slow sheen passing over it. Use it once per page, for the main action.
 * With `magnetic` it leans towards a mouse pointer. Both stop under reduced motion.
 */
export function ShimmerButton({ magnetic = false, className, children, onPointerMove, onPointerLeave, ...rest }: ShimmerButtonProps) {
  const reduced = useReducedMotion()
  const el = useRef<HTMLButtonElement>(null)

  function move(e: PointerEvent<HTMLButtonElement>) {
    onPointerMove?.(e)
    if (!magnetic || reduced || e.pointerType !== 'mouse' || !el.current) return
    const r = el.current.getBoundingClientRect()
    const x = (e.clientX - r.left - r.width / 2) * 0.15
    const y = (e.clientY - r.top - r.height / 2) * 0.25
    el.current.style.transform = `translate(${x}px, ${y}px)`
  }

  function leave(e: PointerEvent<HTMLButtonElement>) {
    onPointerLeave?.(e)
    if (el.current) el.current.style.transform = ''
  }

  return (
    <button
      ref={el}
      onPointerMove={move}
      onPointerLeave={leave}
      className={cn(
        'relative isolate inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-6 font-medium text-primary-foreground',
        'transition-transform duration-300 ease-out-quint active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none',
        className,
      )}
      {...rest}
    >
      <style href="manniche-shimmer" precedence="default">
        {'@keyframes manniche-shimmer { 0% { transform: translateX(-100%) } 60%, 100% { transform: translateX(100%) } }'}
      </style>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 animate-[manniche-shimmer_2.8s_ease-in-out_infinite] bg-[linear-gradient(110deg,transparent_30%,color-mix(in_oklch,white_28%,transparent)_50%,transparent_70%)] motion-reduce:hidden"
      />
      {children}
    </button>
  )
}
