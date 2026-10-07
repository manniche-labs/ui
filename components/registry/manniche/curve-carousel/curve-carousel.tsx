import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { useCarouselEngine } from '@/registry/manniche/hooks/use-carousel-engine'
import { cn } from '@/lib/utils'
import { curveLayouts, type CurveContext, type CurveLayout, type CurveLayoutName, type CurveSize } from './layouts'

export type CurveCarouselProps = Omit<HTMLAttributes<HTMLElement>, 'onChange'> & {
  /** One card per slide. An img or an SVG fills its card edge to edge. In the shingle layout each card sets
   *  `--curve-shift` (px); content that translates by it pans inside its card, e.g. `[translate:var(--curve-shift,0px)_0]`
   *  on an img a little wider than the card. */
  slides: ReactNode[]
  /** Read by screen readers, e.g. “Recent work”. */
  label: string
  /** The curve the cards sit on: one of the built-in layouts, or your own. */
  layout?: CurveLayoutName | CurveLayout
  /** Wrap round from the last card to the first. Ring layouts wrap by default. */
  loop?: boolean
  /** Controlled: the card in focus. */
  index?: number
  /** The card in focus at first, when uncontrolled. */
  defaultIndex?: number
  /** Called when the carousel heads for a new card: on release, a key, a button or a click. */
  onIndexChange?: (index: number) => void
  /** Card width over height. Each layout has its own default. */
  aspect?: number
  /** Show the previous and next buttons and the position rule. */
  controls?: boolean
  /** Screen reader and button text with English defaults. Keys: `previous`, `next`, `slide`, `of` and `slides`. */
  labels?: Partial<Record<'previous' | 'next' | 'slide' | 'of' | 'slides', string>>
}

const EN = { previous: 'Previous', next: 'Next', slide: 'Slide', of: 'of', slides: 'Slides' }
const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

/**
 * Cards on a curve: a fan, an arc, a coverflow, a drum, a wall that wraps round you, a helix, a double helix,
 * a rolodex, overlapping tiles, or a row that bulges towards you when it moves fast. Drag or swipe with momentum, use a trackpad, the arrow keys, the buttons, or
 * click a card to bring it to the front. Every frame is written as transform, opacity and filter only, and
 * cards are painted in depth order. Under reduced motion each move jumps straight to the new card.
 */
