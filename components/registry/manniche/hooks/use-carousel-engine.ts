import { useEffect, useLayoutEffect, useState, type MouseEvent, type PointerEvent } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'

export type CarouselEngineOptions = {
  /** How many slides there are. */
  count: number
  /** Wrap around from the last slide to the first. */
  loop?: boolean
  /** Controlled: the current slide. */
  index?: number
  /** The slide shown first, when uncontrolled. */
  defaultIndex?: number
  /** Called when the carousel settles on a new slide. */
  onIndexChange?: (index: number) => void
  /** The drag direction. `x` also takes sideways wheel and trackpad swipes. */
  axis?: 'x' | 'y'
  /** Pixels of drag that move the carousel one slide. Negative turns the drag round, e.g. pull down for the next slide. */
  step: number
  /** Come to rest on a whole slide. Off, a fling glides to a stop anywhere. */
  snap?: boolean
  /** Draws a frame: the position in slides (fractional while moving) and the speed in slides per second. */
  onFrame: (position: number, velocity: number) => void
}

export type CarouselEngine = {
  /** The slide the carousel is on or heading to. */
  index: number
  /** Go to a slide. In a loop it takes the short way round. */
  go: (index: number) => void
  /** Move by a number of slides from where the carousel is heading. */
  move: (by: number) => void
  /** Draw the current frame again, e.g. after a resize. */
  draw: () => void
  /** Spread on the element that takes the drag. */
  bind: {
    ref: (el: HTMLElement | null) => void
    onPointerDown: (e: PointerEvent<HTMLElement>) => void
    onPointerMove: (e: PointerEvent<HTMLElement>) => void
    onPointerUp: (e: PointerEvent<HTMLElement>) => void
    onPointerCancel: (e: PointerEvent<HTMLElement>) => void
    onClickCapture: (e: MouseEvent<HTMLElement>) => void
  }
}

type Settings = Required<Pick<CarouselEngineOptions, 'loop' | 'axis' | 'snap' | 'step' | 'onFrame'>> &
  Pick<CarouselEngineOptions, 'onIndexChange'> & { n: number; reduce: boolean }

const SLOP = 6 // px before a press becomes a drag
const THROW = 0.32 // s: how far a fling carries, as speed × this
const SAMPLE = 90 // ms of pointer history used for the release speed
const mod = (v: number, n: number) => ((v % n) + n) % n
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
// Pixels per slide, kept away from zero but with its sign.
const per = (step: number) => (step < 0 ? -1 : 1) * Math.max(Math.abs(step), 1)
// Past an end the carousel gives less and less, and never more than one slide.
const rubber = (over: number) => 1 - 1 / (over * 0.55 + 1)

/**
 * The motion behind the carousels: one position, in slides, that drag, fling, wheel, keys and buttons all move.
 * It runs a frame loop only while something moves and hands each frame to `onFrame`, which writes transforms
 * straight to the DOM, so React renders only when the slide changes. Glides use ease-out-quint: 300 ms for a
 * step, and after a fling a duration that starts at the finger's speed. Under reduced motion every move jumps.
 */
export function useCarouselEngine(options: CarouselEngineOptions): CarouselEngine {
  const { count, loop = false, index, defaultIndex = 0, axis = 'x', snap = true, step, onFrame, onIndexChange } = options
  const n = Math.max(count, 1)
  const reduce = useReducedMotion()
  const [current, setCurrent] = useState(() => clamp(index ?? defaultIndex, 0, n - 1))
  const [m] = useState(() => machine(current, setCurrent))
  const [surface, setSurface] = useState<HTMLElement | null>(null)

  // The latest options, for the handlers and the frame loop, which outlive a render.
  useLayoutEffect(() => {
    m.configure({ n, loop, axis, snap, step, onFrame, onIndexChange, reduce })
  })

  // A controlled index that changes from outside moves the carousel there; a count that shrinks pulls it back in.
  useEffect(() => {
    if (index !== undefined) m.go(index)
  }, [index, m])
  useEffect(() => {
    if (!loop && m.committed > n - 1) m.go(n - 1)
  }, [n, loop, m])

  useEffect(() => (surface && axis === 'x' ? m.listenWheel(surface) : undefined), [surface, axis, m])
  useEffect(() => m.stop, [m])

  return { index: current, go: m.go, move: m.move, draw: m.draw, bind: { ref: setSurface, ...m.handlers } }
}

