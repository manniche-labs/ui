// DateRangePicker: a button that shows the chosen range and opens a panel to change it. The panel is exported on its
// own too (DateRangePanel), to sit inline in a page or a tile. On the left, quick ranges (Today, Last 7 days, …) with
// a check on the active one; on the right, two months side by side (one when the panel is narrower than about 640 px).
// Picking days by hand switches the quick range to Custom. The footer has a switch that compares with the period of
// equal length just before, and shows that period, then Cancel and Apply. Nothing is applied until Apply.
//
// Dates are plain local days: every helper below works on year, month and day (new Date(y, m, d)), never on
// milliseconds, so a range never shifts by a day across time zones or daylight saving. Pass and get back Date objects
// at local midnight. Month and weekday names come from Intl in the given `locale`.
//
// Keyboard: the days are one grid with a single tab stop (roving tabindex), across both months. Arrows move a day or a
// week, Home and End go to the start and end of the week, PageUp and PageDown a month (with Shift a year), Enter or
// Space picks. The quick ranges are a radio group (arrows move and pick). In the popover, Tab stays inside, and Esc or
// a click outside closes it without applying and puts focus back on the button.
//
// Screen readers: each month is a grid labelled by its name; each day is a button named by its full date, plus
// "start of range", "end of range", "in range", "today" and so on, and its cell carries aria-selected. A polite status
// says what was picked and how many days it covers.
//
// Motion: the popover rises from its button in 160 ms when opened by pointer; from the keyboard and under reduced
// motion it is instant. Days fade their colour in 150 ms. Nothing else moves.
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { Switch } from '@/registry/manniche/switch/switch'
import {
  addDays,
  addMonths,
  before,
  dayOf,
  daysBetween,
  endOfMonth,
  iso,
  keyOf,
  monthsBetween,
  ordered,
  presetRange,
  previousPeriod,
  sameDay,
  startOfMonth,
  startOfWeek,
  type DateRange,
  type DateRangePreset,
} from '@/registry/manniche/date-range-picker/dates'

export type { DateRange, DateRangePreset }

// ─── Types ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** What Apply hands back. */
export type DateRangeApplyDetail = {
  /** The applied range. */
  range: DateRange
  /** The quick range that was active, or "custom". */
  preset: DateRangePreset
  /** Whether the compare switch was on. */
  compare: boolean
  /** The period of equal length just before the range, whether or not compare is on. */
  previous: DateRange
}

export type DateRangePickerLabels = {
  /** Names the trigger button, read before its text. Default "Date range". */
  trigger: string
  /** The trigger text when nothing is chosen. Default "Pick a date range". */
  placeholder: string
  /** Names the popover. Default "Choose a date range". */
  dialog: string
  /** Names the list of quick ranges. Default "Quick ranges". */
  presets: string
  today: string
  yesterday: string
  last7: string
  last30: string
  thisMonth: string
  lastMonth: string
  custom: string
  /** The month arrows. Defaults "Previous month" and "Next month". */
  previousMonth: string
  nextMonth: string
  /** The switch in the footer. Default "Compare to previous period". */
  compare: string
  /** Before the compared period on the trigger. Default "vs". */
  versus: string
  cancel: string
  apply: string
  /** Added to a day's name for screen readers. */
  rangeStart: string
  rangeEnd: string
  inRange: string
  inComparison: string
  isToday: string
  unavailable: string
  /** Spoken after the first pick; `{date}` is the day. Default "Start {date}. Now pick the end date." */
  pickEnd: string
  /** Spoken when a range is complete. `{range}` and `{count}`. Defaults "{range}, {count} days." and "{range}, 1 day." */
  picked: string
  pickedOne: string
}

const LABELS: DateRangePickerLabels = {
  trigger: 'Date range',
  placeholder: 'Pick a date range',
  dialog: 'Choose a date range',
  presets: 'Quick ranges',
  today: 'Today',
  yesterday: 'Yesterday',
  last7: 'Last 7 days',
  last30: 'Last 30 days',
  thisMonth: 'This month',
  lastMonth: 'Last month',
  custom: 'Custom range',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  compare: 'Compare to previous period',
  versus: 'vs',
  cancel: 'Cancel',
  apply: 'Apply',
  rangeStart: 'start of range',
  rangeEnd: 'end of range',
  inRange: 'in range',
  inComparison: 'in comparison period',
  isToday: 'today',
  unavailable: 'unavailable',
  pickEnd: 'Start {date}. Now pick the end date.',
  picked: '{range}, {count} days.',
  pickedOne: '{range}, 1 day.',
}

