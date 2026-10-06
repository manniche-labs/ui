// The "cells" family's border distance is based on Inigo Quilez's "Voronoi - distances" (MIT, © 2013 Inigo Quilez,
// https://www.shadertoy.com/view/ldl3W8). See THIRD_PARTY_NOTICES.md.
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type ShaderVariant = 'mesh' | 'swirl' | 'halftone' | 'metal' | 'aurora' | 'flame' | 'cells'

type Preset = { variant: ShaderVariant; colors: string[]; grain?: number }

/**
 * Ready-made looks, named family-first. What the five colours mean depends on the family:
 * - mesh: five colours that drift and blend; the first one usually covers the most
 * - swirl, metal, flame: a ramp from the first colour to the last
 * - halftone: paper, first ink, second ink (white on light paper or black on dark paper for none), paper tint
 * - aurora: night sky, three curtains, glow at the horizon
 * - cells: the gaps, then four cell colours
 */
export const SHADER_PRESETS = {
  'mesh-lilac': { variant: 'mesh', colors: ['#f4effa', '#c9b6f2', '#f2b5d4', '#9d8df1', '#fbe3f0'] },
  'mesh-ink': { variant: 'mesh', colors: ['#09090c', '#2b2b38', '#1b1f2e', '#3d3448', '#14141b'] },
  'mesh-spearmint': { variant: 'mesh', colors: ['#effaf5', '#b4ecd6', '#86d9bc', '#d6f5e8', '#a3e4dd'] },
  'mesh-golden-hour': { variant: 'mesh', colors: ['#fff1e6', '#ffb085', '#ff7f6e', '#ffd49c', '#f6a3c5'] },
  'mesh-sherbet': { variant: 'mesh', colors: ['#fff4f0', '#ffc0d0', '#ffd6a5', '#c4efd9', '#fbb0bd'] },
  'mesh-olive': { variant: 'mesh', colors: ['#eef0e6', '#b8c4a2', '#8ea181', '#dde4cd', '#a7b799'] },
  'mesh-terracotta': { variant: 'mesh', colors: ['#f6ebe3', '#d4784f', '#b5552f', '#e9b08f', '#8c3b22'] },
  'mesh-damson': { variant: 'mesh', colors: ['#1c0e23', '#5b2a6e', '#8e3f86', '#3c1b4f', '#bf5f99'] },
  'mesh-deep-sea': { variant: 'mesh', colors: ['#03192c', '#0b4f7a', '#1489a8', '#0a2f55', '#35bfc8'] },
  'mesh-electric': { variant: 'mesh', colors: ['#0a0614', '#e02bc4', '#2fd8e8', '#6a2bf0', '#16d685'] },
  'mesh-espresso': { variant: 'mesh', colors: ['#f3ece5', '#b58b6d', '#7a5640', '#dcc3ab', '#9c7258'] },
  'mesh-green-tea': { variant: 'mesh', colors: ['#eef3e2', '#a9c47f', '#c8dba6', '#7fa35b', '#e2ebcf'] },
  'mesh-lavender': { variant: 'mesh', colors: ['#f1eefc', '#b8a6f5', '#d6ccfb', '#9a89e8', '#e7e1fd'] },
  'mesh-indigo': { variant: 'mesh', colors: ['#0e1033', '#3b3fb6', '#5a5fe0', '#1f2270', '#8a7ff0'] },
  'mesh-lemon-lime': { variant: 'mesh', colors: ['#fbfde8', '#e6f46a', '#b2e26a', '#fff3a3', '#7fd07a'] },
  'mesh-bubblegum': { variant: 'mesh', colors: ['#fff0f7', '#ff9fd0', '#a0d6ff', '#ffd0ef', '#c4b2ff'] },
  'mesh-blush': { variant: 'mesh', colors: ['#fdf0ee', '#f6c0bf', '#f2a2a7', '#fad8ce', '#e6b3c7'] },
  'mesh-glacier': { variant: 'mesh', colors: ['#f2f8fc', '#bce1f4', '#d6edf8', '#9bcde8', '#e1f0f9'] },
  'mesh-lava': { variant: 'mesh', colors: ['#120404', '#f2461b', '#b0170a', '#ff8a2b', '#5a0a06'] },
  'mesh-jade': { variant: 'mesh', colors: ['#04211a', '#0f6b52', '#18a07a', '#0a4636', '#5ed2a5'] },
  'mesh-twilight': { variant: 'mesh', colors: ['#1a1530', '#6b4c9a', '#df869a', '#2e2752', '#f1b28a'] },
  'mesh-cobalt': { variant: 'mesh', colors: ['#04102e', '#1846d6', '#2f7bff', '#0b2a8a', '#7fb2ff'] },
  'mesh-smoke': { variant: 'mesh', colors: ['#e9e9ea', '#c2c3c6', '#9ea0a5', '#dadbdd', '#b3b5b9'] },
  'mesh-prism': { variant: 'mesh', colors: ['#f6f4ff', '#ffd5e6', '#c7e6ff', '#d7f6d4', '#fff0bf'] },
  'mesh-embers': { variant: 'mesh', colors: ['#1a0b06', '#c2410c', '#f97316', '#7c2d12', '#f5b324'] },

  'swirl-tide': { variant: 'swirl', colors: ['#062a43', '#0f5f86', '#2aa3c2', '#8fdde6', '#eefbfc'] },
  'swirl-rose': { variant: 'swirl', colors: ['#4a0f24', '#9b2f52', '#e0708f', '#f6b9c8', '#fff0f3'] },
  'swirl-mono': { variant: 'swirl', colors: ['#0d0d0d', '#3a3a3a', '#7a7a7a', '#c4c4c4', '#f5f5f5'] },
  'swirl-citrus': { variant: 'swirl', colors: ['#3d2a00', '#e07b00', '#ffb000', '#ffe066', '#fffbe0'] },
  'swirl-spectrum': { variant: 'swirl', colors: ['#2b1055', '#7597de', '#f7b2d9', '#ffe29a', '#fff8ef'] },

  'halftone-tide': { variant: 'halftone', colors: ['#f3f7f8', '#0f5f86', '#ffffff', '#d4eaf1', '#f3f7f8'], grain: 0.2 },
  'halftone-sun': { variant: 'halftone', colors: ['#fff6e0', '#e5532d', '#ffffff', '#ffd98a', '#fff6e0'], grain: 0.2 },
  'halftone-mono': { variant: 'halftone', colors: ['#111111', '#e9e9e9', '#000000', '#262626', '#111111'], grain: 0.2 },
  'halftone-moss': { variant: 'halftone', colors: ['#eef0e4', '#2f4a2a', '#ffffff', '#cdd9b8', '#eef0e4'], grain: 0.2 },
  'halftone-press': { variant: 'halftone', colors: ['#fbfaf7', '#00a0d6', '#e6007e', '#f1ede4', '#fbfaf7'], grain: 0.2 },

  'metal-steel': { variant: 'metal', colors: ['#1d2026', '#4a5059', '#8b929c', '#c9ced6', '#f4f6f8'] },
  'metal-rose': { variant: 'metal', colors: ['#3a1f22', '#7d4a4c', '#c08a87', '#ecc5bf', '#fff1ec'] },
  'metal-oil': { variant: 'metal', colors: ['#12091f', '#3b1c6b', '#0f6f8a', '#59c27d', '#f2d16b'] },
  'metal-mercury': { variant: 'metal', colors: ['#050608', '#1c1f24', '#4d535c', '#a9afb8', '#eef1f5'] },
  'metal-gold': { variant: 'metal', colors: ['#2b1a05', '#6e4a12', '#b9862b', '#e8c46a', '#fff3c4'] },

  'aurora-boreal': { variant: 'aurora', colors: ['#040b14', '#2bf0a0', '#7b5cff', '#1fc7a8', '#0b2a3a'] },
  'aurora-solar': { variant: 'aurora', colors: ['#140805', '#ff9a3c', '#ff4f6d', '#ffd35c', '#3a1408'] },
  'aurora-rose': { variant: 'aurora', colors: ['#12060d', '#ff7eb6', '#c86bff', '#ffb3c7', '#2e0f22'] },
  'aurora-noir': { variant: 'aurora', colors: ['#060606', '#9a9a9a', '#d8d8d8', '#5e5e5e', '#1a1a1a'] },
  'aurora-ice': { variant: 'aurora', colors: ['#04101a', '#9fe8ff', '#5fb4ff', '#d6f6ff', '#0c2a40'] },

  'flame-ember': { variant: 'flame', colors: ['#0a0302', '#5c0f04', '#c2330a', '#ff8a1e', '#ffe08a'] },
  'flame-viridian': { variant: 'flame', colors: ['#010a07', '#043b2a', '#0f8a5f', '#3ee0a0', '#d8ffe9'] },
  'flame-violet': { variant: 'flame', colors: ['#07020f', '#2a0a5c', '#6a1fd0', '#b16bff', '#f0dcff'] },
  'flame-ash': { variant: 'flame', colors: ['#080808', '#2b2b2b', '#666666', '#b5b5b5', '#f5f5f5'] },
  'flame-azure': { variant: 'flame', colors: ['#01060f', '#062a5c', '#0f62d0', '#4fb0ff', '#e0f4ff'] },

  'cells-tide': { variant: 'cells', colors: ['#06263a', '#0f5f86', '#1f8fb3', '#55bcd1', '#a9e4ec'] },
  'cells-violet': { variant: 'cells', colors: ['#160a2b', '#4b2a8a', '#6b44c4', '#9a7ce6', '#cbb9f7'] },
  'cells-slate': { variant: 'cells', colors: ['#1b1f24', '#3c434c', '#56606b', '#78838f', '#a3adb8'] },
  'cells-coral': { variant: 'cells', colors: ['#3a0e0a', '#e25b45', '#f08a6c', '#f7b49b', '#fcd9c8'] },
  'cells-amber': { variant: 'cells', colors: ['#2a1700', '#c77800', '#e89a10', '#f6bd45', '#fde08a'] },
} satisfies Record<string, Preset>

