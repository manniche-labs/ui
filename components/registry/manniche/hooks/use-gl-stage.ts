import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'

/** A picture for a WebGL carousel. The alt text is what screen readers read; the canvas itself is hidden from them. */
export type GlImage = { src: string; alt: string }

export type Rgb = [number, number, number]

export type GlSceneContext = {
  gl: WebGLRenderingContext
  canvas: HTMLCanvasElement
  /** Call once the scene has what it needs for its first frame, e.g. after its pictures load. The canvas fades in. */
  ready: () => void
  /** Draw again, e.g. once a texture has loaded. */
  redraw: () => void
  /** Call when the scene cannot run after all, e.g. its pictures could not be uploaded. The stage reports `failed`. */
  fail: () => void
  /** The theme's colours when the scene is built, in the order of `colors`, e.g. for a texture's empty cells. */
  colors: Rgb[]
  /** Set when the stage is torn down, so work that finishes later can stop. */
  signal: AbortSignal
}

export type GlScene = {
  /** Draws a frame. `time` is in seconds; it only moves while the stage animates on its own and stands still under reduced motion. */
  draw: (time: number) => void
  /** The canvas has a new size in device pixels. The viewport is already set. */
  resize?: (width: number, height: number, dpr: number) => void
  /** The theme's colours, in the order of `colors`, as 0–1 RGB. Called before the first frame and on every theme change. */
  theme?: (colors: Rgb[]) => void
  /** Frees what the scene made. The context is released right after. */
  dispose?: () => void
}

export type GlStageOptions = {
  /** Upper bound on device pixels per CSS pixel. */
  maxDpr?: number
  /** Upper bound on the canvas's device pixels; past it the canvas renders smaller and the browser scales it up. */
  maxPixels?: number
  /** A frame loop of its own while on screen, for motion that does not come from the carousel. Off under reduced motion. */
  animate?: boolean
  /** CSS colours the scene needs, e.g. `var(--background)`. Read from the host, so they follow the theme. */
  colors?: string[]
  /** Classes for the canvas, which goes first in the host. */
  className?: string
  /** Context attributes on top of the defaults (no antialias, low power). */
  attributes?: WebGLContextAttributes
}

export type GlStage = {
  /** `pending` until the scene is ready, `ready` once it has drawn, `failed` without WebGL or after the GPU drops the context. */
  status: 'pending' | 'ready' | 'failed'
  /** Draw a frame now, e.g. from a carousel's `onFrame`. Does nothing before the scene exists. */
  redraw: () => void
}

// Seconds of animation that a still frame shows under reduced motion, so it is not the plain first frame.
const STILL = 4

/**
 * Runs a WebGL scene in a canvas inside `host`: a fresh canvas each run, sized to the host with a cap on pixels,
 * the theme's colours read live, its own frame loop only while on screen, and the context released on teardown or
 * failure, so a page never holds more than it uses. `build` makes the scene; it runs again when `key` changes, so put
 * everything the scene is built from in it, e.g. the pictures' addresses. Return null from `build` when the scene cannot
 * run, and the stage reports `failed`.
 */
