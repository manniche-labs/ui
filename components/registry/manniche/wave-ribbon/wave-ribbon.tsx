import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { useCarouselEngine } from '@/registry/manniche/hooks/use-carousel-engine'
import { glAtlas, glProgram, useGlStage, type GlAtlas, type GlImage, type GlSceneContext, type Rgb } from '@/registry/manniche/hooks/use-gl-stage'
import { cn } from '@/lib/utils'

export type WaveRibbonProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  /** The pictures, each with alt text. Pictures from another origin must send CORS headers to be drawn into WebGL. */
  images: GlImage[]
  /** Read by screen readers, e.g. “Landscapes”. */
  label: string
  /** Controlled: the picture at the front. */
  index?: number
  /** The picture at the front at first, when uncontrolled. */
  defaultIndex?: number
  /** Called when the ribbon heads for a new picture: on release, a key, a button or a click. */
  onIndexChange?: (index: number) => void
  /** Wrap round from the last picture to the first. Needs three pictures or more. */
  loop?: boolean
  /** Picture width over height. */
  aspect?: number
  /** How deep the wave runs; 0 lays the pictures out in a flat row. */
  amplitude?: number
  /** How much the pictures away from the front fade into the page, 0–1. */
  fog?: number
  /** A very slow drift in the wave while the ribbon is at rest. Off under reduced motion and off screen. */
  animate?: boolean
  /** Show the previous and next buttons and the position rule. */
  controls?: boolean
  /** The words on the buttons and for screen readers, to translate them, e.g. `{ picture: 'Bild', of: 'von' }`. */
  labels?: Partial<Record<'previous' | 'next' | 'picture' | 'of', string>>
}

const EN = { previous: 'Previous picture', next: 'Next picture', picture: 'Picture', of: 'of' }
const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

// The scene, in world units of one picture width.
const GAP = 0.09 // between pictures, along the ribbon
const FOV = (24 * Math.PI) / 180 // vertical field of view: long, so the wave reads calm rather than wide-angle
const DEPTH = 0.42 // how far the wave dips back, at amplitude 1
const LIFT = 0.06 // how far it dips down as it goes back
const WAVE = 3.9 // one wavelength, crest to crest
const RECEDE = 0.28 // how far the ribbon falls back towards its ends, per RECEDE_LEN of length
const RECEDE_LEN = 1.6
const RADIUS = 6 // px, the corner radius of the picture at the front
const SEG = 28 // columns per picture, so it bends smoothly
const PAD = 0.03 // world units of quad around each picture, room for its smoothed edge
const FOG_START = 1 // distance along the ribbon where the fog begins
const FOG_DEPTH = 0.35 // how fast the fog thickens with depth
const FLUTTER = 0.3 // how much deeper the wave runs at full speed

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/** The wave: depth `a` with wavenumber `k`, a dip of `h` with wavenumber `ky`, a drifting phase `ph`, and a fall
 *  back of `r` per `rl` towards the ends. */
type Wave = { a: number; k: number; h: number; ky: number; ph: number; r: number; rl: number }

// The ribbon's centre line, as height and depth over x. The crest sits at x = 0, facing the camera.
const waveY = (w: Wave, x: number) => w.h * (Math.cos(w.ky * x + w.ph) - Math.cos(w.ph))
const waveZ = (w: Wave, x: number) => w.a * (Math.cos(w.k * x) - 1) - w.r * (Math.hypot(1, x / w.rl) - 1)
const slopeY = (w: Wave, x: number) => -w.h * w.ky * Math.sin(w.ky * x + w.ph)
const slopeZ = (w: Wave, x: number) => -w.a * w.k * Math.sin(w.k * x) - (w.r * x) / (w.rl * w.rl * Math.hypot(1, x / w.rl))
// How far x moves per unit of distance along the ribbon.
const dxds = (w: Wave, x: number) => 1 / Math.sqrt(1 + slopeY(w, x) ** 2 + slopeZ(w, x) ** 2)
// Walk `s` along the ribbon from x, in midpoint steps. The vertex shader takes the same steps across a picture.
function walk(w: Wave, x: number, s: number, steps: number) {
  const h = s / steps
  for (let i = 0; i < steps; i++) x += h * dxds(w, x + 0.5 * h * dxds(w, x))
  return x
}
const arcToX = (w: Wave, s: number) => walk(w, 0, s, Math.max(1, Math.ceil(Math.abs(s) / 0.2)))