export type ShaderPreset = keyof typeof SHADER_PRESETS

export type ShaderBackdropProps = {
  /** A ready-made look. `variant` and `colors` override parts of it. */
  preset?: ShaderPreset
  /** The kind of motion. Defaults to the preset's. */
  variant?: ShaderVariant
  /** Two to five hex colours; fewer are stretched to five. Defaults to the preset's. */
  colors?: string[]
  /** 1 is slow enough to sit behind a headline. 0 stands still. */
  speed?: number
  /** 0 to 1: fine print grain on top, which also hides banding. */
  grain?: number
  /** Above 1 the pattern gets smaller and busier, below 1 bigger and calmer. */
  scale?: number
  /** Another whole number gives the same look a different layout, e.g. for two backdrops on one page. */
  seed?: number
  /** Content shown on top. */
  children?: ReactNode
  className?: string
}

const VERTEX = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`

// Shared by every family: uniforms, a hash, value noise, five-octave fbm and a five-stop palette.
const HEAD = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 r;uniform float t;uniform vec3 c[5];uniform float g;uniform float s;uniform float k;uniform float px;uniform float sd;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}
vec3 pal(float x){x=clamp(x,0.,1.)*4.;vec3 a=mix(c[0],c[1],clamp(x,0.,1.));a=mix(a,c[2],clamp(x-1.,0.,1.));a=mix(a,c[3],clamp(x-2.,0.,1.));return mix(a,c[4],clamp(x-3.,0.,1.));}
`