const ALL_PRESETS: DateRangePreset[] = ['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth', 'custom']

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type DateRangePanelProps = {
  /** The applied range (controlled). `null` for none. Leave it out to let the panel keep track. */
  value?: DateRange | null
  /** The range applied at the start when not controlled. */
  defaultValue?: DateRange | null
  /** Called with the range when Apply is pressed. */
  onChange?: (range: DateRange) => void
  /** Called on Apply with the range, the active quick range, the compare state and the previous period. */
  onApply?: (detail: DateRangeApplyDetail) => void
  /** Called on Cancel. The panel goes back to the applied range. */
  onCancel?: () => void
  /** Whether comparing to the previous period is on (controlled). Changes are handed back on Apply. */
  compare?: boolean
  /** Whether compare starts on when not controlled. Default false. */
  defaultCompare?: boolean
  /** Called with the new compare state on Apply, when it changed. */
  onCompareChange?: (compare: boolean) => void
  /** Which quick ranges to show, in order. Default all seven. Leave "custom" out to hide it. */
  presets?: DateRangePreset[]
  /** The first day of the week, 0 for Sunday to 6 for Saturday. Default 1 (Monday). */
  weekStartsOn?: Weekday
  /** BCP 47 locale for month and weekday names and the range text, such as "de" or "en-GB". Default "en". */
  locale?: string
  /** The earliest day that can be picked. */
  min?: Date
  /** The last day that can be picked, such as today for data that only goes back. */
  max?: Date
  /** Return true for days that cannot be picked. A range may still run across them. */
  isDateDisabled?: (date: Date) => boolean
  /** The day the quick ranges count from. Default the real today; pass one to pin it in tests and demos. */
  today?: Date
  /** Show one or two months. Default: two, or one when the panel is narrower than about 640 px. */
  months?: 1 | 2
  /** Text for other languages. Missing keys fall back to English. */
  labels?: Partial<DateRangePickerLabels>
  /** Classes for the outer panel. */
  className?: string
}

export type DateRangePickerProps = DateRangePanelProps & {
  /** Whether the popover is open (controlled). */
  open?: boolean
  /** Whether the popover starts open when not controlled. */
  defaultOpen?: boolean
  /** Called with the new open state. */
  onOpenChange?: (open: boolean) => void
  /** Which edge of the button the popover lines up with. Default "start". */
  align?: 'start' | 'end'
  /** Classes for the trigger button. */
  className?: string
  /** Classes for the popover panel. */
  panelClassName?: string
}

const sameRange = (a: DateRange | null | undefined, b: DateRange | null | undefined) =>
  !!a && !!b && sameDay(a.start, b.start) && sameDay(a.end, b.end)

function matchPreset(range: DateRange | null | undefined, today: Date, presets: DateRangePreset[]): DateRangePreset | null {
  if (!range) return null
  return presets.find((p) => p !== 'custom' && sameRange(presetRange(p, today), range)) ?? (presets.includes('custom') ? 'custom' : null)
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m))

