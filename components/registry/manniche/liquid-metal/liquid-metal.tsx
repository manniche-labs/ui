import { useEffect, useRef, type ReactNode } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type LiquidMetalProps = {
  /** Flow speed; 1 is slow and heavy. */
  speed?: number
  /** Content shown on top of the metal. */
  children?: ReactNode
  className?: string
}

const VERTEX = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`

// The plane is folded a few times with sine waves, then read through a chrome palette of dark and bright bands.
const FRAGMENT = `precision mediump float;
uniform vec2 r;uniform float t;
void main(){
  vec2 p=(gl_FragCoord.xy*2.-r)/min(r.x,r.y);
  for(int i=1;i<5;i++){
    float f=float(i);
    p+=vec2(.6/f*sin(f*p.y+t+.3*f),.4/f*sin(f*p.x+t*.8+.3*f));
  }
  float v=.5+.5*sin(p.x*2.2+p.y*1.4);
  float band=pow(abs(sin(v*9.42)),.6);
  vec3 c=mix(vec3(.16,.17,.2),vec3(.96,.97,.99),band);
  c+=vec3(.05,.02,.08)*sin(v*12.);
  gl_FragColor=vec4(c,1.);
}`

/** A surface of flowing chrome, drawn with a tiny WebGL shader. Without WebGL it falls back to still metal bands. */
export function LiquidMetal({ speed = 1, children, className }: LiquidMetalProps) {
  const host = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const wrap = host.current
    if (!wrap) return
    // A fresh canvas per run: a canvas whose context was lost cannot hand out a new one.
    const el = document.createElement('canvas')
    el.setAttribute('aria-hidden', 'true')
    el.className = 'absolute inset-0 -z-10 size-full opacity-0 transition-opacity duration-500 data-ready:opacity-100'
    wrap.prepend(el)
    const remove = () => el.remove()

    const gl = el.getContext('webgl', { antialias: false, premultipliedAlpha: false })
    if (!gl) return remove

    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const program = gl.createProgram()!
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return remove
    gl.useProgram(program)

    // One triangle that covers the whole canvas.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const uRes = gl.getUniformLocation(program, 'r')
    const uTime = gl.getUniformLocation(program, 't')

    const draw = (now: number) => {
      gl.uniform1f(uTime, (now / 1000) * 0.35 * speed)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      el.width = Math.max(1, Math.round(el.clientWidth * dpr))
      el.height = Math.max(1, Math.round(el.clientHeight * dpr))
      gl.viewport(0, 0, el.width, el.height)
      gl.uniform2f(uRes, el.width, el.height)
      draw(reduce ? 4000 : performance.now())
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    // Wait a frame so the new canvas fades in instead of popping.
    requestAnimationFrame(() => (el.dataset.ready = ''))

    let raf = 0
    let visible = false
    const loop = (now: number) => {
      draw(now)
      raf = requestAnimationFrame(loop)
    }
    // Only animate while on screen.
    const io = new IntersectionObserver(([entry]) => {
      if (reduce || entry.isIntersecting === visible) return
      visible = entry.isIntersecting
      if (visible) raf = requestAnimationFrame(loop)
      else cancelAnimationFrame(raf)
    })
    io.observe(el)

    return () => {
      ro.disconnect()
      io.disconnect()
      cancelAnimationFrame(raf)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      remove()
    }
  }, [speed, reduce])

  return (
    <div
      ref={host}
      className={cn(
        'relative isolate overflow-hidden',
        // Fallback until (or if) WebGL starts: still chrome bands.
        'bg-[linear-gradient(115deg,#2a2c33_0%,#f4f5f8_22%,#6b6e78_40%,#eef0f4_58%,#30323a_78%,#d9dbe1_100%)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
