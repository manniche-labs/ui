import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState, type HTMLAttributes, type KeyboardEvent } from 'react'
import { useCarouselEngine } from '@/registry/manniche/hooks/use-carousel-engine'
import { glAtlas, glProgram, useGlStage, type GlAtlas, type GlImage, type GlScene, type GlSceneContext, type Rgb } from '@/registry/manniche/hooks/use-gl-stage'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

/*
 * A strip of pictures that slides behind a fixed lens of thick, clear glass. Through the lens the strip is magnified,
 * so the picture at rest fills it; near the rim a bevel bends the image inwards and splits it into faint colour
 * fringes, as real glass does. While the strip moves, its speed adds a little more dispersion and a slight sideways
 * smear inside the lens, and both settle back to clean glass as it comes to rest.
 *
 * One fragment shader draws the whole stage: each pixel maps to a point on the strip, and from there to the picture in
 * a texture atlas. Outside the lens that point is the pixel itself; inside it, the point is magnified about the lens's
 * centre and pushed along the bevel's slope, separately for red, green and blue. The engine drives the position, and
 * a frame is drawn only while something moves.
 *
 * Under reduced motion every move jumps and the lens shows one still, clean frame. Without WebGL, or when the GPU drops
 * the context, the pictures themselves are the carousel: the same strip in the DOM, with the picture in the middle
 * raised to the lens's size. They are always there for screen readers.
 */

/** A picture in the strip. `title` is shown under the lens. */
export type LensStripImage = GlImage & { title?: string }

export type LensStripProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  /** The pictures, in order. Pictures from another origin must send CORS headers, or they show as empty cards. */
  images: LensStripImage[]
  /** Read by screen readers, e.g. “Landscapes”. */
  label: string
  /** Controlled: the picture in the lens. */
  index?: number
  /** The picture in the lens at first, when uncontrolled. */
  defaultIndex?: number
  /** Called when the strip heads for a new picture: on release, a key, a button or a click. */
  onIndexChange?: (index: number) => void
  /** Wrap round from the last picture to the first. */
  loop?: boolean
  /** Picture width over height. The lens takes the same shape. */
  aspect?: number
  /** How much larger the strip looks through the lens. */
  magnify?: number
  /** How strongly the glass splits light into colour at its rim, from 0 (none) to 1. */
  dispersion?: number
  labels?: Partial<Record<'previous' | 'next' | 'picture' | 'of', string>>
}

const EN = { previous: 'Previous picture', next: 'Next picture', picture: 'Picture', of: 'of' }
const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
const COLORS = ['var(--background)', 'var(--foreground)']
const CANVAS = 'pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-300 ease-out-quint data-ready:opacity-100 motion-reduce:transition-none'
// Parts of the stage's width over which the strip fades out at each side.
const FADE = 0.16
// How far the bevel bends the view at the rim, as a part of its width, and how much of that the picture covers: the
// rest shows the picture's own edge curving away, which is what makes the glass read as thick.
const BEND = 1
const COVER = 0.45

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const mod = (v: number, n: number) => ((v % n) + n) % n
const pad = (v: number) => String(v).padStart(2, '0')

type Geometry = {
  width: number
  height: number
  /** A card in the strip, in CSS px. */
  cardW: number
  cardH: number
  cardR: number
  pitch: number
  /** The lens, in CSS px. */
  lensW: number
  lensH: number
  lensR: number
  bevel: number
  /** How far the view bends at the rim, in lens px. */
  bend: number
  /** Card to lens scale. */
  magnify: number
}

