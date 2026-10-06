// A week by the hour: a time rail on the left, one column per day, and the events as coloured blocks with their
// title and time. Events that overlap sit side by side in lanes. Every block is at least 44 px tall, so a
// 15-minute slot stays readable and easy to hit, and the lanes are worked out from that drawn height, so short
// events never cover each other. The "now" line, its dot and its time on the rail are the one thing in --primary.
// When the columns would get narrower than `minDayWidth`, the week turns into day tabs over a single-day grid.
// Screen readers: each day is a list ("Thu 8 Oct, today, now 14:20, 4 events") of events read as "Team sync,
// 14:30 to 15:30, Work". The schedule is one Tab stop: arrow keys walk the events (up and down within a day, left and
// right to the nearest event on the next day), Home and End jump to the first and last, Escape clears. The active
// event is read once through a polite live region and shows the same tooltip as a hover or a tap. With `onSelect`
// the events are buttons in a roving tab order instead.
// Reduced motion: the events are in place at once instead of growing in.
import { useId, useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent, type PointerEvent } from 'react'
import { ChartTooltip } from '@/registry/manniche/chart-kit/chart-kit'
import { EASE_CSS, GRID, WELL, seriesColor } from '@/registry/manniche/chart-kit/chart-utils'
import { useAnnounce, useChartFrame } from '@/registry/manniche/chart-kit/use-chart'
import { TileLegend } from '@/registry/manniche/data-tile/data-tile'
import { cn } from '@/lib/utils'

export type ScheduleEvent = {
  /** Unique and stable. */
  id: string
  title: string
  /** The day, counted from `weekStart`: 0 is the first column. */
  day: number
  /** "HH:MM", 24-hour. */
  start: string
  /** "HH:MM", 24-hour, after `start`. */
  end: string
  /** The id of one of `categories`. */
  category?: string
  /** Overrides the category's colour. */
  color?: string
}

export type ScheduleCategory = {
  id: string
  /** Shown in the legend and read after each event. */
  label: string
  /** Default the series colours in order. */
  color?: string
}

export type WeekScheduleLabels = {
  /** The heading of a day, such as "Mon 5 Oct". */
  day?: (date: Date, locale: string) => string
  today?: string
  now?: (time: string) => string
  /** The event count after a day's name. */
  count?: (n: number) => string
  /** One event, read as a sentence. */
  event?: (e: ScheduleEvent, parts: { start: string; end: string; category: string }) => string
  /** The length in the tooltip. */
  duration?: (minutes: number) => string
  /** Read after the schedule's name. */
  hint?: string
  /** The name of the day tabs. */
  days?: string
}

export type WeekScheduleProps = Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> & {
  /** The events of the week. */
  data: ScheduleEvent[]
  /** The accessible name, such as "This week". */
  label: string
  /** "YYYY-MM-DD" of the first column. */
  weekStart: string
  /** How many days to show. Default 7. */
  days?: number
  /** The categories, in legend order. Without them events use their own `color` or the first series colour. */
  categories?: ScheduleCategory[]
  /** "YYYY-MM-DDTHH:MM". Draws the now line when it falls inside the week and marks that day as today. */
  now?: string
  /** The first hour on the rail. Default 8. */
  startHour?: number
  /** The hour the grid ends. Default 21. */
  endHour?: number
  /** The height of an hour in px. Default 46, or 40 inside a compact tile. */
  hourHeight?: number
  /** "auto" shows the week while each day gets `minDayWidth`, then day tabs. Default "auto". */
  layout?: 'auto' | 'week' | 'day'
  /** The narrowest a day column may get before "auto" switches to day tabs. Default 60. */
  minDayWidth?: number
  /** The day shown in day tabs (controlled). */
  day?: number
  /** The day shown first in day tabs. Default today, else the first day. */
  defaultDay?: number
  onDayChange?: (day: number) => void
  /** Makes each event a button and is called with it. */
  onSelect?: (event: ScheduleEvent) => void
  /** Show the category legend under the grid. Default true. */
  legend?: boolean
  /** Number and date language. Default "en-GB". */
  locale?: string
  labels?: WeekScheduleLabels
}