const MAIN = `
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  vec2 p=(gl_FragCoord.xy-.5*r)/min(r.x,r.y)*s+vec2(sd*3.71,0.);
  vec3 col=shade(p,uv);
  col+=(h(gl_FragCoord.xy*.731+3.1)-.5)*g*.12;
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
}`

const SHADE: Record<ShaderVariant, string> = {
  // Each colour owns a slow noise field; wherever its field is highest it shows, with soft seams between them.
  mesh: `vec3 shade(vec2 p,vec2 uv){
  float T=t*.1;
  vec2 q=mat2(.8,.6,-.6,.8)*p*.9+.5*(vec2(fbm(p*.8+vec2(T,0.)),fbm(p*.8+vec2(4.1,-T)))-.5);
  vec3 col=vec3(0.);float ws=0.;
  for(int i=0;i<5;i++){
    float f=float(i);
    vec2 o=vec2(f*7.31,f*3.17)+T*vec2(sin(f*1.7),cos(f*2.3));
    float v=n(q*.9+o)*.75+n(q*1.9-o)*.25;
    float w=exp(10.*v+(i==0?.6:0.));
    col+=c[i]*w;ws+=w;
  }
  return col/ws;
}`,
  // Soft diagonal bands of colour twist round a drifting point in the middle, like stirred paint, and slowly flow.
  swirl: `vec3 shade(vec2 p,vec2 uv){
  float T=t*.08;
  vec2 q=p+.6*vec2(n(p*.55+vec2(T,1.7)),n(p*.55+vec2(-T,4.3)))-.3;
  vec2 d=q-vec2(.25*sin(T*.7),.15*cos(T*.5));
  float a=2.2*exp(-dot(d,d)*.9);
  q=mat2(cos(a),sin(a),-sin(a),cos(a))*d;
  float w=(q.x*.5+q.y*.87)*1.25-T*.6;
  float x=fract(w);
  float tri=1.-abs(x*2.-1.);
  return pal(tri*tri*(3.-2.*tri));
}`,
  // Two screened plates at 15 and 75 degrees, the second slightly out of register, printed over a drifting tone.
  halftone: `float fld(vec2 fc){
  vec2 p=(fc-.5*r)/min(r.x,r.y)*s+vec2(sd*3.71,0.);float T=t*.1;
  return smoothstep(.3,.75,fbm(p*1.2+vec2(T,-T*.6)+.8*fbm(p*.9-vec2(T*.7,0.))));
}
float dots(vec2 fc,float a,float pitch){
  vec2 q=mat2(cos(a),sin(a),-sin(a),cos(a))*fc/pitch;
  vec2 id=floor(q)+.5;
  float v=fld(mat2(cos(a),-sin(a),sin(a),cos(a))*id*pitch);
  return 1.-smoothstep(sqrt(v)*.71-.9/pitch,sqrt(v)*.71+.9/pitch,length(q-id));
}
vec3 shade(vec2 p,vec2 uv){
  float pitch=7.*px;
  vec3 col=mix(c[0],c[3],(1.-uv.y)*.6);
  float d1=dots(gl_FragCoord.xy,.2618,pitch);
  float d2=dots(gl_FragCoord.xy+vec2(1.6,-1.1)*px,1.309,pitch)*.9;
  if(k>.5){col=1.-(1.-col)*(1.-c[1]*d1);col=1.-(1.-col)*(1.-c[2]*d2);}
  else{col*=mix(vec3(1.),c[1],d1);col*=mix(vec3(1.),c[2],d2);}
  return col;
}`,
  // The plane is folded with sine waves into ridges, each with a sharp lit edge that fades into shadow, like brushed metal.
  metal: `vec3 shade(vec2 p,vec2 uv){
  float T=t*.3;vec2 q=p;
  for(int i=1;i<5;i++){float f=float(i);q+=vec2(.6/f*sin(f*q.y+T+.3*f),.4/f*sin(f*q.x+T*.8+.3*f));}
  float v=.5+.5*sin(q.x*2.2+q.y*1.4);
  float x=fract(v*2.6+.2*sin(q.y*1.3-T*.5));
  float b=smoothstep(0.,.1,x)*(1.-.82*sqrt(x))*1.32;
  vec3 col=pal(.04+.92*b)*(.86+.18*uv.y)+pow(min(b,1.),16.)*.12;
  return col+(n(vec2(gl_FragCoord.x*.004/px,gl_FragCoord.y*.7/px))-.5)*.05;
}`,
  aurora: `vec3 shade(vec2 p,vec2 uv){
  float T=t*.08;
  vec3 col=mix(c[0],c[4],pow(1.-uv.y,1.6)*.9);
  for(int i=0;i<3;i++){
    float f=float(i);
    float x=p.x*(.9+.25*f)+f*3.7;
    float base=.14-.15*f+1.1*(fbm(vec2(x*.5+T*(1.+.3*f),f*5.3))-.5);
    float dy=p.y-base;
    float body=exp(-max(dy,0.)*(3.+f)-max(-dy,0.)*20.);
    float rays=.4+.6*pow(n(vec2(x*9.,T*3.+f*11.)),1.4);
    col+=c[1+i]*body*rays*(.8-.15*f);
  }
  return col;
}`,
  // Two layers of rising noise, hottest at the bottom edge, read through the ramp from cold to white-hot.
  flame: `vec3 shade(vec2 p,vec2 uv){
  float T=t*.5;
  vec2 q=vec2(p.x*2.2,p.y*1.2-T);
  float w=fbm(q*.9+vec2(0.,-T*.3));
  float f=fbm(vec2(q.x,q.y*.8)+vec2(w*1.8,-T*.6));
  float heat=clamp((1.-uv.y)*1.35-.44+(f-.5)*2.,0.,1.);
  return pal(heat*heat*(3.-2.*heat));
}`,
  // Cells whose seeds wander in small circles; each cell takes a colour from the ramp, with even gaps between them.
  // The gap is the exact distance to the nearest border, after Inigo Quilez (see the top of this file).
  // Hash offsets stay whole numbers so a cell gets the same colour from every grid square it covers.
  cells: `vec2 site(vec2 c,float T){vec2 o=vec2(h(c),h(c+vec2(17.,31.)));return .5+.4*sin(T+6.2831853*o);}
vec3 shade(vec2 p,vec2 uv){
  float T=t*.25;vec2 q=p*3.2;vec2 i=floor(q),f=fract(q);
  vec2 mg=vec2(0.),mr=vec2(0.);float md=8.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 g=vec2(float(x),float(y));vec2 v=g+site(i+g,T)-f;float d=dot(v,v);
    if(d<md){md=d;mr=v;mg=g;}
  }
  md=8.;
  for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){
    vec2 g=mg+vec2(float(x),float(y));vec2 v=g+site(i+g,T)-f;
    if(dot(mr-v,mr-v)>.00001)md=min(md,dot(.5*(mr+v),normalize(v-mr)));
  }
  vec3 cell=pal(.25+.75*h(i+mg+vec2(41.,7.)))*(1.03-.2*length(mr));
  return mix(c[0],cell,smoothstep(.01,.035,md));
}`,
}

