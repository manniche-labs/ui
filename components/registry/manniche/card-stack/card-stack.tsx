// A fanned stack of payment or account cards. The front card's figure sits under the fan in the display number.
// Drag or flick the front card sideways, tap it, press the arrow keys or use the buttons, and it flies off and
// tucks in at the back while the next card comes forward. The dots under the fan pick a card directly.
// The fan is sized in CSS from the container's width, so nothing jumps on load and it fits from 280 px up.
// Screen readers: the stack is a carousel whose only visible slide is the front card ("1 of 4: Everyday, Debit,
// ending 4821, €2,091.20"); the cards behind it are hidden and inert. Every switch made with a key, a button or a
// swipe is read once through a polite live region. The dots are a radio group.
// Reduced motion: no fan-in, no flight and no rolling digits; the next card is simply in front.
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { BigNumber } from '@/registry/manniche/chart-kit/chart-kit'
import { EASE_CSS, formatValue, stepIndex, type ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { useAnnounce, useChartFrame } from '@/registry/manniche/chart-kit/use-chart'
import { cn } from '@/lib/utils'

export type StackCard = {
  /** Unique and stable; it is the card's value for `value` and `onValueChange`. */
  id: string
  /** The name on the card, such as "Everyday". */
  name: string
  /** A second word in the corner, such as "Debit" or "Virtual". */
  kind?: string
  /** The last digits of the number, shown as "•••• 4821". */
  ending?: string
  /** The figure shown under the fan while this card is in front, such as its balance. */
  amount: number
  /** The card's fill. Any CSS colour; defaults run ink, then --chart-1, --chart-3, --chart-2, --chart-5, --chart-4. */
  color?: string
  /** The text colour on the card. Leave it out and it is picked from the fill for contrast. */
  textColor?: string
}

export type CardStackLabels = {
  /** The small line over the figure. Default "Everyday · Debit". */
  readout?: (card: StackCard) => string
  /** The accessible name of the previous button. Default “Previous card”. */
  previous?: string
  /** The accessible name of the next button. Default “Next card”. */
  next?: string
  /** The name of the dot picker. */
  picker?: string
  /** Read after the stack's name. */
  hint?: string
  /** The front slide's name, which screen readers say when they reach it. */
  slide?: (card: StackCard, position: number, count: number, amount: string) => string
  /** What is read when a card comes forward. */
  announce?: (card: StackCard, amount: string) => string
  /** One dot's name. */
  dot?: (card: StackCard) => string
  /** Shown in place of the dots when they do not fit. Default "2 of 7". */
  counter?: (position: number, count: number) => string
}

export type CardStackProps = Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> & {
  /** The cards, front first. */
  data: StackCard[]
  /** The accessible name of the stack, such as "Your cards". */
  label: string
  /** The figure's format. Default two decimals; pass a currency for money. */
  format?: ValueFormat
  /** The id of the card in front (controlled). */
  value?: string
  /** The card in front at first (uncontrolled). Default the first card. */
  defaultValue?: string
  /** Called with the new front card's id. */
  onValueChange?: (id: string) => void
  /** The widest a card gets, in px. Default 330, or 268 inside a compact tile. */
  cardWidth?: number
  /** Draw your own card face. The shell (fill, corners, shadow, motion) stays. */
  renderCard?: (card: StackCard, state: { front: boolean; index: number }) => ReactNode
  /** Hide the figure under the fan. */
  hideAmount?: boolean
  /** Text overrides for the readout, buttons, hints and announcements, with English defaults. */
  labels?: CardStackLabels
}

const DEFAULT_LABELS: Required<CardStackLabels> = {
  readout: (c) => (c.kind ? `${c.name} · ${c.kind}` : c.name),
  previous: 'Previous card',
  next: 'Next card',
  picker: 'Choose a card',
  hint: 'Use the arrow keys, the buttons or a swipe to switch cards.',
  slide: (c, i, n, amount) => `${i} of ${n}: ${[c.name, c.kind, c.ending && `ending ${c.ending}`, amount].filter(Boolean).join(', ')}`,
  announce: (c, amount) => `${c.name}${c.ending ? `, ending ${c.ending}` : ''}, ${amount}`,
  dot: (c) => (c.ending ? `${c.name}, ending ${c.ending}` : c.name),
  counter: (i, n) => `${i} of ${n}`,
}

const FILLS = ['var(--foreground)', 'var(--chart-1)', 'var(--chart-3)', 'var(--chart-2)', 'var(--chart-5)', 'var(--chart-4)']

// The fan: each card behind the front one is moved, turned and shrunk a step more, about a point low on its left.
const STEP = { x: 16, y: -9, turn: 5.5, shrink: 0.035 }
const MAX_BEHIND = 3
const ORIGIN = { x: 0.22, y: 1.2 }
const RATIO = 1.586 // ISO/IEC 7810 ID-1
const slot = (k: number) =>
  `translate(${k * STEP.x}px, ${k * STEP.y}px) rotate(${k * STEP.turn}deg) scale(${1 - k * STEP.shrink})`

// How far the fan reaches past the front card, as a·width + b px, so CSS can reserve the room. Right uses the
// deepest card; the lift above the front card's top edge is the largest of all depths, written as CSS max().
function fanCorners(k: number) {
  const h = 1 / RATIO
  const s = 1 - k * STEP.shrink
  const t = (k * STEP.turn * Math.PI) / 180
  const ox = ORIGIN.x
  const oy = ORIGIN.y * h
  let right = -Infinity
  let top = Infinity
  for (const [px, py] of [
    [0, 0],
    [1, 0],
    [0, h],
    [1, h],
  ]) {
    const rx = (px - ox) * s
    const ry = (py - oy) * s
    right = Math.max(right, ox + rx * Math.cos(t) - ry * Math.sin(t) - 1)
    top = Math.min(top, oy + rx * Math.sin(t) + ry * Math.cos(t))
  }
  return { right, top }
}
function fanRoom(behind: number) {
  const right = fanCorners(behind).right
  const lifts = Array.from({ length: behind }, (_, i) => {
    const k = i + 1
    return `calc(${-k * STEP.y}px - var(--w) * ${fanCorners(k).top.toFixed(4)})`
  })
  return {
    marginRight: `calc(var(--w) * ${right.toFixed(4)} + ${behind * STEP.x}px)`,
    marginTop: lifts.length ? `max(0px, ${lifts.join(', ')})` : '0px',
    width: `min(var(--cw), calc((100cqw - ${behind * STEP.x}px) / ${(1 + right).toFixed(4)}))`,
  }
}

const FLY_MS = 220
const SETTLE_MS = 300
const TAP_PX = 4

type Drag = { id: string; pointer: number; x0: number; dx: number; samples: { t: number; x: number }[] }

export function CardStack({
  data,
  label,
  format = { decimals: 2 },
  value,
  defaultValue,
  onValueChange,
  cardWidth,
  renderCard,
  hideAmount = false,
  labels: labelsProp,
  className,
  style,
  ...rest
}: CardStackProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const { ref: frameRef, width: frameWidth, drawn, reduced } = useChartFrame<HTMLDivElement>()
  const { say, region } = useAnnounce()
  const hintId = useId()
  const [inner, setInner] = useState(defaultValue ?? data[0]?.id)
  const current = value ?? inner
  const n = data.length
  const front = Math.max(0, data.findIndex((c) => c.id === current))

  const [drag, setDrag] = useState<Drag | null>(null)
  const [fly, setFly] = useState<{ id: string; dir: number; ms: number } | null>(null)
  const [enter, setEnter] = useState<string | null>(null)
  // The fan opens once, card by card, the first time the stack is seen; after that cards move without a delay.
  const [opened, setOpened] = useState(false)
  const flyTimer = useRef(0)

  useEffect(() => () => window.clearTimeout(flyTimer.current), [])
  useEffect(() => {
    if (!drawn || opened) return
    const t = window.setTimeout(() => setOpened(true), 600)
    return () => window.clearTimeout(t)
  }, [drawn, opened])
  // A card coming back from the left is placed there for one frame without a transition, then glides in.
  useEffect(() => {
    if (!enter) return
    let b = 0
    const a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => setEnter(null))
    })
    return () => {
      cancelAnimationFrame(a)
      cancelAnimationFrame(b)
    }
  }, [enter])

  if (!n) return null

  const select = (i: number, speak: boolean) => {
    const card = data[((i % n) + n) % n]
    if (card.id === data[front].id) return
    if (value === undefined) setInner(card.id)
    onValueChange?.(card.id)
    if (speak) say(labels.announce(card, formatValue(card.amount, format)))
  }

  // The front card flies out (in the swipe's direction) and the next one comes forward at once.
  const next = (dir = 1, ms = FLY_MS) => {
    if (n < 2) return
    if (!reduced) {
      window.clearTimeout(flyTimer.current)
      setFly({ id: data[front].id, dir, ms })
      flyTimer.current = window.setTimeout(() => setFly(null), ms)
    }
    select(front + 1, true)
  }
  // The back card comes in from the left, over the top, and lands in front.
  const previous = () => {
    if (n < 2) return
    const i = (front - 1 + n) % n
    if (!reduced) setEnter(data[i].id)
    select(i, true)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') previous()
    else if (e.key === 'Home' || e.key === 'End') select(e.key === 'Home' ? 0 : n - 1, true)
    else return
    e.preventDefault()
  }

  // Dragging -----------------------------------------------------------------------------------------------------
  const onPointerDown = (e: PointerEvent<HTMLDivElement>, id: string) => {
    if (id !== data[front].id || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ id, pointer: e.pointerId, x0: e.clientX, dx: 0, samples: [{ t: e.timeStamp, x: e.clientX }] })
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag || e.pointerId !== drag.pointer) return
    const samples = [...drag.samples, { t: e.timeStamp, x: e.clientX }].filter((s) => e.timeStamp - s.t < 100)
    setDrag({ ...drag, dx: e.clientX - drag.x0, samples })
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag || e.pointerId !== drag.pointer) return
    const { dx, samples } = drag
    setDrag(null)
    const first = samples[0]
    const last = samples[samples.length - 1]
    // px per ms over the last tenth of a second, so a short flick counts as well as a long drag
    const v = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0
    const width = e.currentTarget.offsetWidth
    const far = Math.abs(dx) > Math.min(90, width * 0.28)
    const flick = Math.abs(dx) > 16 && Math.abs(v) > 0.45 && Math.sign(v) === Math.sign(dx)
    if (far || flick) {
      // Keep the throw's speed: an ease-out-quint starts at about 4.3 times its average speed, so the card
      // leaves the finger at the speed it was thrown and slows to a stop off to the side, with no spring back.
      const left = width * 1.15 - Math.abs(dx)
      const ms = Math.round(Math.max(160, Math.min(SETTLE_MS, (4.3 * left) / Math.max(Math.abs(v), 0.6))))
      next(Math.sign(dx), ms)
    } else if (Math.abs(dx) < TAP_PX) next(1)
  }
  const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    if (drag && e.pointerId === drag.pointer) setDrag(null)
  }

  // Layout -------------------------------------------------------------------------------------------------------
  const behind = Math.min(n - 1, MAX_BEHIND)
  const room = fanRoom(behind)
  const dotsFit = frameWidth === 0 || n * 44 + 2 * 44 + 2 * 8 <= frameWidth
  const frontCard = data[front]

  return (
    <div
      ref={frameRef}
      className={cn(
        '@container grid w-full min-w-0 justify-items-center gap-[18px] group-data-[density=compact]/tile:gap-3',
        cardWidth === undefined && '[--cw:330px] group-data-[density=compact]/tile:[--cw:268px]',
        className,
      )}
      style={{ ...(cardWidth !== undefined ? ({ '--cw': `${cardWidth}px` } as CSSProperties) : null), ...style }}
      {...rest}
    >
      <div
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
        aria-describedby={hintId}
        onKeyDown={onKeyDown}
        className="relative aspect-[1.586] touch-pan-y rounded-[20px] outline-offset-[6px] select-none [-webkit-touch-callout:none]"
        style={{ '--w': room.width, width: 'var(--w)', marginRight: room.marginRight, marginTop: room.marginTop } as CSSProperties}
      >
        <span id={hintId} className="sr-only">
          {labels.hint}
        </span>
        {data.map((card, i) => {
          const k = (i - front + n) % n
          const isFront = k === 0
          const fill = card.color ?? FILLS[i % FILLS.length]
          const ink = card.color === undefined && i % FILLS.length === 0
          const settle = `transform ${SETTLE_MS}ms ${EASE_CSS}, opacity 200ms ${EASE_CSS}`
          let transform = slot(Math.min(k, MAX_BEHIND))
          let transition = reduced ? 'none' : settle
          let delay = opened || reduced ? 0 : Math.min(k, MAX_BEHIND) * 60
          let opacity = k > MAX_BEHIND ? 0 : 1
          let z = 20 - Math.min(k, 19)
          if (!drawn && !reduced) transform = slot(0)
          if (drag?.id === card.id) {
            transform = `translateX(${drag.dx}px) rotate(${drag.dx * 0.05}deg)`
            transition = 'none'
            z = 30
          } else if (fly?.id === card.id) {
            transform = `translate(${fly.dir * 115}%, -4%) rotate(${fly.dir * 16}deg)`
            transition = `transform ${fly.ms}ms ${EASE_CSS}`
            delay = 0
            opacity = 1
            z = 30
          } else if (enter === card.id) {
            transform = 'translate(-115%, -4%) rotate(-16deg)'
            transition = 'none'
            z = 30
          }
          return (
            <div
              key={card.id}
              role={isFront ? 'group' : undefined}
              aria-roledescription={isFront ? 'slide' : undefined}
              aria-label={isFront ? labels.slide(card, i + 1, n, formatValue(card.amount, format)) : undefined}
              aria-hidden={isFront ? undefined : true}
              inert={!isFront}
              data-front={isFront || undefined}
              onPointerDown={(e) => onPointerDown(e, card.id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onLostPointerCapture={onPointerCancel}
              onDragStart={(e) => e.preventDefault()}
              className={cn(
                'absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[18px] px-5 py-[18px]',
                'shadow-[0_1px_1px_rgba(0,0,0,0.08),0_14px_28px_-14px_rgba(0,0,0,0.45)]',
                'group-data-[density=compact]/tile:px-4 group-data-[density=compact]/tile:py-3.5',
                isFront && (drag ? 'cursor-grabbing' : 'cursor-grab'),
                !card.textColor && !ink && 'cs-auto',
              )}
              style={
                {
                  '--fill': fill,
                  background: fill,
                  color: card.textColor ?? (ink ? 'var(--card)' : 'oklch(0.985 0.002 90)'),
                  transform,
                  transformOrigin: `${ORIGIN.x * 100}% ${ORIGIN.y * 100}%`,
                  transition,
                  transitionDelay: delay ? `${delay}ms` : undefined,
                  opacity,
                  zIndex: z,
                } as CSSProperties
              }
            >
              {renderCard ? renderCard(card, { front: isFront, index: i }) : <CardFace card={card} />}
            </div>
          )
        })}
      </div>
      <style>{AUTO_CSS}</style>

      {!hideAmount && (
        <div aria-hidden className="grid min-w-0 justify-items-center gap-1 text-center">
          <span className="max-w-full truncate text-[13.5px] leading-[1.3] font-medium text-muted-foreground">
            {labels.readout(frontCard)}
          </span>
          <BigNumber value={frontCard.amount} format={format} size="lg" className="group-data-[density=compact]/tile:text-[30px]" />
        </div>
      )}

      {n > 1 && (
        <div className="flex items-center gap-2">
          <IconButton label={labels.previous} onClick={previous}>
            <ChevronLeft className="size-[18px]" strokeWidth={2} />
          </IconButton>
          {dotsFit ? (
            <div role="radiogroup" aria-label={labels.picker} className="flex">
              {data.map((card, i) => (
                <Dot
                  key={card.id}
                  label={labels.dot(card)}
                  on={i === front}
                  onPick={() => select(i, false)}
                  onKey={(e) => {
                    const key = e.key === 'ArrowDown' ? 'ArrowRight' : e.key === 'ArrowUp' ? 'ArrowLeft' : e.key
                    const to = stepIndex(key, i, n, { loop: true })
                    if (to === null) return
                    e.preventDefault()
                    select(to, false)
                    ;(e.currentTarget.parentElement?.children[to] as HTMLElement | undefined)?.focus()
                  }}
                />
              ))}
            </div>
          ) : (
            <span className="min-w-14 text-center font-mono text-[12px] text-muted-foreground tabular-nums">
              {labels.counter(front + 1, n)}
            </span>
          )}
          <IconButton label={labels.next} onClick={() => next(1)}>
            <ChevronRight className="size-[18px]" strokeWidth={2} />
          </IconButton>
        </div>
      )}
      {region}
    </div>
  )
}

// Text on a card fill: where the browser can do colour maths, the fill is pulled out of the murky middle band and
// the text goes near-white on a dark fill and near-black on a light one, so the name and number keep 4.5:1.
const SWITCH = 'clamp(0, (l - 0.66) * 1000, 1)'
const AUTO_CSS = `@supports (color: oklch(from red l c h)) {
  .cs-auto {
    background: oklch(from var(--fill) calc((1 - ${SWITCH}) * min(l, 0.55) + ${SWITCH} * max(l, 0.77)) c h) !important;
    color: oklch(from var(--fill) calc((1 - ${SWITCH}) * 0.985 + ${SWITCH} * 0.2) 0.01 90) !important;
  }
}`

function CardFace({ card }: { card: StackCard }) {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-[60px] -bottom-[90px] size-60 rounded-full opacity-[0.13] shadow-[inset_0_0_0_1px_currentColor] after:absolute after:inset-7 after:rounded-full after:shadow-[inset_0_0_0_1px_currentColor] after:content-['']"
      />
      <span aria-hidden className="relative flex items-center justify-between gap-2">
        <span className="truncate text-[15px] leading-[1.2] font-semibold tracking-[-0.01em]">{card.name}</span>
        <svg viewBox="0 0 20 20" className="size-5 flex-none fill-none stroke-current stroke-[1.8] opacity-90 [stroke-linecap:round]">
          <path d="M6 6.5a5 5 0 0 1 0 7M9.5 4.5a8 8 0 0 1 0 11M13 2.5a11 11 0 0 1 0 15" />
        </svg>
      </span>
      <svg aria-hidden viewBox="0 0 38 28" className="relative h-7 w-[38px]">
        <rect x=".75" y=".75" width="36.5" height="26.5" rx="6" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.2" />
        <path d="M1 10h11M1 18h11M26 10h11M26 18h11M12 1v26M26 1v26M12 14h14" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.2" fill="none" />
      </svg>
      <span aria-hidden className="relative flex items-center justify-between gap-2">
        {card.ending ? (
          <span className="font-mono text-[14px] leading-none font-medium tracking-[0.06em] whitespace-nowrap">•••• {card.ending}</span>
        ) : (
          <span />
        )}
        {card.kind && <span className="truncate text-[12px] leading-none font-medium opacity-[0.78]">{card.kind}</span>}
      </span>
    </>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-11 flex-none cursor-pointer place-items-center rounded-full bg-muted text-foreground transition-transform duration-150 ease-out-quint active:scale-[0.96] motion-reduce:transition-none"
    >
      {children}
    </button>
  )
}

function Dot({ label, on, onPick, onKey }: { label: string; on: boolean; onPick: () => void; onKey: (e: KeyboardEvent<HTMLButtonElement>) => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={label}
      tabIndex={on ? 0 : -1}
      onClick={onPick}
      onKeyDown={onKey}
      className="group/dot grid size-11 cursor-pointer place-items-center rounded-full focus-visible:outline-offset-[-4px]"
    >
      <i
        aria-hidden
        className={cn(
          'block size-[7px] rounded-full bg-foreground transition-[opacity,transform] duration-200 ease-out-quint motion-reduce:transition-none',
          on ? 'scale-[1.15] opacity-100' : 'opacity-[0.22] group-hover/dot:opacity-50',
        )}
      />
    </button>
  )
}