export function CurveCarousel({
  slides,
  label,
  layout = 'coverflow',
  loop,
  index,
  defaultIndex,
  onIndexChange,
  aspect,
  controls = true,
  labels = {},
  className,
  onKeyDown,
  ...rest
}: CurveCarouselProps) {
  const t = { ...EN, ...labels }
  const L = typeof layout === 'string' ? curveLayouts[layout] : layout
  const n = slides.length
  const wraps = (loop ?? L.loop) && n > 2
  const id = useId()

  const stage = useRef<HTMLDivElement | null>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const ticks = useRef<(HTMLSpanElement | null)[]>([])
  const [width, setWidth] = useState(0)
  const ratio = aspect ?? L.aspect
  const size: CurveSize | null = width ? L.size(width, ratio, n) : null
  const ctx = useRef<CurveContext | null>(null)

  const paint = useCallback(
    (p: number, velocity: number) => {
      const c = ctx.current
      if (!c) return
      c.velocity = velocity
      const range = L.range(c)
      for (let i = 0; i < n; i++) {
        const el = cards.current[i]
        if (!el) continue
        let d = i - p
        if (wraps) d = ((((d + n / 2) % n) + n) % n) - n / 2
        const pose = Math.abs(d) <= range ? L.pose(d, c) : null
        // Near the seam of a short loop a card is about to jump to the other end, so it fades out first.
        const seam = wraps ? Math.min(1, Math.max(0, (n / 2 - Math.abs(d)) / 0.75)) : 1
        const opacity = pose ? (pose.opacity ?? 1) * seam : 0
        if (!pose || opacity < 0.004) {
          el.style.visibility = 'hidden'
          continue
        }
        const { x = 0, y = 0, z = 0, rotateX = 0, rotateY = 0, rotateZ = 0, scale = 1, blur = 0, fog = 0, shift = 0 } = pose
        el.style.visibility = 'visible'
        el.style.transform =
          `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px)` +
          (rotateX ? ` rotateX(${rotateX.toFixed(3)}deg)` : '') +
          (rotateY ? ` rotateY(${rotateY.toFixed(3)}deg)` : '') +
          (rotateZ ? ` rotateZ(${rotateZ.toFixed(3)}deg)` : '') +
          (scale !== 1 ? ` scale(${scale.toFixed(4)})` : '')
        el.style.opacity = opacity.toFixed(3)
        el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : ''
        el.style.zIndex = String(Math.round(pose.order ?? z) + 10000)
        const fogEl = el.lastElementChild as HTMLElement
        fogEl.style.opacity = fog > 0.002 ? Math.min(fog, 1).toFixed(3) : '0'
        if (L.shift) el.style.setProperty('--curve-shift', `${(shift * L.shift * c.cardWidth).toFixed(2)}px`)
      }
      // The rule under the stage follows the position, also mid-drag.
      const at = wraps ? (((p % n) + n) % n) / n : (Math.min(Math.max(p, 0), n - 1) / Math.max(n - 1, 1)) * (1 - 1 / n)
      ticks.current.forEach((el, k) => {
        if (el) el.style.transform = `translateX(${((at - k) * 100).toFixed(3)}cqw)`
      })
    },
    [L, n, wraps],
  )

  const engine = useCarouselEngine({
    count: n,
    loop: wraps,
    index,
    defaultIndex,
    onIndexChange,
    axis: L.axis,
    step: size ? L.step({ ...size, width, count: n, velocity: 0 }) : 300,
    onFrame: paint,
  })
  const current = engine.index

  // The stage only exists while there are cards, so watch it again when the first ones arrive.
  const empty = !n
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [empty])

  // A new size, layout or set of cards: draw the current frame again.
  const { draw } = engine
  useLayoutEffect(() => {
    ctx.current = width ? { ...L.size(width, ratio, n), width, count: n, velocity: 0 } : null
    draw()
  }, [draw, paint, L, width, ratio, n])

  // If focus sat in a card that just left the front, keep it in the carousel.
  useEffect(() => {
    const el = stage.current
    const active = document.activeElement
    if (!el || !active || active === el || !el.contains(active)) return
    if (!cards.current[current]?.contains(active)) el.focus({ preventScroll: true })
  }, [current])

  const keys = (e: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented || (e.target as HTMLElement).closest(TYPING)) return
    const back = L.axis === 'x' ? 'ArrowLeft' : 'ArrowUp'
    const fwd = L.axis === 'x' ? 'ArrowRight' : 'ArrowDown'
    if (e.key === back || e.key === fwd) engine.move(e.key === fwd ? 1 : -1)
    else if (e.key === 'Home') engine.go(0)
    else if (e.key === 'End') engine.go(n - 1)
    else return
    e.preventDefault()
  }

  if (!n) return null

  const atStart = !wraps && current === 0
  const atEnd = !wraps && current === n - 1
  const button =
    'grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-muted text-foreground [-webkit-tap-highlight-color:transparent] hover:bg-[color-mix(in_oklab,var(--foreground)_8%,var(--muted))] ' +
    'transition-[opacity,transform] duration-150 ease-out-quint active:scale-[0.96] aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:active:scale-100 motion-reduce:transition-none ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

  return (
    <section aria-roledescription="carousel" aria-label={label} onKeyDown={keys} className={cn('w-full', className)} {...rest}>
      <div
        {...engine.bind}
        ref={(el) => {
          stage.current = el
          engine.bind.ref(el)
        }}
        id={id}
        role="group"
        aria-label={t.slides}
        tabIndex={0}
        style={{ height: size?.height ?? 320, perspective: size?.perspective, perspectiveOrigin: size?.origin }}
        className={cn(
          'relative w-full overflow-x-clip rounded-[calc(var(--radius)*2+2px)] select-none [-webkit-tap-highlight-color:transparent]',
          L.axis === 'x' ? 'touch-pan-y' : 'touch-pan-x',
          'cursor-grab data-dragging:cursor-grabbing',
          'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
        )}
      >
        {size &&
          slides.map((slide, i) => {
            const on = i === current
            return (
              <div
                key={i}
                ref={(el) => {
                  cards.current[i] = el
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${t.slide} ${i + 1} ${t.of} ${n}`}
                aria-hidden={!on}
                onClick={on ? undefined : () => engine.go(i)}
                style={{ width: size.cardWidth, height: size.cardHeight, marginLeft: -size.cardWidth / 2, marginTop: -size.cardHeight / 2 }}
                className={cn(
                  'absolute top-1/2 left-1/2 overflow-hidden rounded-[calc(var(--radius)+2px)] bg-card will-change-transform',
                  'shadow-[0_1px_2px_rgb(0_0_0/0.06),0_18px_36px_-18px_rgb(0_0_0/0.45)]',
                  !on && 'cursor-pointer',
                  // Hidden until the first frame places it, except the card in focus.
                  !on && 'invisible',
                )}
              >
                <div
                  inert={!on}
                  className="absolute inset-0 [&>img]:size-full [&>img]:object-cover [&>img]:[-webkit-user-drag:none] [&>svg]:size-full"
                >
                  {slide}
                </div>
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent)]" />
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-background opacity-0" />
              </div>
            )
          })}
      </div>

      {controls && n > 1 ? (
        <div className="mx-auto mt-4 flex max-w-sm items-center gap-3">
          {/* aria-disabled, not disabled: a button that has focus keeps it when it reaches the end. */}
          <button type="button" aria-label={t.previous} aria-controls={id} aria-disabled={atStart} onClick={() => atStart || engine.move(-1)} className={button}>
            <ChevronLeft className="size-[18px]" strokeWidth={2} aria-hidden />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {/* A hairline rule with a primary tick, one card's share of it long, that follows the position. In a
                loop a second tick trails one rule-length behind, so the tick slides off one end and on at the other. */}
            <div aria-hidden className="@container relative h-1 overflow-hidden rounded-full bg-muted">
              {(wraps ? [0, 1] : [0]).map((k) => (
                <span
                  key={k}
                  ref={(el) => {
                    ticks.current[k] = el
                  }}
                  style={{ width: `${100 / n}%` }}
                  className="absolute inset-y-0 left-0 block rounded-full bg-primary"
                />
              ))}
            </div>
            <p className="flex justify-between font-mono text-[11px] leading-none font-medium tracking-[0.04em] text-muted-foreground tabular-nums">
              <span aria-hidden>{String(current + 1).padStart(2, '0')}</span>
              <span aria-hidden>{String(n).padStart(2, '0')}</span>
            </p>
          </div>
          <button type="button" aria-label={t.next} aria-controls={id} aria-disabled={atEnd} onClick={() => atEnd || engine.move(1)} className={button}>
            <ChevronRight className="size-[18px]" strokeWidth={2} aria-hidden />
          </button>
        </div>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {`${t.slide} ${current + 1} ${t.of} ${n}`}
      </p>
    </section>
  )
}