// Soft families look the same at one device pixel per CSS pixel; crisp ones need more.
const MAX_DPR: Record<ShaderVariant, number> = { mesh: 1, swirl: 1, aurora: 1, flame: 1, metal: 1.5, cells: 1.5, halftone: 2 }
// Above this many pixels the canvas renders smaller and the browser scales it up.
const MAX_PIXELS = 2_400_000
const DEFAULT_GRAIN = 0.35

function rgb(hex: string): [number, number, number] {
  const h = hex.trim().replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n) || full.length !== 6) return [0.5, 0.5, 0.5]
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Stretches any number of colours to the five stops the shaders read. */
function fiveStops(colors: string[]) {
  const list = (colors.length ? colors : ['#000000']).map(rgb)
  if (list.length === 1) list.push(list[0])
  return Array.from({ length: 5 }, (_, i) => {
    const at = (i / 4) * (list.length - 1)
    const lo = Math.min(Math.floor(at), list.length - 2)
    const f = at - lo
    return list[lo].map((v, j) => v + (list[lo + 1][j] - v) * f) as [number, number, number]
  })
}

function hex([r, g, b]: number[]) {
  return `#${[r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`
}

/** Shown until WebGL draws, and instead of it when WebGL is missing. */
function fallback(variant: ShaderVariant, stops: number[][]): CSSProperties {
  const [a, b, c, d, e] = stops.map(hex)
  if (variant === 'flame') return { background: `linear-gradient(to top, ${d}, ${c} 18%, ${b} 40%, ${a} 72%)` }
  if (variant === 'aurora') return { background: `radial-gradient(120% 60% at 50% 45%, ${b}55, transparent 70%), linear-gradient(to top, ${e}, ${a} 70%)` }
  if (variant === 'halftone') return { background: `linear-gradient(to top, ${d}, ${a})` }
  return {
    background: `radial-gradient(at 18% 22%, ${b}, transparent 55%), radial-gradient(at 82% 28%, ${c}, transparent 55%), radial-gradient(at 70% 85%, ${d}, transparent 55%), radial-gradient(at 22% 80%, ${e}, transparent 55%), ${a}`,
  }
}

