import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent } from 'react'
import { useCarouselEngine } from '@/registry/manniche/hooks/use-carousel-engine'
import { glAtlas, glProgram, useGlStage, type GlAtlas, type GlImage, type GlScene } from '@/registry/manniche/hooks/use-gl-stage'
import { cn } from '@/lib/utils'

/** A picture for the carousel. The title, if given, is shown under the pictures. */
export type SandEdgeImage = GlImage & { title?: string }

export type SandEdgeProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  /** The pictures. A picture from another origin must send CORS headers (Access-Control-Allow-Origin) to be drawn in WebGL. */
  images: SandEdgeImage[]
  /** Read by screen readers, e.g. “Landscapes”. */
  label: string
  /** Controlled: the picture in the middle. */
  index?: number
  /** The picture in the middle at first, when uncontrolled. */
  defaultIndex?: number
  /** Called when the carousel heads for a new picture: on release, a key, a button or a click. */
  onIndexChange?: (index: number) => void
  /** Wrap round from the last picture to the first. */
  loop?: boolean
  /** Picture width over height. */
  aspect?: number
  /** Size of one grain of sand in CSS pixels, the same on every screen. */
  grain?: number
  /** How far the wind carries the sand when the strip moves; 0 keeps the grains near their edge. */
  wind?: number
  /** Loose grains at the edges shimmer slightly while on screen. Off under reduced motion. */
  shimmer?: boolean
  /** Screen reader and button text with English defaults. Keys: `previous`, `next`, `picture` and `of`. */
  labels?: Partial<Record<'previous' | 'next' | 'picture' | 'of', string>>
}

const EN = { previous: 'Previous picture', next: 'Next picture', picture: 'Picture', of: 'of' }
const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

// How the erosion reads, in parts of the stage's half width and of the card width.
const FADE = 0.32 // how far past its threshold a grain is still seen, at rest
const GUST = 1.1 // how much longer the trail of sand gets in a full wind
const REACH = 0.36 // card widths a grain drifts per unit of erosion, at rest
const RADIUS = 14 // css px, the corners of a card
const MAX_GRAINS = 90_000 // per card; past this the grains get coarser
const PIXELS = 4_200_000 // device pixels the canvas may use; the scene draws only cards, so this can be above the stage's own cap

type Layout = { width: number; cw: number; ch: number; step: number; pad: number; height: number; z0: number }

// Where everything sits for a stage `width` CSS pixels wide.
function measure(width: number, aspect: number): Layout {
  let cw = Math.min(460, Math.max(width * 0.3, Math.min(width * 0.56, 320)))
  cw = Math.round(Math.min(cw, 560 * aspect))
  const ch = Math.round(cw / aspect)
  const step = cw + Math.round(Math.max(12, cw * 0.05))
  const pad = Math.round(Math.max(24, ch * 0.09))
  // Erosion starts a little outside the middle card's edge, and never nearer the middle than 40 % of the half width.
  const z0 = Math.max(0.4, cw / width + 0.05)
  return { width, cw, ch, step, pad, height: ch + pad * 2, z0 }
}

// Shared by both programs: how eroded the stage is at a device x, in units where 0 is the start of the zone and
// 1 + FADE is the stage's edge.
const ERODE = `uniform vec4 uZ;
float erode(float x){return (abs(x-uZ.x)*uZ.y-uZ.z)*uZ.w;}`

// The solid body of a card: the picture at full resolution, with every grain cell that has come loose cut out.
const CARD_VS = `attribute vec2 aQ;
uniform vec2 uRes;uniform vec2 uOrg;uniform vec2 uSize;
varying vec2 vL;
void main(){
  vL=aQ*uSize;
  vec2 p=uOrg+vL;
  gl_Position=vec4(p.x/uRes.x*2.-1.,1.-p.y/uRes.y*2.,0.,1.);
}`

