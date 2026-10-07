// Gallery card: a poster, the item's name as its link, a short description and a few labels (tier, category, new).
// The whole card is one link target, so it reads as one thing; the name stays the link text, and the tier badge and
// the description describe it, so a screen reader hears "flux-image, link, Pro, Flowing image…" and nothing twice.
//
// Without a poster (or when the image fails) the card draws its own: the name set large in mono, split at its
// hyphens, on a dotted ground. With a `loop` video the poster comes alive on hover (after a short dwell, so a quick
// pass does not start anything) or on keyboard focus: a small chip says it plays, and a thin bar runs with it. The
// video is fetched only the first time the card is hovered or focused, never plays under reduced motion, and if it
// fails the chip says so and the still image stays.
//
// `href` is a real link, so the card works without JS and Cmd/Ctrl/Shift/middle click open it as usual. Pass
// `onOpen` to open a detail view in place instead: a plain click (or Enter) calls it and the link does not navigate.
//
// Motion: the video, the chip and the "↵ open" hint fade in (opacity, 150 ms); the card sinks 1 px on press. Under
// reduced motion there is no video at all and the hint appears without a fade.
import { Play } from 'lucide-react'
import { useEffect, useId, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { Badge } from '@/registry/manniche/badge/badge'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type GalleryCardLabels = {
  /** The tier badge for free items. */
  free: string
  /** The tier badge for paid items. */
  pro: string
  /** The badge on recently added items. */
  new: string
  /** The hint after the ↵ key, shown on hover and focus. */
  open: string
  /** The chip while the loop plays (the length in seconds follows it). */
  loop: string
  /** The chip while the loop is still loading. */
  loading: string
  /** The chip when the loop could not play; the still image stays. */
  failed: string
  /** The file type in the corner of the drawn poster. */
  fileTag: string
}

const LABELS: GalleryCardLabels = {
  free: 'Free',
  pro: 'Pro',
  new: 'New',
  open: 'open',
  loop: 'Loop',
  loading: 'Loading loop',
  failed: 'No loop · still image',
  fileTag: '.tsx',
}

export type GalleryCardProps = {
  /** The item's name (a slug like "flux-image"). It is the link text and, without a poster, the poster. */
  name: string
  /** Where the card leads. Always a real URL, so the card works without JS and opens in a new tab on Cmd/Ctrl click. */
  href: string
  /** One or two sentences; clamped to two lines. */
  description?: string
  /** The language of the description, when it differs from the page (e.g. English descriptions on a Danish page). */
  descriptionLang?: string
  /** Which tier badge to show. */
  tier?: 'free' | 'pro'
  /** A category label under the description, e.g. "surfaces". */
  category?: string
  /** Marks the item as recently added. */
  isNew?: boolean
  /** Poster image (16:10). Decorative: the name is the link text. Without one, or if it fails, the card draws its own. */
  poster?: string
  /** A short muted video that loops on hover and focus. Fetched on first hover/focus; never plays under reduced motion. */
  loop?: string
  /** Called on a plain click or Enter instead of navigating, e.g. to open a detail view. Modified clicks keep the link. */
  onOpen?: (event: MouseEvent<HTMLAnchorElement>) => void
  /** The heading level of the name. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
  /** Every visible string, for other languages. */
  labels?: Partial<GalleryCardLabels>
  className?: string
}

type LoopState = 'loading' | 'playing' | 'failed'

/** The drawn poster: the name large in mono, one hyphen-separated part per line (short names) or wrapping (long ones). */
function DrawnPoster({ name, category, fileTag }: { name: string; category?: string; fileTag: string }) {
  const parts = name.split('-')
  const long = parts.length > 3 || name.length > 28
  return (
    <div
      aria-hidden
      className="@container absolute inset-0 flex flex-col justify-between bg-muted bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_11%,transparent)_1px,transparent_1.3px)] bg-size-[14px_14px] bg-position-[7px_7px] px-4 pt-3.5 pb-4"
    >
      <div className="flex justify-between gap-3 font-mono text-[11px] leading-none font-medium text-muted-foreground">
        <span className="truncate">{category}</span>
        <span>{fileTag}</span>
      </div>
      <div
        className={cn(
          'min-w-0 font-mono leading-[1.04] font-medium tracking-[-0.04em] [overflow-wrap:anywhere] text-foreground/90',
          long ? 'line-clamp-3 text-[clamp(17px,7cqi,24px)]' : 'text-[clamp(20px,8.5cqi,28px)]',
        )}
      >
        {parts.map((part, i) => (
          <span key={i} className={long ? undefined : 'block'}>
            {part}
            {i < parts.length - 1 && <span className="text-muted-foreground">-</span>}
            {long && i < parts.length - 1 && <wbr />}
          </span>
        ))}
      </div>
    </div>
  )
}

/** A poster card for a gallery: the name is the link, stretched over the whole card. */
export function GalleryCard({
  name,
  href,
  description,
  descriptionLang,
  tier = 'free',
  category,
  isNew = false,
  poster,
  loop,
  onOpen,
  headingLevel = 3,
  labels: labelsProp,
  className,
}: GalleryCardProps) {
  const labels = { ...LABELS, ...labelsProp }
  const reduced = useReducedMotion()
  const tierId = useId()
  const descId = useId()
  const Heading = `h${headingLevel}` as const

  const [imageFailed, setImageFailed] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [armed, setArmed] = useState(false)
  const [loopState, setLoopState] = useState<LoopState>('loading')
  const [duration, setDuration] = useState<number | null>(null)
  const [run, setRun] = useState(0)
  const dwell = useRef<ReturnType<typeof setTimeout> | null>(null)
  const video = useRef<HTMLVideoElement>(null)

  // A new poster gets a fresh chance to load.
  const [lastPoster, setLastPoster] = useState(poster)
  if (poster !== lastPoster) {
    setLastPoster(poster)
    setImageFailed(false)
  }

  const canLoop = Boolean(loop) && !reduced
  const active = canLoop && (hovered || focused)

  useEffect(() => () => {
    if (dwell.current) clearTimeout(dwell.current)
  }, [])

  // Play while active, rewind when not, so the next hover starts from the top.
  useEffect(() => {
    const v = video.current
    if (!v) return
    if (active) {
      v.play().catch((error: unknown) => {
        // An interrupted play (pause during load) is normal; a refused or unsupported one means no loop here.
        if (error instanceof DOMException && error.name !== 'AbortError') setLoopState('failed')
      })
    } else {
      v.pause()
      if (v.readyState > 0) v.currentTime = 0
    }
  }, [active, armed])

  // A card left alone for a while lets its video go, so sweeping across a grid does not keep dozens buffered.
  useEffect(() => {
    if (active || !armed) return
    const t = setTimeout(() => {
      setArmed(false)
      setLoopState((s) => (s === 'failed' ? s : 'loading'))
    }, 4000)
    return () => clearTimeout(t)
  }, [active, armed])

  const activate = () => {
    if (!canLoop) return
    if (!armed) setArmed(true)
  }

  const onPointerEnter = (e: PointerEvent<HTMLElement>) => {
    if (!canLoop || e.pointerType === 'touch' || dwell.current) return
    dwell.current = setTimeout(() => {
      dwell.current = null
      activate()
      setHovered(true)
    }, 120)
  }
  const onPointerLeave = () => {
    if (dwell.current) clearTimeout(dwell.current)
    dwell.current = null
    setHovered(false)
  }

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onOpen || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    onOpen(e)
  }

  const showImage = Boolean(poster) && !imageFailed
  const chip = loopState === 'playing' ? labels.loop : loopState === 'failed' ? labels.failed : labels.loading
  const describedBy = description ? `${tierId} ${descId}` : tierId

  return (
    <article
      data-loop={active ? loopState : undefined}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={(e) => {
        // Keyboard focus only: a mouse click also focuses the link, and must not leave the loop running.
        if (!(e.target as Element).matches(':focus-visible')) return
        activate()
        setFocused(true)
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
      }}
      className={cn(
        'group/card relative flex min-w-0 flex-col rounded-[calc(var(--radius)*2+2px)] bg-card p-3 text-card-foreground',
        'shadow-[inset_0_-2px_0_color-mix(in_oklab,var(--foreground)_6%,transparent),0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]',
        'dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06),inset_0_-2px_0_rgb(0_0_0/0.38),0_0_0_1px_rgb(255_255_255/0.07)]',
        'transition-transform duration-100 ease-out-quint active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-[3px] has-[a:focus-visible]:outline-ring',
        'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-foreground/3 after:opacity-0 after:transition-opacity after:duration-150 after:ease-out-quint hover:after:opacity-100 motion-reduce:after:transition-none',
        className,
      )}
    >
      <div className="relative isolate aspect-[16/10] overflow-hidden rounded-[14px] bg-muted">
        {showImage ? (
          <img
            src={poster}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <DrawnPoster name={name} category={category} fileTag={labels.fileTag} />
        )}

        {canLoop && armed && (
          <video
            ref={video}
            src={loop}
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            aria-hidden
            tabIndex={-1}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration
              if (Number.isFinite(d) && d > 0) setDuration(d)
            }}
            onWaiting={() => setLoopState('loading')}
            onPlaying={() => {
              setLoopState('playing')
              setRun((n) => n + 1)
            }}
            onError={() => setLoopState('failed')}
            className={cn(
              'absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-150 ease-out-quint',
              active && loopState === 'playing' && 'opacity-100',
            )}
          />
        )}

        {/* The image's edge: pure black or white at 10 %, so it never tints with the surface below. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2] rounded-[inherit] shadow-[inset_0_0_0_1px_oklch(0_0_0/0.1)] dark:shadow-[inset_0_0_0_1px_oklch(1_0_0/0.1)]"
        />

        {canLoop && (
          <>
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-2.5 left-2.5 z-[3] inline-flex h-[26px] items-center gap-[7px] rounded-full bg-background/85 pr-2.5 pl-2 text-xs leading-none font-medium text-foreground opacity-0 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_12%,transparent)] transition-opacity duration-150 ease-out-quint',
                active && 'opacity-100',
                loopState === 'failed' && 'pl-2.5 text-muted-foreground',
              )}
            >
              {loopState === 'playing' && <Play className="size-2.5 fill-current" strokeWidth={0} />}
              {chip}
              {loopState === 'playing' && duration !== null && (
                <span className="text-muted-foreground tabular-nums">{Math.round(duration)} s</span>
              )}
            </span>
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-0.5 overflow-hidden bg-foreground/15 opacity-0 transition-opacity duration-150 ease-out-quint',
                active && loopState !== 'failed' && 'opacity-100',
              )}
            >
              {loopState === 'playing' ? (
                <i
                  key={run}
                  className="block h-full origin-left bg-foreground [animation:manniche-loop-run_var(--loop-d)_linear_infinite]"
                  style={{ ['--loop-d' as string]: `${duration ?? 4}s` }}
                />
              ) : (
                <i className="block h-full w-[30%] bg-foreground/60 [animation:manniche-loop-wait_1.2s_cubic-bezier(0.23,1,0.32,1)_infinite]" />
              )}
            </span>
            <style href="manniche-gallery-card" precedence="default">
              {
                '@keyframes manniche-loop-run { from { transform: scaleX(0) } to { transform: scaleX(1) } } @keyframes manniche-loop-wait { from { transform: translateX(-100%) } to { transform: translateX(340%) } }'
              }
            </style>
          </>
        )}
      </div>

      <div className="grid gap-[9px] px-2 pt-3.5 pb-1.5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Heading className="min-w-0 truncate font-mono text-[15px] leading-[1.25] font-medium tracking-[-0.015em]">
            <a
              href={href}
              onClick={onClick}
              aria-describedby={describedBy}
              className="outline-none before:absolute before:inset-0 before:z-[1] before:rounded-[calc(var(--radius)*2+2px)]"
            >
              {name}
            </a>
          </Heading>
          <Badge id={tierId} variant={tier}>
            {tier === 'pro' ? labels.pro : labels.free}
          </Badge>
        </div>
        {description && (
          <p id={descId} lang={descriptionLang} className="line-clamp-2 min-h-[3em] text-sm leading-normal text-pretty text-muted-foreground">
            {description}
          </p>
        )}
        <div className="flex min-h-[22px] items-center gap-1.5">
          {category && <Badge>{category}</Badge>}
          {isNew && <Badge variant="new">{labels.new}</Badge>}
          <span
            aria-hidden
            className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] leading-none text-muted-foreground opacity-0 transition-opacity duration-150 ease-out-quint group-focus-within/card:opacity-100 group-hover/card:opacity-100 motion-reduce:transition-none [@media(hover:none)]:hidden"
          >
            <kbd className="inline-grid h-5 min-w-5 place-items-center rounded-[5px] bg-muted px-[5px] font-mono text-[11px] text-muted-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent),inset_0_-1.5px_0_rgb(0_0_0/0.18),0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)]">
              ↵
            </kbd>
            {labels.open}
          </span>
        </div>
      </div>
    </article>
  )
}
