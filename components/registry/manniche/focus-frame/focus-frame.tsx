import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type FocusFrameWord = {
  /** Position of the word in the sentence, from 0. */
  index: number
  text: string
  /** Width of the word in CSS pixels. */
  width: number
  /** False while the frame travels, true once it has locked onto the word. */
  locked: boolean
}

export type FocusFrameProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** The sentence. A string is split at spaces; an array sets each stop yourself, e.g. `['Made in', 'Aalborg']`. */
  children: string | string[]
  /** Milliseconds the frame rests on each word while it plays. */
  interval?: number
  /** Blur in pixels on the words outside the frame. */
  blur?: number
  /** Step through the words on its own. */
  autoPlay?: boolean
  /** Rounds through the sentence before it stops on the last word. 0 keeps going; then offer a pause button (see `paused`). */
  rounds?: number
  /** Stops the frame where it is, e.g. from a pause button of your own. */
  paused?: boolean
  /** Hold still while the pointer is over the sentence or it has keyboard focus. */
  pauseOnInteraction?: boolean
  /** Called when the frame moves to a word, and again when it locks onto it. */
  onFocusWord?: (word: FocusFrameWord) => void
  /** The element that holds the sentence. */
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3'
}

// Corner size in pixels, and the frame's padding and line-height trim as shares of the font size.
const CORNER = 15
const PAD_X = 0.13
const PAD_Y = 0.02
const TRIM_TOP = 0.12
const TRIM_BOTTOM = 0.1
// The short detent after the frame arrives, before it locks.
const LOCK_MS = 170

const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]'
const corners = ['tl', 'tr', 'bl', 'br'] as const

/**
 * A viewfinder that steps through a sentence and pulls one word into focus; the others sit slightly blurred and dimmed.
 * The four corners glide on transform only and spread a little while travelling, then close in with a short detent.
 * It follows the mouse, a tap, and the arrow keys when focused. Screen readers hear the sentence once, as plain text.
 * Off screen or in a hidden tab it holds still. Under reduced motion it does not play, and the frame jumps without gliding.
 */