const HIGHP = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`

const CARD_FS = `${HIGHP}
uniform sampler2D uTex;uniform sampler2D uThr;
uniform vec2 uOrg;uniform vec2 uSize;uniform vec2 uGrid;uniform float uPitch;uniform vec4 uChan;uniform vec4 uRect;
uniform float uRadius;uniform float uLine;uniform vec4 uBorder;
varying vec2 vL;
${ERODE}
void main(){
  vec2 cell=floor(vL/uPitch);
  float t=dot(texture2D(uThr,(cell+.5)/uGrid),uChan);
  // A hair of overlap with the grains, so the seam between the two never shows a gap.
  if(erode(uOrg.x+(cell.x+.5)*uPitch)-t>.004)discard;
  vec2 q=abs(vL-uSize*.5)-(uSize*.5-uRadius);
  float sd=length(max(q,0.))+min(max(q.x,q.y),0.)-uRadius;
  float a=clamp(.5-sd,0.,1.);
  vec4 c=texture2D(uTex,mix(uRect.xy,uRect.zw,vL/uSize));
  // The family's hairline ring, in the theme's border colour.
  float ring=clamp(uLine-abs(sd+uLine*.5)+.5,0.,1.)*uBorder.a;
  c.rgb=mix(c.rgb,uBorder.rgb*c.a,ring);
  gl_FragColor=c*a;
}`

// One point per grain. Past its threshold a grain leaves home: out towards the nearer edge of the stage, a little up
// or down, farther the more eroded it is and the stronger the wind, and it fades as it goes.
const SAND_VS = `attribute vec2 aCell;attribute vec4 aT;attribute vec4 aR;
uniform vec2 uRes;uniform vec2 uOrg;uniform vec2 uSize;uniform float uPitch;uniform vec4 uChan;uniform vec4 uRect;
uniform float uRadius;
uniform vec4 uAir;
uniform vec3 uFlow;
uniform float uTime;
varying vec2 vUv;varying float vA;varying float vShade;
${ERODE}
void main(){
  vec2 local=(aCell+.5)*uPitch;
  vec2 home=uOrg+local;
  float d=erode(home.x)-dot(aT,uChan);
  float life=d/uAir.x;
  vec2 q=abs(local-uSize*.5)-(uSize*.5-uRadius);
  float sd=length(max(q,0.))+min(max(q.x,q.y),0.)-uRadius;
  if(d<-.004||life>=1.||sd>0.){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;return;}
  d=max(d,0.);life=max(life,0.);
  float side=home.x<uZ.x?-1.:1.;
  float loose=smoothstep(0.,.03,d);
  float w=uAir.w;
  // The downwind side carries farther than the side the strip comes in from.
  float gust=1.+.5*w*max(0.,side*uFlow.x);
  float spread=.5+aR.x;
  vec2 off;
  off.x=side*(uAir.y*d+uAir.z*w*d*d*gust)*spread;
  off.y=((aR.y-.5)*2.-uFlow.y*(.35+w))*pow(d,1.3)*uAir.y*.3;
  off+=(aR.zw-.5)*uPitch*1.3*loose;
  off+=vec2(sin(uTime*(1.3+aR.z)+aR.w*6.283),cos(uTime*(1.1+aR.w)+aR.z*6.283))*uPitch*.55*loose*uFlow.z;
  vec2 p=home+off;
  float edge=smoothstep(0.,uPitch*8.,min(p.x,uRes.x-p.x))*smoothstep(0.,uPitch*6.,min(p.y,uRes.y-p.y));
  vA=(1.-smoothstep(.25,1.,life))*edge;
  vShade=mix(1.,.9+.2*aR.w,loose);
  vUv=mix(uRect.xy,uRect.zw,local/uSize);
  gl_PointSize=max(1.,floor(uPitch*mix(1.,.55+.45*aR.x,life)+.5));
  gl_Position=vec4(p.x/uRes.x*2.-1.,1.-p.y/uRes.y*2.,0.,1.);
}`

const SAND_FS = `precision mediump float;
uniform sampler2D uTex;uniform float uBias;
varying vec2 vUv;varying float vA;varying float vShade;
void main(){
  // The point's uv is the same in all its pixels, so the bias alone picks the mip level: one grain, one average colour.
  vec4 c=texture2D(uTex,vUv,uBias);
  gl_FragColor=vec4(c.rgb*vShade,c.a)*vA;
}`

// A small seeded hash and value noise, for the grains' thresholds.
function hash(x: number, y: number, s: number) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function noise(x: number, y: number, s: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy, s)
  const b = hash(ix + 1, iy, s)
  const c = hash(ix, iy + 1, s)
  const d = hash(ix + 1, iy + 1, s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/**
 * Each grain's threshold, four variants per grain (one per channel), so neighbouring cards do not erode alike.
 * Broad noise, stretched sideways, sets bays and headlands; strata, thin bands that run across the card, let some
 * layers recede further like weathered sandstone; fine noise and a little white noise fray the front. The top and
 * bottom give way a little first, so the front rounds off at the corners. The values sit around 0.5 and change
 * slowly across the card, so the front is one ragged line, not holes all over.
 */
function thresholds(cols: number, rows: number) {
  const n = cols * rows
  const out = new Uint8Array(n * 4)
  const k = rows / cols
  for (let s = 0; s < 4; s++) {
    for (let j = 0; j < rows; j++) {
      const y = (j + 0.5) / rows
      const rim = 1 - Math.min(1, Math.min(y, 1 - y) / 0.1)
      for (let i = 0; i < cols; i++) {
        const x = (i + 0.5) / cols
        const big = noise(x * 1.6, y * k * 3.2, s * 7 + 1) * 0.7 + noise(x * 3.5, y * k * 7, s * 7 + 2) * 0.3
        const strata = noise(x * 2.2, y * k * 26, s * 7 + 3)
        const fine = noise(x * 34, y * k * 34, s * 7 + 4)
        const value = 0.5 + (big - 0.5) * 0.5 + (strata - 0.5) * 0.3 + (fine - 0.5) * 0.09 + (hash(i, j, s + 11) - 0.5) * 0.035 - rim * rim * 0.2
        out[(j * cols + i) * 4 + s] = Math.round(Math.min(1, Math.max(0, value)) * 255)
      }
    }
  }
  return out
}

type Motion = { p: number; v: number; wind: number; dir: number; at: number; raf: number }

/**
 * A row of pictures whose edges blow away like sand. The picture in the middle is solid; towards the stage's left
 * and right edges each card breaks up into fine square grains in the picture's own colours, and they drift off on a
 * wind and fade. The faster the strip moves, the stronger the wind and the farther the sand flies; a card coming in
 * gathers from grains, one going out comes apart. Each card is drawn in WebGL as its full-resolution picture with the
 * loose grain cells cut out, plus one point per loose grain, with the erosion front set per grain from noise so it
 * reads as weathered stone, not a wipe. Drag or swipe with momentum, use a trackpad, the arrow keys, the buttons, or
 * click a side picture. Under reduced motion each move jumps and the eroded edges stand still. Without WebGL, or if
 * the GPU drops the context, the same carousel is drawn with plain images that fade towards the edges.
 */
export function SandEdge({
  images,
  label,
  index,
  defaultIndex,
  onIndexChange,
  loop = false,
  aspect = 4 / 5,
  grain = 2,
  wind = 1,
  shimmer = false,
  labels = {},
  className,
  onKeyDown,
  ...rest
}: SandEdgeProps) {
  const t = { ...EN, ...labels }
  const n = images.length
  const wraps = loop && n > 2
  const id = useId()

  const stage = useRef<HTMLDivElement | null>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const tick = useRef<HTMLSpanElement | null>(null)
  const [width, setWidth] = useState(0)
  const L = width ? measure(width, aspect) : null
  const layout = useRef<Layout | null>(null)
  const motion = useRef<Motion>({ p: 0, v: 0, wind: 0, dir: 0, at: 0, raf: 0 })
  // The latest effect settings, for the scene, which outlives a render.
  const tune = useRef({ grain, wind, shimmer, n, wraps })
  useLayoutEffect(() => {
    tune.current = { grain, wind, shimmer, n, wraps }
  })

  const srcs = images.map((im) => im.src).join('\n')
  const gl = useGlStage(
    stage,
    ({ gl, canvas, ready, redraw, fail, signal }) => {
      const card = glProgram(gl, CARD_VS, CARD_FS)
      const sand = glProgram(gl, SAND_VS, SAND_FS)
      if (!card || !sand) return null
      const list = srcs.split('\n').map((src) => ({ src, alt: '' }))
      const loc = (p: WebGLProgram, names: string[]) => Object.fromEntries(names.map((k) => [k, gl.getUniformLocation(p, k)]))
      const common = ['uRes', 'uOrg', 'uSize', 'uPitch', 'uChan', 'uRect', 'uRadius', 'uZ', 'uTex']
      const uc = loc(card, [...common, 'uThr', 'uGrid', 'uLine', 'uBorder'])
      const us = loc(sand, [...common, 'uAir', 'uFlow', 'uTime', 'uBias'])
      const aQ = gl.getAttribLocation(card, 'aQ')
      const aCell = gl.getAttribLocation(sand, 'aCell')
      const aT = gl.getAttribLocation(sand, 'aT')
      const aR = gl.getAttribLocation(sand, 'aR')

      const quad = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, quad)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
      const grains = gl.createBuffer()
      const thr = gl.createTexture()
      let grid = '' // cols × rows the grain buffer was built for
      let count = 0
      let atlas: GlAtlas | null = null
      let border: [number, number, number] = [0.5, 0.5, 0.5]
      let dark = false
      let W = 1
      let H = 1

      // The atlas cells match the cards' size on screen, so the middle picture is sharp.
      const host = canvas.parentElement
      const cssH = host ? measure(host.clientWidth || 600, aspect).ch : 400
      const cell = cssH * Math.min(2, window.devicePixelRatio || 1) > 560 ? 1024 : 512
      glAtlas(gl, list, { aspect, cell, limit: 4096, signal }).then((a) => {
        if (signal.aborted) return
        if (!a) return fail()
        atlas = a
        ready()
        redraw()
      })

      // The grain grid for a card of cols × rows grains: one vertex each, with its four thresholds and four randoms.
      const build = (cols: number, rows: number) => {
        const key = `${cols}x${rows}`
        if (key === grid) return
        grid = key
        count = cols * rows
        const t4 = thresholds(cols, rows)
        const data = new ArrayBuffer(count * 16)
        const f = new Float32Array(data)
        const b = new Uint8Array(data)
        for (let j = 0, g = 0; j < rows; j++)
          for (let i = 0; i < cols; i++, g++) {
            f[g * 4] = i
            f[g * 4 + 1] = j
            for (let c = 0; c < 4; c++) {
              b[g * 16 + 8 + c] = t4[g * 4 + c]
              b[g * 16 + 12 + c] = Math.floor(hash(i, j, 101 + c) * 256)
            }
          }
        gl.bindBuffer(gl.ARRAY_BUFFER, grains)
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, thr)
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, t4)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      }

      const scene: GlScene = {
        resize: (w, h) => {
          W = w
          H = h
        },
        theme: ([bd, bg]) => {
          border = bd
          dark = bg[0] * 0.3 + bg[1] * 0.6 + bg[2] * 0.1 < 0.5
        },
        draw: (time) => {
          gl.clearColor(0, 0, 0, 0)
          gl.clear(gl.COLOR_BUFFER_BIT)
          const lay = layout.current
          if (!atlas || !lay) return
          const o = tune.current
          const m = motion.current
          const dpr = W / Math.max(1, lay.width)
          // Grain pitch in device pixels, whole, so grains tile with no gaps; coarser if a card would need too many.
          let pitch = Math.max(1, Math.round(o.grain * dpr))
          while ((lay.cw * dpr * lay.ch * dpr) / (pitch * pitch) > MAX_GRAINS) pitch++
          const cols = Math.max(2, Math.round((lay.cw * dpr) / pitch))
          const rows = Math.max(2, Math.round((lay.ch * dpr) / pitch))
          build(cols, rows)
          const sw = cols * pitch
          const sh = rows * pitch
          const cx = W / 2
          const half = W / 2
          const w = m.wind
          // In a wind the erosion reaches a little further in, and the trail of sand gets longer.
          const z0 = lay.z0 - 0.05 * w
          const fade = FADE * (1 + GUST * w * Math.min(1, o.wind))
          const z1 = z0 + (1 - z0) / (1 + FADE)
          const zone = [cx, 1 / half, z0, 1 / (z1 - z0)] as const
          const erode = (x: number) => (Math.abs(x - cx) / half - z0) / (z1 - z0)
          const top = Math.round(lay.pad * dpr + (lay.ch * dpr - sh) / 2)

          // The cards near the visible range, farthest first. `inner` and `outer` are the erosion at a card's
          // nearest and farthest point from the middle.
          const shown: { i: number; x: number; inner: number; outer: number }[] = []
          for (let i = 0; i < o.n; i++) {
            let d = i - m.p
            if (o.wraps) d = ((((d + o.n / 2) % o.n) + o.n) % o.n) - o.n / 2
            const x = cx + d * lay.step * dpr - sw / 2
            const near = Math.max(0, x - cx, cx - x - sw)
            const far = Math.max(Math.abs(x - cx), Math.abs(x + sw - cx))
            const inner = erode(cx + near)
            if (near > half || inner > 1 + fade) continue
            shown.push({ i, x, inner, outer: erode(cx + far) })
          }
          shown.sort((a, b) => b.inner - a.inner)

          gl.enable(gl.BLEND)
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, atlas.texture)
          gl.activeTexture(gl.TEXTURE1)
          gl.bindTexture(gl.TEXTURE_2D, thr)

          const chan = (i: number) => [i % 4 === 0 ? 1 : 0, i % 4 === 1 ? 1 : 0, i % 4 === 2 ? 1 : 0, i % 4 === 3 ? 1 : 0] as const
          const shared = (u: Record<string, WebGLUniformLocation | null>, c: (typeof shown)[number]) => {
            gl.uniform2f(u.uRes, W, H)
            gl.uniform2f(u.uOrg, c.x, top)
            gl.uniform2f(u.uSize, sw, sh)
            gl.uniform1f(u.uPitch, pitch)
            gl.uniform4f(u.uChan, ...chan(c.i))
            gl.uniform4f(u.uRect, ...atlas!.rects[c.i % atlas!.rects.length])
            gl.uniform1f(u.uRadius, RADIUS * dpr)
            gl.uniform4f(u.uZ, ...zone)
            gl.uniform1i(u.uTex, 0)
          }

          gl.useProgram(card)
          gl.bindBuffer(gl.ARRAY_BUFFER, quad)
          gl.enableVertexAttribArray(aQ)
          gl.vertexAttribPointer(aQ, 2, gl.FLOAT, false, 0, 0)
          gl.uniform1i(uc.uThr, 1)
          gl.uniform2f(uc.uGrid, cols, rows)
          gl.uniform1f(uc.uLine, Math.max(1, dpr))
          gl.uniform4f(uc.uBorder, ...border, dark ? 0.55 : 0.8)
          for (const c of shown) {
            if (c.inner > 1.004) continue
            shared(uc, c)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
          }
          gl.disableVertexAttribArray(aQ)

          gl.useProgram(sand)
          gl.bindBuffer(gl.ARRAY_BUFFER, grains)
          gl.enableVertexAttribArray(aCell)
          gl.enableVertexAttribArray(aT)
          gl.enableVertexAttribArray(aR)
          gl.vertexAttribPointer(aCell, 2, gl.FLOAT, false, 16, 0)
          gl.vertexAttribPointer(aT, 4, gl.UNSIGNED_BYTE, true, 16, 8)
          gl.vertexAttribPointer(aR, 4, gl.UNSIGNED_BYTE, true, 16, 12)
          const reach = REACH * sw
          gl.uniform4f(us.uAir, fade, reach, reach * 2 * o.wind, w)
          gl.uniform3f(us.uFlow, m.dir, 0.35, o.shimmer ? 1 : 0)
          gl.uniform1f(us.uTime, time)
          // Texels per grain, as a mip bias, so each grain is its patch's average colour.
          gl.uniform1f(us.uBias, Math.log2(Math.max(1, (pitch * atlas.cell[1]) / sh)))
          for (const c of shown) {
            // A card wholly inside the solid middle has no loose grains.
            if (c.outer < -0.004) continue
            shared(us, c)
            gl.drawArrays(gl.POINTS, 0, count)
          }
          gl.disableVertexAttribArray(aCell)
          gl.disableVertexAttribArray(aT)
          gl.disableVertexAttribArray(aR)
        },
        dispose: () => {
          gl.deleteBuffer(quad)
          gl.deleteBuffer(grains)
          gl.deleteTexture(thr)
          if (atlas) gl.deleteTexture(atlas.texture)
          gl.deleteProgram(card)
          gl.deleteProgram(sand)
        },
      }
      return scene
    },
    `${srcs}|${aspect}`,
    {
      maxDpr: 2,
      maxPixels: PIXELS,
      animate: shimmer,
      colors: ['var(--border)', 'var(--background)'],
      className: 'pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-300 ease-out-quint data-ready:opacity-100 motion-reduce:transition-none',
    },
  )
  const glReady = gl.status === 'ready'
  const redraw = gl.redraw

  // The DOM layer: the visual until WebGL is ready or if it fails, and always the layer people click and read.
  const paint = useCallback(
    (p: number) => {
      const lay = layout.current
      if (!lay) return
      for (let i = 0; i < n; i++) {
        const el = cards.current[i]
        if (!el) continue
        let d = i - p
        if (wraps) d = ((((d + n / 2) % n) + n) % n) - n / 2
        const x = d * lay.step
        if (Math.abs(x) - lay.cw / 2 > lay.width / 2) {
          el.style.visibility = 'hidden'
          continue
        }
        el.style.visibility = 'visible'
        el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`
      }
      const at = wraps ? (((p % n) + n) % n) / n : (Math.min(Math.max(p, 0), n - 1) / Math.max(n - 1, 1)) * (1 - 1 / n)
      if (tick.current) tick.current.style.transform = `translateX(${(at * 100 * n).toFixed(3)}%)`
    },
    [n, wraps],
  )

  // The wind follows the strip's speed at once and dies down over about a third of a second once it stops.
  const breathe = useCallback(() => {
    const m = motion.current
    cancelAnimationFrame(m.raf)
    m.raf = 0
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - m.at) / 1000)
      m.at = now
      m.wind *= Math.exp(-dt / 0.32)
      if (m.wind < 0.01) m.wind = 0
      redraw()
      m.raf = m.wind ? requestAnimationFrame(step) : 0
    }
    m.at = performance.now()
    m.raf = requestAnimationFrame(step)
  }, [redraw])

  const onFrame = useCallback(
    (p: number, v: number) => {
      const m = motion.current
      const now = performance.now()
      const dt = Math.min(0.05, (now - (m.at || now)) / 1000)
      m.at = now
      m.p = p
      m.v = v
      if (Math.abs(v) > 0.01) {
        cancelAnimationFrame(m.raf)
        m.raf = 0
        m.dir = v > 0 ? -1 : 1
        const target = 1 - Math.exp(-Math.abs(v) / 5)
        m.wind = target > m.wind ? m.wind + (target - m.wind) * (1 - Math.exp(-dt / 0.05)) : m.wind + (target - m.wind) * (1 - Math.exp(-dt / 0.32))
      } else if (m.wind > 0 && !m.raf) breathe()
      paint(p)
      redraw()
    },
    [paint, redraw, breathe],
  )
  useEffect(() => () => cancelAnimationFrame(motion.current.raf), [])

  const engine = useCarouselEngine({ count: n, loop: wraps, index, defaultIndex, onIndexChange, step: L?.step ?? 300, onFrame })
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
    layout.current = width ? measure(width, aspect) : null
    draw()
  }, [draw, width, aspect, grain, wind, glReady, n, wraps])

  // If focus sat in a picture that just left the middle, keep it in the carousel.
  useEffect(() => {
    const el = stage.current
    const active = document.activeElement
    if (!el || !active || active === el || !el.contains(active)) return
    if (!cards.current[current]?.contains(active)) el.focus({ preventScroll: true })
  }, [current])

  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented || (e.target as HTMLElement).closest(TYPING)) return
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') engine.move(e.key === 'ArrowRight' ? 1 : -1)
    else if (e.key === 'Home') engine.go(0)
    else if (e.key === 'End') engine.go(n - 1)
    else return
    e.preventDefault()
  }

  if (!n) return null

  const atStart = !wraps && current === 0
  const atEnd = !wraps && current === n - 1
  const title = images[current]?.title
  const button =
    'grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-muted text-foreground [-webkit-tap-highlight-color:transparent] hover:bg-[color-mix(in_oklab,var(--foreground)_8%,var(--muted))] ' +
    'transition-[opacity,transform] duration-150 ease-out-quint active:scale-[0.96] aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:active:scale-100 motion-reduce:transition-none ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
  // The fallback fades its cards out towards the stage's edges, where the sand would be.
  const z = L ? Math.round((1 - L.z0) * 50) : 25
  const mask = `linear-gradient(to right, transparent, #000 ${z}%, #000 ${100 - z}%, transparent)`

  return (
    <div onKeyDown={keys} className={cn('w-full', className)} {...rest}>
      <div
        {...engine.bind}
        ref={(el) => {
          stage.current = el
          engine.bind.ref(el)
        }}
        id={id}
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        style={{ height: L?.height ?? 480 }}
        className={cn(
          'relative w-full touch-pan-y overflow-hidden rounded-[calc(var(--radius)*2+2px)] select-none [-webkit-tap-highlight-color:transparent]',
          'cursor-grab data-dragging:cursor-grabbing',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <div
          style={{ maskImage: mask, WebkitMaskImage: mask }}
          className={cn('absolute inset-0 transition-opacity duration-300 ease-out-quint motion-reduce:transition-none', glReady && 'opacity-0')}
        >
          {L &&
            images.map((im, i) => {
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
                  onClick={on ? undefined : () => engine.go(i)}
                  style={{ width: L.cw, height: L.ch, top: L.pad, marginLeft: -L.cw / 2 }}
                  className={cn(
                    'absolute left-1/2 overflow-hidden rounded-[calc(var(--radius)+2px)] bg-muted will-change-transform',
                    !on && 'invisible cursor-pointer',
                  )}
                >
                  <img
                    inert={!on}
                    src={im.src}
                    alt={im.alt}
                    draggable={false}
                    className="size-full object-cover [-webkit-user-drag:none]"
                  />
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent)]" />
                </div>
              )
            })}
        </div>
      </div>

      {n > 1 ? (
        <div className="mx-auto mt-3 flex max-w-sm items-center gap-3">
          {/* aria-disabled, not disabled: a button that has focus keeps it when it reaches the end. */}
          <button type="button" aria-label={t.previous} aria-controls={id} aria-disabled={atStart} onClick={() => atStart || engine.move(-1)} className={button}>
            <ChevronLeft className="size-[18px]" strokeWidth={2} aria-hidden />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="flex items-baseline justify-between gap-3 text-[11px] leading-none">
              <span aria-hidden className="truncate text-[13px] font-medium tracking-[-0.005em] text-foreground">
                {title ?? String(current + 1).padStart(2, '0')}
              </span>
              <span aria-hidden className="font-mono font-medium tracking-[0.04em] text-muted-foreground tabular-nums">
                {String(current + 1).padStart(2, '0')}/{String(n).padStart(2, '0')}
              </span>
            </p>
            {/* A hairline rule with a primary tick, one picture's share of it long, that follows the position. */}
            <div aria-hidden className="relative h-1 overflow-hidden rounded-full bg-muted">
              <span ref={tick} style={{ width: `${100 / n}%` }} className="absolute inset-y-0 left-0 block rounded-full bg-primary" />
            </div>
          </div>
          <button type="button" aria-label={t.next} aria-controls={id} aria-disabled={atEnd} onClick={() => atEnd || engine.move(1)} className={button}>
            <ChevronRight className="size-[18px]" strokeWidth={2} aria-hidden />
          </button>
        </div>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {`${t.picture} ${current + 1} ${t.of} ${n}`}
      </p>
    </div>
  )
}