export function useGlStage(
  host: RefObject<HTMLElement | null>,
  build: (ctx: GlSceneContext) => GlScene | null,
  key: string,
  { maxDpr = 2, maxPixels = 2_400_000, animate = false, colors = [], className = '', attributes }: GlStageOptions = {},
): GlStage {
  const reduce = useReducedMotion()
  const [status, setStatus] = useState<GlStage['status']>('pending')
  // The live scene's draw, for redraw(); null between runs.
  const live = useRef<(() => void) | null>(null)
  const palette = colors.join('|')
  const attrs = JSON.stringify(attributes ?? {})
  // The latest build, so a new function each render does not rebuild the scene; `key` does.
  const make = useRef(build)
  useLayoutEffect(() => {
    make.current = build
  })

  useEffect(() => {
    const wrap = host.current
    if (!wrap) return
    const abort = new AbortController()
    // Reported after the effect, and only while this run is the live one.
    const report = (s: GlStage['status']) => queueMicrotask(() => abort.signal.aborted || setStatus(s))
    report('pending')
    // A fresh canvas per run: a canvas whose context was lost cannot hand out a new one.
    const el = document.createElement('canvas')
    el.setAttribute('aria-hidden', 'true')
    el.className = className
    wrap.prepend(el)

    const options: WebGLContextAttributes = { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power', ...JSON.parse(attrs) }
    const gl = el.getContext('webgl', options)
    if (!gl) {
      el.remove()
      report('failed')
      return () => abort.abort()
    }

    let scene: GlScene | null = null
    let dead = false
    let shown = false
    let clock = STILL
    let raf = 0
    let last = 0
    let visible = false
    const looping = animate && !reduce

    const frame = () => {
      if (!dead && scene) scene.draw(clock)
    }
    let released = false
    const release = () => {
      if (released) return
      released = true
      dead = true
      live.current = null
      cancelAnimationFrame(raf)
      abort.abort()
      try {
        scene?.dispose?.()
      } catch {
        // The context may already be gone; there is nothing left to free.
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      el.remove()
    }

    // The theme's colours, read through a 1 px canvas so any CSS colour (oklch, color-mix, var) comes out as RGB.
    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    const wanted = palette ? palette.split('|') : []
    const read = () => {
      const style = getComputedStyle(wrap)
      return wanted.map((c): Rgb => {
        const value = c.startsWith('var(') ? style.getPropertyValue(c.slice(4, -1).split(',')[0].trim()).trim() || '#808080' : c
        if (!probe) return [0.5, 0.5, 0.5]
        probe.clearRect(0, 0, 1, 1)
        probe.fillStyle = '#808080'
        probe.fillStyle = value
        probe.fillRect(0, 0, 1, 1)
        const [r, g, b] = probe.getImageData(0, 0, 1, 1).data
        return [r / 255, g / 255, b / 255]
      })
    }

    const ctx: GlSceneContext = {
      gl,
      canvas: el,
      signal: abort.signal,
      colors: read(),
      fail: () => {
        if (dead) return
        release()
        queueMicrotask(() => setStatus('failed'))
      },
      redraw: () => {
        // A running loop draws on its next frame anyway.
        if (!(looping && visible)) frame()
      },
      ready: () => {
        if (dead || shown) return
        shown = true
        frame()
        // Wait a frame so the canvas fades in instead of popping.
        requestAnimationFrame(() => {
          if (dead) return
          el.dataset.ready = ''
          report('ready')
        })
      },
    }

    try {
      scene = make.current(ctx)
    } catch {
      scene = null
    }
    // Free the context straight away, so a scene that cannot run does not hold one of the page's few.
    if (!scene) {
      release()
      queueMicrotask(() => setStatus('failed'))
      return
    }
    live.current = ctx.redraw

    const theme = () => {
      if (dead || !scene?.theme || !wanted.length) return
      scene.theme(read())
      ctx.redraw()
    }
    theme()
    // The theme changes through a class or inline variables on <html>, or the system's colour scheme.
    const mo = new MutationObserver(theme)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    scheme.addEventListener('change', theme)

    const resize = () => {
      if (dead) return
      const w = el.clientWidth
      const h = el.clientHeight
      let dpr = Math.min(maxDpr, window.devicePixelRatio || 1)
      if (w * h * dpr * dpr > maxPixels) dpr = Math.sqrt(maxPixels / Math.max(1, w * h))
      el.width = Math.max(1, Math.round(w * dpr))
      el.height = Math.max(1, Math.round(h * dpr))
      gl.viewport(0, 0, el.width, el.height)
      scene?.resize?.(el.width, el.height, dpr)
      frame()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    const loop = (now: number) => {
      // Cap the step so a stalled tab does not jump the motion ahead.
      clock += Math.min(50, now - (last || now)) / 1000
      last = now
      frame()
      raf = requestAnimationFrame(loop)
    }
    // Only animate while on screen.
    const io = new IntersectionObserver(([entry]) => {
      if (dead || !looping || entry.isIntersecting === visible) return
      visible = entry.isIntersecting
      last = 0
      if (visible) raf = requestAnimationFrame(loop)
      else cancelAnimationFrame(raf)
    })
    io.observe(el)

    // If the GPU drops the context, the component shows its fallback again.
    const lost = (e: Event) => {
      e.preventDefault()
      dead = true
      live.current = null
      cancelAnimationFrame(raf)
      delete el.dataset.ready
      report('failed')
    }
    el.addEventListener('webglcontextlost', lost)

    return () => {
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      scheme.removeEventListener('change', theme)
      el.removeEventListener('webglcontextlost', lost)
      release()
    }
  }, [host, key, reduce, animate, maxDpr, maxPixels, palette, className, attrs])

  const redraw = useCallback(() => live.current?.(), [])
  return { status, redraw }
}

/**
 * Compiles and links a program, or returns null so the caller can fall back; the reason goes to the console unless the
 * context was lost. A uniform used in both shaders must have the same precision in each, or linking fails.
 */
export function glProgram(gl: WebGLRenderingContext, vertex: string, fragment: string) {
  const program = gl.createProgram()
  if (!program) return null
  const log: string[] = []
  for (const [type, src] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const s = gl.createShader(type)
    if (!s) {
      gl.deleteProgram(program)
      return null
    }
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) log.push(gl.getShaderInfoLog(s) ?? '')
    gl.attachShader(program, s)
    // Flagged for deletion; it lives until the program goes.
    gl.deleteShader(s)
  }
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (!gl.isContextLost()) console.warn('WebGL program failed:', log.join('\n') || gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

export type GlAtlas = {
  /** The texture, power-of-two sized, with mipmaps. */
  texture: WebGLTexture
  /** Each picture's corner in the atlas as [u0, v0, u1, v1], with v growing downwards (the texture is not flipped). */
  rects: [number, number, number, number][]
  /** False for a picture that did not load; its cell shows `empty` instead. */
  loaded: boolean[]
  /** A cell's width and height in texels, without its gutter. */
  cell: [number, number]
  /** The texture's width and height in texels. */
  size: [number, number]
}

const pow2 = (v: number) => 2 ** Math.ceil(Math.log2(Math.max(1, v)))

function load(src: string, signal: AbortSignal) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    // A picture from another origin must send CORS headers to be drawn into WebGL; without them it shows as empty.
    if (!/^(data|blob):/.test(src)) img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    signal.addEventListener('abort', () => resolve(null), { once: true })
    img.src = src
  })
}

export type GlAtlasOptions = {
  /** The pictures' width over height; each is cropped from the middle to fill a cell of this shape. */
  aspect: number
  /** The longer side of a cell in texels, at most. Cells shrink to keep the texture within `limit`. */
  cell?: number
  /** The texture's largest side in texels. A 2048 atlas with mipmaps takes about 22 MB of GPU memory, a 4096 one four times that. */
  limit?: number
  /** The colour of a cell whose picture did not load. */
  empty?: Rgb
  signal: AbortSignal
}

/**
 * Loads pictures and paints them, cropped to fill a cell of `aspect` (width over height), into one texture. Each cell
 * has a gutter of its own edge pixels, so mipmaps and filtering never bleed one picture into the next. Resolves to
 * null if the stage was torn down meanwhile, or if the pictures could not be uploaded.
 */
export async function glAtlas(
  gl: WebGLRenderingContext,
  images: GlImage[],
  { aspect, cell = 1024, limit = 2048, empty = [0.5, 0.5, 0.5], signal }: GlAtlasOptions,
): Promise<GlAtlas | null> {
  const n = Math.max(images.length, 1)
  const cols = Math.ceil(Math.sqrt(n * aspect) / aspect) || 1
  const rows = Math.ceil(n / cols)
  const gutter = 4
  // The largest cell in the picture's shape that fits the grid within the limit; the limit is a power of two, so the
  // texture never rounds up past it.
  const max = Math.min(pow2(limit), gl.getParameter(gl.MAX_TEXTURE_SIZE) as number)
  const w = aspect >= 1 ? 1 : aspect
  const h = aspect >= 1 ? 1 / aspect : 1
  const size = Math.max(16, Math.floor(Math.min(cell, (max / cols - gutter * 2) / w, (max / rows - gutter * 2) / h)))
  const cw = Math.max(1, Math.floor(size * w))
  const ch = Math.max(1, Math.floor(size * h))
  const W = pow2((cw + gutter * 2) * cols)
  const H = pow2((ch + gutter * 2) * rows)

  const pictures = await Promise.all(images.map((im) => load(im.src, signal)))
  if (signal.aborted) return null

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext('2d')
  if (!c) return null
  c.imageSmoothingQuality = 'high'
  const fill = `rgb(${empty.map((v) => Math.round(v * 255)).join(' ')})`
  const rects: GlAtlas['rects'] = []
  const loaded: boolean[] = []

  pictures.forEach((img, i) => {
    const x = (i % cols) * (cw + gutter * 2) + gutter
    const y = Math.floor(i / cols) * (ch + gutter * 2) + gutter
    rects.push([x / W, y / H, (x + cw) / W, (y + ch) / H])
    const ok = !!img && img.naturalWidth > 0
    loaded.push(ok)
    if (!ok) {
      c.fillStyle = fill
      c.fillRect(x - gutter, y - gutter, cw + gutter * 2, ch + gutter * 2)
      return
    }
    // Crop to fill the cell, from the middle.
    const k = Math.max(cw / img.naturalWidth, ch / img.naturalHeight)
    const sw = cw / k
    const sh = ch / k
    const sx = (img.naturalWidth - sw) / 2
    const sy = (img.naturalHeight - sh) / 2
    c.drawImage(img, sx, sy, sw, sh, x, y, cw, ch)
    // The gutter repeats the cell's outermost pixels.
    c.drawImage(canvas, x, y, cw, 1, x, y - gutter, cw, gutter)
    c.drawImage(canvas, x, y + ch - 1, cw, 1, x, y + ch, cw, gutter)
    c.drawImage(canvas, x, y - gutter, 1, ch + gutter * 2, x - gutter, y - gutter, gutter, ch + gutter * 2)
    c.drawImage(canvas, x + cw - 1, y - gutter, 1, ch + gutter * 2, x + cw, y - gutter, gutter, ch + gutter * 2)
  })

  const texture = gl.createTexture()
  if (!texture || gl.isContextLost()) return null
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
  } catch {
    // A picture tainted the canvas; nothing can be uploaded.
    gl.deleteTexture(texture)
    return null
  }
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic')
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))
  return { texture, rects, loaded, cell: [cw, ch], size: [W, H] }
}