// Everything is sized from the lens: most of the stage's height, in the pictures' shape. The cards are the lens over
// `magnify`, plus most of the bevel's bend, so the picture at rest fills the lens almost to its rim.
function measure(width: number, aspect: number, magnify: number): Geometry {
  // 16:7 on wide screens; taller on narrow ones, so the lens keeps a useful size.
  const height = Math.round(Math.max((width * 7) / 16, Math.min(width * 0.72, 380)))
  let lensH = height * 0.76
  let lensW = lensH * aspect
  if (lensW > width * 0.5) {
    lensW = width * 0.5
    lensH = lensW / aspect
  }
  const short = Math.min(lensW, lensH)
  const bevel = short * 0.2
  const bend = bevel * BEND
  const cardW = (lensW + bend * COVER * 2) / magnify
  const cardH = cardW / aspect
  return {
    width,
    height,
    cardW,
    cardH,
    cardR: clamp(cardW * 0.07, 8, 14),
    pitch: cardW + Math.max(8, cardW * 0.075),
    lensW,
    lensH,
    lensR: Math.max(bevel, short * 0.11),
    bevel,
    bend,
    magnify,
  }
}

const VERTEX = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`

// All lengths are CSS px from the stage's centre, with y going down like the atlas.
const FRAGMENT = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTex;
uniform vec3 uView;  // half width, half height, device px per CSS px
uniform vec4 uLens;  // half width, half height, corner radius, bevel width
uniform vec4 uCard;  // half width, half height, corner radius, pitch
uniform vec4 uStrip; // position, count, loops (0 or 1), magnify
uniform vec4 uGlass; // bend at the rim, dispersion, sideways colour split, smear
uniform vec4 uCell;  // the first cell's corner and size in the atlas
uniform vec3 uGrid;  // step from cell to cell, columns
uniform vec3 uBody;  // the glass's own colour
uniform vec4 uShade; // shadow, rim line, dark inner edge, side fade

float box(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r;
}

// The strip at a point: the card there as premultiplied colour, or nothing in a gap. aa is a device pixel in strip px.
vec4 strip(vec2 s, float aa) {
  float u = s.x / uCard.w + uStrip.x;
  float i = floor(u + .5);
  vec2 l = vec2((u - i) * uCard.w, s.y);
  float a = clamp(.5 - box(l, uCard.xy, uCard.z) / aa, 0., 1.);
  float k = i;
  if (uStrip.z > .5) k = mod(i, uStrip.y);
  else a *= step(-.5, i) * step(i, uStrip.y - .5);
  k = floor(k + .5);
  float row = floor((k + .5) / uGrid.z);
  vec2 f = clamp(l / (2. * uCard.xy) + .5, 0., 1.);
  return texture2D(uTex, uCell.xy + vec2(k - row * uGrid.z, row) * uGrid.xy + f * uCell.zw) * a;
}

// The strip seen through the glass at a lens point, laid over the glass's own colour, smeared sideways while moving.
vec3 seen(vec2 c, float aa) {
  vec4 s = strip(c, aa);
  if (abs(uGlass.w) > .01) s = s * .5 + (strip(c - vec2(uGlass.w, 0.), aa) + strip(c + vec2(uGlass.w, 0.), aa)) * .25;
  return s.rgb + uBody * (1. - s.a);
}

void main() {
  float px = 1. / uView.z;
  vec2 p = vec2(gl_FragCoord.x * px - uView.x, uView.y - gl_FragCoord.y * px);
  float d = box(p, uLens.xy, uLens.z);

  // Outside the lens: the plain strip, fading out towards the sides, under the lens's soft shadow.
  vec4 o = vec4(0.);
  if (d > -px) {
    o = strip(p, px) * smoothstep(0., uShade.w, uView.x - abs(p.x));
    float sh = box(p - vec2(0., uLens.w * .3), uLens.xy, uLens.z);
    float shadow = uShade.x * (1. - smoothstep(-uLens.w * .4, uLens.w * 1.2, sh));
    o = o * (1. - shadow) + vec4(0., 0., 0., shadow);
    if (d > px) {
      gl_FragColor = o;
      return;
    }
  }

  // Inside: t runs from 0 at the rim to 1 where the flat top starts; the bevel's slope falls smoothly to nothing.
  float t = clamp(-d / uLens.w, 0., 1.);
  float slope = (1. - t) * (1. - t) * (1. - t);
  vec2 q = abs(p) - uLens.xy + uLens.z;
  vec2 n = sign(p) * normalize(max(q, 0.) + .001);
  // The slope bends the view outwards, so the image curves in at the rim; blue bends more than red.
  vec2 bend = n * uGlass.x * slope;
  float aa = px / uStrip.w;
  vec2 side = vec2(uGlass.z, 0.);
  vec3 c = vec3(
    seen((p + bend * (1. - uGlass.y) - side) / uStrip.w, aa).r,
    seen((p + bend) / uStrip.w, aa).g,
    seen((p + bend * (1. + uGlass.y) + side) / uStrip.w, aa).b
  );

  // Light from the top left: a fine bright line along that part of the rim, a soft dark edge inside the opposite one.
  vec2 light = vec2(-.48, -.88);
  float lit = max(dot(n, light), 0.);
  float away = max(dot(n, -light), 0.);
  float rim = -d;
  c *= 1. - uShade.z * away * slope;
  c = mix(c, vec3(1.), .1 * lit * slope);
  c *= 1. - uShade.y * (1. - smoothstep(0., 1.2, rim));
  float line = (1. - smoothstep(.55, 1.5, rim)) * smoothstep(.0, .35, rim + .2);
  c = mix(c, vec3(1.), line * (.12 + .7 * lit * lit));

  gl_FragColor = mix(o, vec4(c, 1.), clamp(.5 - d / px, 0., 1.));
}`

