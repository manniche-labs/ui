import {
  Children,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { ChevronDown, X } from 'lucide-react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type PillToCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'role'> & {
  /** The person's name, shown in the pill and as the card's title. */
  name: string
  /** A line under the name in the card, e.g. a job title. */
  role?: string
  /** The avatar. Defaults to the initials of `name`. */
  avatar?: ReactNode
  /** The card's body. Each direct child fades in a little after the one before it. */
  children?: ReactNode
  /** Controlled open state. */
  open?: boolean
  /** Open state on the first render, when uncontrolled. */
  defaultOpen?: boolean
  /** Called when the card asks to open or close. */
  onOpenChange?: (open: boolean) => void
  /** Accessible name of the close button. */
  closeLabel?: string
}

const E = 'cubic-bezier(0.23,1,0.32,1)'
const FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

const setTransition = (el: HTMLElement, v: string) => {
  el.style.transition = v
}

/**
 * An avatar pill that unfolds from its place into a profile card, and folds back on Escape, the close button or a click outside.
 * The morph is a FLIP: the card's surface, avatar and name start exactly over the pill and glide to rest on transform only,
 * while the rest of the card fades in one row after another. The card is a non-modal dialog: it covers its own trigger and
 * takes focus, so a disclosure would not fit. Focus goes to the first control in the card and back to the pill on close.
 * Under reduced motion the card opens and closes at once.
 */
