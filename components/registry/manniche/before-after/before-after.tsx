// Before and after: two photos of the same place on top of each other, with a handle that wipes between them.
// The after photo fills the frame; the before photo lies over it and is cut off at the handle, so before is on the
// left and after on the right.
//
// Drag anywhere on the picture, or click to jump the handle there. The frame keeps `touch-action: pan-y`, so on a
// phone a vertical swipe still scrolls the page and only a sideways drag moves the handle. The keyboard and screen
// readers use a real range input (hidden, but focusable): arrows move 1 %, Page Up/Down 10 %, Home and End go to the
// ends, and its value is read as "40 % before". Focus shows as a ring on the handle.
//
// Motion: none of its own. The handle follows the pointer or the key, and nothing animates by itself.
import { useId, useRef, useState, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'

export type BeforeAfterLabels = {
  /** The chip on the before photo. */
  before: string
  /** The chip on the after photo. */
  after: string
  /** The name of the slider, read by screen readers. */
  slider: string
  /** The slider's spoken value; `{n}` is the share of the before photo in per cent. */
  value: string
}

const LABELS: BeforeAfterLabels = {
  before: 'Before',
  after: 'After',
  slider: 'Compare before and after',
  value: '{n} % before',
}

export type BeforeAfterProps = {
  /** The before photo. */
  before: { src: string; alt: string }
  /** The after photo, taken from the same spot. */
  after: { src: string; alt: string }
  /** Where the handle starts, in per cent from the left. */
  initial?: number
  /** Width to height of the frame, as CSS `aspect-ratio`. Both photos are cropped to it. */
  aspectRatio?: string
  /** Called with the new position (0–100) when it changes. */
  onChange?: (position: number) => void
  /** Visible and spoken text. */
  labels?: Partial<BeforeAfterLabels>
  /** Classes for the frame. */
  className?: string
}

const clamp = (n: number) => Math.min(100, Math.max(0, n))

/** Two photos of the same place with a handle that wipes from before to after. */
export function BeforeAfter({ before, after, initial = 50, aspectRatio = '4 / 3', onChange, labels = {}, className }: BeforeAfterProps) {
  const l = { ...LABELS, ...labels }
  const id = useId()
  const frame = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(() => clamp(initial))

  const set = (n: number) => {
    const next = clamp(Math.round(n * 10) / 10)
    setPos(next)
    onChange?.(next)
  }
  const fromPointer = (e: PointerEvent) => {
    const box = frame.current?.getBoundingClientRect()
    if (box && box.width > 0) set(((e.clientX - box.left) / box.width) * 100)
  }

  return (
    <div
      ref={frame}
      className={cn('relative isolate cursor-ew-resize touch-pan-y overflow-hidden rounded-xl border border-border bg-muted select-none', className)}
      style={{ aspectRatio }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        fromPointer(e)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e)
      }}
    >
      <img src={after.src} alt={after.alt} draggable={false} className="absolute inset-0 size-full object-cover" />
      <img
        src={before.src}
        alt={before.alt}
        draggable={false}
        className="absolute inset-0 size-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />

      <span aria-hidden className="pointer-events-none absolute top-3 left-3 rounded-md bg-background/85 px-2 py-1 text-xs font-medium text-foreground">
        {l.before}
      </span>
      <span aria-hidden className="pointer-events-none absolute top-3 right-3 rounded-md bg-background/85 px-2 py-1 text-xs font-medium text-foreground">
        {l.after}
      </span>

      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(pos)}
        aria-label={l.slider}
        aria-valuetext={l.value.replace('{n}', String(Math.round(pos)))}
        onChange={(e) => set(Number(e.target.value))}
        className="peer sr-only"
      />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-background shadow-[0_0_0_1px_rgb(0_0_0/0.15)]" style={{ left: `${pos}%` }} />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
        style={{ left: `${pos}%` }}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
        </svg>
      </div>
    </div>
  )
}