/** The camera and sizes for a stage, in world units of one picture width. */
type Rig = {
  width: number
  height: number
  half: [number, number]
  spacing: number
  fx: number
  fy: number
  shift: number
  dist: number
  camY: number
  /** Pixels per world unit at the front. */
  ppu: number
  radius: number
  /** Distance along the ribbon where a picture's outer edge reaches the side of the frame. */
  end: number
  /** Pixels at each side of the frame over which the ribbon dissolves into the page. */
  band: number
  wave: Wave
}

function rigFor(width: number, height: number, aspect: number, amplitude: number, n: number, loop: boolean): Rig {
  const half: [number, number] = [0.5, 0.5 / aspect]
  const ratio = width / height
  const f = 1 / Math.tan(FOV / 2)
  // The front picture takes a set share of the height, and at most under a third of the width.
  const share = 0.72
  const dist = Math.max((half[1] * f) / share, (half[0] * f) / (ratio * 0.3))
  const camY = half[1] * 0.42
  const k = (2 * Math.PI) / WAVE
  const wave: Wave = { a: DEPTH * amplitude, k, h: LIFT * amplitude, ky: k * 0.5, ph: 0, r: RECEDE * amplitude, rl: RECEDE_LEN }
  const rig: Rig = {
    width,
    height,
    half,
    spacing: 1 + GAP,
    fx: f / ratio,
    fy: f,
    shift: (f * camY) / dist,
    dist,
    camY,
    ppu: (height / 2) * (f / dist),
    radius: 0,
    end: 0,
    band: clamp(width * 0.13, 48, 200),
    wave,
  }
  rig.radius = Math.min(RADIUS / rig.ppu, 0.08)
  // Walk out along the ribbon until a picture's outer edge reaches the side of the frame.
  let s = 0.5
  while (s < 9) {
    const x = arcToX(wave, s + 0.5)
    const [px] = project(rig, x, waveY(wave, x), waveZ(wave, x))
    if (px > width) break
    s += 0.05
  }
  rig.end = loop ? Math.min(s, (n / 2) * rig.spacing - 0.4) : s
  return rig
}

// A world point to stage pixels, and its distance from the camera.
function project(r: Rig, x: number, y: number, z: number): [number, number, number] {
  const w = r.dist - z
  const nx = (r.fx * x) / w
  const ny = (r.fy * (y - r.camY)) / w + r.shift
  return [((nx + 1) / 2) * r.width, ((1 - ny) / 2) * r.height, w]
}

// How much a point at distance `s` along the ribbon and depth `z` mixes into the page.
function fogAt(r: Rig, fog: number, s: number, z: number) {
  const fs = smooth(FOG_START, r.end + 0.5, Math.abs(s))
  const fz = 1 - Math.exp(z * FOG_DEPTH)
  return fog * (1 - (1 - fs) * (1 - fz))
}

// How visible the ribbon is at a horizontal point on the stage: it dissolves into the page at both sides.
const edgeAt = (r: Rig, px: number) => smooth(0, r.band, Math.min(px, r.width - px))

type Card = { i: number; s: number; x: number; w: number; alpha: number }

// The pictures in view for a position, farthest first.
function lay(r: Rig, wave: Wave, p: number, n: number, loop: boolean): Card[] {
  const out: Card[] = []
  for (let i = 0; i < n; i++) {
    let d = i - p
    if (loop) d = ((((d + n / 2) % n) + n) % n) - n / 2
    const s = d * r.spacing
    if (Math.abs(s) > r.end + 1.05) continue
    // Near the seam of a loop a picture is about to jump to the other end, so it is gone first.
    const seam = loop ? clamp((n / 2 - Math.abs(d)) / 0.75, 0, 1) : 1
    if (seam <= 0) continue
    const x = arcToX(wave, s)
    out.push({ i, s, x, w: r.dist - waveZ(wave, x), alpha: seam })
  }
  return out.sort((a, b) => b.w - a.w)
}