// Intl formatters are slow to build, so each locale gets one set.
const formatCache = new Map<string, ReturnType<typeof makeFormats>>()
function makeFormats(locale: string) {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, o)
  return {
    month: f({ month: 'long', year: 'numeric' }),
    weekdayShort: f({ weekday: 'short' }),
    weekdayLong: f({ weekday: 'long' }),
    day: f({ day: 'numeric' }),
    full: f({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    range: f({ day: 'numeric', month: 'short', year: 'numeric' }),
    rangeShort: f({ day: 'numeric', month: 'short' }),
  }
}
function formatsFor(locale: string) {
  let found = formatCache.get(locale)
  if (!found) {
    found = makeFormats(locale)
    formatCache.set(locale, found)
  }
  return found
}
/** "8 – 14 Oct 2026" in the locale's own shape. Drops the year when the whole range is in `thisYear`. */
function rangeText(locale: string, r: DateRange, thisYear?: number) {
  const fm = formatsFor(locale)
  const short = thisYear !== undefined && r.start.getFullYear() === thisYear && r.end.getFullYear() === thisYear
  return (short ? fm.rangeShort : fm.range).formatRange(r.start, r.end)
}

function useControllable<T>(value: T | undefined, initial: T) {
  const [own, setOwn] = useState(initial)
  return [value !== undefined ? value : own, setOwn] as const
}

// The panel's widths: a column of quick ranges (176) beside two 280 px months, or the quick ranges on top.
const SIDE_MIN = 792
const TWO_MIN = 620
type Layout = { months: 1 | 2; side: boolean }
const layoutFor = (width: number): Layout => ({ months: width >= TWO_MIN ? 2 : 1, side: width >= SIDE_MIN })

const BAND = 'bg-[color-mix(in_oklab,var(--primary)_15%,transparent)]'
const BAND_PREVIEW = 'bg-[color-mix(in_oklab,var(--primary)_8%,transparent)]'
const TILE_SHADOW = 'shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]'
const FOCUS = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

// ─── Panel ────────────────────────────────────────────────────────────────────────────────────────────────────────

type InternalPanelProps = DateRangePanelProps & {
  /** Set by the popover, which knows its own width; inline panels measure themselves. */
  layout?: Layout
}

/** The picker on its own: quick ranges, months, compare switch, Cancel and Apply. Fills the width it is given. */
export function DateRangePanel(props: DateRangePanelProps) {
  return <Panel {...props} />
}

function Panel({
  value,
  defaultValue = null,
  onChange,
  onApply,
  onCancel,
  compare,
  defaultCompare = false,
  onCompareChange,
  presets = ALL_PRESETS,
  weekStartsOn = 1,
  locale = 'en',
  min,
  max,
  isDateDisabled,
  today: todayProp,
  months: monthsProp,
  labels: labelsProp,
  className,
  layout: fixedLayout,
}: InternalPanelProps) {
  const L = useMemo(() => ({ ...LABELS, ...labelsProp }), [labelsProp])
  const fm = formatsFor(locale)
  // The clock is read once, when the panel mounts, so a render never sees a different day.
  const [mountedAt] = useState(() => new Date())
  const today = dayOf(todayProp ?? mountedAt)
  const minDay = min ? dayOf(min) : null
  const maxDay = max ? dayOf(max) : null

  const [applied, setApplied] = useControllable<DateRange | null>(value, defaultValue)
  const [appliedCompare, setAppliedCompare] = useControllable<boolean>(compare, defaultCompare)

  // Draft: what the panel shows until Apply.
  const [start, setStart] = useState<Date | null>(applied?.start ?? null)
  const [end, setEnd] = useState<Date | null>(applied?.end ?? null)
  const [preset, setPreset] = useState<DateRangePreset | null>(() => matchPreset(applied, today, presets))
  const [compareOn, setCompareOn] = useState(appliedCompare)
  const [preview, setPreview] = useState<Date | null>(null)
  const [status, setStatus] = useState('')

  const isDisabled = (d: Date) => (!!minDay && before(d, minDay)) || (!!maxDay && before(maxDay, d)) || !!isDateDisabled?.(d)
  const clamp = (d: Date) => (minDay && before(d, minDay) ? minDay : maxDay && before(maxDay, d) ? maxDay : d)

  // Width: the popover passes its layout; inline, the panel measures the room it has.
  const root = useRef<HTMLDivElement>(null)
  const [measured, setMeasured] = useState<Layout>({ months: 2, side: true })
  useLayoutEffect(() => {
    if (fixedLayout) return
    const el = root.current
    if (!el) return
    const update = () => {
      const next = layoutFor(el.getBoundingClientRect().width)
      setMeasured((m) => (m.months === next.months && m.side === next.side ? m : next))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fixedLayout])
  const layout = fixedLayout ?? measured
  const monthCount = monthsProp ?? layout.months

  // The day with the grid's one tab stop, and the first month on show.
  const [focused, setFocused] = useState<Date>(() => clamp(applied?.end ?? today))
  const [view, setView] = useState<Date>(() => {
    const anchor = clamp(applied?.end ?? today)
    const v = addMonths(startOfMonth(anchor), -(monthCount - 1))
    return applied && before(v, startOfMonth(applied.start)) && monthsBetween(applied.start, anchor) < monthCount ? startOfMonth(applied.start) : v
  })

  /** The first month to show so that `d` is on screen, moving as little as possible. */
  const viewFor = (v: Date, d: Date, count = monthCount) => {
    const m = startOfMonth(d)
    if (before(m, v)) return m
    const last = addMonths(v, count - 1)
    return before(last, m) ? addMonths(m, -(count - 1)) : v
  }
  const showMonth = (d: Date) => setView((v) => viewFor(v, d))

  /** Puts the draft back to the applied value: on Cancel, and when a new value comes in from outside. */
  const reset = () => {
    setStart(applied?.start ?? null)
    setEnd(applied?.end ?? null)
    setPreset(matchPreset(applied, today, presets))
    setCompareOn(appliedCompare)
    setPreview(null)
    if (applied) {
      setFocused(clamp(applied.end))
      showMonth(clamp(applied.end))
    }
  }

  // Changes from outside are handled while rendering, not in an effect, so there is no extra paint:
  // a new applied value puts the draft back, and going from two months to one keeps the focused day on show.
  const appliedKey = applied ? `${keyOf(applied.start)}-${keyOf(applied.end)}` : ''
  const [seen, setSeen] = useState({ appliedKey, appliedCompare, monthCount })
  if (seen.appliedKey !== appliedKey || seen.appliedCompare !== appliedCompare || seen.monthCount !== monthCount) {
    setSeen({ appliedKey, appliedCompare, monthCount })
    if (seen.appliedKey !== appliedKey || seen.appliedCompare !== appliedCompare) reset()
    else showMonth(focused)
  }

  const picking = !!start && !end
  const draft: DateRange | null = start && end ? { start, end } : null
  const previous = draft ? previousPeriod(draft) : null

  // Where the band runs: the draft, or while picking the end, from the start to the day under the pointer or focus.
  const shown: Shown | null = draft
    ? { ...draft, preview: false, anchor: null }
    : start
      ? { ...ordered(start, preview ?? start), preview: true, anchor: start }
      : null

  const announce = (r: DateRange) => {
    const count = daysBetween(r.start, r.end) + 1
    setStatus(fill(count === 1 ? L.pickedOne : L.picked, { range: rangeText(locale, r), count }))
  }

  const pick = (d: Date) => {
    if (isDisabled(d)) return
    setFocused(d)
    if (picking && start) {
      const r = ordered(start, d)
      setStart(r.start)
      setEnd(r.end)
      setPreview(null)
      announce(r)
    } else {
      setStart(d)
      setEnd(null)
      setStatus(fill(L.pickEnd, { date: fm.full.format(d) }))
    }
    if (presets.includes('custom')) setPreset('custom')
    else setPreset(null)
  }

  const presetAllowed = (p: DateRangePreset) => {
    if (p === 'custom') return true
    const r = presetRange(p, today)
    return !!r && !isDisabled(r.start) && !isDisabled(r.end)
  }

  const choosePreset = (p: DateRangePreset) => {
    setPreset(p)
    if (p === 'custom') return
    const r = presetRange(p, today)
    if (!r) return
    setStart(r.start)
    setEnd(r.end)
    setPreview(null)
    setFocused(r.end)
    // Show the whole range when it fits, with its end in the last month on show.
    setView(() => {
      const v = addMonths(startOfMonth(r.end), -(monthCount - 1))
      return before(v, startOfMonth(r.start)) ? startOfMonth(r.start) : v
    })
    announce(r)
  }

  // Focus follows the roving day after a key moves it.
  const grids = useRef<HTMLDivElement>(null)
  const moveFocus = useRef(false)
  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    grids.current?.querySelector<HTMLButtonElement>(`[data-date="${iso(focused)}"]`)?.focus()
  }, [focused, view])

  const onGridKey = (e: ReactKeyboardEvent) => {
    let next: Date | null = null
    const big = e.shiftKey ? 12 : 1
    switch (e.key) {
      case 'ArrowLeft':
        next = addDays(focused, -1)
        break
      case 'ArrowRight':
        next = addDays(focused, 1)
        break
      case 'ArrowUp':
        next = addDays(focused, -7)
        break
      case 'ArrowDown':
        next = addDays(focused, 7)
        break
      case 'Home':
        next = startOfWeek(focused, weekStartsOn)
        break
      case 'End':
        next = addDays(startOfWeek(focused, weekStartsOn), 6)
        break
      case 'PageUp':
        next = addMonths(focused, -big)
        break
      case 'PageDown':
        next = addMonths(focused, big)
        break
      case 'Escape':
        // Inline, Esc drops a half-picked range. In the popover, the dialog closes instead.
        if (picking && !fixedLayout) {
          e.preventDefault()
          e.stopPropagation()
          reset()
        }
        return
      default:
        return
    }
    e.preventDefault()
    next = clamp(next)
    moveFocus.current = true
    setFocused(next)
    showMonth(next)
    if (picking) setPreview(next)
  }

  const step = (n: number) => {
    const v = addMonths(view, n)
    setView(v)
    const last = endOfMonth(addMonths(v, monthCount - 1))
    if (before(focused, v) || before(last, focused)) setFocused(clamp(addMonths(focused, n)))
  }
  const canBack = !minDay || before(startOfMonth(minDay), view)
  const canForward = !maxDay || before(addMonths(view, monthCount - 1), startOfMonth(maxDay))

  const apply = () => {
    if (!draft || !previous) return
    if (value === undefined) setApplied(draft)
    if (compare === undefined) setAppliedCompare(compareOn)
    onChange?.(draft)
    if (compareOn !== appliedCompare) onCompareChange?.(compareOn)
    onApply?.({ range: draft, preset: preset ?? 'custom', compare: compareOn, previous })
  }
  const cancel = () => {
    reset()
    onCancel?.()
  }

  // Quick ranges: a radio group, one tab stop, arrows move and pick.
  const shownPresets = presets
  const presetRefs = useRef<(HTMLButtonElement | null)[]>([])
  const picked = preset ? shownPresets.indexOf(preset) : -1
  const activePreset = picked >= 0 ? picked : Math.max(0, shownPresets.findIndex(presetAllowed))
  const onPresetKey = (e: ReactKeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    const n = shownPresets.length
    let to = -1
    if (dir) {
      for (let k = 1; k <= n; k++) {
        const j = (i + dir * k + n) % n
        if (presetAllowed(shownPresets[j])) {
          to = j
          break
        }
      }
    } else if (e.key === 'Home' || e.key === 'End') {
      const order = e.key === 'Home' ? shownPresets.keys() : [...shownPresets.keys()].reverse()
      for (const j of order)
        if (presetAllowed(shownPresets[j])) {
          to = j
          break
        }
    }
    if (to < 0) return
    e.preventDefault()
    presetRefs.current[to]?.focus()
    choosePreset(shownPresets[to])
  }

  const ids = { status: useId(), grid: useId() }
  const thisYear = today.getFullYear()

  return (
    <div
      ref={root}
      className={cn('w-full min-w-0 rounded-[calc(var(--radius)*2+2px)] bg-card text-card-foreground', TILE_SHADOW, className)}
    >
      <div className={cn('flex min-w-0', layout.side ? 'flex-row' : 'flex-col')}>
        {shownPresets.length > 0 && (
          <div
            role="radiogroup"
            aria-label={L.presets}
            className={cn(
              'flex shrink-0',
              layout.side
                ? 'w-44 flex-col gap-0.5 border-r border-border p-2'
                : 'flex-wrap gap-1.5 border-b border-border p-3 sm:px-4',
            )}
          >
            {shownPresets.map((p, i) => {
              const on = preset === p
              const allowed = presetAllowed(p)
              return (
                <button
                  key={p}
                  ref={(el) => {
                    presetRefs.current[i] = el
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!allowed}
                  tabIndex={i === activePreset ? 0 : -1}
                  onClick={() => {
                    choosePreset(p)
                    // Custom by pointer: go straight to the days.
                    if (p === 'custom') {
                      grids.current?.querySelector<HTMLButtonElement>('[data-roving]')?.focus()
                    }
                  }}
                  onKeyDown={(e) => onPresetKey(e, i)}
                  className={cn(
                    'relative flex cursor-pointer items-center gap-1.5 text-left text-[13.5px] font-medium transition-[background-color,color,scale] duration-150 ease-out-quint active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100',
                    FOCUS,
                    layout.side ? 'min-h-10 justify-between rounded-[var(--radius)] px-3' : 'min-h-9 rounded-full px-3',
                    on
                      ? layout.side
                        ? 'bg-muted text-foreground'
                        : 'bg-foreground text-background'
                      : cn('text-muted-foreground hover:bg-muted hover:text-foreground', !layout.side && 'shadow-[inset_0_0_0_1px_var(--border)]'),
                  )}
                >
                  {L[p]}
                  {on && <Check aria-hidden className={cn('shrink-0', layout.side ? 'size-4' : 'size-3.5')} strokeWidth={2.25} />}
                </button>
              )
            })}
          </div>
        )}

        <div
          ref={grids}
          className="min-w-0 flex-1 px-3 pt-3 pb-2 sm:px-4 sm:pt-4"
          onPointerLeave={() => setPreview(null)}
        >
          <div className={cn('grid gap-x-6 gap-y-4', monthCount === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
            {Array.from({ length: monthCount }, (_, i) => {
              const month = addMonths(view, i)
              return (
                <MonthGrid
                  key={keyOf(month)}
                  month={month}
                  idBase={`${ids.grid}-${i}`}
                  title={fm.month.format(month)}
                  prev={
                    i === 0 ? (
                      <NavButton label={L.previousMonth} disabled={!canBack} onClick={() => step(-1)}>
                        <ChevronLeft aria-hidden className="size-4" />
                      </NavButton>
                    ) : null
                  }
                  next={
                    i === monthCount - 1 ? (
                      <NavButton label={L.nextMonth} disabled={!canForward} onClick={() => step(1)}>
                        <ChevronRight aria-hidden className="size-4" />
                      </NavButton>
                    ) : null
                  }
                  weekStartsOn={weekStartsOn}
                  fm={fm}
                  today={today}
                  focused={focused}
                  shown={shown}
                  previous={compareOn ? previous : null}
                  isDisabled={isDisabled}
                  labels={L}
                  onPick={pick}
                  onHover={(d) => picking && setPreview(d)}
                  onKeyDown={onGridKey}
                  onFocusDay={setFocused}
                />
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <Switch label={L.compare} checked={compareOn} onChange={setCompareOn} className="[&_label]:text-[13.5px]" />
          {previous && (
            <span
              className={cn(
                'inline-flex items-center gap-2 text-[13.5px] tabular-nums transition-colors duration-150 motion-reduce:transition-none',
                compareOn ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <i aria-hidden className={cn('h-0.5 w-3 rounded-full bg-[var(--chart-2)]', !compareOn && 'opacity-0')} />
              {rangeText(locale, previous, thisYear)}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={cancel}
            className={cn(
              'inline-flex min-h-10 cursor-pointer items-center rounded-full bg-muted px-4 text-[13.5px] font-medium transition-[background-color,scale] duration-150 ease-out-quint hover:bg-[color-mix(in_oklab,var(--foreground)_12%,var(--card))] active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100',
              FOCUS,
            )}
          >
            {L.cancel}
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!draft}
            className={cn(
              'inline-flex min-h-10 cursor-pointer items-center rounded-full bg-foreground px-5 text-[13.5px] font-medium text-background transition-[opacity,scale] duration-150 ease-out-quint hover:opacity-90 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100',
              FOCUS,
            )}
          >
            {L.apply}
          </button>
        </div>
      </div>
      <span id={ids.status} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {status}
      </span>
    </div>
  )
}

function NavButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out-quint hover:bg-muted hover:text-foreground active:scale-[0.94] disabled:pointer-events-none disabled:opacity-30 motion-reduce:transition-none motion-reduce:active:scale-100',
        FOCUS,
      )}
    >
      {children}
    </button>
  )
}

type Shown = DateRange & { preview: boolean; anchor: Date | null }

type MonthGridProps = {
  month: Date
  idBase: string
  title: string
  prev: ReactNode
  next: ReactNode
  weekStartsOn: number
  fm: ReturnType<typeof makeFormats>
  today: Date
  focused: Date
  shown: Shown | null
  previous: DateRange | null
  isDisabled: (d: Date) => boolean
  labels: DateRangePickerLabels
  onPick: (d: Date) => void
  onHover: (d: Date) => void
  onKeyDown: (e: ReactKeyboardEvent) => void
  onFocusDay: (d: Date) => void
}

function MonthGrid({
  month,
  idBase,
  title,
  prev,
  next,
  weekStartsOn,
  fm,
  today,
  focused,
  shown,
  previous,
  isDisabled,
  labels: L,
  onPick,
  onHover,
  onKeyDown,
  onFocusDay,
}: MonthGridProps) {
  const gridStart = startOfWeek(month, weekStartsOn)
  const last = endOfMonth(month).getDate()
  const titleId = `${idBase}-title`
  const focusInMonth = focused.getMonth() === month.getMonth() && focused.getFullYear() === month.getFullYear()

  return (
    <div className="mx-auto w-full max-w-[280px] min-w-0">
      <div className="mb-1 flex h-10 items-center gap-1">
        {prev ?? <span className="size-10 shrink-0" />}
        <p id={titleId} className="flex-1 text-center text-[14px] font-medium tracking-[-0.01em]">
          {title}
        </p>
        {next ?? <span className="size-10 shrink-0" />}
      </div>
      <table role="grid" aria-labelledby={titleId} className="w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-1">
        <thead>
          <tr>
            {Array.from({ length: 7 }, (_, c) => {
              const d = addDays(gridStart, c)
              return (
                <th
                  key={c}
                  scope="col"
                  abbr={fm.weekdayLong.format(d)}
                  className="h-7 p-0 text-[11.5px] font-medium text-muted-foreground"
                >
                  {fm.weekdayShort.format(d)}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: 7 }, (_, c) => {
                const d = addDays(gridStart, r * 7 + c)
                // Days of other months stay empty, but keep their height, so the panel does not jump between months.
                if (d.getMonth() !== month.getMonth()) return <td key={c} role="gridcell" className="h-10 p-0" />
                const disabled = isDisabled(d)
                const isToday = sameDay(d, today)
                const lo = shown?.start
                const hi = shown?.end
                const isStart = sameDay(d, lo)
                const isEnd = sameDay(d, hi)
                const inside = !!lo && !!hi && before(lo, d) && before(d, hi)
                const single = isStart && isEnd
                const preview = !!shown?.preview
                // While picking, the first day is filled and the day under the pointer or focus gets a ring.
                const filled = preview ? sameDay(d, shown?.anchor) : isStart || isEnd
                const ringEnd = preview && !filled && (isStart || isEnd)
                const inCompare = !!previous && !before(d, previous.start) && !before(previous.end, d)
                const rowStart = c === 0 || d.getDate() === 1
                const rowEnd = c === 6 || d.getDate() === last
                const roving = focusInMonth ? sameDay(d, focused) : false
                // The band: full cell inside the range, half a cell out of each end, rounded where a row ends.
                let band: CSSProperties | null = null
                let bandRound = ''
                if (!single && (inside || isStart || isEnd)) {
                  if (inside) band = { left: 0, right: 0 }
                  else if (isStart && !rowEnd) band = { left: '50%', right: 0 }
                  else if (isEnd && !rowStart) band = { left: 0, right: '50%' }
                  bandRound = cn(inside && rowStart && 'rounded-l-full', inside && rowEnd && 'rounded-r-full')
                }
                const state = [
                  preview ? (filled ? L.rangeStart : null) : isStart ? L.rangeStart : null,
                  isEnd && !preview ? L.rangeEnd : null,
                  inside && !preview ? L.inRange : null,
                  inCompare ? L.inComparison : null,
                  isToday ? L.isToday : null,
                  disabled ? L.unavailable : null,
                ].filter(Boolean)
                const selected = !preview && (isStart || isEnd || inside)
                return (
                  <td key={c} role="gridcell" aria-selected={selected} className="relative p-0">
                    {band && <span aria-hidden className={cn('absolute inset-y-0', preview ? BAND_PREVIEW : BAND, bandRound)} style={band} />}
                    <button
                      type="button"
                      data-date={iso(d)}
                      data-roving={roving || undefined}
                      tabIndex={roving ? 0 : -1}
                      aria-disabled={disabled || undefined}
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={[fm.full.format(d), ...state].join(', ')}
                      onClick={() => onPick(d)}
                      onPointerEnter={() => onHover(d)}
                      onFocus={() => !roving && onFocusDay(d)}
                      onKeyDown={onKeyDown}
                      className={cn(
                        'relative mx-auto grid aspect-square w-full max-w-10 cursor-pointer place-items-center rounded-full text-[13.5px] tabular-nums',
                        'transition-[background-color,color,box-shadow,scale] duration-150 ease-out-quint active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100',
                        FOCUS,
                        filled
                          ? 'bg-primary font-medium text-primary-foreground'
                          : disabled
                            ? 'cursor-not-allowed text-muted-foreground/45 active:scale-100'
                            : 'text-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]',
                        ringEnd && 'shadow-[inset_0_0_0_1.5px_var(--primary)]',
                      )}
                    >
                      {fm.day.format(d)}
                      {isToday && (
                        <i
                          aria-hidden
                          className={cn('absolute bottom-[5px] left-1/2 size-1 -translate-x-1/2 rounded-full', filled ? 'bg-primary-foreground' : 'bg-primary')}
                        />
                      )}
                      {inCompare && !isToday && (
                        <i aria-hidden className="absolute bottom-[5px] left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-[var(--chart-2)]" />
                      )}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Picker: trigger + popover ─────────────────────────────────────────────────────────────────────────────────

const GAP = 8
const EDGE = 8

/** A button that shows the chosen range and opens the date range panel in a popover anchored to it. */
export function DateRangePicker({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  align = 'start',
  className,
  panelClassName,
  value,
  defaultValue = null,
  onChange,
  onApply,
  onCancel,
  compare,
  defaultCompare = false,
  onCompareChange,
  ...panel
}: DateRangePickerProps) {
  const L = { ...LABELS, ...panel.labels }
  const locale = panel.locale ?? 'en'
  const [mountedAt] = useState(() => new Date())
  const today = dayOf(panel.today ?? mountedAt)
  const reduced = useReducedMotion()

  const [applied, setApplied] = useControllable<DateRange | null>(value, defaultValue)
  const [appliedCompare, setAppliedCompare] = useControllable<boolean>(compare, defaultCompare)
  const [open, setOwnOpen] = useControllable<boolean>(openProp, defaultOpen)
  const setOpen = (next: boolean) => {
    setOwnOpen(next)
    onOpenChange?.(next)
  }

  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const [instant, setInstant] = useState(false)
  const [vw, setVw] = useState(() => (typeof window === 'undefined' ? 1024 : document.documentElement.clientWidth))
  const room = vw - 2 * EDGE
  const layout = layoutFor(room)
  const width = layout.side ? SIDE_MIN + 4 : layout.months === 2 ? Math.min(room, 640) : Math.min(room, 360)

  const place = useCallback(() => {
    const t = trigger.current
    const d = dialog.current
    if (!t || !d || !d.open) return
    const r = t.getBoundingClientRect()
    const w = d.offsetWidth
    const h = d.offsetHeight
    const W = document.documentElement.clientWidth
    const H = innerHeight
    const left = Math.min(Math.max(align === 'end' ? r.right - w : r.left, EDGE), Math.max(EDGE, W - w - EDGE))
    const below = H - r.bottom - GAP - EDGE
    const above = r.top - GAP - EDGE
    const up = h > below && above > below
    const top = Math.min(Math.max(up ? r.top - GAP - h : r.bottom + GAP, EDGE), Math.max(EDGE, H - h - EDGE))
    d.style.left = `${left}px`
    d.style.top = `${top}px`
    // The popover grows from the corner nearest its button.
    const x = Math.min(Math.max((align === 'end' ? r.right : r.left) - left, 0), w)
    d.style.transformOrigin = `${x}px ${up ? '100%' : '0'}`
  }, [align])

  useLayoutEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      place()
      d.querySelector<HTMLButtonElement>('[data-roving]')?.focus()
    } else if (!open && d.open) {
      d.close()
    }
  }, [open, place])

  // Track the width even while closed, so the popover opens in the layout that fits now.
  useEffect(() => {
    const onResize = () => setVw(document.documentElement.clientWidth)
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  }, [])
  useEffect(() => {
    if (!open) return
    addEventListener('resize', place)
    addEventListener('scroll', place, true)
    return () => {
      removeEventListener('resize', place)
      removeEventListener('scroll', place, true)
    }
  }, [open, place])
  useLayoutEffect(() => place(), [width, place])

  const close = () => {
    setOpen(false)
    // Back to the button that opened it, after the dialog has left the top layer.
    requestAnimationFrame(() => trigger.current?.focus())
  }

  // Tab and Shift+Tab stay inside the popover.
  const onDialogKey = (e: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== 'Tab') return
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"]), [tabindex="0"]')]
    if (!items.length) return
    const firstItem = items[0]
    const lastItem = items[items.length - 1]
    if (e.shiftKey && document.activeElement === firstItem) {
      e.preventDefault()
      lastItem.focus()
    } else if (!e.shiftKey && document.activeElement === lastItem) {
      e.preventDefault()
      firstItem.focus()
    }
  }

  const presets = panel.presets ?? ALL_PRESETS
  const appliedPreset = matchPreset(applied, today, presets)
  const text = applied ? rangeText(locale, applied) : L.placeholder
  const compared = applied && appliedCompare ? rangeText(locale, previousPeriod(applied), today.getFullYear()) : null

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          // A click from Enter or Space has no pointer position; the popover then opens without motion.
          setInstant(e.detail === 0)
          setOpen(!open)
        }}
        className={cn(
          'inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2.5 rounded-full bg-card px-4 text-[13.5px] font-medium text-card-foreground transition-[background-color,scale] duration-150 ease-out-quint hover:bg-muted active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100',
          TILE_SHADOW,
          FOCUS,
          className,
        )}
      >
        <CalendarDays aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="sr-only">{L.trigger}: </span>
        {appliedPreset && appliedPreset !== 'custom' && (
          <>
            <span className="hidden whitespace-nowrap text-muted-foreground sm:inline">{L[appliedPreset]}</span>
            <span aria-hidden className="hidden h-3.5 w-px bg-border sm:inline-block" />
          </>
        )}
        <span className={cn('min-w-0 truncate tabular-nums', !applied && 'text-muted-foreground')}>{text}</span>
        {compared && (
          <span className="hidden whitespace-nowrap text-muted-foreground tabular-nums md:inline">
            {L.versus} {compared}
          </span>
        )}
        <ChevronDown
          aria-hidden
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out-quint motion-reduce:transition-none', open && 'rotate-180')}
        />
      </button>
      <dialog
        ref={dialog}
        aria-label={L.dialog}
        onKeyDown={onDialogKey}
        onCancel={(e) => {
          e.preventDefault()
          onCancel?.()
          close()
        }}
        onClose={() => open && setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) {
            onCancel?.()
            close()
          }
        }}
        style={{ width }}
        className={cn(
          'fixed inset-auto m-0 max-h-[calc(100dvh-16px)] max-w-none overflow-auto bg-transparent p-0 text-card-foreground backdrop:bg-transparent',
          'rounded-[calc(var(--radius)*2+2px)] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.28),0_4px_12px_-4px_rgba(0,0,0,0.12)]',
          !(instant || reduced) && 'scale-100 opacity-100 transition-[opacity,scale] duration-[160ms] ease-out-quint starting:scale-[0.97] starting:opacity-0',
        )}
      >
        {open && (
          <Panel
            {...panel}
            today={today}
            layout={layout}
            value={applied}
            compare={appliedCompare}
            className={panelClassName}
            onApply={(detail) => {
              if (value === undefined) setApplied(detail.range)
              if (compare === undefined) setAppliedCompare(detail.compare)
              onChange?.(detail.range)
              if (detail.compare !== appliedCompare) onCompareChange?.(detail.compare)
              onApply?.(detail)
              close()
            }}
            onCancel={() => {
              onCancel?.()
              close()
            }}
          />
        )}
      </dialog>
    </>
  )
}
