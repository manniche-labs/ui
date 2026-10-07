// Filter bar for a gallery: a segmented tier switch (All / Free / Pro / New) and a row of category chips, each with
// its count. Every option is a real link (`hrefFor` builds it, by default `?filter=…&kat=…`), so the bar works with no
// JS at all and Cmd/Ctrl/Shift click opens a filtered view in a new tab. Pass `onChange` and a plain click (or Enter)
// filters in place instead: the link does not navigate and you get the next state.
//
// The counts are yours: pass them for the current state, so a category with no hits under a tier can show its 0
// (keep the chosen one in the list, so the empty grid below can say why). The bar never invents a number.
//
// Keyboard: Tab walks the tiers, then the chips. Keys 1 to 4 pick a tier from anywhere on the page (not while typing
// in a field or with a dialog open); `shortcuts={false}` turns them off, which also hides their hints and drops
// `aria-keyshortcuts` (WCAG 2.1.4). After a change, focus stays on the option you chose, even if your list re-sorts.
//
// The chip row scrolls sideways when it overflows, fading at the edge that has more. The round arrow keys beside it
// are a mouse helper only (hidden from screen readers and Tab, since the chips themselves are reachable); they
// appear only when the row overflows and there is a fine pointer. The chosen chip is kept in view without scrolling
// the page.
//
// Motion: the tier indicator slides to the chosen tier (transform, 280 ms, ease-out-quint), keys and chips sink 1 px
// on press. A change made from the keyboard jumps straight there, and so does everything under reduced motion.
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type FilterTier = 'all' | 'free' | 'pro' | 'new'

export type FilterState = {
  /** The tier filter. */
  filter: FilterTier
  /** The chosen category, or null for all categories. */
  category: string | null
}

export type FilterBarLabels = {
  /** The label above the tier switch (it names the navigation landmark). */
  filter: string
  /** The label above the chips (it names the navigation landmark). */
  category: string
  all: string
  free: string
  pro: string
  new: string
  /** The first chip, for all categories. */
  allCategories: string
}

const LABELS: FilterBarLabels = {
  filter: 'Filter',
  category: 'Category',
  all: 'All',
  free: 'Free',
  pro: 'Pro',
  new: 'New',
  allCategories: 'all',
}

const TIERS: FilterTier[] = ['all', 'free', 'pro', 'new']

export type FilterBarProps = {
  /** The current filter and category. Read it from the URL on the server so the bar renders right without JS. */
  value: FilterState
  /** How many items each tier holds for the current category. */
  counts: Record<FilterTier, number>
  /** The category chips in the order to show them, each with its count for the current tier (0 is fine). */
  categories: { name: string; count: number }[]
  /** The count on the "all" chip. Defaults to the sum of the category counts. */
  allCount?: number
  /** Builds the link for a state. Defaults to `?filter=<tier>&kat=<category>`. */
  hrefFor?: (next: FilterState) => string
  /** Filter in place: a plain click or Enter calls this instead of following the link. */
  onChange?: (next: FilterState) => void
  /** Keys 1 to 4 pick a tier from anywhere on the page. Off: no keys, no hints, no aria-keyshortcuts. */
  shortcuts?: boolean
  /** Every visible string, for other languages. */
  labels?: Partial<FilterBarLabels>
  className?: string
}

function defaultHref({ filter, category }: FilterState) {
  const p = new URLSearchParams({ filter })
  if (category) p.set('kat', category)
  return `?${p}`
}

const isModified = (e: MouseEvent) => e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
}

function modalOpen() {
  try {
    return document.querySelector('dialog:modal') !== null
  } catch {
    return document.querySelector('dialog[open]') !== null
  }
}

