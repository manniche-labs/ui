import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'
import { LAND_MASK, LAND_MASK_HEIGHT, LAND_MASK_WIDTH } from './land-mask'

export type DotGlobeProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** Idle spin in degrees per second. The surface drifts west to east; 0 stands still. */
  speed?: number
  /** Scale for the dots; 1 is the plotter's own size. */
  dotSize?: number
  /** The point that faces you, as [longitude, latitude]. Changing it turns the globe there. */
  center?: [number, number]
  /** Drag and the arrow keys turn the globe. */
  interactive?: boolean
  /** A ring of degree ticks round the globe. */
  bezel?: boolean
  /** A crosshair at the centre, a longitude tape and the coordinates under the globe. */
  readout?: boolean
  /** The largest diameter in CSS pixels. The globe shrinks to fit narrower containers. */
  maxSize?: number
  /** Accessible name of the globe. */
  label?: string
}

const RAD = Math.PI / 180
// One ring of dots per 2.25° of latitude, spaced evenly along each ring: about 8,100 points.
const STEP = 2.25
// The tape shows 150° of longitude across the width of the globe.
const TAPE_SPAN = 150
// Keyboard steps in degrees, and how long the turn takes.
const KEY_LON = 15
const KEY_LAT = 10
const KEY_MS = 280
// The poles stay out of the middle, so the globe never turns upside down.
const MAX_LAT = 70
// Depth bands, from the limb to the middle: alpha of land and sea dots and the size of land dots.
const LAND_ALPHA = [0.32, 0.55, 0.78, 0.95]
const SEA_ALPHA = [0.05, 0.08, 0.11, 0.14]

type Points = { sinLat: Float32Array; cosLat: Float32Array; sinLon: Float32Array; cosLon: Float32Array; land: Uint8Array }
let cache: Points | null = null

// Built once per page, on first use, so nothing runs at import time or on the server.
function points(): Points {
  if (cache) return cache
  const bits = atob(LAND_MASK)
  const isLand = (lat: number, lon: number) => {
    const i = (((Math.floor(((lon + 180) / 360) * LAND_MASK_WIDTH)) % LAND_MASK_WIDTH) + LAND_MASK_WIDTH) % LAND_MASK_WIDTH
    const j = Math.min(LAND_MASK_HEIGHT - 1, Math.max(0, Math.floor(((90 - lat) / 180) * LAND_MASK_HEIGHT)))
    const k = j * LAND_MASK_WIDTH + i
    return (bits.charCodeAt(k >> 3) >> (k & 7)) & 1
  }
  const list: number[][] = []
  for (let lat = -90 + STEP / 2; lat < 90; lat += STEP) {
    const n = Math.max(1, Math.round((360 / STEP) * Math.cos(lat * RAD)))
    for (let q = 0; q < n; q++) list.push([lat, -180 + ((q + 0.5) * 360) / n])
  }
  const n = list.length
  const p: Points = {
    sinLat: new Float32Array(n),
    cosLat: new Float32Array(n),
    sinLon: new Float32Array(n),
    cosLon: new Float32Array(n),
    land: new Uint8Array(n),
  }
  list.forEach(([lat, lon], i) => {
    p.sinLat[i] = Math.sin(lat * RAD)
    p.cosLat[i] = Math.cos(lat * RAD)
    p.sinLon[i] = Math.sin(lon * RAD)
    p.cosLon[i] = Math.cos(lon * RAD)
    p.land[i] = isLand(lat, lon)
  })
  cache = p
  return p
}

const wrapLon = (l: number) => ((((l + 180) % 360) + 360) % 360) - 180
const clampLat = (l: number) => Math.max(-MAX_LAT, Math.min(MAX_LAT, l))
const easeOutQuint = (t: number) => 1 - (1 - t) ** 5
const fmtLon = (l: number) => `${Math.abs(l).toFixed(1).padStart(5, '0')}° ${l >= 0 ? 'E' : 'W'}`
const fmtLat = (l: number) => `${Math.abs(l).toFixed(1).padStart(4, '0')}° ${l >= 0 ? 'N' : 'S'}`

