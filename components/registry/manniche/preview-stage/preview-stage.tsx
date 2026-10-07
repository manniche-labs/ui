// Preview stage: shows a demo at a chosen width, like a measuring instrument. A ruler with two caliper jaws and a
// readout says how wide the frame is, and two shutters close in from the sides when the frame is narrower than the
// window. When the frame is wider than the window (1440 in a 700 px column), the content is scaled down to fit with
// a transform, so you still see the whole layout; the note under the window says by how much.
//
// Content is either a page in an iframe (`src`; the theme goes into its URL through `themeParam`, by default as
// `mode=light|dark`) or your own `children`. Plain children get the `dark` class in dark, so token-based content
// follows; to show light content on a dark page, pass a function, which gets the width and theme to apply yourself.
// Above the window: the width switch, a light/dark switch for the content, reload, and (for `src`) open in a new tab.
//
// States: loading shows a thin bar, but only after 300 ms, so a quick load never flashes; ready fades the content
// in; error says so and offers Try again. An iframe on this origin is checked when it loads (the browser's error
// page or an HTTP error status counts as failed), and any iframe that has not loaded `timeout` ms after it came into
// view is an error. Pass `status` to drive the states yourself, and `onReload` to hear Reload and Try again.
//
// Keyboard: the width switch is a radio group (arrow keys). While focus is inside the stage, W steps the width
// (Shift+W back) and T flips the theme; `shortcuts={false}` turns both off, hides their hints and drops
// `aria-keyshortcuts` (WCAG 2.1.4). Width and theme changes, and a failed load, are announced politely. Try again
// hands focus to Reload, since the button it was on goes away.
//
// Motion: jaws and shutters travel 300 ms, the width indicator 280 ms, the switch knob 260 ms, the readout digits
// roll; all transform, all ease-out-quint. A change made from the keyboard jumps straight there, and so does
// everything under reduced motion (the loader then shows a still bar).
import { ArrowUpRight, RotateCw } from 'lucide-react'
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type StageTheme = 'light' | 'dark'
export type StageStatus = 'loading' | 'ready' | 'error'

export type PreviewStageLabels = {
  /** The label of the width switch. */
  width: string
  /** The unit after each width, read out with it ("320 px"). */
  px: string
  dark: string
  light: string
  /** What the switch turns on; read after "Dark Light:". */
  themeSwitch: string
  reload: string
  /** The open-in-a-new-tab link (only with `src`). */
  open: string
  loading: string
  error: string
  retry: string
  /** The note under the window. `percent` is below 100 when the frame is scaled to fit. */
  frame: (width: number, percent: number) => string
  /** Announced when the width changes. */
  announceWidth: (width: number) => string
  /** Announced when the theme changes. */
  announceTheme: (theme: StageTheme) => string
}

const LABELS: PreviewStageLabels = {
  width: 'Width',
  px: 'px',
  dark: 'Dark',
  light: 'Light',
  themeSwitch: 'light theme in the frame',
  reload: 'Reload the preview',
  open: 'Open the preview in a new tab',
  loading: 'Loading the preview',
  error: 'The preview could not load.',
  retry: 'Try again',
  frame: (width, percent) => (percent < 100 ? `Frame ${width} px · shown at ${percent} %` : `Frame ${width} px`),
  announceWidth: (width) => `Frame ${width} px wide`,
  announceTheme: (theme) => (theme === 'light' ? 'Light theme in the frame' : 'Dark theme in the frame'),
}

// The default `themeParam`: puts the theme into the URL as `mode=light|dark` and keeps the rest (relative stays relative).
function modeParam(src: string, theme: StageTheme) {
  const hashAt = src.indexOf('#')
  const hash = hashAt < 0 ? '' : src.slice(hashAt)
  const rest = hashAt < 0 ? src : src.slice(0, hashAt)
  const q = rest.indexOf('?')
  const params = new URLSearchParams(q < 0 ? '' : rest.slice(q + 1))
  params.set('mode', theme)
  return `${q < 0 ? rest : rest.slice(0, q)}?${params}${hash}`
}