export function PillToCard({
  name,
  role,
  avatar,
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  closeLabel = 'Close profile',
  className,
  onKeyDown,
  ...rest
}: PillToCardProps) {
  const reduce = useReducedMotion()
  const [openState, setOpenState] = useState(defaultOpen)
  const isOpen = openProp ?? openState
  const [shown, setShown] = useState(isOpen)

  const id = useId()
  const cardId = `${id}card`
  const titleId = `${id}title`

  const root = useRef<HTMLDivElement>(null)
  const pill = useRef<HTMLButtonElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const surf = useRef<HTMLDivElement>(null)
  const pillAv = useRef<HTMLSpanElement>(null)
  const pillName = useRef<HTMLSpanElement>(null)
  const cardAv = useRef<HTMLSpanElement>(null)
  const cardName = useRef<HTMLSpanElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const phase = useRef<'closed' | 'open'>('closed')
  const first = useRef(true)
  const returnFocus = useRef(false)
  const hideT = useRef(0)

  const request = (next: boolean, focusPill = false) => {
    if (next === isOpen) return
    returnFocus.current = focusPill
    if (openProp === undefined) setOpenState(next)
    onOpenChange?.(next)
  }
  const requestLatest = useRef(request)
  useLayoutEffect(() => {
    requestLatest.current = request
  })

  const reveals = () => [...(card.current?.querySelectorAll<HTMLElement>('[data-ptc-reveal]') ?? [])]

  // Centre the card on the pill, kept 8px inside the viewport. Local pixels, so a scaled parent does not throw it off.
  const position = () => {
    const r = root.current
    const p = pill.current
    const c = card.current
    if (!r || !p || !c) return
    const rr = r.getBoundingClientRect()
    const k = rr.width / (r.offsetWidth || 1) || 1
    const cw = c.offsetWidth
    const ch = c.offsetHeight
    const minX = -rr.left / k + 8
    const maxX = (window.innerWidth - rr.left) / k - cw - 8
    const minY = -rr.top / k + 8
    const maxY = (window.innerHeight - rr.top) / k - ch - 8
    const x = p.offsetLeft + p.offsetWidth / 2 - cw / 2
    const y = p.offsetTop + p.offsetHeight / 2 - ch / 2
    c.style.left = `${Math.max(minX, Math.min(maxX, x))}px`
    c.style.top = `${Math.max(minY, Math.min(maxY, y))}px`
  }
  const positionLatest = useRef(position)
  useLayoutEffect(() => {
    positionLatest.current = position
  })

  // The transforms that put the card's surface, avatar and name exactly over their counterparts in the pill.
  const inverse = () => {
    const r = root.current!
    const k = r.getBoundingClientRect().width / (r.offsetWidth || 1) || 1
    const pr = pill.current!.getBoundingClientRect()
    const cr = card.current!.getBoundingClientRect()
    const pairs = [
      [pillAv.current!, cardAv.current!],
      [pillName.current!, cardName.current!],
    ].map(([a, b]) => {
      const ra = a.getBoundingClientRect()
      const rb = b.getBoundingClientRect()
      const m = new DOMMatrix(getComputedStyle(b).transform)
      const s = ra.width / (rb.width / (m.a || 1))
      return `translate(${(ra.left - (rb.left - m.e * k)) / k}px,${(ra.top - (rb.top - m.f * k)) / k}px) scale(${s})`
    })
    return {
      surf: `translate(${(pr.left - cr.left) / k}px,${(pr.top - cr.top) / k}px) scale(${pr.width / cr.width},${pr.height / cr.height})`,
      pairs,
    }
  }

  useLayoutEffect(() => {
    const c = card.current
    const s = surf.current
    const p = pill.current
    if (!c || !s || !p || !cardAv.current || !cardName.current) return
    const instant = reduce || first.current
    first.current = false
    const flip = [cardAv.current, cardName.current]
    const parts = [s, ...flip, ...reveals()]
    // Hold every part where it is right now, so a reversal mid-way starts from there.
    const freeze = () =>
      parts.forEach((el) => {
        const cs = getComputedStyle(el)
        el.style.transform = cs.transform
        el.style.opacity = cs.opacity
        setTransition(el, 'none')
      })

    if (isOpen && phase.current !== 'open') {
      phase.current = 'open'
      window.clearTimeout(hideT.current)
      const wasHidden = c.hidden
      if (!wasHidden) freeze()
      c.hidden = false
      c.style.pointerEvents = ''
      setShown(true)
      if (wasHidden) {
        parts.forEach((el) => setTransition(el, 'none'))
        s.style.transform = 'none'
        flip.forEach((el) => (el.style.transform = 'none'))
      }
      position()
      if (wasHidden) {
        const inv = inverse()
        s.style.transform = inv.surf
        s.style.opacity = '0'
        flip.forEach((el, i) => (el.style.transform = inv.pairs[i]))
        reveals().forEach((el) => {
          el.style.opacity = '0'
          el.style.transform = 'translateY(-6px)'
        })
      }
      void c.offsetWidth
      const T = instant ? 0 : 260
      setTransition(s, `transform ${T}ms ${E}, opacity ${T ? 120 : 0}ms ${E}`)
      s.style.transform = 'none'
      s.style.opacity = '1'
      flip.forEach((el) => {
        setTransition(el, `transform ${T}ms ${E}`)
        el.style.transform = 'none'
      })
      reveals().forEach((el, i) => {
        // Capped, so the last row is still done within 300 ms however many children there are.
        const d = T ? Math.min(70 + i * 28, 100) : 0
        setTransition(el, `opacity ${T ? 180 : 0}ms ${E} ${d}ms, transform ${T ? 200 : 0}ms ${E} ${d}ms`)
        el.style.opacity = '1'
        el.style.transform = 'none'
      })
      setTransition(p, `opacity ${T ? 110 : 0}ms ${E}`)
      p.style.opacity = '0'
      const target = body.current?.querySelector<HTMLElement>(FOCUSABLE) ?? closeBtn.current
      target?.focus({ preventScroll: true })
    } else if (!isOpen && phase.current === 'open') {
      phase.current = 'closed'
      // Let presses through while it folds away, so a quick second press on the pill opens it again.
      c.style.pointerEvents = 'none'
      freeze()
      void c.offsetWidth
      const inv = inverse()
      const T = instant ? 0 : 210
      setTransition(s, `transform ${T}ms ${E}, opacity ${T ? 110 : 0}ms ${E} ${T ? 90 : 0}ms`)
      s.style.transform = inv.surf
      s.style.opacity = '0'
      flip.forEach((el, i) => {
        setTransition(el, `transform ${T}ms ${E}`)
        el.style.transform = inv.pairs[i]
      })
      reveals().forEach((el) => {
        setTransition(el, `opacity ${T ? 90 : 0}ms ${E}, transform ${T ? 120 : 0}ms ${E}`)
        el.style.opacity = '0'
        el.style.transform = 'translateY(-4px)'
      })
      setTransition(p, `opacity ${T ? 110 : 0}ms ${E} ${T ? 100 : 0}ms`)
      p.style.opacity = '1'
      if (returnFocus.current) p.focus({ preventScroll: true })
      returnFocus.current = false
      const done = () => {
        c.hidden = true
        c.style.pointerEvents = ''
        setShown(false)
        parts.forEach((el) => {
          el.style.transition = ''
          el.style.transform = ''
          el.style.opacity = ''
        })
        p.style.transition = ''
      }
      window.clearTimeout(hideT.current)
      if (T) hideT.current = window.setTimeout(done, T + 20)
      else done()
    }
  }, [isOpen, reduce])

  useEffect(() => () => window.clearTimeout(hideT.current), [])

  // While open: a press outside closes, and so does focus leaving the card; a resize re-centres it.
  useEffect(() => {
    if (!isOpen) return
    const down = (e: PointerEvent) => {
      const c = card.current
      // The pill toggles on its own click.
      if (!c || c.contains(e.target as Node) || pill.current?.contains(e.target as Node)) return
      const hadFocus = c.contains(document.activeElement)
      requestLatest.current(false)
      // A press on something that cannot take focus leaves focus on the body; hand it back to the pill instead.
      if (hadFocus)
        requestAnimationFrame(() => {
          if (document.activeElement === document.body) pill.current?.focus({ preventScroll: true })
        })
    }
    const out = (e: FocusEvent) => {
      const to = e.relatedTarget as Node | null
      if (to && card.current && !card.current.contains(to)) requestLatest.current(false)
    }
    const resize = () => positionLatest.current()
    const c = card.current
    document.addEventListener('pointerdown', down)
    c?.addEventListener('focusout', out)
    window.addEventListener('resize', resize)
    return () => {
      document.removeEventListener('pointerdown', down)
      c?.removeEventListener('focusout', out)
      window.removeEventListener('resize', resize)
    }
  }, [isOpen])

  return (
    <div
      ref={root}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e)
        if (e.key === 'Escape' && isOpen && !e.defaultPrevented) {
          e.preventDefault()
          request(false, true)
        }
      }}
      className={cn('relative inline-flex', className)}
      {...rest}
    >
      <button
        ref={pill}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={cardId}
        onClick={() => request(!isOpen)}
        className={cn(
          'inline-flex h-12 items-center gap-2.5 rounded-full border border-border bg-card pr-3.5 pl-1.5 text-card-foreground',
          'transition-[opacity,transform] duration-120 ease-[cubic-bezier(0.23,1,0.32,1)] active:[transform:scale(.97)] motion-reduce:transition-none',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      >
        <Avatar ref={pillAv} className="size-[34px] text-xs">
          {avatar ?? initials(name)}
        </Avatar>
        <span ref={pillName} className="text-[15px] leading-[1.2] font-medium tracking-[-0.01em] whitespace-nowrap">
          {name}
        </span>
        <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
      </button>

      <div
        ref={card}
        id={cardId}
        role="dialog"
        aria-labelledby={titleId}
        // Focusable, so a click on plain text inside keeps focus in the card and Escape still reaches the root.
        tabIndex={-1}
        hidden={!shown}
        className="absolute top-0 left-0 z-50 outline-none w-[min(316px,calc(100vw-16px))] p-4 text-card-foreground"
      >
        <div
          ref={surf}
          aria-hidden
          className="absolute inset-0 origin-top-left rounded-[14px] bg-card shadow-[inset_0_0_0_1px_var(--border),0_1px_0_color-mix(in_oklab,var(--foreground)_4%,transparent),0_22px_40px_-24px_rgb(0_0_0/0.4)]"
        />
        <div className="relative flex items-center gap-3">
          <Avatar ref={cardAv} className="size-11 origin-top-left text-sm">
            {avatar ?? initials(name)}
          </Avatar>
          <div className="grid min-w-0 flex-1 gap-[3px]">
            <span
              ref={cardName}
              id={titleId}
              className="block justify-self-start origin-top-left text-[15px] leading-[1.2] font-medium tracking-[-0.01em] whitespace-nowrap"
            >
              {name}
            </span>
            {role && (
              <span data-ptc-reveal className="text-[13px] leading-[1.2] text-muted-foreground">
                {role}
              </span>
            )}
          </div>
          <button
            ref={closeBtn}
            type="button"
            aria-label={closeLabel}
            data-ptc-reveal
            onClick={() => request(false, true)}
            className="-mt-2 -mr-2 grid size-11 place-items-center self-start rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <div ref={body} className="relative">
          {Children.map(children, (child) => (
            <div data-ptc-reveal>{child}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Avatar({ className, children, ref }: { className?: string; children: ReactNode; ref: Ref<HTMLSpanElement> }) {
  return (
    <span
      ref={ref}
      aria-hidden
      className={cn(
        'grid flex-none place-items-center overflow-hidden rounded-full bg-accent leading-none font-medium tracking-[0.02em] text-accent-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent-foreground)_18%,transparent)]',
        className,
      )}
    >
      {children}
    </span>
  )
}
