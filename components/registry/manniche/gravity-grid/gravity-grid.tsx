import { useEffect, useRef, type ReactNode } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type GravityGridProps = {
  /** Dots at each crossing, or the grid lines themselves. */
  variant?: 'dots' | 'lines'
  /** Distance between grid points in CSS pixels. */
  gap?: number
  /** How far from the pointer the pull reaches, in CSS pixels. */
  reach?: number
  /** How hard points are pulled; 1 is a gentle well. */
  strength?: number
  /** Classes for the grid layer; its text colour colours the grid, e.g. `text-primary/50`. */
  gridClassName?: string
  /** Content shown on top of the grid. */
  children?: ReactNode
  /** Classes for the outer element. */
  className?: string
}

// How quickly points catch up with where the pointer wants them, per 60 Hz frame.
const FOLLOW = 0.16

/**
 * A grid of dots or lines that bends towards the pointer like a gravity well and settles when it leaves.
 * The grid takes its colour from `gridClassName` (muted by default) and lights up around the pointer. Static under reduced motion.
 */
export function GravityGrid({ variant = 'dots', gap = 28, reach = 180, strength = 1, gridClassName, children, className }: GravityGridProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return
    const step = Math.max(8, gap)

    let w = 0
    let h = 0
    let cols = 0
    let rows = 0
    let x0 = 0
    let y0 = 0
    // Offset of each point from its rest position, and how strongly the pointer holds it (0 to 1).
    let off = new Float32Array(0)
    let pull = new Float32Array(0)
    let pointer: { x: number; y: number } | null = null
    // Where the light around the pointer sits, and how bright it is (0 to 1); both ease like the points.
    let gx = 0
    let gy = 0
    let glow = 0
    // Lines are lit by drawing them again on a second canvas and masking that to a soft circle.
    const lit = document.createElement('canvas')
    const lctx = lit.getContext('2d')

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, el.width, el.height)
      const dpr = el.width / Math.max(1, w)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const color = getComputedStyle(el).color
      ctx.fillStyle = color
      ctx.strokeStyle = color

      if (variant === 'lines') {
        const trace = (g: CanvasRenderingContext2D) => {
          g.beginPath()
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const i = r * cols + c
              const x = x0 + c * step + off[i * 2]
              const y = y0 + r * step + off[i * 2 + 1]
              if (c === 0) g.moveTo(x, y)
              else g.lineTo(x, y)
            }
          }
          for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
              const i = r * cols + c
              const x = x0 + c * step + off[i * 2]
              const y = y0 + r * step + off[i * 2 + 1]
              if (r === 0) g.moveTo(x, y)
              else g.lineTo(x, y)
            }
          }
          g.lineWidth = 1
          g.stroke()
        }
        ctx.globalAlpha = 0.2
        trace(ctx)
        if (glow < 0.01 || !lctx) return
        lctx.setTransform(1, 0, 0, 1, 0, 0)
        lctx.globalCompositeOperation = 'source-over'
        lctx.clearRect(0, 0, lit.width, lit.height)
        lctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        lctx.strokeStyle = color
        trace(lctx)
        const mask = lctx.createRadialGradient(gx, gy, 0, gx, gy, reach)
        mask.addColorStop(0, '#000')
        mask.addColorStop(1, 'transparent')
        lctx.globalCompositeOperation = 'destination-in'
        lctx.fillStyle = mask
        lctx.fillRect(0, 0, w, h)
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.globalAlpha = glow
        ctx.drawImage(lit, 0, 0)
        return
      }

      for (let i = 0; i < cols * rows; i++) {
        const p = pull[i]
        ctx.globalAlpha = 0.35 + 0.65 * p
        ctx.beginPath()
        ctx.arc(x0 + (i % cols) * step + off[i * 2], y0 + Math.floor(i / cols) * step + off[i * 2 + 1], 1.2 * (1 + 1.1 * p), 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const layout = () => {
      w = el.clientWidth
      h = el.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      el.width = Math.max(1, Math.round(w * dpr))
      el.height = Math.max(1, Math.round(h * dpr))
      lit.width = el.width
      lit.height = el.height
      // One extra point beyond each edge, so bent lines never end inside the box.
      cols = Math.floor(w / step) + 3
      rows = Math.floor(h / step) + 3
      x0 = (w - (cols - 1) * step) / 2
      y0 = (h - (rows - 1) * step) / 2
      off = new Float32Array(cols * rows * 2)
      pull = new Float32Array(cols * rows)
      draw()
    }
    const ro = new ResizeObserver(layout)
    ro.observe(el)
    layout()

    // Redraw when the theme changes the text colour.
    const mo = new MutationObserver(draw)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    scheme.addEventListener('change', draw)

    const cleanupStatic = () => {
      ro.disconnect()
      mo.disconnect()
      scheme.removeEventListener('change', draw)
    }
    if (reduce) return cleanupStatic

    let raf = 0
    let last = 0
    const tick = (now: number) => {
      const k = 1 - Math.pow(1 - FOLLOW, Math.min(4, (now - (last || now - 16.7)) / 16.7))
      last = now
      let moving = false
      if (pointer) {
        // Jump straight to the pointer when the light is out, so it does not slide in from the last spot.
        gx = glow < 0.01 ? pointer.x : gx + (pointer.x - gx) * k
        gy = glow < 0.01 ? pointer.y : gy + (pointer.y - gy) * k
      }
      const eg = (pointer ? 1 : 0) - glow
      glow += eg * k
      if (Math.abs(eg) > 0.005) moving = true
      for (let i = 0; i < cols * rows; i++) {
        let tx = 0
        let ty = 0
        let tp = 0
        if (pointer) {
          const dx = pointer.x - (x0 + (i % cols) * step)
          const dy = pointer.y - (y0 + Math.floor(i / cols) * step)
          const d = Math.hypot(dx, dy)
          if (d < reach) {
            const f = (1 - d / reach) ** 2
            tx = dx * f * 0.55 * strength
            ty = dy * f * 0.55 * strength
            tp = f
          }
        }
        const ex = tx - off[i * 2]
        const ey = ty - off[i * 2 + 1]
        const ep = tp - pull[i]
        off[i * 2] += ex * k
        off[i * 2 + 1] += ey * k
        pull[i] += ep * k
        if (Math.abs(ex) > 0.05 || Math.abs(ey) > 0.05 || Math.abs(ep) > 0.005) moving = true
      }
      draw()
      // Stop once everything has settled; the next pointer move starts it again.
      if (moving) raf = requestAnimationFrame(tick)
      else raf = last = 0
    }
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }

    const move = (e: PointerEvent) => {
      const box = el.getBoundingClientRect()
      const x = e.clientX - box.left
      const y = e.clientY - box.top
      const near = x > -reach && y > -reach && x < box.width + reach && y < box.height + reach
      if (!near && !pointer) return
      pointer = near ? { x, y } : null
      wake()
    }
    const leave = () => {
      pointer = null
      wake()
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    window.addEventListener('blur', leave)

    return () => {
      cleanupStatic()
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      window.removeEventListener('blur', leave)
    }
  }, [variant, gap, reach, strength, reduce])

  return (
    <div className={cn('relative isolate overflow-hidden', className)}>
      <canvas ref={canvas} aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 size-full text-muted-foreground', gridClassName)} />
      {children}
    </div>
  )
}