export type PreviewStageProps = {
  /** Names the stage and the iframe ("data-tile demo"). */
  title: string
  /** A page to show in an iframe. */
  src?: string
  /** Or your own content. As a function it gets the width and theme; plain nodes get the `dark` class in dark. */
  children?: ReactNode | ((view: { width: number; theme: StageTheme }) => ReactNode)
  /** Builds the iframe URL for a theme. By default it sets `mode=light|dark` in the query and keeps the rest. */
  themeParam?: (src: string, theme: StageTheme) => string
  /** The widths to switch between, in CSS px. */
  widths?: number[]
  /** The width, if you control it. */
  width?: number
  /** The first width when you do not. Defaults to the widest. */
  defaultWidth?: number
  /** Called with the new width when a width is chosen. */
  onWidthChange?: (width: number) => void
  /** The content's theme, if you control it. */
  theme?: StageTheme
  /** The starting theme when the theme is not controlled. */
  defaultTheme?: StageTheme
  /** Called with the new theme when it is switched. */
  onThemeChange?: (theme: StageTheme) => void
  /** Drive the states yourself. Without it, an iframe is loading until it loads, and `children` are ready. */
  status?: StageStatus
  /** Called on Reload and Try again (the stage reloads its own iframe or remounts `children` either way). */
  onReload?: () => void
  /** Milliseconds an iframe may take, counted once it is in view, before the stage shows the error. */
  timeout?: number
  /** A line beside the frame note, e.g. where the demo comes from. */
  caption?: ReactNode
  /** The window's height. Defaults to clamp(300px, 48vh, 540px). */
  height?: number | string
  /** W and T while focus is in the stage. Off: no keys, no hints, no aria-keyshortcuts. */
  shortcuts?: boolean
  /** Every visible and announced string, for other languages. */
  labels?: Partial<PreviewStageLabels>
  /** Classes for the outer group. */
  className?: string
}

const KEYCAP =
  'shadow-[inset_0_-2px_0_color-mix(in_oklab,var(--foreground)_7%,transparent),0_0_0_1px_color-mix(in_oklab,var(--foreground)_10%,transparent),0_1px_2px_rgb(0_0_0/0.06)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.09),inset_0_-2px_0_rgb(0_0_0/0.42),0_0_0_1px_rgb(255_255_255/0.1)]'
const PIT =
  'bg-foreground/[0.045] shadow-[inset_0_1px_2px_rgb(0_0_0/0.06),inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_7%,transparent)] dark:bg-black/35 dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.55),inset_0_0_0_1px_rgb(255_255_255/0.05)]'
const HINT =
  'inline-grid h-5 min-w-5 flex-none place-items-center rounded-[5px] bg-muted px-[5px] font-mono text-[11px] leading-none text-muted-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent),inset_0_-1.5px_0_rgb(0_0_0/0.18),0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)] @max-[35rem]:hidden [@media(hover:none)]:hidden'
const ROUND =
  'inline-grid size-11 flex-none place-items-center rounded-full bg-muted text-muted-foreground transition-transform duration-100 ease-out-quint hover:text-foreground active:translate-y-px motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
const DOTS = 'bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_9%,transparent)_1px,transparent_1.3px)] bg-[size:16px_16px]'

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
}

// An iframe fires `load` even when its page failed. For a page on this origin the stage can look: no document (the
// browser's own error page) or an HTTP error status means it failed. A page on another origin cannot be read, so
// only the timeout can catch it.
// False on the server and while hydrating, true after. The iframe waits for it: one that loads before React has
// hydrated would fire its load event with no listener and sit at loading until the timeout.
const noSubscribe = () => () => {}
const useHydrated = () => useSyncExternalStore(noSubscribe, () => true, () => false)

function frameFailed(frame: HTMLIFrameElement) {
  try {
    if (new URL(frame.src, location.href).origin !== location.origin) return false
    const doc = frame.contentDocument
    if (!doc || doc.URL === 'about:blank') return true
    const nav = frame.contentWindow?.performance.getEntriesByType('navigation')[0] as (PerformanceEntry & { responseStatus?: number }) | undefined
    return (nav?.responseStatus ?? 0) >= 400
  } catch {
    return false
  }
}