export function FocusFrame({
  children,
  interval = 1800,
  blur = 1.6,
  autoPlay = true,
  rounds = 3,
  paused = false,
  pauseOnInteraction = true,
  onFocusWord,
  as: Text = 'p',
  className,
  style,
  onKeyDown,
  onFocus,
  onBlur,
  onPointerEnter,
  onPointerLeave,
  ...rest
}: FocusFrameProps) {
  const reduce = useReducedMotion()
  // A stable key for the words, so a new array with the same words does not restart the frame.
  const list = Array.isArray(children)
  const source = list ? children.join('\u0000') : children
  const words = useMemo(() => (list ? source.split('\u0000') : source.trim().split(/\s+/)).filter(Boolean), [source, list])
  const n = words.length

  const [active, setActive] = useState(0)
  const [locked, setLocked] = useState(true)
  const [ready, setReady] = useState(false)
  const [steps, setSteps] = useState(0)
  const [inside, setInside] = useState(false)
  const [onScreen, setOnScreen] = useState(true)
  const [tabHidden, setTabHidden] = useState(false)

  const hintId = useId()
  const root = useRef<HTMLDivElement>(null)
  const text = useRef<HTMLElement>(null)
  const spans = useRef<(HTMLSpanElement | null)[]>([])
  const cornerEls = useRef<(HTMLSpanElement | null)[]>([])
  const moved = useRef(false)
  const report = useRef(onFocusWord)
  useLayoutEffect(() => {
    report.current = onFocusWord
  })

  const at = Math.min(active, Math.max(0, n - 1))

  // Put the four corners round the active word. Offsets, not screen rects, so a scaled parent does not throw it off.
  const place = (instant: boolean) => {
    const el = root.current
    const w = spans.current[at]
    if (!el || !w || !text.current) return
    const fs = parseFloat(getComputedStyle(text.current).fontSize) || 16
    const x0 = w.offsetLeft - fs * PAD_X
    const x1 = w.offsetLeft + w.offsetWidth + fs * PAD_X
    const y0 = w.offsetTop + fs * TRIM_TOP - fs * PAD_Y
    const y1 = w.offsetTop + w.offsetHeight - fs * TRIM_BOTTOM + fs * PAD_Y
    const xy = [
      [x0, y0],
      [x1 - CORNER, y0],
      [x0, y1 - CORNER],
      [x1 - CORNER, y1 - CORNER],
    ]
    if (instant) el.setAttribute('data-instant', '')
    cornerEls.current.forEach((c, k) => c && (c.style.transform = `translate(${xy[k][0]}px,${xy[k][1]}px)`))
    if (instant) {
      void el.offsetWidth
      el.removeAttribute('data-instant')
    }
  }

  const placeLatest = useRef(place)
  useLayoutEffect(() => {
    placeLatest.current = place
  })

  // Move the frame whenever the word changes; the first placement and reduced motion jump straight there.
  useLayoutEffect(() => {
    placeLatest.current(!moved.current || reduce)
    if (!moved.current || reduce) {
      moved.current = true
      setReady(true)
      setLocked(true)
      return
    }
    setLocked(false)
    const t = setTimeout(() => setLocked(true), LOCK_MS)
    return () => clearTimeout(t)
  }, [at, source, reduce])

  // Tell the parent where the frame is.
  useEffect(() => {
    const w = spans.current[at]
    if (!w || !ready) return
    report.current?.({ index: at, text: words[at], width: w.offsetWidth, locked })
  }, [at, locked, ready, words])

  // Re-place on resize and once web fonts have loaded, without gliding.
  useEffect(() => {
    const el = root.current
    if (!el) return
    const ro = new ResizeObserver(() => placeLatest.current(true))
    ro.observe(el)
    let live = true
    document.fonts?.ready.then(() => live && placeLatest.current(true))
    return () => {
      live = false
      ro.disconnect()
    }
  }, [])

  // Hold still off screen and in a hidden tab.
  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting))
    io.observe(el)
    const vis = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', vis)
    vis()
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])

  const done = rounds > 0 && steps >= n * rounds - 1
  const running = autoPlay && !paused && !(pauseOnInteraction && inside) && onScreen && !tabHidden && !reduce && !done && n > 1

  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => {
      setActive((i) => (i + 1) % n)
      setSteps((s) => s + 1)
    }, interval)
    return () => clearTimeout(t)
  }, [running, at, interval, n])

  const go = (k: number) => setActive(((k % n) + n) % n)

  const wordAt = (target: EventTarget) => {
    const k = (target as HTMLElement).closest?.('[data-ff-word]')?.getAttribute('data-ff-word')
    return k == null ? -1 : Number(k)
  }

  function keyDown(e: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(e)
    const to = ({ ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1, Home: 0, End: n - 1 } as Record<string, number>)[e.key]
    if (to === undefined || e.defaultPrevented) return
    e.preventDefault()
    go(to)
  }

  return (
    <div
      ref={root}
      tabIndex={0}
      role="group"
      aria-describedby={hintId}
      onKeyDown={keyDown}
      onFocus={(e: FocusEvent<HTMLDivElement>) => {
        onFocus?.(e)
        // Only keyboard focus holds the frame; a click or tap focuses the group too, and must not pause it for good.
        if (e.currentTarget.matches(':focus-visible')) setInside(true)
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onBlur?.(e)
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setInside(false)
      }}
      onPointerEnter={(e: PointerEvent<HTMLDivElement>) => {
        onPointerEnter?.(e)
        if (e.pointerType === 'mouse') setInside(true)
      }}
      onPointerLeave={(e: PointerEvent<HTMLDivElement>) => {
        onPointerLeave?.(e)
        if (!root.current?.matches(':focus-visible')) setInside(false)
      }}
      data-locked={locked || undefined}
      style={{ '--ff-blur': `${blur}px`, ...style } as CSSProperties}
      className={cn(
        'group/ff relative rounded-[2px] outline-none focus-visible:outline-2 focus-visible:outline-offset-[14px] focus-visible:outline-ring',
        className,
      )}
      {...rest}
    >
      <Text
        ref={text as never}
        onPointerOver={(e: PointerEvent<HTMLElement>) => {
          const k = e.pointerType === 'mouse' ? wordAt(e.target) : -1
          if (k >= 0) go(k)
        }}
        onPointerDown={(e: PointerEvent<HTMLElement>) => {
          const k = e.pointerType === 'mouse' ? -1 : wordAt(e.target)
          if (k >= 0) go(k)
        }}
        className="m-0"
      >
        <span className="sr-only">{words.join(' ')}</span>
        <span id={hintId} hidden>
          Arrow keys move the frame.
        </span>
        {words.map((w, i) => (
          <span key={i} aria-hidden>
            <span
              ref={(el) => {
                spans.current[i] = el
              }}
              data-ff-word={i}
              className={cn(
                'inline-block transition-[filter,opacity] duration-240 group-data-[instant]/ff:transition-none motion-reduce:transition-none',
                EASE,
                ready && i !== at && 'opacity-36 blur-(--ff-blur)',
              )}
            >
              {w}
            </span>
            {i < n - 1 ? ' ' : null}
          </span>
        ))}
      </Text>
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-160 motion-reduce:transition-none',
          EASE,
          ready && 'opacity-100',
        )}
      >
        {corners.map((c, k) => (
          <span
            key={c}
            ref={(el) => {
              cornerEls.current[k] = el
            }}
            style={{ width: CORNER, height: CORNER }}
            className={cn(
              'absolute top-0 left-0 transition-[transform] duration-220 will-change-transform group-data-[instant]/ff:transition-none motion-reduce:transition-none',
              EASE,
            )}
          >
            <i
              className={cn(
                'absolute inset-0 border-0 border-solid border-foreground transition-[transform] duration-140 group-data-[locked]/ff:[transform:none] group-data-[instant]/ff:transition-none motion-reduce:transition-none',
                EASE,
                c === 'tl' && 'border-t-[1.5px] border-l-[1.5px] [transform:translate(-6px,-6px)]',
                c === 'tr' && 'border-t-[1.5px] border-r-[1.5px] [transform:translate(6px,-6px)]',
                c === 'bl' && 'border-b-[1.5px] border-l-[1.5px] [transform:translate(-6px,6px)]',
                c === 'br' && 'border-r-[1.5px] border-b-[1.5px] [transform:translate(6px,6px)]',
              )}
            />
            {c === 'tr' && (
              <span
                className={cn(
                  'absolute -top-px left-6 size-1.5 rounded-full bg-primary opacity-0 transition-opacity duration-120 group-data-[locked]/ff:opacity-100 group-data-[instant]/ff:transition-none motion-reduce:transition-none',
                  EASE,
                )}
              />
            )}
          </span>
        ))}
      </span>
    </div>
  )
}
