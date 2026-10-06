import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

export type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * What sits behind the button, drawn in `currentColor`. It shows round the button in the muted colour and again,
   * magnified, inside the lens. Leave it out for plain glass.
   */
  backdrop?: ReactNode
  /** Classes for the backdrop layer, which is absolutely positioned in the wrapper. */
  backdropClassName?: string
  /** Classes for the wrapper round the backdrop and the button, e.g. `flex w-full justify-center` to give the backdrop room. */
  containerClassName?: string
  /** How much the lens magnifies the backdrop. */
  magnify?: number
}

const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]'

/**
 * A glass lens set in a bevel. A small highlight follows the mouse across the glass, the face sinks a pixel when pressed
 * (pointer, touch, Enter or Space), and whatever you pass as `backdrop` is drawn behind the button and magnified inside it,
 * lined up so the lens reads as one piece of glass over the page. It is a plain `<button>` with every button prop.
 * Under reduced motion the highlight is hidden; the press still shows, without easing.
 */
export function GlassButton({
  backdrop,
  backdropClassName,
  containerClassName,
  magnify = 1.3,
  type = 'button',
  className,
  children,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...rest
}: GlassButtonProps) {
  const [down, setDown] = useState(false)
  const [lit, setLit] = useState(false)
  const wrap = useRef<HTMLSpanElement>(null)
  const layer = useRef<HTMLSpanElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const face = useRef<HTMLSpanElement>(null)
  const mag = useRef<HTMLSpanElement>(null)

  // Line the magnified copy up with the backdrop behind the button, scaled about the centre of the lens.
  // Offsets, not screen rects, so a pressed face or a scaled parent does not throw it off.
  const layout = () => {
    const l = layer.current
    const b = btn.current
    const f = face.current
    const m = mag.current
    if (!l || !b || !f || !m) return
    const fx = b.offsetLeft + b.clientLeft + f.offsetLeft
    const fy = b.offsetTop + b.clientTop + f.offsetTop
    const cx = f.offsetWidth / 2
    const cy = f.offsetHeight / 2
    m.style.width = `${l.offsetWidth}px`
    m.style.height = `${l.offsetHeight}px`
    m.style.transform = `translate(${cx}px,${cy}px) scale(${magnify}) translate(${l.offsetLeft - fx - cx}px,${l.offsetTop - fy - cy}px)`
  }
  const layoutLatest = useRef(layout)
  useLayoutEffect(() => {
    layoutLatest.current = layout
    layout()
  })

  useEffect(() => {
    if (!backdrop) return
    const ro = new ResizeObserver(() => layoutLatest.current())
    if (wrap.current) ro.observe(wrap.current)
    if (layer.current) ro.observe(layer.current)
    let live = true
    document.fonts?.ready.then(() => live && layoutLatest.current())
    return () => {
      live = false
      ro.disconnect()
    }
  }, [backdrop])

  // A press ends wherever the pointer is let go.
  useEffect(() => {
    if (!down) return
    const up = () => setDown(false)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [down])

  return (
    <span ref={wrap} className={cn('relative inline-flex', containerClassName)}>
      {backdrop && (
        <span ref={layer} aria-hidden className={cn('pointer-events-none absolute inset-0 text-muted-foreground', backdropClassName)}>
          {backdrop}
        </span>
      )}
      <button
        ref={btn}
        type={type}
        data-down={down || undefined}
        data-lit={lit || undefined}
        onPointerEnter={(e: PointerEvent<HTMLButtonElement>) => {
          onPointerEnter?.(e)
          if (e.pointerType === 'mouse') setLit(true)
        }}
        onPointerMove={(e: PointerEvent<HTMLButtonElement>) => {
          onPointerMove?.(e)
          const f = face.current
          if (e.pointerType !== 'mouse' || !f) return
          const r = f.getBoundingClientRect()
          const k = r.width / (f.offsetWidth || 1) || 1
          f.style.setProperty('--px', `${(e.clientX - r.left) / k}px`)
          f.style.setProperty('--py', `${(e.clientY - r.top) / k}px`)
        }}
        onPointerLeave={(e: PointerEvent<HTMLButtonElement>) => {
          onPointerLeave?.(e)
          setLit(false)
          setDown(false)
        }}
        onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
          onPointerDown?.(e)
          if (e.button === 0) setDown(true)
        }}
        onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
          onKeyDown?.(e)
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) setDown(true)
        }}
        onKeyUp={(e: KeyboardEvent<HTMLButtonElement>) => {
          onKeyUp?.(e)
          setDown(false)
        }}
        onBlur={(e: FocusEvent<HTMLButtonElement>) => {
          onBlur?.(e)
          setDown(false)
        }}
        className={cn(
          'group/gb relative cursor-pointer rounded-[19px] border border-border p-1 text-foreground outline-none [-webkit-tap-highlight-color:transparent]',
          '[--hi:color-mix(in_oklab,white_70%,transparent)] dark:[--hi:color-mix(in_oklab,white_14%,transparent)]',
          'bg-[linear-gradient(180deg,color-mix(in_oklab,var(--foreground)_8%,var(--card)),color-mix(in_oklab,var(--foreground)_2%,var(--card))_55%,color-mix(in_oklab,var(--foreground)_10%,var(--card)))]',
          'shadow-[inset_0_1px_0_var(--hi),0_1px_0_color-mix(in_oklab,var(--foreground)_5%,transparent),0_10px_22px_-16px_rgb(0_0_0/0.45)]',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...rest}
      >
        <span
          ref={face}
          className={cn(
            'relative isolate flex h-[58px] items-center gap-2.5 overflow-hidden rounded-[14px] px-[30px] text-[15px] leading-none font-medium tracking-[-0.005em]',
            'transition-[transform] duration-140 group-data-[down]/gb:[transform:translateY(1px)_scale(.985)] motion-reduce:transition-none',
            EASE,
          )}
        >
          {/* The lens: a frosted base with the magnified backdrop in it. */}
          <span aria-hidden className="absolute inset-0 -z-3 overflow-hidden bg-[color-mix(in_oklab,var(--card)_55%,var(--muted))]">
            {backdrop && (
              <span ref={mag} className="absolute top-0 left-0 origin-top-left text-foreground opacity-62">
                {backdrop}
              </span>
            )}
          </span>
          <span aria-hidden className="absolute inset-0 -z-2 bg-[color-mix(in_oklab,var(--card)_34%,transparent)]" />
          {/* The glass: a bright upper half, a clear band, and a darker rim at the bottom. */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 -z-1 rounded-[inherit]',
              'bg-[linear-gradient(180deg,color-mix(in_oklab,white_46%,transparent)_0,color-mix(in_oklab,white_10%,transparent)_44%,transparent_52%,transparent_78%,color-mix(in_oklab,var(--foreground)_7%,transparent))]',
              'dark:bg-[linear-gradient(180deg,color-mix(in_oklab,white_13%,transparent)_0,color-mix(in_oklab,white_3%,transparent)_44%,transparent_52%,transparent_78%,color-mix(in_oklab,black_22%,transparent))]',
              'shadow-[inset_0_1px_0_var(--hi),inset_0_-1px_0_color-mix(in_oklab,var(--foreground)_14%,transparent),inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),inset_0_0_22px_color-mix(in_oklab,var(--foreground)_9%,transparent)]',
            )}
          />
          {/* The highlight that follows the mouse. */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 -z-1 opacity-0 transition-opacity duration-160 group-data-[lit]/gb:opacity-100 motion-reduce:hidden',
              EASE,
              'bg-[radial-gradient(ellipse_44px_20px_at_var(--px,50%)_var(--py,30%),color-mix(in_oklab,white_92%,transparent),color-mix(in_oklab,white_30%,transparent)_42%,transparent_72%)]',
              'dark:bg-[radial-gradient(ellipse_44px_20px_at_var(--px,50%)_var(--py,30%),color-mix(in_oklab,white_40%,transparent),color-mix(in_oklab,white_10%,transparent)_42%,transparent_72%)]',
            )}
          />
          <span className="relative inline-flex items-center gap-2.5 [&_svg]:size-[18px]">{children}</span>
        </span>
      </button>
    </span>
  )
}