const DEFAULT_LABELS: Required<WeekScheduleLabels> = {
  day: (d, locale) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d).replace(',', ''),
  today: 'today',
  now: (t) => `Now, ${t}`,
  count: (n) => (n === 0 ? 'no events' : n === 1 ? '1 event' : `${n} events`),
  event: (e, p) => [e.title, `${p.start} to ${p.end}`, p.category].filter(Boolean).join(', '),
  duration: (m) => (m <= 90 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`),
  hint: 'Use the arrow keys to move between events.',
  days: 'Day',
}

const RAIL = 46
const GAP = 6
const MIN_PX = 44
/** Below this block width a title cannot be read, so the block keeps only its colour bar; the name is in the tooltip. */
const MIN_TEXT_PX = 56
/** Below this block height there is room for the title only, not the time under it. */
const TIME_PX = 58

/** A word's width in em in the semibold title face, guessed from its letters so server and client agree. */
function wordEm(word: string) {
  let em = 0
  for (const ch of word) em += /[mwMW@]/.test(ch) ? 0.86 : /[A-Z&]/.test(ch) ? 0.68 : /[iljtfr.,'’:;!|]/.test(ch) ? 0.34 : 0.58
  return em
}

const toMin = (t: string) => {
  const [h = 0, m = 0] = t.split(':').map(Number)
  return h * 60 + m
}
const dayNumber = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}

type Placed = ScheduleEvent & { s: number; e: number; lane: number; lanes: number; color: string; cat: string }
type Tip = { id: string; x: number; y: number; below: boolean; from: 'pointer' | 'key' }

/** Puts overlapping events side by side. Overlap is judged on the drawn block, which is at least 44 px tall. */
function placeDay(events: Placed[], minMinutes: number) {
  const sorted = [...events].sort((a, b) => a.s - b.s || b.e - a.e)
  let cluster: Placed[] = []
  let clusterEnd = -Infinity
  const laneEnds: number[] = []
  const flush = () => {
    const lanes = Math.max(1, laneEnds.length)
    for (const p of cluster) p.lanes = lanes
    cluster = []
    laneEnds.length = 0
  }
  for (const p of sorted) {
    const visualEnd = Math.max(p.e, p.s + minMinutes)
    if (p.s >= clusterEnd) flush()
    let lane = laneEnds.findIndex((end) => end <= p.s)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = visualEnd
    p.lane = lane
    cluster.push(p)
    clusterEnd = Math.max(clusterEnd === -Infinity ? 0 : clusterEnd, visualEnd)
  }
  flush()
  return sorted
}

export function WeekSchedule({
  data,
  label,
  weekStart,
  days = 7,
  categories,
  now,
  startHour = 8,
  endHour = 21,
  hourHeight,
  layout = 'auto',
  minDayWidth = 60,
  day: dayProp,
  defaultDay,
  onDayChange,
  onSelect,
  legend = true,
  locale = 'en-GB',
  labels: labelsProp,
  className,
  style,
  ...rest
}: WeekScheduleProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const { ref, width, drawn, reduced } = useChartFrame<HTMLDivElement>()
  const { ref: bodyRef, height: bodyHeight } = useChartFrame<HTMLDivElement>()
  const { say, region } = useAnnounce()
  const uid = useId()
  const hours = Math.max(1, endHour - startHour)
  const span = hours * 60
  const rh = bodyHeight ? bodyHeight / hours : (hourHeight ?? 46)
  const minMinutes = ((MIN_PX + 4) / rh) * 60

  const startN = dayNumber(weekStart)
  const dates = Array.from({ length: days }, (_, i) => new Date((startN + i) * 86400000))
  const nowDay = now ? dayNumber(now) - startN : -1
  const nowMin = now && now.length > 10 ? toMin(now.slice(11, 16)) : -1
  const today = nowDay >= 0 && nowDay < days ? nowDay : -1
  const nowInGrid = today >= 0 && nowMin >= startHour * 60 && nowMin <= endHour * 60

  const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
  const clock = (min: number) => timeFmt.format(new Date(min * 60000))
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' })

  const catIndex = new Map((categories ?? []).map((c, i) => [c.id, { ...c, color: c.color ?? seriesColor(i) }]))
  const byDay: Placed[][] = Array.from({ length: days }, () => [])
  for (const ev of data) {
    if (ev.day < 0 || ev.day >= days) continue
    // An event wholly outside the shown hours has no place on the grid; one that overlaps an edge is clamped.
    if (toMin(ev.end) <= startHour * 60 || toMin(ev.start) >= endHour * 60) continue
    const c = ev.category ? catIndex.get(ev.category) : undefined
    byDay[ev.day].push({
      ...ev,
      s: toMin(ev.start),
      e: Math.max(toMin(ev.end), toMin(ev.start) + 1),
      lane: 0,
      lanes: 1,
      color: ev.color ?? c?.color ?? seriesColor(0),
      cat: c?.label ?? '',
    })
  }
  const placed = byDay.map((list) => placeDay(list, minMinutes))
  // Reading order inside a day: by start, then lane.
  const ordered = placed.map((list) => [...list].sort((a, b) => a.s - b.s || a.lane - b.lane))
  const all = ordered.flat()

  // Layout and day tabs ------------------------------------------------------------------------------------------
  const colWidth = width ? (width - RAIL - GAP * days) / days : Infinity
  const mode = layout === 'auto' ? (colWidth < minDayWidth ? 'day' : 'week') : layout
  const [innerDay, setInnerDay] = useState(defaultDay ?? (today >= 0 ? today : 0))
  const shownDay = Math.min(days - 1, Math.max(0, dayProp ?? innerDay))
  const setDay = (d: number) => {
    if (dayProp === undefined) setInnerDay(d)
    onDayChange?.(d)
  }
  const columns = mode === 'week' ? Array.from({ length: days }, (_, i) => i) : [shownDay]

  // Active event, tooltip ----------------------------------------------------------------------------------------
  const [active, setActive] = useState<string | null>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  const find = (id: string | null) => all.find((p) => p.id === id)

  const sentence = (p: Placed) => labels.event(p, { start: clock(p.s), end: clock(p.e), category: p.cat })
  const dayName = (d: number) => labels.day(dates[d], locale)

  const tipAt = (el: Element, id: string, from: Tip['from']): Tip | null => {
    const root = el.closest('[data-ws-root]')
    if (!root) return null
    const r = root.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    const below = b.top - r.top < 96
    return { id, x: b.left - r.left + b.width / 2, y: below ? b.bottom - r.top : b.top - r.top, below, from }
  }

  const activate = (root: Element, id: string, speak: boolean) => {
    const p = find(id)
    if (!p) return
    if (mode === 'day' && p.day !== shownDay) setDay(p.day)
    setActive(id)
    if (speak) say(sentence(p))
    // The block may only exist after the day switch, so measure on the next frame.
    requestAnimationFrame(() => {
      const el = root.querySelector(`[data-ev="${CSS.escape(id)}"]`)
      if (!el) return
      setTip(tipAt(el, id, 'key'))
      if (onSelect) (el as HTMLElement).focus()
    })
  }

  // The event the keyboard starts from: the next one still to come, else the first.
  const startEvent = () => {
    const pool = mode === 'day' ? ordered[shownDay] : all
    if (today >= 0) {
      const upcoming = pool.find((p) => p.day > today || (p.day === today && p.e > nowMin))
      if (upcoming) return upcoming
    }
    return pool[0]
  }
  const rovingId = (active && find(active) && (mode === 'week' || find(active)?.day === shownDay) ? active : startEvent()?.id) ?? null

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const root = e.currentTarget
    if (e.key === 'Escape') {
      if (!tip && !active) return
      setTip(null)
      if (!onSelect) setActive(null)
      e.preventDefault()
      return
    }
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const cur = find(onSelect ? rovingId : active)
    let to: Placed | undefined
    if (!cur) to = startEvent()
    else if (e.key === 'Home' || e.key === 'End') {
      const pool = mode === 'day' ? ordered[cur.day] : all
      to = e.key === 'Home' ? pool[0] : pool[pool.length - 1]
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const list = ordered[cur.day]
      const i = list.indexOf(cur)
      to = list[Math.max(0, Math.min(list.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]
    } else {
      const dir = e.key === 'ArrowRight' ? 1 : -1
      for (let d = cur.day + dir; d >= 0 && d < days; d += dir) {
        if (!ordered[d].length) continue
        to = ordered[d].reduce((best, p) => (Math.abs(p.s - cur.s) < Math.abs(best.s - cur.s) ? p : best))
        break
      }
      to ??= cur
    }
    if (to) activate(root, to.id, !onSelect)
  }

  const onPointerOver = (e: PointerEvent<HTMLElement>, id: string) => {
    if (e.pointerType === 'touch') return
    setTip(tipAt(e.currentTarget, id, 'pointer'))
  }
  const onPointerLeave = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return
    setTip((t) => (t?.from === 'pointer' ? null : t))
  }
  // Touch: a tap shows the tooltip, and sliding the finger across the blocks moves it.
  const onTouch = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-ev]')
    if (el) setTip(tipAt(el, el.getAttribute('data-ev') ?? '', 'pointer'))
    else if (e.type === 'pointerdown') setTip(null)
  }

  const tipEvent = find(tip?.id ?? null)
  const nowPct = ((nowMin - startHour * 60) / span) * 100
  const legendItems = [
    ...(categories ?? []).map((c, i) => ({ label: c.label, color: c.color ?? seriesColor(i), shape: 'square' as const })),
    ...(nowInGrid ? [{ label: labels.now(clock(nowMin)), color: 'var(--primary)', shape: 'dot' as const }] : []),
  ]
  const gridCols = { gridTemplateColumns: `${RAIL}px repeat(${columns.length}, minmax(0, 1fr))`, columnGap: GAP } as CSSProperties
  // The width of one day column in px, to decide per block whether its title fits.
  const dayPx = width ? (width - RAIL - GAP * columns.length) / columns.length : Infinity
  let stagger = 0

  return (
    <div
      ref={ref}
      data-ws-root=""
      className={cn(
        'relative grid w-full min-w-0 gap-2.5',
        hourHeight === undefined && '[--rh:46px] group-data-[density=compact]/tile:[--rh:40px]',
        className,
      )}
      style={{ ...(hourHeight !== undefined ? ({ '--rh': `${hourHeight}px` } as CSSProperties) : null), ...style }}
      {...rest}
    >
      {mode === 'week' ? (
        <div aria-hidden className="grid" style={gridCols}>
          <span />
          {columns.map((d) => (
            <span key={d} className="grid min-w-0 justify-items-center gap-0.5 text-center">
              <span className="text-[12.5px] leading-[1.3] font-medium text-muted-foreground">{weekdayFmt.format(dates[d])}</span>
              <DateMark text={dateFmt.format(dates[d])} on={d === today} />
            </span>
          ))}
        </div>
      ) : (
        <DayTabs
          days={days}
          shown={shownDay}
          today={today}
          label={`${label}, ${labels.days}`}
          tabId={(d) => `${uid}-tab${d}`}
          panelId={`${uid}-panel`}
          weekday={(d) => weekdayFmt.format(dates[d])}
          date={(d) => dateFmt.format(dates[d])}
          name={(d) => `${dayName(d)}${d === today ? `, ${labels.today}` : ''}`}
          onPick={(d) => {
            setDay(d)
            setTip(null)
          }}
        />
      )}

      <div
        role={mode === 'day' ? 'tabpanel' : 'group'}
        id={mode === 'day' ? `${uid}-panel` : undefined}
        aria-labelledby={mode === 'day' ? `${uid}-tab${shownDay}` : undefined}
        aria-label={mode === 'day' ? undefined : label}
        aria-describedby={onSelect ? undefined : `${uid}-hint`}
        tabIndex={onSelect || !all.length ? undefined : 0}
        onKeyDown={onKeyDown}
        onPointerDown={onTouch}
        onPointerMove={onTouch}
        onBlur={(e) => {
          if (e.currentTarget.contains(e.relatedTarget)) return
          setTip((t) => (t?.from === 'key' ? null : t))
          setActive(null)
        }}
        className="relative grid touch-pan-y rounded-[14px] outline-offset-4"
        style={gridCols}
      >
        <span id={`${uid}-hint`} className="sr-only">
          {labels.hint}
        </span>
        {/* The rail: hour labels on the lines, and the time of now in the signal colour. */}
        <div ref={bodyRef} aria-hidden className="relative" style={{ height: `calc(var(--rh) * ${hours})` }}>
          {Array.from({ length: hours - 1 }, (_, i) => {
            const h = startHour + i + 1
            // The now pill wins over an hour label it would touch.
            if (nowInGrid && columns.includes(today) && (Math.abs(nowMin - h * 60) / 60) * rh < 20) return null
            return (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 font-mono text-[11px] leading-none text-muted-foreground tabular-nums"
                style={{ top: `${((i + 1) / hours) * 100}%` }}
              >
                {clock(h * 60)}
              </span>
            )
          })}
          {nowInGrid && columns.includes(today) && (
            <span
              className="absolute right-0.5 z-10 -translate-y-1/2 rounded-full bg-primary px-1.5 py-[3px] font-mono text-[10.5px] leading-none font-medium text-primary-foreground tabular-nums"
              style={{ top: `${nowPct}%` }}
            >
              {clock(nowMin)}
            </span>
          )}
        </div>

        {columns.map((d) => {
          const isToday = d === today
          const col = isToday ? 'color-mix(in oklab, var(--foreground) 8%, var(--card))' : WELL
          const name = [dayName(d), isToday && labels.today, isToday && nowInGrid && labels.now(clock(nowMin)), labels.count(ordered[d].length)]
            .filter(Boolean)
            .join(', ')
          return (
            <div key={d} className="relative min-w-0 rounded-[14px]" style={{ background: col, '--col': col } as CSSProperties}>
              <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
                {Array.from({ length: hours - 1 }, (_, i) => {
                  const y = `${((i + 1) / hours) * 100}%`
                  return <line key={i} x1="0" x2="100%" y1={y} y2={y} stroke={GRID} strokeWidth={1} strokeDasharray="2 4" />
                })}
              </svg>
              <ul aria-label={name} className="absolute inset-0">
                {ordered[d].map((p) => {
                  const top = Math.max(0, (p.s - startHour * 60) / span) * 100
                  const bottom = Math.min(1, (p.e - startHour * 60) / span) * 100
                  const k = stagger++
                  const isActive = (tip?.id === p.id && tip.from === 'key') || active === p.id
                  const dur = p.e - p.s
                  const blockW = dayPx / p.lanes - 6
                  const blockH = Math.max(MIN_PX, (dur / 60) * rh - 4)
                  // Too narrow for a readable word: only the colour bar shows; the name is read aloud and in the tooltip.
                  const short = blockH < TIME_PX
                  const small = blockW < 92
                  // The longest word must fit on a line whole, so a title is never cut to "Sta…" or broken as "Desig-n".
                  const room = blockW - (small ? 21 : 23)
                  const longest = Math.max(0, ...p.title.split(/\s+/).map((w) => wordEm(w))) * (small ? 11.5 : 12.5)
                  // The guess is kept a tenth wide, so a near miss drops the text rather than break a word.
                  const bare = blockW < MIN_TEXT_PX || longest * 1.1 > room
                  const inner = (
                    <>
                      <span className="sr-only">{sentence(p)}</span>
                      <i
                        aria-hidden
                        className={cn('absolute left-1.5 w-[3px] rounded-full', short ? 'top-1.5 bottom-1.5' : 'top-2 bottom-2')}
                        style={{ background: p.color }}
                      />
                      {!bare && (
                        <span
                          aria-hidden
                          className={cn(
                            'line-clamp-2 block text-[12.5px] leading-[1.2] font-semibold [overflow-wrap:break-word]',
                            small && 'text-[11.5px] leading-[1.15]',
                          )}
                        >
                          {p.title}
                        </span>
                      )}
                      {!bare && !short && (
                        <span
                          aria-hidden
                          className="mt-0.5 block truncate font-mono text-[10.5px] leading-[1.3] tabular-nums text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]"
                        >
                          <span className="hidden @[92px]:inline">
                            {clock(p.s)}–{clock(p.e)}
                          </span>
                          <span className="hidden @[52px]:inline @[92px]:hidden">{clock(p.s)}</span>
                        </span>
                      )}
                    </>
                  )
                  const box = cn(
                    '@container absolute block overflow-hidden rounded-[11px] text-left text-foreground',
                    bare ? 'p-0' : cn(short ? 'flex flex-col justify-center py-1' : 'py-[7px]', small ? 'pr-1.5 pl-[15px]' : 'pr-2 pl-[15px]'),
                    'shadow-[0_0_0_2px_var(--col)] [transform-origin:top]',
                    isActive && 'outline-2 outline-offset-0 outline-ring',
                  )
                  const boxStyle = {
                    top: `min(calc(${top}% + 2px), calc(100% - ${MIN_PX + 2}px))`,
                    height: `max(${MIN_PX}px, calc(${bottom - top}% - 4px))`,
                    left: `calc(${(p.lane / p.lanes) * 100}% + 3px)`,
                    width: `calc(${100 / p.lanes}% - 6px)`,
                    background: `color-mix(in oklab, ${p.color} 24%, var(--card))`,
                    opacity: drawn ? 1 : 0,
                    transform: drawn ? 'none' : 'scaleY(0.6)',
                    transition: reduced ? 'none' : `opacity 300ms ${EASE_CSS}, transform 300ms ${EASE_CSS}`,
                    transitionDelay: drawn && !reduced ? `${Math.min(k * 15, 300)}ms` : undefined,
                  } as CSSProperties
                  const handlers = {
                    'data-ev': p.id,
                    'data-minutes': dur,
                    onPointerEnter: (e: PointerEvent<HTMLElement>) => onPointerOver(e, p.id),
                    onPointerLeave,
                  }
                  return (
                    <li key={p.id}>
                      {onSelect ? (
                        <button
                          type="button"
                          {...handlers}
                          tabIndex={p.id === rovingId ? 0 : -1}
                          onFocus={(e) => {
                            setActive(p.id)
                            setTip(tipAt(e.currentTarget, p.id, 'key'))
                          }}
                          onClick={() => onSelect(p)}
                          className={cn(box, 'cursor-pointer focus-visible:outline-offset-0')}
                          style={boxStyle}
                        >
                          {inner}
                        </button>
                      ) : (
                        <div {...handlers} className={box} style={boxStyle}>
                          {inner}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              {isToday && nowInGrid && (
                <span aria-hidden className="pointer-events-none absolute inset-x-0 z-10 h-0.5 -translate-y-1/2 bg-primary" style={{ top: `${nowPct}%` }}>
                  <i className="absolute top-1/2 -left-[5px] size-2.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_0_2px_var(--card)]" />
                </span>
              )}
            </div>
          )
        })}
      </div>

      {tipEvent && tip && (
        <ChartTooltip
          open
          x={tip.x}
          y={tip.y}
          bounds={width}
          below={tip.below}
          title={[dayName(tipEvent.day), tipEvent.cat].filter(Boolean).join(' · ')}
          value={tipEvent.title}
          rows={[{ label: `${clock(tipEvent.s)}–${clock(tipEvent.e)}`, value: labels.duration(tipEvent.e - tipEvent.s), color: tipEvent.color }]}
        />
      )}
      {legend && legendItems.length > 0 && <TileLegend items={legendItems} className="mt-1.5" />}
      {region}
    </div>
  )
}

function DateMark({ text, on, small = false }: { text: string; on: boolean; small?: boolean }) {
  return (
    <span
      className={cn(
        'grid place-items-center rounded-full leading-none font-extrabold tabular-nums',
        small ? 'size-8 text-[17px]' : 'size-[38px] text-[22px] group-data-[density=compact]/tile:size-8 group-data-[density=compact]/tile:text-[18px]',
        on ? 'bg-foreground text-card' : 'text-foreground',
      )}
      style={{ fontFamily: 'var(--font-display, inherit)', fontStretch: '88%' }}
    >
      {text}
    </span>
  )
}

function DayTabs({
  days,
  shown,
  today,
  label,
  tabId,
  panelId,
  weekday,
  date,
  name,
  onPick,
}: {
  days: number
  shown: number
  today: number
  label: string
  tabId: (d: number) => string
  panelId: string
  weekday: (d: number) => string
  date: (d: number) => string
  name: (d: number) => string
  onPick: (d: number) => void
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, d: number) => {
    const to =
      e.key === 'ArrowRight' ? (d + 1) % days : e.key === 'ArrowLeft' ? (d - 1 + days) % days : e.key === 'Home' ? 0 : e.key === 'End' ? days - 1 : null
    if (to === null) return
    e.preventDefault()
    onPick(to)
    ;(e.currentTarget.parentElement?.children[to] as HTMLElement | undefined)?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className="-mx-1 flex overflow-x-auto px-1 py-1 [scrollbar-width:none]">
      {Array.from({ length: days }, (_, d) => (
        <button
          key={d}
          type="button"
          role="tab"
          id={tabId(d)}
          aria-selected={d === shown}
          aria-controls={panelId}
          aria-label={name(d)}
          tabIndex={d === shown ? 0 : -1}
          onClick={() => onPick(d)}
          onKeyDown={(e) => onKeyDown(e, d)}
          className="relative grid min-h-11 min-w-11 flex-1 cursor-pointer justify-items-center gap-0.5 rounded-[14px] py-1 focus-visible:outline-offset-0"
        >
          <span aria-hidden className="text-[12px] leading-[1.3] font-medium text-muted-foreground">
            {weekday(d)}
          </span>
          <DateMark text={date(d)} on={d === shown} small />
          <i aria-hidden className={cn('size-1 rounded-full', d === today ? 'bg-primary' : 'bg-transparent')} />
        </button>
      ))}
    </div>
  )
}