/**
 * An animated WebGL background in seven families with 55 ready-made looks. It pauses off screen, shows one
 * still frame under reduced motion, and falls back to a CSS gradient in the same colours without WebGL.
 */
export function ShaderBackdrop({
  preset = 'mesh-lilac',
  variant,
  colors,
  speed = 1,
  grain,
  scale = 1,
  seed = 0,
  children,
  className,
}: ShaderBackdropProps) {
  const host = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const base: Preset = SHADER_PRESETS[preset] ?? SHADER_PRESETS['mesh-lilac']
  const kind = variant ?? base.variant
  const palette = (colors ?? base.colors).join(',')
  const grainAmount = Math.min(1, Math.max(0, grain ?? base.grain ?? DEFAULT_GRAIN))
  const stops = fiveStops(palette.split(','))

  useEffect(() => {
    const wrap = host.current
    if (!wrap) return
    // A fresh canvas per run: a canvas whose context was lost cannot hand out a new one.
    const el = document.createElement('canvas')
    el.setAttribute('aria-hidden', 'true')
    el.className = 'pointer-events-none absolute inset-0 -z-10 size-full opacity-0 transition-opacity duration-700 data-ready:opacity-100'
    wrap.prepend(el)
    const remove = () => el.remove()

    const gl = el.getContext('webgl', { antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' })
    if (!gl) return remove
    const release = () => {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      remove()
    }

    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const program = gl.createProgram()!
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, HEAD + SHADE[kind] + MAIN))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return release
    gl.useProgram(program)

    // One triangle that covers the whole canvas.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const u = (name: string) => gl.getUniformLocation(program, name)
    const uRes = u('r')
    const uTime = u('t')
    const uPx = u('px')
    const five = fiveStops(palette.split(','))
    gl.uniform3fv(u('c'), five.flat())
    gl.uniform1f(u('g'), grainAmount)
    gl.uniform1f(u('s'), Math.max(0.1, scale))
    gl.uniform1f(u('sd'), seed % 97)
    // Halftone prints light ink on dark paper by screening instead of multiplying.
    const [pr, pg, pb] = five[0]
    gl.uniform1f(u('k'), 0.2126 * pr + 0.7152 * pg + 0.0722 * pb < 0.5 ? 1 : 0)

    // Time only moves while the canvas is drawn, so the pattern resumes where it paused.
    const STILL = 4000
    let clock = STILL
    let last = 0
    const draw = () => {
      gl.uniform1f(uTime, clock / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      let dpr = Math.min(MAX_DPR[kind], window.devicePixelRatio || 1)
      if (w * h * dpr * dpr > MAX_PIXELS) dpr = Math.sqrt(MAX_PIXELS / Math.max(1, w * h))
      el.width = Math.max(1, Math.round(w * dpr))
      el.height = Math.max(1, Math.round(h * dpr))
      gl.viewport(0, 0, el.width, el.height)
      gl.uniform2f(uRes, el.width, el.height)
      gl.uniform1f(uPx, dpr)
      draw()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()
    requestAnimationFrame(() => (el.dataset.ready = ''))

    let raf = 0
    let visible = false
    // Set once the GPU drops the context; nothing restarts the loop after that.
    let dead = false
    const loop = (now: number) => {
      // Cap the step so a stalled tab does not jump the pattern ahead.
      clock += Math.min(50, now - (last || now)) * speed
      last = now
      draw()
      raf = requestAnimationFrame(loop)
    }
    // Only animate while on screen.
    const io = new IntersectionObserver(([entry]) => {
      if (dead || reduce || speed === 0 || entry.isIntersecting === visible) return
      visible = entry.isIntersecting
      last = 0
      if (visible) raf = requestAnimationFrame(loop)
      else cancelAnimationFrame(raf)
    })
    io.observe(el)

    // If the GPU drops the context, the CSS fallback shows again.
    const lost = () => {
      dead = true
      cancelAnimationFrame(raf)
      delete el.dataset.ready
    }
    el.addEventListener('webglcontextlost', lost)

    return () => {
      ro.disconnect()
      io.disconnect()
      cancelAnimationFrame(raf)
      el.removeEventListener('webglcontextlost', lost)
      release()
    }
  }, [kind, palette, grainAmount, scale, seed, speed, reduce])

  return (
    <div ref={host} className={cn('relative isolate overflow-hidden', className)} style={fallback(kind, stops)}>
      {children}
    </div>
  )
}