type Tween = { from: number; to: number; start: number; dur: number }
type Drag = { id: number; x: number; y: number; p0: number; active: boolean; samples: [number, number][]; resume: number | null }

// The state and behaviour, made once per carousel and kept for its lifetime.
function machine(start: number, setCurrent: (i: number) => void) {
  let want = start // where a drag or the wheel puts the carousel
  let drawn = start // the position on screen
  let velocity = 0
  let tween: Tween | null = null
  let drag: Drag | null = null
  let raf = 0
  let last = 0
  let swallowClick = false
  let wheelTimer = 0

  const m = {
    set: null as Settings | null,
    committed: start,
    configure: (settings: Settings) => {
      m.set = settings
    },
    go,
    move,
    draw,
    stop,
    listenWheel,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: PointerEvent<HTMLElement>) => release(e, false),
      onPointerCancel: (e: PointerEvent<HTMLElement>) => release(e, true),
      onClickCapture,
    },
  }

  function draw() {
    m.set?.onFrame(drawn, velocity)
  }

  function tick(now: number) {
    raf = 0
    const o = m.set
    if (!o) return
    let p = want
    if (tween) {
      const u = clamp((now - tween.start) / tween.dur, 0, 1)
      p = tween.from + (tween.to - tween.from) * (1 - (1 - u) ** 5)
      if (u >= 1) tween = null
    }
    const dt = Math.max(now - last, 1) / 1000
    last = now
    // Smoothed over about 60 ms, so a layout can lean into the speed without jitter.
    velocity = o.reduce ? 0 : velocity + ((p - drawn) / dt - velocity) * (1 - Math.exp(-dt / 0.06))
    drawn = p
    const moving = tween || drag?.active || Math.abs(velocity) > 0.01
    if (!moving) velocity = 0
    o.onFrame(p, velocity)
    if (moving) raf = requestAnimationFrame(tick)
  }

  function run() {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  function commit(to: number) {
    const o = m.set
    if (!o) return
    const i = mod(Math.round(to), o.n)
    if (i === m.committed) return
    m.committed = i
    setCurrent(i)
    o.onIndexChange?.(i)
  }

  // Glide to a position. With a release speed (slides/s) in the same direction, the glide starts at that speed.
  function glide(to: number, speed = 0) {
    want = to
    const dist = to - drawn
    if (m.set?.reduce || Math.abs(dist) < 1e-4) tween = null
    else {
      const dur = speed && Math.sign(speed) === Math.sign(dist) ? clamp(((5 * Math.abs(dist)) / Math.abs(speed)) * 1000, 220, 900) : 300
      tween = { from: drawn, to, start: performance.now(), dur }
    }
    run()
  }

  function go(i: number) {
    const o = m.set
    if (!o || mod(i, o.n) === m.committed) return
    let to: number
    if (o.loop) {
      const at = Math.round(tween?.to ?? want)
      to = at + mod(i - at + o.n / 2, o.n) - o.n / 2
      // An even count puts the far slide exactly half way round: go forwards.
      if (to < at && mod(i - at, o.n) === o.n / 2) to = at + o.n / 2
    } else to = clamp(i, 0, o.n - 1)
    glide(to)
    commit(to)
  }

  function move(by: number) {
    const o = m.set
    if (!o) return
    let to = Math.round(tween?.to ?? want) + by
    if (!o.loop) to = clamp(to, 0, o.n - 1)
    glide(to)
    commit(to)
  }

  function stop() {
    cancelAnimationFrame(raf)
    clearTimeout(wheelTimer)
    raf = 0
    tween = null
    drag = null
    velocity = 0
    // Land where it was heading, so a remount starts settled.
    drawn = want
  }

  // Where a position lands once the ends of a carousel that does not loop push back.
  function give(raw: number) {
    const o = m.set!
    if (o.loop) return raw
    if (raw < 0) return -rubber(-raw)
    if (raw > o.n - 1) return o.n - 1 + rubber(raw - (o.n - 1))
    return raw
  }

  function settle(speed: number, from: number) {
    const o = m.set!
    let to = drawn + speed * THROW
    if (o.snap) {
      to = Math.round(to)
      // A quick flick always moves at least one slide.
      if (Math.abs(speed) > 0.8 && to === Math.round(from)) to += Math.sign(speed)
    }
    if (!o.loop) to = clamp(to, 0, o.n - 1)
    glide(to, speed)
    commit(to)
  }

  function onPointerDown(e: PointerEvent<HTMLElement>) {
    swallowClick = false
    if (!e.isPrimary || e.button !== 0 || drag || !m.set || m.set.n < 2) return
    const resume = tween ? tween.to : null
    // Catch a moving carousel where it is.
    if (tween) {
      tween = null
      want = drawn
    }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, p0: drawn, active: false, samples: [[e.timeStamp, drawn]], resume }
  }

  function onPointerMove(e: PointerEvent<HTMLElement>) {
    const d = drag
    const o = m.set
    if (!d || !o || e.pointerId !== d.id) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    const along = o.axis === 'x' ? dx : dy
    const across = o.axis === 'x' ? dy : dx
    if (!d.active) {
      if (Math.abs(along) < SLOP && Math.abs(across) < SLOP) return
      if (Math.abs(across) >= Math.abs(along)) {
        // Moving across the carousel: leave it to the page, and finish any glide that was caught.
        drag = null
        if (d.resume !== null) glide(d.resume)
        return
      }
      d.active = true
      // Count from here, so the slop does not make the slides jump.
      if (o.axis === 'x') d.x += Math.sign(dx) * SLOP
      else d.y += Math.sign(dy) * SLOP
      e.currentTarget.setPointerCapture(e.pointerId)
      e.currentTarget.dataset.dragging = ''
    }
    const p = give(d.p0 - (o.axis === 'x' ? e.clientX - d.x : e.clientY - d.y) / per(o.step))
    want = p
    d.samples.push([e.timeStamp, p])
    while (d.samples.length > 2 && e.timeStamp - d.samples[0][0] > SAMPLE) d.samples.shift()
    run()
  }

  function release(e: PointerEvent<HTMLElement>, cancelled: boolean) {
    const d = drag
    if (!d || e.pointerId !== d.id) return
    drag = null
    delete e.currentTarget.dataset.dragging
    if (!d.active) {
      if (d.resume !== null) glide(d.resume)
      return
    }
    swallowClick = true
    let speed = 0
    const [t0, p0] = d.samples[0]
    const [t1, p1] = d.samples[d.samples.length - 1]
    // A finger that stopped before letting go throws nothing.
    if (!cancelled && t1 > t0 && e.timeStamp - t1 < 60) speed = ((p1 - p0) / (t1 - t0)) * 1000
    settle(speed, d.p0)
  }

  // A drag ends with a click on whatever was under the pointer; that click is not meant.
  function onClickCapture(e: MouseEvent<HTMLElement>) {
    if (!swallowClick) return
    swallowClick = false
    e.preventDefault()
    e.stopPropagation()
  }

  // Sideways wheel and trackpad swipes. A vertical wheel is left to the page.
  function listenWheel(el: HTMLElement) {
    let base: number | null = null
    const onWheel = (e: WheelEvent) => {
      const o = m.set
      const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0)
      if (!o || o.n < 2 || Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY)) return
      e.preventDefault()
      if (drag?.active) return
      tween = null
      base = (base ?? drawn) + (dx * (e.deltaMode === 1 ? 16 : 1)) / per(o.step)
      if (!o.loop) base = clamp(base, -1.5, o.n + 0.5)
      want = give(base)
      run()
      clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => {
        base = null
        settle(0, drawn)
      }, 140)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      clearTimeout(wheelTimer)
    }
  }

  return m
}
