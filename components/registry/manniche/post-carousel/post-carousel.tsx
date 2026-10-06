import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { useCarouselEngine } from '@/registry/manniche/hooks/use-carousel-engine'
import { cn } from '@/lib/utils'

export type PostCarouselProps = Omit<HTMLAttributes<HTMLElement>, 'onChange'> & {
  /** One picture per slide. An img or an SVG fills the frame edge to edge. */
  slides: ReactNode[]
  /** Read by screen readers, e.g. “Post by Ada Lovelace”. */
  label: string
  /** The row above the pictures, e.g. an avatar and a name. */
  header?: ReactNode
  /** The text under the pictures. */
  children?: ReactNode
  /** Picture width over height. */
  aspect?: number
  /** Controlled: the picture in view. */
  index?: number
  /** The picture in view at first, when uncontrolled. */
  defaultIndex?: number
  /** Called when the post heads for a new picture: on release, a key or a button. */
  onIndexChange?: (index: number) => void
  labels?: Partial<Record<'previous' | 'next' | 'picture' | 'of' | 'pictures', string>>
}

const EN = { previous: 'Previous picture', next: 'Next picture', picture: 'Picture', of: 'of', pictures: 'Pictures' }
const DOT = 6 // px, and the gap between dots
const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

/**
 * A post with a row of pictures to swipe through. The pictures lie in a stack: as you swipe, the one in view swings
 * out to one side and tucks in behind, while its neighbour swings out from behind the other side and comes to the
 * front. Drag, swipe or use a trackpad with momentum, the arrow keys, or the buttons that show on hover. A dot
 * follows the position under the pictures. Every frame is written as transform and opacity only. Under reduced
 * motion each move jumps straight to the next picture.
 */
