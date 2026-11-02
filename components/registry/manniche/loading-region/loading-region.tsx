// A box that handles the waiting for you. It shows nothing for the first `delay` ms (most answers come faster, and a
// flash of grey is worse than no grey), then a skeleton when you know what the content looks like, or a spinner when
// you do not (a screen that may turn out to be A or B must not wear a skeleton of A). Once an indicator has appeared
// it stays for at least `minDuration`, so it never blinks. When data that is already on screen is fetched again, the
// old data stays and only a small spinner shows. The box keeps `minHeight` in every state, including error and empty,
// so nothing around it jumps.
// For screen readers the box is `aria-busy` while it waits, and a persistent `role="status"` line says "Loading",
// then "Loaded" (or the error), and says nothing at all when the answer came before the delay.
import { LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MotionConfig, motion } from 'motion/react'
import { cn } from '@/lib/utils'

export type LoadingRegionStatus = 'loading' | 'ready' | 'empty' | 'error'

export type LoadingRegionLabels = {
  /** Spoken while the first load runs, and the name of the spinner. Default "Loading". */
  loading?: string
  /** Spoken while data that is already shown is fetched again. Default "Updating". */
  reloading?: string
  /** Spoken when a load that was announced has finished. Default "Loaded". */
  loaded?: string
  /** Shown and spoken when the load failed and no `error` content is given. Default "Could not load this." */
  error?: string
  /** Shown when `status` is "empty" and no `empty` content is given. Default "Nothing here yet." */
  empty?: string
  /** The text of the retry button. Default "Try again". */
  retry?: string
}

export type LoadingRegionProps = {
  /** Where the data is: "loading" (fetching), "ready" (show the children), "empty" (nothing came) or "error". */
  status: LoadingRegionStatus
  /** The real content. It stays on screen while the same region loads again. */
  children: ReactNode
  /**
   * A skeleton with the shape and size of the content. Give it when the layout is known before the data is there;
   * leave it out when it is not, and the region shows a spinner instead.
   */
  skeleton?: ReactNode
  /** The least height of the box in pixels (or any CSS length), kept in every state. Match it to the content. Default 160. */
  minHeight?: number | string
  /** Content for "empty", such as an `EmptyState`. Default is a line of text. */
  empty?: ReactNode
  /** Content for "error". Default is the `labels.error` line. */
  error?: ReactNode
  /** Called by the retry button. With no handler there is no button. */
  onRetry?: () => void
  /** Milliseconds to wait before any indicator shows. Default 300. */
  delay?: number
  /** Milliseconds an indicator that has appeared stays at least. Default 500. */
  minDuration?: number
  /** Text overrides, with English defaults. */
  labels?: LoadingRegionLabels
  /** Classes for the box. */
  className?: string
}

const DEFAULT_LABELS: Required<LoadingRegionLabels> = {
  loading: 'Loading',
  reloading: 'Updating',
  loaded: 'Loaded',
  error: 'Could not load this.',
  empty: 'Nothing here yet.',
  retry: 'Try again',
}

function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden="true" className={cn('motion-safe:animate-spin', className)} />
}

export function LoadingRegion({
  status,
  children,
  skeleton,
  minHeight = 160,
  empty,
  error,
  onRetry,
  delay = 300,
  minDuration = 500,
  labels,
  className,
}: LoadingRegionProps) {
  const t = { ...DEFAULT_LABELS, ...labels }
  const loading = status === 'loading'

  // Has real content been shown? From then on a new load is a reload, and the old data stays.
  const [hadContent, setHadContent] = useState(false)
  // Is an indicator on screen (or held for its least time)? Only a timer turns it on or off, never a render.
  const [indicator, setIndicator] = useState(false)
  // Has the load been announced? Then its end is announced too.
  const [spoke, setSpoke] = useState(false)
  const [prev, setPrev] = useState(status)
  const shownAt = useRef(0)

  if (prev !== status) {
    setPrev(status)
    if (loading) setSpoke(false)
  }

  const waiting = loading || indicator
  if (!waiting && status === 'ready' && !hadContent) setHadContent(true)

  useEffect(() => {
    if (loading) {
      if (indicator) return
      const id = window.setTimeout(() => {
        shownAt.current = performance.now()
        setIndicator(true)
        setSpoke(true)
      }, delay)
      return () => window.clearTimeout(id)
    }
    if (!indicator) return
    const rest = Math.max(0, minDuration - (performance.now() - shownAt.current))
    const id = window.setTimeout(() => setIndicator(false), rest)
    return () => window.clearTimeout(id)
  }, [loading, indicator, delay, minDuration])

  const reload = hadContent && waiting
  const first = waiting && !hadContent

  let body: ReactNode = null
  let key = 'blank'
  if (first) {
    // Before the delay is over the box is simply empty, at full height.
    if (indicator) {
      key = skeleton ? 'skeleton' : 'spinner'
      body = skeleton ?? (
        <div className="flex h-full min-h-[inherit] items-center justify-center gap-2.5 text-sm text-muted-foreground">
          <Spinner className="size-5" />
          <span aria-hidden="true">{t.loading}</span>
        </div>
      )
    }
  } else if (status === 'error') {
    key = 'error'
    body = (
      <div className="flex min-h-[inherit] flex-col items-center justify-center gap-3 px-4 py-6 text-center text-sm text-muted-foreground">
        {error ?? <p>{t.error}</p>}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t.retry}
          </button>
        )}
      </div>
    )
  } else if (status === 'empty') {
    key = 'empty'
    body = (
      <div className="flex min-h-[inherit] items-center justify-center px-4 py-6 text-center text-sm text-muted-foreground">
        {empty ?? <p>{t.empty}</p>}
      </div>
    )
  } else {
    key = 'content'
    body = children
  }

  const announce = indicator
    ? reload
      ? t.reloading
      : t.loading
    : spoke && !loading
      ? status === 'error'
        ? t.error
        : status === 'empty'
          ? t.empty
          : t.loaded
      : ''

  return (
    <MotionConfig reducedMotion="user">
      <div
        aria-busy={waiting}
        className={cn('relative', className)}
        style={{ minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight }}
      >
        <motion.div
          key={key}
          initial={key === 'blank' || key === 'content' ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="min-h-[inherit]"
        >
          {body}
        </motion.div>
        {reload && indicator && (
          <span className="pointer-events-none absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)]">
            <Spinner className="size-4" />
          </span>
        )}
        <div role="status" className="sr-only">
          {announce}
        </div>
      </div>
    </MotionConfig>
  )
}