/** The readout's digits roll to the new width (transform only). */
function Odometer({ value, still }: { value: number; still: boolean }) {
  const digits = String(value).split('')
  return (
    <span className="inline-flex text-[17px] leading-none font-medium tracking-[-0.03em]">
      {digits.map((d, i) => (
        <span key={digits.length - i} className="relative inline-block h-[1em] w-[0.62em] overflow-hidden">
          <span
            className={cn('absolute inset-x-0 top-0 flex flex-col', !still && 'transition-transform duration-300 ease-out-quint', 'motion-reduce:transition-none')}
            style={{ transform: `translateY(${-Number(d)}em)` }}
          >
            {Array.from({ length: 10 }, (_, n) => (
              <span key={n} className="block h-[1em] text-center">
                {n}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  )
}

/** A framed, measured preview with a width switch, light/dark, reload and open in a new tab. */
export function PreviewStage({
  title,
  src,
  children,
  themeParam: buildSrc = modeParam,
  widths = [320, 768, 1440],
  width: widthProp,
  defaultWidth,
  onWidthChange,
  theme: themeProp,
  defaultTheme = 'dark',
  onThemeChange,
  status,
  onReload,
  timeout = 20000,
  caption,
  height,
  shortcuts = true,
  labels: labelsProp,
  className,
}: PreviewStageProps) {
  const labels = { ...LABELS, ...labelsProp }
  const reduced = useReducedMotion()
  const widthLabelId = useId()
  const box = useRef<HTMLDivElement>(null)
  const group = useRef<HTMLDivElement>(null)
  const reloadButton = useRef<HTMLButtonElement>(null)
  const hydrated = useHydrated()

  const [ownWidth, setOwnWidth] = useState(defaultWidth ?? widths[widths.length - 1])
  const [ownTheme, setOwnTheme] = useState<StageTheme>(defaultTheme)
  const width = widthProp ?? ownWidth
  const theme = themeProp ?? ownTheme
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [instant, setInstant] = useState(false)
  const [reloads, setReloads] = useState(0)
  const [seen, setSeen] = useState(false)
  const [said, setSaid] = useState('')

  // The iframe's own state belongs to one URL and one reload; a new one starts out loading.
  const frameSrc = src ? buildSrc(src, theme) : undefined
  const loadKey = `${frameSrc ?? ''}#${reloads}`
  const [loaded, setLoaded] = useState<{ key: string; state: 'ready' | 'error' } | null>(null)
  const own: StageStatus = !src ? 'ready' : loaded?.key === loadKey ? loaded.state : 'loading'
  const state = status ?? own

  // Same text twice in a row still gets read: the no-break space makes it a change.
  const say = (text: string) => setSaid((prev) => (prev === text ? `${text}\u00a0` : text))

  const still = instant || reduced
  const index = Math.max(0, widths.indexOf(width))
  const scale = size.w ? Math.min(1, size.w / width) : 1
  const open = size.w ? Math.min(1, (width * scale) / size.w) : 1
  const percent = Math.round(scale * 100)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setSize((prev) => (prev.w === el.clientWidth && prev.h === el.clientHeight ? prev : { w: el.clientWidth, h: el.clientHeight }))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // The timeout counts from when the window is first in view, since a lazy iframe off screen never loads.
  useEffect(() => {
    const el = box.current
    if (!el || seen || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setSeen(true)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [seen])

  useEffect(() => {
    if (!src || own !== 'loading' || status || !(seen || typeof IntersectionObserver === 'undefined')) return
    const t = window.setTimeout(() => setLoaded({ key: loadKey, state: 'error' }), timeout)
    return () => window.clearTimeout(t)
  }, [src, own, seen, status, loadKey, timeout])

  const setWidth = (next: number, fromKey: boolean) => {
    setInstant(fromKey)
    if (next === width) return
    if (widthProp === undefined) setOwnWidth(next)
    onWidthChange?.(next)
    say(labels.announceWidth(next))
  }
  const stepWidth = (dir: number, fromKey: boolean, focus = false) => {
    const next = (index + dir + widths.length) % widths.length
    setWidth(widths[next], fromKey)
    if (focus) group.current?.querySelectorAll<HTMLElement>('[role=radio]')[next]?.focus()
  }
  const flipTheme = (fromKey: boolean) => {
    const next: StageTheme = theme === 'light' ? 'dark' : 'light'
    setInstant(fromKey)
    if (themeProp === undefined) setOwnTheme(next)
    onThemeChange?.(next)
    say(labels.announceTheme(next))
  }
  const reload = () => {
    setReloads((n) => n + 1)
    say(labels.loading)
    onReload?.()
  }
  const retry = () => {
    reload()
    reloadButton.current?.focus({ preventScroll: true })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!shortcuts || e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
    const k = e.key.toLowerCase()
    if (k === 'w') {
      e.preventDefault()
      stepWidth(e.shiftKey ? -1 : 1, true)
    } else if (k === 't' && !e.shiftKey) {
      e.preventDefault()
      flipTheme(true)
    }
  }

  const onRadioKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (step) {
      e.preventDefault()
      stepWidth(step, true, true)
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      const to = e.key === 'Home' ? 0 : widths.length - 1
      setWidth(widths[to], true)
      group.current?.querySelectorAll<HTMLElement>('[role=radio]')[to]?.focus()
    }
  }

  const content = typeof children === 'function' ? children({ width, theme }) : children
  const light = theme === 'light'

  return (
    <div role="group" aria-label={title} onKeyDown={onKeyDown} className={cn('@container min-w-0', className)}>
      <style href="manniche-preview-stage" precedence="default">{`
        @keyframes manniche-stage-appear { to { opacity: 1 } }
        @keyframes manniche-stage-indet { from { transform: translateX(-100%) } to { transform: translateX(340%) } }
      `}</style>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex min-w-0 items-center gap-2.5 @max-[35rem]:flex-1">
          <span id={widthLabelId} className="text-[12.5px] leading-none font-medium text-muted-foreground @max-[35rem]:hidden">
            {labels.width}
          </span>
          <div
            ref={group}
            role="radiogroup"
            aria-labelledby={widthLabelId}
            aria-keyshortcuts={shortcuts ? 'W' : undefined}
            onKeyDown={onRadioKey}
            className={cn('relative isolate grid min-w-[216px] auto-cols-fr grid-flow-col rounded-[14px] p-1 @max-[35rem]:min-w-0 @max-[35rem]:flex-1', PIT)}
          >
            <span
              aria-hidden
              className={cn(
                'absolute inset-y-1 left-1 -z-10 rounded-[10px] bg-card dark:bg-[color-mix(in_oklab,var(--card)_80%,white_6%)]',
                KEYCAP,
                !still && 'transition-transform duration-[280ms] ease-out-quint',
                'motion-reduce:transition-none',
              )}
              style={{ width: `calc((100% - 8px) / ${widths.length})`, transform: `translateX(${index * 100}%)` }}
            >
              <i className="absolute top-[7px] right-2 size-[5px] rounded-full bg-primary" />
            </span>
            {widths.map((w, i) => (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={i === index}
                tabIndex={i === index ? 0 : -1}
                onClick={(e: MouseEvent) => setWidth(w, e.detail === 0)}
                className={cn(
                  'relative flex min-h-11 items-center justify-center rounded-[10px] px-2.5 font-mono text-[13px] leading-none font-medium tabular-nums select-none',
                  'transition-transform duration-100 ease-out-quint active:translate-y-px motion-reduce:transition-none',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  i === index ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {w}
                <span className="sr-only"> {labels.px}</span>
              </button>
            ))}
          </div>
          {shortcuts && (
            <span aria-hidden className={HINT}>
              W
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 @max-[35rem]:w-full @max-[35rem]:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={light}
              aria-label={`${labels.dark} ${labels.light}: ${labels.themeSwitch}`}
              aria-keyshortcuts={shortcuts ? 'T' : undefined}
              onClick={(e) => flipTheme(e.detail === 0)}
              className="group/tog inline-flex min-h-11 items-center gap-2.5 rounded-full px-1 text-[13px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className={light ? 'text-muted-foreground' : 'text-foreground'}>{labels.dark}</span>
              <span className={cn('relative h-7 w-[52px] rounded-full', PIT)}>
                <span
                  className={cn(
                    'absolute top-[3px] left-[3px] size-[22px] rounded-full',
                    light ? 'translate-x-6 bg-foreground shadow-[inset_0_-2px_0_rgb(0_0_0/0.25)]' : cn('bg-card', KEYCAP),
                    !still && 'transition-transform duration-[260ms] ease-out-quint',
                    'group-active/tog:scale-[0.96] motion-reduce:transition-none',
                  )}
                />
              </span>
              <span className={light ? 'text-foreground' : 'text-muted-foreground'}>{labels.light}</span>
            </button>
            {shortcuts && (
              <span aria-hidden className={HINT}>
                T
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button ref={reloadButton} type="button" aria-label={labels.reload} onClick={reload} className={ROUND}>
              <RotateCw className="size-4" aria-hidden />
            </button>
            {frameSrc && (
              <a href={frameSrc} target="_blank" rel="noopener noreferrer" aria-label={labels.open} className={ROUND}>
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className={cn('overflow-clip rounded-[calc(var(--radius)*2+2px)] p-3', PIT)}>
        <div aria-hidden className="relative mb-2 h-11">
          <div
            className={cn(
              'absolute inset-x-0 bottom-0 h-3.5 bg-no-repeat [background-position:0_100%,0_100%] [background-size:100%_6px,100%_14px]',
              '[background-image:repeating-linear-gradient(90deg,color-mix(in_oklab,var(--foreground)_28%,transparent)_0_1px,transparent_1px_calc(100%/36)),repeating-linear-gradient(90deg,color-mix(in_oklab,var(--foreground)_50%,transparent)_0_1px,transparent_1px_calc(100%/9))]',
              'after:absolute after:right-0 after:bottom-0 after:h-3.5 after:w-px after:bg-foreground/50',
            )}
          />
          {[-1, 1].map((side) => (
            <div
              key={side}
              className={cn('pointer-events-none absolute inset-0', !still && 'transition-transform duration-300 ease-out-quint', 'motion-reduce:transition-none')}
              style={{ transform: `translateX(${side * open * 50}%)` }}
            >
              <span className="absolute bottom-0 left-1/2 -ml-px h-[26px] w-0.5 rounded-[1px] bg-foreground before:absolute before:-top-px before:-left-1 before:h-0.5 before:w-2.5 before:rounded-[1px] before:bg-foreground" />
            </div>
          ))}
          <div className={cn('absolute top-0.5 left-1/2 flex -translate-x-1/2 items-baseline gap-1.5 rounded-[8px] px-2.5 py-1 font-mono', PIT, 'dark:bg-black/50')}>
            <Odometer value={width} still={still} />
            <span className="text-[11.5px] leading-none font-medium text-muted-foreground">{labels.px}</span>
          </div>
        </div>

        <div
          ref={box}
          data-state={state}
          className={cn(
            'relative isolate overflow-hidden rounded-[14px] bg-background',
            'after:pointer-events-none after:absolute after:inset-0 after:z-[3] after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)]',
            'has-[iframe:focus-visible]:outline-2 has-[iframe:focus-visible]:outline-offset-2 has-[iframe:focus-visible]:outline-ring',
            height === undefined && 'h-[clamp(300px,48vh,540px)]',
          )}
          style={height === undefined ? undefined : { height }}
        >
          <div
            className="absolute top-0 left-1/2 origin-top"
            style={{ width, height: size.h ? size.h / scale : '100%', transform: `translateX(-50%) scale(${scale})` }}
          >
            {frameSrc ? (
              hydrated && (
              <iframe
                key={loadKey}
                src={frameSrc}
                title={title}
                loading="lazy"
                onLoad={(e) => setLoaded({ key: loadKey, state: frameFailed(e.currentTarget) ? 'error' : 'ready' })}
                onError={() => setLoaded({ key: loadKey, state: 'error' })}
                className={cn(
                  'block size-full border-0 transition-opacity duration-200 ease-out-quint motion-reduce:transition-none',
                  state === 'ready' ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              />
              )
            ) : (
              <div
                key={reloads}
                data-theme={theme}
                style={{ colorScheme: theme }}
                className={cn(
                  'size-full overflow-hidden bg-background text-foreground transition-opacity duration-200 ease-out-quint motion-reduce:transition-none',
                  typeof children !== 'function' && theme === 'dark' && 'dark',
                  state === 'ready' ? 'opacity-100' : 'opacity-0',
                )}
              >
                {content}
              </div>
            )}
          </div>

          {state === 'loading' && (
            <div
              className={cn(
                'absolute inset-0 z-[1] grid place-content-center justify-items-center gap-3.5 p-6 text-center text-sm text-muted-foreground opacity-0',
                DOTS,
                '[animation:manniche-stage-appear_150ms_var(--ease-out-quint)_300ms_forwards] motion-reduce:[animation-duration:0s]',
              )}
            >
              <i aria-hidden className="relative block h-0.5 w-40 overflow-hidden rounded-full bg-foreground/12">
                <i className="absolute inset-y-0 left-0 w-[30%] bg-muted-foreground [animation:manniche-stage-indet_1.2s_var(--ease-out-quint)_infinite] motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-50" />
              </i>
              <span>{labels.loading}</span>
            </div>
          )}

          {state === 'error' && (
            <div className={cn('absolute inset-0 z-[1] grid place-content-center justify-items-center gap-3.5 p-6 text-center text-sm text-muted-foreground', DOTS)}>
              <p>{labels.error}</p>
              <button
                type="button"
                onClick={retry}
                className={cn(
                  'inline-flex h-11 items-center gap-2 rounded-full bg-card px-4 text-sm text-foreground',
                  KEYCAP,
                  'transition-transform duration-100 ease-out-quint hover:bg-muted active:translate-y-px motion-reduce:transition-none',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                )}
              >
                <RotateCw className="size-3.5" aria-hidden />
                {labels.retry}
              </button>
            </div>
          )}

          {[-1, 1].map((side) => (
            <div
              key={side}
              aria-hidden
              className={cn(
                'absolute inset-y-0 z-[2] w-1/2 bg-muted dark:bg-[color-mix(in_oklab,var(--background)_70%,black)]',
                'bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--foreground)_6%,transparent)_0_1px,transparent_1px_8px)]',
                'after:absolute after:top-1/2 after:-mt-[17px] after:h-[34px] after:w-1 after:rounded-sm after:bg-foreground/25',
                side < 0
                  ? 'left-0 shadow-[inset_-1px_0_0_color-mix(in_oklab,var(--foreground)_22%,transparent)] after:right-1.5'
                  : 'right-0 shadow-[inset_1px_0_0_color-mix(in_oklab,var(--foreground)_22%,transparent)] after:left-1.5',
                !still && 'transition-transform duration-300 ease-out-quint',
                'motion-reduce:transition-none',
              )}
              style={{ transform: `translateX(${side * open * 100}%)` }}
            />
          ))}
        </div>

        <p className="mx-1 mt-3 mb-0.5 flex justify-between gap-4 text-[13px] leading-normal text-muted-foreground @max-[35rem]:flex-col @max-[35rem]:gap-1">
          <span className="tabular-nums">{labels.frame(width, percent)}</span>
          {caption && <span className="text-right @max-[35rem]:text-left">{caption}</span>}
        </p>
      </div>

      <p role="status" className="sr-only">
        {state === 'error' ? labels.error : said}
      </p>
    </div>
  )
}