/**
 * A strip of pictures that slides behind a fixed glass lens. The lens magnifies the picture in it, bends the image
 * at its bevelled rim with faint colour fringes, and smears it a little while the strip moves. Drag or swipe with
 * momentum, use a trackpad, the arrow keys, the buttons, or click a picture to bring it into the lens. The picture's
 * title and a counter sit under the lens. Uses one WebGL context; without WebGL the strip is drawn in the DOM.
 */
export function LensStrip({
  images,
  label,
  index,
  defaultIndex,
  onIndexChange,
  loop = true,
  aspect = 4 / 5,
  magnify = 1.6,
  dispersion = 0.5,
  labels = {},
  className,
  onKeyDown,
  ...rest
}: LensStripProps) {
  const t = { ...EN, ...labels }
  const n = images.length
  const wraps = loop && n > 2
  const id = useId()
  const reduce = useReducedMotion()

  const stage = useRef<HTMLDivElement | null>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const title = useRef<HTMLSpanElement | null>(null)
  const [width, setWidth] = useState(0)
  const geo = useMemo(() => (width ? measure(width, aspect, Math.max(1, magnify)) : null), [width, aspect, magnify])

  // What the frame loop and the shader read, kept out of React so a frame never renders.
  const live = useRef({ geo, position: 0, velocity: 0, dispersion, wraps, n })
  useLayoutEffect(() => {
    Object.assign(live.current, { geo, dispersion, wraps, n })
  })
  // The picture nearest the lens, which the caption shows; it changes mid-drag, not only when the strip settles.
  const [near, setNear] = useState<number | null>(null)
  const nearRef = useRef<number | null>(null)

  const key = `${aspect}|${images.map((im) => im.src).join('\n')}`

  const build = (ctx: GlSceneContext): GlScene | null => buildScene(ctx, images, aspect, live.current)
  const gl = useGlStage(stage, build, key, { colors: COLORS, className: CANVAS })
  const { redraw } = gl
  const drawn = gl.status === 'ready'

  const paint = useCallback(
    (p: number, velocity: number) => {
      const s = live.current
      s.position = p
      s.velocity = velocity
      redraw()
      const g = s.geo
      if (!g) return
      // The DOM strip: the same cards in the same places, the one in the lens raised to the lens's size. It is the
      // picture when WebGL is missing, and what clicks land on when it is not.
      const raise = g.magnify
      const reach = g.width / 2 + g.pitch
      for (let i = 0; i < s.n; i++) {
        const el = cards.current[i]
        if (!el) continue
        let d = i - p
        if (s.wraps) d = mod(d + s.n / 2, s.n) - s.n / 2
        const x = d * g.pitch
        if (Math.abs(x) > reach) {
          el.style.visibility = 'hidden'
          continue
        }
        const k = Math.max(0, 1 - Math.abs(d))
        const lift = k * k * (3 - 2 * k)
        el.style.visibility = 'visible'
        el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0) scale(${(1 + (raise - 1) * lift).toFixed(4)})`
        el.style.zIndex = String(Math.round(lift * 100) + 1)
      }
      // Without wrapping, the strip can be pulled past an end; the caption stays on the end picture.
      const r = s.wraps ? mod(Math.round(p), Math.max(s.n, 1)) : clamp(Math.round(p), 0, Math.max(s.n - 1, 0))
      if (r !== nearRef.current) {
        nearRef.current = r
        setNear(r)
      }
    },
    [redraw],
  )

  const engine = useCarouselEngine({ count: n, loop: wraps, index, defaultIndex, onIndexChange, step: geo?.pitch ?? 200, onFrame: paint })
  const current = engine.index
  const shown = near ?? current

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
    draw()
  }, [draw, paint, geo, n, wraps, dispersion])

  // The caption's title eases in when it changes.
  const first = useRef(true)
  useLayoutEffect(() => {
    if (first.current || reduce) {
      first.current = false
      return
    }
    title.current?.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' })
  }, [shown, reduce])

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
  const caption = images[shown]?.title
  const button =
    'grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-muted text-foreground [-webkit-tap-highlight-color:transparent] hover:bg-[color-mix(in_oklab,var(--foreground)_8%,var(--muted))] ' +
    'transition-[opacity,transform] duration-150 ease-out-quint active:scale-[0.96] aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:active:scale-100 motion-reduce:transition-none ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={keys}
      className={cn('group/lens w-full outline-none', className)}
      {...rest}
    >
      <div
        {...engine.bind}
        ref={(el) => {
          stage.current = el
          engine.bind.ref(el)
        }}
        id={id}
        style={{ height: geo?.height ?? 320 }}
        className={cn(
          'relative w-full touch-pan-y overflow-x-clip rounded-[calc(var(--radius)*2+2px)] select-none [-webkit-tap-highlight-color:transparent]',
          n > 1 && 'cursor-grab data-dragging:cursor-grabbing',
          'group-focus-visible/lens:outline-2 group-focus-visible/lens:outline-offset-4 group-focus-visible/lens:outline-ring',
        )}
      >
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-300 ease-out-quint motion-reduce:transition-none',
            '[mask-image:linear-gradient(to_right,transparent,#000_16%,#000_84%,transparent)]',
            drawn && 'opacity-0',
          )}
        >
          {geo &&
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
                  style={{ width: geo.cardW, height: geo.cardH, marginLeft: -geo.cardW / 2, marginTop: -geo.cardH / 2, borderRadius: geo.cardR }}
                  className={cn(
                    'absolute top-1/2 left-1/2 overflow-hidden bg-muted will-change-transform',
                    'shadow-[0_1px_2px_rgb(0_0_0/0.06),0_14px_28px_-16px_rgb(0_0_0/0.4)]',
                    !on && 'invisible cursor-pointer',
                  )}
                >
                  <div inert={!on} className="absolute inset-0">
                    <img src={im.src} alt={im.alt} draggable={false} decoding="async" className="size-full object-cover [-webkit-user-drag:none]" />
                  </div>
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent)]" />
                </div>
              )
            })}
        </div>
      </div>

      <div className="mx-auto mt-3 flex w-full max-w-xs items-center justify-between gap-3">
        {n > 1 ? (
          // aria-disabled, not disabled: a button that has focus keeps it when it reaches the end.
          <button type="button" aria-label={t.previous} aria-controls={id} aria-disabled={atStart} onClick={() => atStart || engine.move(-1)} className={button}>
            <ChevronLeft className="size-[18px]" strokeWidth={2} aria-hidden />
          </button>
        ) : null}
        <p aria-hidden className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
          {caption ? (
            <span ref={title} className="max-w-full truncate text-[14px] leading-none font-medium tracking-[-0.01em] text-foreground">
              {caption}
            </span>
          ) : null}
          <span className="font-mono text-[11px] leading-none font-medium tracking-[0.04em] text-muted-foreground tabular-nums">
            {pad(shown + 1)} / {pad(n)}
          </span>
        </p>
        {n > 1 ? (
          <button type="button" aria-label={t.next} aria-controls={id} aria-disabled={atEnd} onClick={() => atEnd || engine.move(1)} className={button}>
            <ChevronRight className="size-[18px]" strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>
      <p aria-live="polite" className="sr-only">
        {`${images[current]?.title ? `${images[current].title}, ` : ''}${t.picture} ${current + 1} ${t.of} ${n}`}
      </p>
    </div>
  )
}

type Live = { geo: Geometry | null; position: number; velocity: number; dispersion: number; wraps: boolean; n: number }

function buildScene({ gl, ready, fail, signal }: GlSceneContext, images: GlImage[], aspect: number, live: Live): GlScene | null {
  const program = glProgram(gl, VERTEX, FRAGMENT)
  if (!program) return null
  gl.useProgram(program)
  // One triangle that covers the whole canvas.
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const at = gl.getAttribLocation(program, 'a')
  gl.enableVertexAttribArray(at)
  gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0)
  const u = (name: string) => gl.getUniformLocation(program, name)
  const uView = u('uView')
  const uLens = u('uLens')
  const uCard = u('uCard')
  const uStrip = u('uStrip')
  const uGlass = u('uGlass')
  const uCell = u('uCell')
  const uGrid = u('uGrid')
  const uBody = u('uBody')
  const uShade = u('uShade')
  gl.uniform1i(u('uTex'), 0)

  let atlas: GlAtlas | null = null
  let size = [1, 1, 1]
  let body: Rgb = [0.5, 0.5, 0.5]
  let dark = false

  glAtlas(gl, images, { aspect, signal }).then((a) => {
    if (signal.aborted) return
    if (!a) return fail()
    atlas = a
    // The grid of cells, read back from the corners glAtlas reports.
    const [u0, v0, u1, v1] = a.rects[0]
    const cols = Math.max(1, a.rects.filter((r) => r[1] === v0).length)
    const su = a.rects[1] && cols > 1 ? a.rects[1][0] - u0 : 1
    const sv = a.rects[cols] ? a.rects[cols][1] - v0 : 1
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, a.texture)
    gl.uniform4f(uCell, u0, v0, u1 - u0, v1 - v0)
    gl.uniform3f(uGrid, su, sv, cols)
    ready()
  })

  return {
    resize: (w, h, dpr) => {
      size = [w / dpr / 2, h / dpr / 2, dpr]
    },
    theme: ([bg, fg]) => {
      dark = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2] < 0.5
      // The glass's own colour: the background, a breath towards the foreground.
      body = [0, 1, 2].map((i) => bg[i] + (fg[i] - bg[i]) * 0.035) as Rgb
    },
    draw: () => {
      const g = live.geo
      if (!atlas || !g) return
      const n = Math.max(live.n, 1)
      const position = live.wraps ? mod(live.position, n) : live.position
      // The speed in CSS px per second, eased into 0–1: more colour and a slight smear while the strip moves.
      const speed = Math.abs(live.velocity) * g.pitch
      const motion = 1 - Math.exp(-speed / 1800)
      const disp = clamp(live.dispersion, 0, 1)
      gl.uniform3f(uView, size[0], size[1], size[2])
      gl.uniform4f(uLens, g.lensW / 2, g.lensH / 2, g.lensR, g.bevel)
      gl.uniform4f(uCard, g.cardW / 2, g.cardH / 2, g.cardR, g.pitch)
      gl.uniform4f(uStrip, position, n, live.wraps ? 1 : 0, g.magnify)
      gl.uniform4f(
        uGlass,
        g.bend,
        disp * 0.06 + motion * 0.2 * (0.4 + disp),
        Math.sign(live.velocity) * motion * 1.1 * (0.4 + disp),
        Math.sign(live.velocity) * motion * 3.2,
      )
      gl.uniform3f(uBody, body[0], body[1], body[2])
      gl.uniform4f(uShade, dark ? 0.3 : 0.07, dark ? 0.28 : 0.14, dark ? 0.32 : 0.2, g.width * FADE)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    dispose: () => {
      if (atlas) gl.deleteTexture(atlas.texture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    },
  }
}