/** Tier switch and category chips as real links, with counts from you and focus that stays put. */
export function FilterBar({
  value,
  counts,
  categories,
  allCount,
  hrefFor = defaultHref,
  onChange,
  shortcuts = true,
  labels: labelsProp,
  className,
}: FilterBarProps) {
  const labels = { ...LABELS, ...labelsProp }
  const reduced = useReducedMotion()
  const filterId = useId()
  const categoryId = useId()
  const root = useRef<HTMLDivElement>(null)
  const row = useRef<HTMLElement>(null)
  const seg = useRef<HTMLElement>(null)
  const pendingFocus = useRef<string | null>(null)
  const [instant, setInstant] = useState(false)
  const [edge, setEdge] = useState({ overflow: false, start: true, end: true })

  const tierIndex = Math.max(0, TIERS.indexOf(value.filter))
  const chipTotal = allCount ?? categories.reduce((sum, c) => sum + c.count, 0)
  const chipSignature = categories.map((c) => `${c.name}:${c.count}`).join('|')

  const choose = (next: FilterState, focusKey: string, e: MouseEvent<HTMLAnchorElement>) => {
    if (!onChange || e.defaultPrevented || isModified(e)) return
    e.preventDefault()
    // detail 0: Enter or a shortcut, not a pointer. Keyboard changes jump instead of slide.
    setInstant(e.detail === 0)
    if (next.filter === value.filter && next.category === value.category) return
    if (document.activeElement === e.currentTarget) pendingFocus.current = focusKey
    onChange(next)
  }

  // If the change re-sorted or rebuilt the options, put focus back on the one that was chosen.
  useLayoutEffect(() => {
    const key = pendingFocus.current
    pendingFocus.current = null
    if (!key) return
    const target = root.current?.querySelector<HTMLElement>(`[data-filter-key="${CSS.escape(key)}"]`)
    if (target && document.activeElement !== target && (document.activeElement === document.body || document.activeElement === null)) {
      target.focus({ preventScroll: true })
    }
  }, [value.filter, value.category])

  // Keep the chosen chip inside the row without scrolling the page.
  useLayoutEffect(() => {
    const el = row.current
    if (!el) return
    const on = el.querySelector<HTMLElement>('[aria-current="page"]')
    if (!on || !value.category) {
      el.scrollLeft = 0
      return
    }
    const left = on.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft
    const right = left + on.offsetWidth
    if (right <= el.clientWidth - 24) el.scrollLeft = 0
    else if (left < el.scrollLeft || right > el.scrollLeft + el.clientWidth) el.scrollLeft = Math.max(0, left - 24)
  }, [value.category, value.filter, categories.length])

  // Which ends of the chip row have more, and whether it overflows at all.
  useEffect(() => {
    const el = row.current
    if (!el) return
    const measure = () => {
      const room = el.scrollWidth - el.clientWidth
      const next = { overflow: room > 2, start: el.scrollLeft <= 2, end: el.scrollLeft >= room - 2 }
      setEdge((prev) => (prev.overflow === next.overflow && prev.start === next.start && prev.end === next.end ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    el.addEventListener('scroll', measure, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', measure)
    }
  }, [chipSignature])

  // Keys 1–4 pick a tier: clicking its link keeps one path for links, onChange and focus.
  useEffect(() => {
    if (!shortcuts) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey || !/^[1-4]$/.test(e.key)) return
      if (isTyping(e.target) || modalOpen()) return
      const link = seg.current?.querySelectorAll<HTMLAnchorElement>('a')[Number(e.key) - 1]
      if (!link) return
      e.preventDefault()
      link.click()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shortcuts])

  const jog = (dir: -1 | 1) => {
    const el = row.current
    if (!el) return
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: reduced ? 'auto' : 'smooth' })
  }

  const tierLabel: Record<FilterTier, string> = { all: labels.all, free: labels.free, pro: labels.pro, new: labels.new }
  const chip = (name: string | null, count: number) => {
    const next = { filter: value.filter, category: name }
    const on = value.category === name
    const key = `c:${name ?? ''}`
    return (
      <a
        key={key}
        href={hrefFor(next)}
        data-filter-key={key}
        aria-current={on ? 'page' : undefined}
        onClick={(e) => choose(next, key, e)}
        className={cn(
          'inline-flex h-11 flex-none items-center gap-[7px] rounded-full px-4 font-mono text-[12.5px] leading-none font-medium whitespace-nowrap',
          'transition-transform duration-100 ease-out-quint active:translate-y-px motion-reduce:transition-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          on
            ? 'bg-foreground text-background shadow-[inset_0_1px_0_color-mix(in_oklab,var(--background)_30%,transparent),inset_0_-2px_0_rgb(0_0_0/0.25)]'
            : 'bg-card text-muted-foreground shadow-[inset_0_-2px_0_color-mix(in_oklab,var(--foreground)_6%,transparent),0_0_0_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)] hover:bg-muted hover:text-foreground dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06),inset_0_-2px_0_rgb(0_0_0/0.38),0_0_0_1px_rgb(255_255_255/0.08)]',
        )}
      >
        {name ?? labels.allCategories}
        <span className={cn('tabular-nums', on ? 'text-background/70' : 'text-muted-foreground')}>{count}</span>
      </a>
    )
  }

  return (
    <div ref={root} className={cn('@container min-w-0', className)}>
      <div className="grid min-w-0 gap-x-8 gap-y-5 @min-[68rem]:grid-cols-[auto_minmax(0,1fr)]">
      <div className="min-w-0">
        <span id={filterId} className="mb-[9px] ml-0.5 block text-[12.5px] leading-none font-medium text-muted-foreground">
          {labels.filter}
        </span>
        <nav
          ref={seg}
          aria-labelledby={filterId}
          style={{ '--i': tierIndex } as CSSProperties}
          className={cn(
            'relative isolate grid auto-cols-fr grid-flow-col rounded-[14px] p-1 @min-[45rem]:min-w-[520px]',
            'bg-foreground/[0.045] shadow-[inset_0_1px_2px_rgb(0_0_0/0.06),inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_7%,transparent)]',
            'dark:bg-black/35 dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.55),inset_0_0_0_1px_rgb(255_255_255/0.05)]',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'absolute inset-y-1 left-1 -z-10 w-[calc((100%-8px)/4)] translate-x-[calc(var(--i)*100%)] rounded-[10px] bg-card',
              'shadow-[inset_0_-2px_0_color-mix(in_oklab,var(--foreground)_7%,transparent),0_0_0_1px_color-mix(in_oklab,var(--foreground)_10%,transparent),0_1px_2px_rgb(0_0_0/0.06)]',
              'dark:bg-[color-mix(in_oklab,var(--card)_80%,white_6%)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.09),inset_0_-2px_0_rgb(0_0_0/0.42),0_0_0_1px_rgb(255_255_255/0.1)]',
              !instant && 'transition-transform duration-[280ms] ease-out-quint',
              'motion-reduce:transition-none',
            )}
          >
            <i className="absolute top-[7px] right-2 size-[5px] rounded-full bg-primary" />
          </span>
          {TIERS.map((tier, i) => {
            const next = { filter: tier, category: value.category }
            const on = tier === value.filter
            const key = `t:${tier}`
            return (
              <a
                key={tier}
                href={hrefFor(next)}
                data-filter-key={key}
                aria-current={on ? 'page' : undefined}
                aria-keyshortcuts={shortcuts ? String(i + 1) : undefined}
                onClick={(e) => choose(next, key, e)}
                className={cn(
                  'relative flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] px-2 text-sm whitespace-nowrap select-none @min-[45rem]:gap-2 @min-[45rem]:px-3.5',
                  'transition-transform duration-100 ease-out-quint active:translate-y-px motion-reduce:transition-none',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {shortcuts && (
                  <span
                    aria-hidden
                    className="hidden h-5 min-w-5 place-items-center rounded-[5px] bg-muted px-[5px] font-mono text-[11px] leading-none text-muted-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent),inset_0_-1.5px_0_rgb(0_0_0/0.18),0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)] @min-[45rem]:inline-grid [@media(hover:none)]:hidden"
                  >
                    {i + 1}
                  </span>
                )}
                {tierLabel[tier]}
                <span className="font-mono text-[11.5px] leading-none font-medium text-muted-foreground tabular-nums">{counts[tier]}</span>
              </a>
            )
          })}
        </nav>
      </div>

      <div className="min-w-0">
        <span id={categoryId} className="mb-[9px] ml-0.5 block text-[12.5px] leading-none font-medium text-muted-foreground">
          {labels.category}
        </span>
        <div className="flex min-w-0 items-center gap-2.5">
          <nav
            ref={row}
            aria-labelledby={categoryId}
            style={{ '--fl': edge.start ? '0px' : '40px', '--fr': edge.end ? '0px' : '56px' } as CSSProperties}
            className="-mt-1.5 -mb-2 -ml-1.5 flex min-w-0 flex-1 gap-1.5 overflow-x-auto overscroll-x-contain px-1.5 pt-1.5 pb-2 [scrollbar-width:none] [scroll-padding-inline:48px_64px] [mask-image:linear-gradient(90deg,transparent,#000_var(--fl),#000_calc(100%-var(--fr)),transparent)] [&::-webkit-scrollbar]:hidden"
          >
            {chip(null, chipTotal)}
            {categories.map((c) => chip(c.name, c.count))}
          </nav>
          {edge.overflow && (
            <div aria-hidden className="flex flex-none gap-1.5 @max-[35rem]:hidden [@media(hover:none)]:hidden">
              {([-1, 1] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  tabIndex={-1}
                  disabled={dir === -1 ? edge.start : edge.end}
                  onClick={() => jog(dir)}
                  className={cn(
                    'inline-grid size-11 place-items-center rounded-full bg-card text-muted-foreground',
                    'shadow-[inset_0_-2px_0_color-mix(in_oklab,var(--foreground)_6%,transparent),0_0_0_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06),inset_0_-2px_0_rgb(0_0_0/0.38),0_0_0_1px_rgb(255_255_255/0.08)]',
                    'transition-transform duration-100 ease-out-quint hover:bg-muted hover:text-foreground active:translate-y-px disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none',
                  )}
                >
                  {dir === -1 ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