const VERTEX = `
attribute vec2 aP;
uniform vec2 uHalf;
uniform float uPad;
uniform float uXc;
uniform float uSc;
uniform vec4 uWave;
uniform float uPh;
uniform vec2 uRec;
uniform vec4 uCam;
uniform vec3 uCam2;
uniform float uViewH;
varying vec2 vLocal;
varying float vS;
varying float vZ;
varying vec3 vN;
varying float vAA;
vec2 slope(float x){float e=sqrt(1.+x*x/(uRec.y*uRec.y));return vec2(-uWave.z*uWave.w*sin(uWave.w*x+uPh),-uWave.x*uWave.y*sin(uWave.y*x)-uRec.x*x/(uRec.y*uRec.y*e));}
float dxds(float x){vec2 d=slope(x);return inversesqrt(1.+dot(d,d));}
void main(){
  vec2 p=aP*(uHalf+uPad);
  // Walk from the picture's centre along the ribbon, the same midpoint steps as on the CPU.
  float h=p.x*.5;
  float x=uXc;
  x+=h*dxds(x+.5*h*dxds(x));
  x+=h*dxds(x+.5*h*dxds(x));
  vec2 d=slope(x);
  float y=uWave.z*(cos(uWave.w*x+uPh)-cos(uPh))+p.y;
  float z=uWave.x*(cos(uWave.y*x)-1.)-uRec.x*(sqrt(1.+x*x/(uRec.y*uRec.y))-1.);
  vN=normalize(vec3(-d.y,0.,1.));
  vLocal=p;
  vS=uSc+p.x;
  vZ=z;
  vec3 v=vec3(x,y-uCam2.x,z-uCam.w);
  float w=-v.z;
  float n=uCam2.y;
  float f=uCam2.z;
  gl_Position=vec4(uCam.x*v.x,uCam.y*v.y+uCam.z*w,(f+n)/(f-n)*w-2.*f*n/(f-n),w);
  // World units per device pixel here, for the edge when derivatives are missing.
  vAA=w/(uCam.y*uViewH*.5);
}`

const FRAGMENT = `
precision mediump float;
uniform sampler2D uTex;
uniform vec4 uRect;
uniform vec2 uBox;
uniform float uRadius;
uniform float uHair;
uniform vec3 uBg;
uniform vec3 uFg;
uniform vec4 uFog;
uniform vec2 uEdge;
uniform float uAlpha;
uniform vec3 uLight;
varying vec2 vLocal;
varying float vS;
varying float vZ;
varying vec3 vN;
varying float vAA;
void main(){
  vec2 q=abs(vLocal)-uBox+uRadius;
  float d=length(max(q,0.))+min(max(q.x,q.y),0.)-uRadius;
#ifdef DERIV
  float aa=max(fwidth(d),1e-4);
#else
  float aa=vAA;
#endif
  float a=clamp(.5-d/aa,0.,1.)*uAlpha;
  // The ribbon dissolves into the page at both sides of the frame.
  a*=smoothstep(0.,uEdge.y,min(gl_FragCoord.x,uEdge.x-gl_FragCoord.x));
  if(a<.002)discard;
  vec2 uv=clamp(vLocal/(2.*uBox)+.5,0.,1.);
  vec3 c=texture2D(uTex,mix(uRect.xy,uRect.zw,vec2(uv.x,1.-uv.y))).rgb;
  // Lit softly from the upper left and front, so the bend reads.
  float lam=max(dot(normalize(vN),uLight),0.);
  c*=mix(.84,1.02,lam);
  // A hairline just inside the edge.
  float line=clamp((d+aa*uHair)/aa+.5,0.,1.);
  c=mix(c,uFg,line*.13);
  float fs=smoothstep(uFog.x,uFog.y,abs(vS));
  float fz=1.-exp(vZ*uFog.z);
  c=mix(c,uBg,uFog.w*(1.-(1.-fs)*(1.-fz)));
  gl_FragColor=vec4(c*a,a);
}`

