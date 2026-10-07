// Inspired by Watermelon UI's “Draw signature” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten with pointer events, a sharp canvas on
// high-density screens, ink in the current text colour, and a typed fallback for keyboard users.
import { Check, Eraser, Keyboard, PenLine } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'

export type Signature = { kind: 'drawn'; png: string } | { kind: 'typed'; name: string }

export type SignaturePadProps = {
  /** Called with the drawn PNG data URL or the typed name when Done is pressed. */
  onSign: (signature: Signature) => void
  /** Visible text and screen reader text; defaults to English. */
  labels?: Partial<Record<'title' | 'clear' | 'done' | 'type' | 'draw' | 'typed' | 'signed' | 'pad' | 'again', string>>
  /** Classes for the pad, and for the signed state that replaces it. */
  className?: string
}

const EN = {
  title: 'Sign here',
  clear: 'Clear',
  done: 'Done',
  type: 'Type instead',
  draw: 'Draw instead',
  typed: 'Your full name',
  signed: 'Signed',
  again: 'Sign again',
  pad: 'Signature area. Draw with a mouse, finger or pen.',
}

export function SignaturePad({ onSign, labels = {}, className }: SignaturePadProps) {
  const t = { ...EN, ...labels }
  const canvas = useRef<HTMLCanvasElement>(null)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [empty, setEmpty] = useState(true)
  const [name, setName] = useState('')
  const [signed, setSigned] = useState<Signature | null>(null)

  // Size the bitmap to the element times the pixel ratio, so the ink stays sharp.
  useEffect(() => {
    const c = canvas.current
    if (!c || mode !== 'draw' || signed) return
    const fit = () => {
      const r = c.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      c.width = Math.round(r.width * dpr)
      c.height = Math.round(r.height * dpr)
      const ctx = c.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 2.5
      ctx.strokeStyle = getComputedStyle(c).color
      setEmpty(true)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(c)
    return () => ro.disconnect()
  }, [mode, signed])

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    last.current = point(e)
    const ctx = e.currentTarget.getContext('2d')!
    ctx.beginPath()
    ctx.arc(last.current.x, last.current.y, 1.2, 0, Math.PI * 2)
    ctx.fillStyle = ctx.strokeStyle
    ctx.fill()
    setEmpty(false)
  }

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!last.current) return
    const ctx = e.currentTarget.getContext('2d')!
    const p = point(e)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }

  const clear = () => {
    const c = canvas.current
    if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    setName('')
    setEmpty(true)
  }

  const done = () => {
    const s: Signature = mode === 'draw' ? { kind: 'drawn', png: canvas.current!.toDataURL('image/png') } : { kind: 'typed', name: name.trim() }
    setSigned(s)
    onSign(s)
  }

  const ready = mode === 'draw' ? !empty : name.trim().length > 1
  const ghost = 'inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground'

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', bounce: 0, duration: 0.5 }}>
      <AnimatePresence mode="popLayout" initial={false}>
        {signed ? (
          <motion.div
            key="signed"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn('flex items-center gap-2', className)}
          >
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 font-medium text-background">
              <Check className="size-4" aria-hidden />
              {t.signed}
            </span>
            <button
              type="button"
              onClick={() => {
                setSigned(null)
                setEmpty(true)
              }}
              aria-label={t.again}
              className="grid size-11 place-items-center rounded-full bg-muted transition-colors duration-150 hover:bg-accent"
            >
              <PenLine className="size-4" aria-hidden />
            </button>
          </motion.div>
        ) : (
          <motion.section
            key="pad"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            aria-label={t.title}
            className={cn('w-full max-w-sm rounded-3xl border bg-card p-4 text-card-foreground shadow-sm', className)}
          >
            <header className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">{t.title}</h2>
              <button type="button" className={ghost} onClick={() => setMode(mode === 'draw' ? 'type' : 'draw')}>
                {mode === 'draw' ? <Keyboard className="size-4" aria-hidden /> : <PenLine className="size-4" aria-hidden />}
                {mode === 'draw' ? t.type : t.draw}
              </button>
            </header>

            {mode === 'draw' ? (
              <canvas
                ref={canvas}
                role="img"
                aria-label={t.pad}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={() => (last.current = null)}
                onPointerCancel={() => (last.current = null)}
                className="h-44 w-full cursor-crosshair touch-none rounded-2xl border border-dashed bg-background text-foreground"
              />
            ) : (
              <label className="block">
                <span className="sr-only">{t.typed}</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.typed}
                  autoComplete="name"
                  className="grid h-44 w-full rounded-2xl border border-dashed bg-background px-4 text-center font-serif text-3xl italic outline-none placeholder:text-base placeholder:not-italic placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            )}

            <footer className="mt-3 flex items-center justify-between">
              <button type="button" className={ghost} onClick={clear}>
                <Eraser className="size-4" aria-hidden />
                {t.clear}
              </button>
              <button
                type="button"
                disabled={!ready}
                onClick={done}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-[opacity,transform] duration-150 active:scale-[0.97] disabled:opacity-30"
              >
                <Check className="size-4" aria-hidden />
                {t.done}
              </button>
            </footer>
          </motion.section>
        )}
      </AnimatePresence>
      <span role="status" className="sr-only">
        {signed ? t.signed : ''}
      </span>
    </MotionConfig>
  )
}
