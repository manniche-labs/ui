import { useEffect, useRef, type ReactNode } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type CloudDriftProps = {
  /** Cloud colour as a hex value. */
  color?: string
  /** 0 to 1: how much of the sky is cloud. */
  cover?: number
  /** Drift speed; 1 is a calm breeze. */
  speed?: number
  /** Content shown on top of the sky. */
  children?: ReactNode
  /** Classes for the outer element. */
  className?: string
}

// The clouds are drawn at a tiny size and scaled up by the browser, which blurs them for free.
const COLS = 96
const ROWS = 54

function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function noise(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** Four layers of noise on top of each other: big soft shapes with finer wisps. */
function fbm(x: number, y: number) {
  let sum = 0
  let amp = 0.5
  for (let o = 0; o < 4; o++) {
    sum += noise(x, y) * amp
    x *= 2.03
    y *= 2.03
    amp *= 0.5
  }
  return sum
}

function rgb(hex: string) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const n = parseInt(full, 16) || 0xffffff
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** A slow sky of soft clouds drifting past, drawn on a small canvas. Background colour comes from the class. */
export function CloudDrift({ color = '#ffffff', cover = 0.5, speed = 1, children, className }: CloudDriftProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return
    const img = ctx.createImageData(COLS, ROWS)
    const [r, g, b] = rgb(color)
    const edge = 0.62 - Math.min(1, Math.max(0, cover)) * 0.3 // where noise turns into cloud

    const draw = (t: number) => {
      const shift = t * 0.00004 * speed
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          // A second noise warps the first, so the shapes billow instead of just sliding.
          const nx = x / 22 + shift
          const ny = y / 22
          const warp = fbm(nx * 0.7 - shift * 0.6, ny * 0.7 + 4.1)
          const n = fbm(nx + warp * 1.4, ny + warp * 0.8 + shift * 0.3)
          const a = Math.min(1, Math.max(0, (n - edge) / 0.22))
          const i = (y * COLS + x) * 4
          img.data[i] = r
          img.data[i + 1] = g
          img.data[i + 2] = b
          img.data[i + 3] = a * a * (3 - 2 * a) * 235
        }
      }
      ctx.putImageData(img, 0, 0)
    }

    if (reduce) {
      draw(0)
      return
    }

    // Only animate while the sky is on screen.
    let raf = 0
    let visible = false
    const loop = (now: number) => {
      draw(now)
      raf = requestAnimationFrame(loop)
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === visible) return
      visible = entry.isIntersecting
      if (visible) raf = requestAnimationFrame(loop)
      else cancelAnimationFrame(raf)
    })
    draw(performance.now())
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [color, cover, speed, reduce])

  return (
    <div className={cn('relative isolate overflow-hidden bg-sky-500 dark:bg-sky-950', className)}>
      <canvas ref={canvas} width={COLS} height={ROWS} aria-hidden className="absolute inset-0 -z-10 size-full blur-[2px]" />
      {children}
    </div>
  )
}