type Sim = {
  lon: number
  lat: number
  vLon: number
  vLat: number
  tween: { lon0: number; lat0: number; lon1: number; lat1: number; t0: number } | null
  // Recent moves while dragging (time, Δlon, Δlat), to work out the throw.
  drag: { x: number; y: number; id: number; hist: [number, number, number][] } | null
}

/**
 * A globe plotted in dots, with land drawn denser and darker than sea, on a small 2D canvas.
 * Land comes from a 240 × 120 bit mask of Natural Earth (public domain) embedded in `land-mask.ts`; nothing is fetched.
 * Drag to turn it: it keeps the throw's momentum and settles back into a slow spin. The arrow keys turn it in steps.
 * On touch, only a sideways drag turns it, so the page still scrolls. The spin pauses off screen and in hidden tabs.
 * Under reduced motion it stands still: dragging and the arrow keys still turn it, without momentum or easing.
 */
export function DotGlobe({
  speed = 4.5,
  dotSize = 1,
  center = [10, 28],
  interactive = true,
  bezel = true,
  readout = true,
  maxSize = 420,
  label,
  className,
  style,
  ...rest
}: DotGlobeProps) {
  const ball = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const tape = useRef<SVGSVGElement>(null)
  const lonOut = useRef<HTMLElement>(null)
  const latOut = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const [lon, lat] = center
  const sim = useRef<Sim>({ lon, lat: clampLat(lat), vLon: 0, vLat: 0, tween: null, drag: null })
  // Diameter in CSS pixels; only the bezel and the tape are drawn from it in React.
  const [size, setSize] = useState(0)
  // Set by the effect: draws one frame now, or wakes the loop.
  const api = useRef<{ draw(): void; wake(): void } | null>(null)

  // A new center turns the globe there with the same short turn as the arrow keys.
  const shown = useRef([lon, lat])
  useEffect(() => {
    if (shown.current[0] === lon && shown.current[1] === lat) return
    shown.current = [lon, lat]
    const s = sim.current
    if (reduce) {
      Object.assign(s, { lon, lat: clampLat(lat), tween: null, vLon: 0, vLat: 0 })
      api.current?.draw()
      return
    }
    // Take the short way round.
    const lon1 = s.lon + wrapLon(lon - s.lon)
    s.tween = { lon0: s.lon, lat0: s.lat, lon1, lat1: clampLat(lat), t0: performance.now() }
    s.vLon = s.vLat = 0
    api.current?.wake()
  }, [lon, lat, reduce])

  useEffect(() => {
    const host = ball.current
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!host || !el || !ctx) return
    const p = points()
    const n = p.land.length
    const s = sim.current
    const idle = -speed / 1000
    let w = 0
    let dpr = 1
    let ink = ''
    let signal = ''
    let readAt = 0
    let raf = 0
    let last = 0
    let onScreen = true
    // Sea dots per depth band as x, y pairs, reused between frames.
    const sea = [0, 1, 2, 3].map(() => new Float32Array(n * 2))

    const colours = () => {
      ink = getComputedStyle(el).color
      signal = getComputedStyle(host).color
    }

    const draw = (final = false) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, el.width, el.height)
      if (!w) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const c = w / 2
      const R = c - 2
      const cL = Math.cos(s.lon * RAD)
      const sL = Math.sin(s.lon * RAD)
      const cP = Math.cos(s.lat * RAD)
      const sP = Math.sin(s.lat * RAD)
      const rr = Math.max(0.85, w / 330) * dotSize
      const land = [new Path2D(), new Path2D(), new Path2D(), new Path2D()]
      const seaLen = [0, 0, 0, 0]
      for (let i = 0; i < n; i++) {
        const sinD = p.sinLon[i] * cL - p.cosLon[i] * sL
        const cosD = p.cosLon[i] * cL + p.sinLon[i] * sL
        // Depth towards the viewer; the far side is skipped.
        const z = sP * p.sinLat[i] + cP * p.cosLat[i] * cosD
        if (z <= 0.02) continue
        const x = c + R * p.cosLat[i] * sinD
        const y = c - R * (cP * p.sinLat[i] - sP * p.cosLat[i] * cosD)
        const b = z < 0.3 ? 0 : z < 0.55 ? 1 : z < 0.8 ? 2 : 3
        if (p.land[i]) {
          const r = rr * (0.8 + 0.12 * b)
          land[b].moveTo(x + r, y)
          land[b].arc(x, y, r, 0, Math.PI * 2)
        } else {
          sea[b][seaLen[b]++] = x
          sea[b][seaLen[b]++] = y
        }
      }
      ctx.fillStyle = ink
      const q = rr * 0.9
      for (let b = 0; b < 4; b++) {
        ctx.globalAlpha = SEA_ALPHA[b]
        const pts = sea[b]
        for (let k = 0; k < seaLen[b]; k += 2) ctx.fillRect(pts[k] - q / 2, pts[k + 1] - q / 2, q, q)
        ctx.globalAlpha = LAND_ALPHA[b]
        ctx.fill(land[b])
      }
      ctx.globalAlpha = 1
      if (!readout) return
      // The crosshair marks the point the readout names.
      ctx.strokeStyle = signal
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        ctx.moveTo(c + dx * 4, c + dy * 4)
        ctx.lineTo(c + dx * 11, c + dy * 11)
      }
      ctx.stroke()
      const l = wrapLon(s.lon)
      if (tape.current) tape.current.style.transform = `translateX(${(w / 2 - (l + 540) * (w / TAPE_SPAN)).toFixed(2)}px)`
      const now = performance.now()
      if (final || now - readAt > 60) {
        readAt = now
        if (lonOut.current) lonOut.current.textContent = fmtLon(l)
        if (latOut.current) latOut.current.textContent = fmtLat(s.lat)
      }
    }

    const running = () => onScreen && !document.hidden && !reduce

    const frame = (now: number) => {
      raf = 0
      const dt = Math.min(48, now - (last || now))
      last = now
      let settled = false
      if (s.tween) {
        const t = Math.min(1, (now - s.tween.t0) / KEY_MS)
        const e = easeOutQuint(t)
        s.lon = s.tween.lon0 + (s.tween.lon1 - s.tween.lon0) * e
        s.lat = s.tween.lat0 + (s.tween.lat1 - s.tween.lat0) * e
        if (t >= 1) s.tween = null
      } else if (!s.drag) {
        // The throw blends back into the idle spin.
        s.vLon += (idle - s.vLon) * (1 - Math.exp(-dt / 380))
        s.vLat *= Math.exp(-dt / 260)
        s.lon += s.vLon * dt
        s.lat = clampLat(s.lat + s.vLat * dt)
        settled = idle === 0 && Math.abs(s.vLon) < 1e-5 && Math.abs(s.vLat) < 1e-5
      }
      draw(settled)
      if (settled) {
        s.vLon = s.vLat = 0
        last = 0
        return
      }
      if (running()) raf = requestAnimationFrame(frame)
      else last = 0
    }

    const wake = () => {
      if (raf || !running()) return
      last = 0
      raf = requestAnimationFrame(frame)
    }
    api.current = { draw: () => draw(true), wake }

    const layout = () => {
      w = host.clientWidth
      dpr = Math.min(2, window.devicePixelRatio || 1)
      el.width = Math.max(1, Math.round(w * dpr))
      el.height = Math.max(1, Math.round(w * dpr))
      setSize(w)
      colours()
      draw(true)
    }
    const ro = new ResizeObserver(layout)
    ro.observe(host)
    layout()

    // Redraw when the theme changes the colours.
    const repaint = () => {
      colours()
      draw(true)
    }
    const mo = new MutationObserver(repaint)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    scheme.addEventListener('change', repaint)

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      wake()
    })
    io.observe(host)
    document.addEventListener('visibilitychange', wake)

    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (s.drag) return
      host.setPointerCapture(e.pointerId)
      host.dataset.drag = ''
      s.tween = null
      s.drag = { x: e.clientX, y: e.clientY, id: e.pointerId, hist: [] }
    }
    const move = (e: PointerEvent) => {
      const d = s.drag
      if (!d || e.pointerId !== d.id) return
      const r = w / 2
      // A drag across the radius turns the globe by about 52°: the surface stays under the finger near the middle.
      const dl = (-(e.clientX - d.x) / r / RAD) * 0.9
      const dp = ((e.clientY - d.y) / r / RAD) * 0.9
      s.lon += dl
      s.lat = clampLat(s.lat + dp)
      const now = performance.now()
      d.hist.push([now, dl, dp])
      while (d.hist.length && now - d.hist[0][0] > 90) d.hist.shift()
      d.x = e.clientX
      d.y = e.clientY
      if (!raf) draw()
    }
    const up = (e: PointerEvent) => {
      const d = s.drag
      if (!d || e.pointerId !== d.id) return
      const h = d.hist
      const now = performance.now()
      if (h.length > 1 && !reduce && now - h[h.length - 1][0] < 60) {
        // Degrees per millisecond over the last 90 ms, capped so a flick cannot spin it wildly.
        const span = Math.max(16, now - h[0][0])
        const cap = (v: number) => Math.max(-0.12, Math.min(0.12, v))
        s.vLon = cap(h.reduce((a, m) => a + m[1], 0) / span)
        s.vLat = cap(h.reduce((a, m) => a + m[2], 0) / span)
      }
      s.drag = null
      delete host.dataset.drag
      draw(true)
      wake()
    }
    const key = (e: KeyboardEvent) => {
      const step = ({ ArrowLeft: [KEY_LON, 0], ArrowRight: [-KEY_LON, 0], ArrowUp: [0, -KEY_LAT], ArrowDown: [0, KEY_LAT] } as Record<string, number[]>)[e.key]
      if (!step) return
      e.preventDefault()
      const lon1 = (s.tween ? s.tween.lon1 : s.lon) + step[0]
      const lat1 = clampLat((s.tween ? s.tween.lat1 : s.lat) + step[1])
      s.vLon = s.vLat = 0
      if (reduce) {
        s.lon = lon1
        s.lat = lat1
        draw(true)
        return
      }
      s.tween = { lon0: s.lon, lat0: s.lat, lon1, lat1, t0: performance.now() }
      wake()
    }
    if (interactive) {
      host.addEventListener('pointerdown', down)
      host.addEventListener('pointermove', move)
      host.addEventListener('pointerup', up)
      host.addEventListener('pointercancel', up)
      host.addEventListener('lostpointercapture', up)
      host.addEventListener('keydown', key)
    }

    wake()

    return () => {
      cancelAnimationFrame(raf)
      api.current = null
      ro.disconnect()
      mo.disconnect()
      io.disconnect()
      scheme.removeEventListener('change', repaint)
      document.removeEventListener('visibilitychange', wake)
      host.removeEventListener('pointerdown', down)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerup', up)
      host.removeEventListener('pointercancel', up)
      host.removeEventListener('lostpointercapture', up)
      host.removeEventListener('keydown', key)
      s.drag = null
      delete host.dataset.drag
    }
  }, [speed, dotSize, interactive, readout, reduce])

  // The ball is square: as wide as the container allows, minus room for the bezel, up to maxSize.
  const width = `min(100% - ${bezel ? 40 : 0}px, ${maxSize}px)`

  return (
    <div className={cn('grid w-full justify-items-center gap-[18px]', className)} style={style} {...rest}>
      <div
        ref={ball}
        // A focusable globe turned with the arrow keys is a widget, so screen readers hand it the keys.
        role={interactive ? 'application' : 'img'}
        aria-roledescription={interactive ? 'globe' : undefined}
        aria-label={
          label ?? (interactive ? 'Globe of dots, land drawn denser. Drag or use the arrow keys to turn it.' : 'Globe of dots, land drawn denser.')
        }
        tabIndex={interactive ? 0 : undefined}
        style={{ width }}
        className={cn(
          'relative aspect-square rounded-full text-primary select-none focus-visible:outline-offset-[10px]',
          // Vertical swipes still scroll the page on touch; only a sideways drag turns the globe.
          interactive && 'cursor-grab touch-pan-y data-drag:cursor-grabbing',
        )}
      >
        {bezel && size > 0 && <Bezel size={size} />}
        <canvas ref={canvas} aria-hidden className="block size-full text-foreground" />
      </div>
      {readout && (
        <div aria-hidden className="grid justify-items-center gap-[18px]" style={{ width }}>
          <div className="relative h-[34px] w-full overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_18%,black_82%,transparent)]">
            <svg ref={tape} className="absolute top-0 left-0 h-[34px] text-muted-foreground will-change-transform" style={tapeStyle(size)}>
              {size > 0 && <TapeMarks size={size} />}
            </svg>
            <span className="absolute top-0 left-1/2 -ml-[0.75px] h-4 w-[1.5px] bg-primary" />
          </div>
          <div className="flex gap-5 font-mono text-xs leading-none text-muted-foreground tabular-nums">
            <span>
              lon{' '}
              <b ref={lonOut} className="font-medium text-foreground">
                {fmtLon(wrapLon(lon))}
              </b>
            </span>
            <span>
              lat{' '}
              <b ref={latOut} className="font-medium text-foreground">
                {fmtLat(clampLat(lat))}
              </b>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Degree ticks every 5°, longer every 30° and longest at the four quarters, 6 px outside the globe.
function Bezel({ size }: { size: number }) {
  const S = size + 24
  const c = S / 2
  const R = size / 2 + 6
  let d = ''
  for (let k = 0; k < 72; k++) {
    const a = k * 5 * RAD
    const len = k % 18 === 0 ? 9 : k % 6 === 0 ? 6 : 3
    const x = Math.cos(a)
    const y = Math.sin(a)
    d += `M${(c + x * R).toFixed(2)} ${(c + y * R).toFixed(2)}L${(c + x * (R + len)).toFixed(2)} ${(c + y * (R + len)).toFixed(2)}`
  }
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${S} ${S}`}
      className="pointer-events-none absolute -inset-3 size-[calc(100%+24px)] overflow-visible fill-none text-muted-foreground"
    >
      <circle cx={c} cy={c} r={R} strokeWidth={1} vectorEffect="non-scaling-stroke" className="stroke-foreground/14" />
      <path d={d} stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const tapeStyle = (size: number): CSSProperties => ({ width: size * (1080 / TAPE_SPAN) })

// Three full turns of longitude, so the tape never runs out while the globe spins; ticks every 5°, labels every 30°.
function TapeMarks({ size }: { size: number }) {
  const ppd = size / TAPE_SPAN
  let d = ''
  const labels: { x: number; text: string }[] = []
  for (let deg = -540; deg <= 540; deg += 5) {
    const x = Math.round((deg + 540) * ppd) + 0.5
    d += `M${x} 0V${deg % 30 === 0 ? 12 : deg % 10 === 0 ? 8 : 4}`
    if (deg % 30 === 0) {
      const v = ((deg + 540) % 360) - 180
      labels.push({ x, text: v === 0 ? '0°' : Math.abs(v) === 180 ? '180°' : `${Math.abs(v)}°${v > 0 ? 'E' : 'W'}` })
    }
  }
  return (
    <>
      <path d={d} stroke="currentColor" strokeWidth={1} fill="none" shapeRendering="crispEdges" />
      {labels.map((l) => (
        <text key={l.x} x={l.x} y={27} textAnchor="middle" className="fill-current font-mono text-[9.5px]">
          {l.text}
        </text>
      ))}
    </>
  )
}