export function PostCarousel({
  slides,
  label,
  header,
  children,
  aspect = 4 / 5,
  index,
  defaultIndex,
  onIndexChange,
  labels = {},
  className,
  ...rest
}: PostCarouselProps) {
  const t = { ...EN, ...labels }
  const n = slides.length
  const id = useId()

  const stage = useRef<HTMLDivElement | null>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const dot = useRef<HTMLSpanElement | null>(null)
  const [width, setWidth] = useState(0)
  const frame = useRef(0)

  const paint = useCallback(
    (p: number) => {
      const w = frame.current
      if (!w) return
      for (let i = 0; i < n; i++) {
        const el = cards.current[i]
        if (!el) continue
        const d = i - p
        if (Math.abs(d) >= 1.5) {
          el.style.visibility = 'hidden'
          continue
        }
        // Out to the side and back in behind: the swing peaks half way, where the two pictures pass each other.
        const a = Math.max(-1, Math.min(1, d))
        const swing = Math.sin(Math.PI * a)
        const far = Math.abs(a)
        el.style.visibility = 'visible'
        el.style.transform =
          `translate3d(${(swing * w * 0.5).toFixed(2)}px, 0, 0) rotate(${(swing * 3).toFixed(3)}deg)` + ` scale(${(1 - far * 0.12).toFixed(4)})`
        el.style.opacity = Math.abs(d) > 1 ? ((1.5 - Math.abs(d)) * 2).toFixed(3) : '1'
        el.style.zIndex = String(100 - Math.round(Math.abs(d) * 50))
        const fog = el.lastElementChild as HTMLElement
        fog.style.opacity = (far * 0.45).toFixed(3)
      }
      if (dot.current) dot.current.style.transform = `translateX(${(Math.min(Math.max(p, 0), n - 1) * DOT * 2).toFixed(2)}px)`
    },
    [n],
  )

  const engine = useCarouselEngine({ count: n, index, defaultIndex, onIndexChange, step: width || 300, onFrame: paint })
  const current = engine.index

  // The stage only exists while there are pictures, so watch it again when the first ones arrive.
  const empty = !n
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [empty])

  // A new size or set of pictures: draw the current frame again.
  const { draw } = engine
  useLayoutEffect(() => {
    frame.current = width
    draw()
  }, [draw, paint, width])

  // If focus sat in a picture that just left the front, keep it in the carousel.
  useEffect(() => {
    const el = stage.current
    const active = document.activeElement
    if (!el || !active || active === el || !el.contains(active)) return
    if (!cards.current[current]?.contains(active)) el.focus({ preventScroll: true })
  }, [current])

  const keys = (e: KeyboardEvent<HTMLElement>) => {
    if (e.defaultPrevented || (e.target as HTMLElement).closest(TYPING)) return
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') engine.move(e.key === 'ArrowRight' ? 1 : -1)
    else if (e.key === 'Home') engine.go(0)
    else if (e.key === 'End') engine.go(n - 1)
    else return
    e.preventDefault()
  }

  if (!n) return null

  const atStart = current === 0
  const atEnd = current === n - 1
  const button =
    'absolute top-1/2 z-[200] grid size-11 -translate-y-1/2 cursor-pointer place-items-center [-webkit-tap-highlight-color:transparent] ' +
    'transition-[opacity,transform] duration-150 ease-out-quint active:scale-[0.96] motion-reduce:transition-none ' +
    // Shown on hover or focus, always on touch screens; at an end the button stays focusable but fades out unless it has focus.
    'opacity-0 group-hover/post:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 ' +
    'aria-disabled:pointer-events-none aria-disabled:not-focus-visible:opacity-0! aria-disabled:focus-visible:opacity-50 ' +
    'focus-visible:outline-none [&:focus-visible>span]:outline-2 [&:focus-visible>span]:outline-offset-2 [&:focus-visible>span]:outline-ring'
  const face = 'grid size-8 place-items-center rounded-[4px] bg-card/90 text-foreground shadow-[inset_0_0_0_1px_var(--border),0_2px_8px_-2px_rgb(0_0_0/0.25)]'

  return (
    <article aria-label={label} className={cn('relative isolate w-full max-w-sm overflow-hidden rounded-[6px] bg-card text-card-foreground', className)} {...rest}>
      {header ? <div className="px-3 py-2.5">{header}</div> : null}

      <div onKeyDown={keys} className="group/post relative">
        <div
          {...engine.bind}
          ref={(el) => {
            stage.current = el
            engine.bind.ref(el)
          }}
          id={id}
          role="group"
          aria-roledescription="carousel"
          aria-label={t.pictures}
          tabIndex={0}
          style={{ aspectRatio: aspect }}
          className={cn(
            'relative w-full touch-pan-y overflow-hidden bg-muted select-none [-webkit-tap-highlight-color:transparent]',
            'cursor-grab data-dragging:cursor-grabbing',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
          )}
        >
          {slides.map((slide, i) => {
            const on = i === current
            return (
              <div
                key={i}
                ref={(el) => {
                  cards.current[i] = el
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${t.picture} ${i + 1} ${t.of} ${n}`}
                aria-hidden={!on}
                className={cn(
                  'absolute inset-0 overflow-hidden bg-muted will-change-transform',
                  'shadow-[0_1px_2px_rgb(0_0_0/0.08),0_16px_32px_-16px_rgb(0_0_0/0.5)]',
                  // Hidden until the first frame places it, except the picture in view.
                  !on && 'invisible',
                )}
              >
                <div
                  inert={!on}
                  className="absolute inset-0 [&>img]:size-full [&>img]:object-cover [&>img]:[-webkit-user-drag:none] [&>svg]:size-full"
                >
                  {slide}
                </div>
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-background opacity-0" />
              </div>
            )
          })}
        </div>

        {n > 1 ? (
          <>
            <p
              aria-hidden
              className="pointer-events-none absolute top-2.5 right-2.5 z-[200] rounded-[4px] bg-card/90 px-1.5 py-1 font-mono text-[11px] leading-none font-medium text-foreground tabular-nums shadow-[inset_0_0_0_1px_var(--border)]"
            >
              {current + 1}
              <span className="text-muted-foreground">/{n}</span>
            </p>
            {/* aria-disabled, not disabled: a button that has focus keeps it when it reaches the end. */}
            <button type="button" aria-label={t.previous} aria-controls={id} aria-disabled={atStart} onClick={() => atStart || engine.move(-1)} className={cn(button, 'left-1')}>
              <span className={face}>
                <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
            </button>
            <button type="button" aria-label={t.next} aria-controls={id} aria-disabled={atEnd} onClick={() => atEnd || engine.move(1)} className={cn(button, 'right-1')}>
              <span className={face}>
                <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
            </button>
          </>
        ) : null}
      </div>

      {n > 1 ? (
        <div aria-hidden className="flex justify-center py-3">
          <div className="relative flex" style={{ gap: DOT }}>
            {slides.map((_, i) => (
              <span key={i} className="block rounded-full bg-border" style={{ width: DOT, height: DOT }} />
            ))}
            <span ref={dot} className="absolute top-0 left-0 block rounded-full bg-primary" style={{ width: DOT, height: DOT }} />
          </div>
        </div>
      ) : null}

      {children ? <div className={cn('px-3 pb-3', n < 2 && 'pt-3')}>{children}</div> : null}

      <span aria-hidden className="pointer-events-none absolute inset-0 z-[300] rounded-[inherit] shadow-[inset_0_0_0_1px_var(--border)]" />
      <p aria-live="polite" className="sr-only">
        {`${t.picture} ${current + 1} ${t.of} ${n}`}
      </p>
    </article>
  )
}