/**
 * A gallery on a long ribbon in 3D. The ribbon runs from left to right and undulates gently in depth: the picture
 * at the front faces you on the crest, and its neighbours bend along the wave as it falls away, fading into the page
 * at both ends. Dragging travels along the ribbon: the pictures slide along the curve while the wave stays where it
 * is, and speed briefly deepens it, so the ribbon flutters and then settles. Drag or swipe with momentum, use a
 * trackpad, the arrow keys, the buttons, or click a picture to bring it to the front. The pictures are drawn with
 * WebGL as finely divided quads that the vertex shader bends onto the ribbon. Under reduced motion every move jumps
 * and the ribbon holds still. Without WebGL, or if the GPU drops the context, the same pictures stand flat on the
 * same wave in CSS 3D.
 */
export function WaveRibbon({
  images,
  label,
  index,
  defaultIndex,
  onIndexChange,
  loop = false,
  aspect = 4 / 5,
  amplitude = 1,
  fog = 0.6,
  animate = false,
  controls = true,
  labels = {},
  className,
  onKeyDown,
  ...rest
}: WaveRibbonProps) {
  const t = { ...EN, ...labels }
  const n = images.length
  const wraps = loop && n > 2
  const id = useId()

  const stage = useRef<HTMLDivElement | null>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const ticks = useRef<(HTMLSpanElement | null)[]>([])
  const [width, setWidth] = useState(0)
  const height = width ? Math.round(clamp(width * 0.3, 300, 480)) : 0
  const rig = width ? rigFor(width, height, aspect, amplitude, n, wraps) : null

  // What the frame loop and the scene read, so neither needs React to render.
  const live = useRef({ rig, n, wraps, fog, pos: 0, vel: 0, wave: rig?.wave ?? null, ready: false })
  useLayoutEffect(() => {
    Object.assign(live.current, { rig, n, wraps, fog })
  })
  const source = useRef({ images, aspect })
  useLayoutEffect(() => {
    source.current = { images, aspect }
  })

  const build = useCallback(({ gl, ready, redraw, fail, colors: initial, signal }: GlSceneContext) => {
    const deriv = !!gl.getExtension('OES_standard_derivatives')
    const prog = glProgram(gl, VERTEX, (deriv ? '#extension GL_OES_standard_derivatives : enable\n#define DERIV\n' : '') + FRAGMENT)
    if (!prog) return null
    const u = (name: string) => gl.getUniformLocation(prog, name)
    const U = {
      half: u('uHalf'),
      box: u('uBox'),
      pad: u('uPad'),
      xc: u('uXc'),
      sc: u('uSc'),
      wave: u('uWave'),
      ph: u('uPh'),
      rec: u('uRec'),
      cam: u('uCam'),
      cam2: u('uCam2'),
      viewH: u('uViewH'),
      tex: u('uTex'),
      rect: u('uRect'),
      radius: u('uRadius'),
      hair: u('uHair'),
      bg: u('uBg'),
      fg: u('uFg'),
      fog: u('uFog'),
      edge: u('uEdge'),
      alpha: u('uAlpha'),
      light: u('uLight'),
    }
    // One strip of columns from the left edge to the right, two rows: the ribbon only bends sideways.
    const verts = new Float32Array((SEG + 1) * 4)
    for (let i = 0; i <= SEG; i++) verts.set([-1 + (2 * i) / SEG, 1, -1 + (2 * i) / SEG, -1], i * 4)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
    const aP = gl.getAttribLocation(prog, 'aP')

    let atlas: GlAtlas | null = null
    let colors: Rgb[] = initial
    let viewH = 1
    let dpr = 1
    // The flutter: how much deeper the wave runs now, eased towards the speed without overshoot.
    let flutter = 0
    let last = 0
    let settle = 0
    const L = Math.hypot(-0.5, 0.32, 1)

    const { images: pics, aspect: ratio } = source.current
    glAtlas(gl, pics, { aspect: ratio, cell: 768, empty: colors[2], signal }).then((a) => {
      if (signal.aborted) return
      if (!a) return fail()
      atlas = a
      ready()
    })

    const draw = (time: number) => {
      const st = live.current
      const r = st.rig
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      if (!r || !atlas) return

      const now = performance.now()
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016
      last = now
      const want = FLUTTER * Math.tanh(Math.abs(st.vel) / 7)
      // Quick to deepen, slow to relax: a first-order ease, so it never swings past.
      flutter += (want - flutter) * (1 - Math.exp(-dt / (want > flutter ? 0.09 : 0.42)))
      if (flutter < 0.0008 && !want) flutter = 0
      cancelAnimationFrame(settle)
      if (flutter > 0 && !want) settle = requestAnimationFrame(() => redraw())

      // At rest the phase is 0; with the ambient drift it sways slowly round it.
      const ph = 0.55 * Math.sin((time - 4) * 0.13)
      const wave: Wave = { ...r.wave, a: r.wave.a * (1 + flutter), h: r.wave.h * (1 + flutter * 0.6), ph }
      st.wave = wave
      const list = lay(r, wave, st.pos, st.n, st.wraps)

      gl.useProgram(prog)
      gl.enable(gl.DEPTH_TEST)
      gl.depthFunc(gl.LEQUAL)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.enableVertexAttribArray(aP)
      gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, atlas.texture)
      gl.uniform1i(U.tex, 0)
      gl.uniform2f(U.half, r.half[0], r.half[1])
      gl.uniform2f(U.box, r.half[0], r.half[1])
      gl.uniform1f(U.pad, PAD)
      gl.uniform4f(U.wave, wave.a, wave.k, wave.h, wave.ky)
      gl.uniform1f(U.ph, wave.ph)
      gl.uniform2f(U.rec, wave.r, wave.rl)
      gl.uniform4f(U.cam, r.fx, r.fy, r.shift, r.dist)
      gl.uniform3f(U.cam2, r.camY, 0.3, r.dist + 12)
      gl.uniform1f(U.viewH, viewH)
      gl.uniform1f(U.radius, r.radius)
      gl.uniform1f(U.hair, dpr)
      gl.uniform3f(U.bg, ...colors[0])
      gl.uniform3f(U.fg, ...colors[1])
      gl.uniform4f(U.fog, FOG_START, r.end + 0.5, FOG_DEPTH, st.fog)
      gl.uniform2f(U.edge, gl.drawingBufferWidth, r.band * dpr)
      gl.uniform3f(U.light, -0.5 / L, 0.32 / L, 1 / L)
      for (const c of list) {
        const rect = atlas.rects[c.i]
        if (!rect) continue
        gl.uniform1f(U.xc, c.x)
        gl.uniform1f(U.sc, c.s)
        gl.uniform4f(U.rect, rect[0], rect[1], rect[2], rect[3])
        gl.uniform1f(U.alpha, c.alpha)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, (SEG + 1) * 2)
      }
    }

    return {
      draw,
      resize: (_w: number, h: number, ratio: number) => {
        viewH = h
        dpr = ratio
      },
      theme: (c: Rgb[]) => {
        colors = c
      },
      dispose: () => {
        cancelAnimationFrame(settle)
        gl.deleteBuffer(buf)
        gl.deleteProgram(prog)
        if (atlas) gl.deleteTexture(atlas.texture)
      },
    }
  }, [])

  const key = `${images.map((im) => im.src).join('\n')}|${aspect}`
  const gl = useGlStage(stage, build, key, {
    animate,
    maxDpr: 2,
    colors: ['var(--background)', 'var(--foreground)', 'var(--muted)'],
    className: 'pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-300 ease-out-quint data-ready:opacity-100',
  })
  const ready = gl.status === 'ready'

  // The flat cards in CSS 3D, for when WebGL is not drawing: the same wave, the same camera.
  const paint = useCallback(() => {
    const st = live.current
    const r = st.rig
    if (!r || st.ready) return
    const p = st.pos
    const shown = new Set<number>()
    for (const c of lay(r, r.wave, p, st.n, st.wraps)) {
      const el = cards.current[c.i]
      if (!el) continue
      shown.add(c.i)
      const z = waveZ(r.wave, c.x)
      const mix = fogAt(r, st.fog, c.s, z)
      const turn = Math.atan(-slopeZ(r.wave, c.x))
      el.style.visibility = 'visible'
      el.style.transform =
        `translate3d(${(c.x * r.ppu).toFixed(2)}px, ${(-waveY(r.wave, c.x) * r.ppu).toFixed(2)}px, ${(z * r.ppu).toFixed(2)}px)` +
        ` rotateY(${turn.toFixed(4)}rad)`
      el.style.opacity = c.alpha.toFixed(3)
      el.style.zIndex = String(1000 - Math.round(c.w * 50))
      const veil = el.lastElementChild as HTMLElement
      veil.style.opacity = mix.toFixed(3)
    }
    cards.current.forEach((el, i) => {
      if (el && !shown.has(i)) el.style.visibility = 'hidden'
    })
  }, [])

  const rule = useCallback((p: number) => {
    const { n: count, wraps: w } = live.current
    const at = w ? (((p % count) + count) % count) / count : (Math.min(Math.max(p, 0), count - 1) / Math.max(count - 1, 1)) * (1 - 1 / count)
    ticks.current.forEach((el, k) => {
      if (el) el.style.transform = `translateX(${((at - k) * 100).toFixed(3)}cqw)`
    })
  }, [])

  const { redraw } = gl
  const onFrame = useCallback(
    (p: number, v: number) => {
      live.current.pos = p
      live.current.vel = v
      redraw()
      paint()
      rule(p)
    },
    [redraw, paint, rule],
  )

  const engine = useCarouselEngine({
    count: n,
    loop: wraps,
    index,
    defaultIndex,
    onIndexChange,
    step: rig ? rig.spacing * rig.ppu : 300,
    onFrame,
  })
  const current = engine.index

  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // A new size, shape or set of pictures, or WebGL taking over or dropping out: draw the current frame again.
  const { draw } = engine
  useLayoutEffect(() => {
    live.current.ready = ready
    draw()
  }, [draw, ready, width, aspect, amplitude, fog, n, wraps])

  // The picture under a point on the stage, from the same maths the shader runs; the nearest wins.
  const hit = (e: MouseEvent<HTMLElement> | PointerEvent<HTMLElement>) => {
    const st = live.current
    const r = st.rig
    const wave = st.wave ?? r?.wave
    const el = stage.current
    if (!r || !wave || !el) return null
    const box = el.getBoundingClientRect()
    const px = e.clientX - box.left
    const py = e.clientY - box.top
    let best: number | null = null
    for (const c of lay(r, wave, st.pos, st.n, st.wraps)) {
      if (c.alpha * edgeAt(r, project(r, c.x, waveY(wave, c.x), waveZ(wave, c.x))[0]) < 0.3) continue
      const outline: [number, number][] = []
      for (const side of [1, -1]) {
        for (let j = 0; j <= 8; j++) {
          const ds = (side > 0 ? -0.5 + j / 8 : 0.5 - j / 8) * 2 * r.half[0]
          const x = walk(wave, c.x, ds, 2)
          const [sx, sy] = project(r, x, waveY(wave, x) + side * r.half[1], waveZ(wave, x))
          outline.push([sx, sy])
        }
      }
      let inside = false
      for (let a = 0, b = outline.length - 1; a < outline.length; b = a++) {
        const [xa, ya] = outline[a]
        const [xb, yb] = outline[b]
        if (ya > py !== yb > py && px < ((xb - xa) * (py - ya)) / (yb - ya) + xa) inside = !inside
      }
      // Drawn farthest first, so the last hit is the one in front.
      if (inside) best = c.i
    }
    return best
  }

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!ready || e.defaultPrevented) return
    const i = hit(e)
    if (i !== null && i !== current) engine.go(i)
  }

  // A pointer over a picture away from the front shows that it can be clicked.
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    engine.bind.onPointerMove(e)
    const el = e.currentTarget
    if (!ready || e.pointerType !== 'mouse' || 'dragging' in el.dataset) {
      el.style.cursor = ''
      return
    }
    const i = hit(e)
    el.style.cursor = i !== null && i !== current ? 'pointer' : ''
  }

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
  const button =
    'grid size-11 shrink-0 cursor-pointer place-items-center rounded-[4px] bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)] [-webkit-tap-highlight-color:transparent] hover:bg-muted ' +
    'transition-[opacity,transform] duration-150 ease-out-quint active:scale-[0.96] aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:active:scale-100 motion-reduce:transition-none ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

  return (
    <div onKeyDown={keys} className={cn('w-full', className)} {...rest}>
      <div
        {...engine.bind}
        ref={(el) => {
          stage.current = el
          engine.bind.ref(el)
        }}
        onPointerMove={onPointerMove}
        onClick={onClick}
        id={id}
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        style={{ height: height || 300 }}
        className={cn(
          'relative isolate w-full touch-pan-y overflow-hidden rounded-[4px] select-none [-webkit-tap-highlight-color:transparent]',
          'cursor-grab data-dragging:cursor-grabbing',
          'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
        )}
      >
        {/* The pictures for screen readers, and the picture itself until WebGL draws or when it cannot. */}
        <div
          style={
            rig
              ? {
                  perspective: rig.dist * rig.ppu,
                  perspectiveOrigin: `50% ${(((1 - rig.shift) / 2) * 100).toFixed(2)}%`,
                  maskImage: `linear-gradient(to right, transparent, #000 ${rig.band}px, #000 calc(100% - ${rig.band}px), transparent)`,
                }
              : undefined
          }
          className={cn(
            'absolute inset-0 transition-opacity duration-300 ease-out-quint motion-reduce:transition-none',
            ready && 'pointer-events-none opacity-0',
          )}
        >
          {rig &&
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
                  onClick={on || ready ? undefined : () => engine.go(i)}
                  style={{
                    width: rig.half[0] * 2 * rig.ppu,
                    height: rig.half[1] * 2 * rig.ppu,
                    marginLeft: -rig.half[0] * rig.ppu,
                    marginTop: -rig.half[1] * rig.ppu,
                  }}
                  className={cn('absolute top-1/2 left-1/2 overflow-hidden rounded-[6px] bg-muted', !on && 'invisible cursor-pointer')}
                >
                  <img
                    inert={!on}
                    src={im.src}
                    alt={im.alt}
                    draggable={false}
                    decoding="async"
                    className="size-full object-cover [-webkit-user-drag:none]"
                  />
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_13%,transparent)]" />
                  <span aria-hidden className="pointer-events-none absolute inset-0 bg-background opacity-0" />
                </div>
              )
            })}
        </div>
      </div>

      {controls && n > 1 ? (
        <div className="mx-auto mt-4 flex max-w-sm items-center gap-3">
          {/* aria-disabled, not disabled: a button that has focus keeps it when it reaches the end. */}
          <button type="button" aria-label={t.previous} aria-controls={id} aria-disabled={atStart} onClick={() => atStart || engine.move(-1)} className={button}>
            <ChevronLeft className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {/* A hairline rule with a primary tick, one picture's share of it long, that follows the position. In a
                loop a second tick trails one rule-length behind, so the tick slides off one end and on at the other. */}
            <div aria-hidden className="@container relative h-[3px] overflow-hidden before:absolute before:inset-x-0 before:top-px before:h-px before:bg-border">
              {(wraps ? [0, 1] : [0]).map((k) => (
                <span
                  key={k}
                  ref={(el) => {
                    ticks.current[k] = el
                  }}
                  style={{ width: `${100 / n}%` }}
                  className="absolute inset-y-0 left-0 block bg-primary"
                />
              ))}
            </div>
            <p className="flex justify-between font-mono text-[11px] leading-none font-medium tracking-[0.04em] text-muted-foreground tabular-nums">
              <span aria-hidden>{String(current + 1).padStart(2, '0')}</span>
              <span aria-hidden>{String(n).padStart(2, '0')}</span>
            </p>
          </div>
          <button type="button" aria-label={t.next} aria-controls={id} aria-disabled={atEnd} onClick={() => atEnd || engine.move(1)} className={button}>
            <ChevronRight className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {`${t.picture} ${current + 1} ${t.of} ${n}`}
      </p>
    </div>
  )
}
