// A list split into date groups: Today (overdue rows count as today, with a hint), This week (until Sunday), Later
// and No date. Give your own `groupBy` and `groups` for any other split. Each group has a heading with its count that
// folds the group, and long groups show `pageSize` rows with "Show N more". Empty groups are left out, and an empty
// list shows an empty state. Pair it with `selection-bar`: `onVisibleChange` tells which rows are on screen, so a bulk
// change can ask first when picked rows sit in a folded group or past "Show more".
import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/registry/manniche/empty-state/empty-state'

export type GroupedListGroup = {
  id: string
  label: string
  /** A quiet line beside the heading, such as "Until Sunday 25 Oct". */
  hint?: string
}

export type GroupedListLabels = {
  /** Spoken count after a heading, with {count}. Default "{count} items". */
  count?: string
  /** One row. Default "1 item". */
  countOne?: string
  /** The paging button, with {count} and {total}. Default "Show {count} more of {total}". */
  showMore?: string
  /** Said after paging, with {count}. Default "{count} more shown". */
  shown?: string
  /** Hint on Today when it holds overdue rows, with {count}. Default "Includes {count} overdue". */
  overdue?: string
  /** Hint on This week, with {date}. Default "Until {date}". */
  until?: string
  /** Group names for the date split. */
  today?: string
  week?: string
  later?: string
  none?: string
  /** The empty state. */
  emptyTitle?: string
  emptyDescription?: string
}

export type GroupedListProps<T> = {
  /** The rows, in the order they should show inside each group. */
  items: T[]
  /** A stable key per row. */
  getKey: (item: T) => string
  /** Draws one row. Render the row's content, not an <li>: the list adds that. */
  renderItem: (item: T, info: { group: GroupedListGroup; index: number }) => ReactNode
  /** The date a row is due, for the default date split. Rows without one go in No date. */
  getDate?: (item: T) => Date | string | number | null | undefined
  /** Your own split: return a group id from `groups`. Replaces the date split. */
  groupBy?: (item: T) => string
  /** The groups in the order they show, with their names. Required with groupBy; for the date split it renames or reorders today, week, later and none. */
  groups?: GroupedListGroup[]
  /** The day the date split counts from. Default the day the list first showed. */
  today?: Date
  /** First day of the week for "This week": 0 Sunday, 1 Monday. Default 1. */
  weekStartsOn?: 0 | 1
  /** Rows shown per group before "Show more". Default 50. */
  pageSize?: number
  /** Rows each "Show more" adds. Default 100. */
  moreStep?: number
  /** Folded group ids, controlled. */
  collapsed?: string[]
  /** Folded group ids at first. Default none. */
  defaultCollapsed?: string[]
  /** Called with the folded group ids when a heading is pressed. */
  onCollapsedChange?: (collapsed: string[]) => void
  /** Change it (a filter, a search) to set paging back to the first page. */
  resetKey?: string | number
  /** Called with the keys of the rows on screen, in order, whenever that changes. */
  onVisibleChange?: (keys: string[]) => void
  /** Name of the list for screen readers. */
  label: string
  /** Shown when there are no rows at all. Default a plain empty state. */
  empty?: ReactNode
  /** Heading level of the group headings. Default 3. */
  headingLevel?: 2 | 3 | 4
  /** Where the headings stick while their group scrolls, as a CSS length. Default 0. */
  stickyTop?: string
  /** "card" draws a bordered box; "plain" sits on the page. The sticky headings take the background from `--grouped-list-bg`, so set it (`[--grouped-list-bg:var(--card)]`) when a plain list sits on a card. Default "card". */
  variant?: 'card' | 'plain'
  /** BCP 47 locale for numbers and the "Until" date. Default "en". */
  locale?: string
  /** Visible and spoken text, with English defaults. */
  labels?: GroupedListLabels
  className?: string
}

const DEFAULT_LABELS: Required<GroupedListLabels> = {
  count: '{count} items',
  countOne: '1 item',
  showMore: 'Show {count} more of {total}',
  shown: '{count} more shown',
  overdue: 'Includes {count} overdue',
  until: 'Until {date}',
  today: 'Today',
  week: 'This week',
  later: 'Later',
  none: 'No date',
  emptyTitle: 'Nothing here yet',
  emptyDescription: 'Items you add show up here, grouped by date.',
}

export type DateBucket = 'today' | 'week' | 'later' | 'none'

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** The last day of the week that holds `today`, at midnight. */
export function endOfWeek(today: Date, weekStartsOn: 0 | 1 = 1) {
  const d = startOfDay(today)
  const offset = (d.getDay() - weekStartsOn + 7) % 7
  d.setDate(d.getDate() + (6 - offset))
  return d
}

/** Which date group a date falls in: overdue and today give "today", the rest of this week "week", after it "later". */
export function dateBucket(value: Date | string | number | null | undefined, today = new Date(), weekStartsOn: 0 | 1 = 1): DateBucket {
  if (value === null || value === undefined || value === '') return 'none'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'none'
  const day = startOfDay(date).getTime()
  if (day <= startOfDay(today).getTime()) return 'today'
  if (day <= endOfWeek(today, weekStartsOn).getTime()) return 'week'
  return 'later'
}

/** Sorts rows into groups, keeping their order; leaves out empty groups and rows whose group is not listed. */
export function groupItems<T>(items: T[], groupOf: (item: T) => string, groups: GroupedListGroup[]) {
  const byId = new Map<string, T[]>(groups.map((g) => [g.id, []]))
  for (const item of items) byId.get(groupOf(item))?.push(item)
  return groups.map((group) => ({ group, items: byId.get(group.id) ?? [] })).filter((g) => g.items.length > 0)
}

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m)

/**
 * A list in groups with folding headings and paging. Generic over the row type: give `getKey` and `renderItem`.
 */
export function GroupedList<T>({
  items,
  getKey,
  renderItem,
  getDate,
  groupBy,
  groups: groupsProp,
  today,
  weekStartsOn = 1,
  pageSize = 50,
  moreStep = 100,
  collapsed: collapsedProp,
  defaultCollapsed = [],
  onCollapsedChange,
  resetKey,
  onVisibleChange,
  label,
  empty,
  headingLevel = 3,
  stickyTop = '0px',
  variant = 'card',
  locale = 'en',
  labels: labelsProp,
  className,
}: GroupedListProps<T>) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const baseId = useId()
  const [collapsedState, setCollapsedState] = useState(defaultCollapsed)
  const collapsed = collapsedProp ?? collapsedState
  const [limits, setLimits] = useState<Record<string, number>>({})
  const [said, setSaid] = useState('')
  const focusKey = useRef<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [openedAt] = useState(() => new Date())
  const now = today ?? openedAt
  const dayKey = startOfDay(now).getTime()

  // Paging starts over when the rows are filtered anew.
  const [seenResetKey, setSeenResetKey] = useState(resetKey)
  if (seenResetKey !== resetKey) {
    setSeenResetKey(resetKey)
    setLimits({})
  }

  const grouped = useMemo(() => {
    const day = new Date(dayKey)
    if (groupBy) return groupItems(items, groupBy, groupsProp ?? [])
    const bucketOf = (item: T) => dateBucket(getDate?.(item), day, weekStartsOn)
    const overdue = items.filter((item) => {
      const v = getDate?.(item)
      if (v === null || v === undefined || v === '') return false
      const d = new Date(v instanceof Date ? v.getTime() : v)
      return !Number.isNaN(d.getTime()) && startOfDay(d).getTime() < dayKey
    }).length
    const until = endOfWeek(day, weekStartsOn).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })
    const defaults: GroupedListGroup[] = [
      { id: 'today', label: labels.today, hint: overdue ? fill(labels.overdue, { count: overdue.toLocaleString(locale) }) : undefined },
      { id: 'week', label: labels.week, hint: fill(labels.until, { date: until }) },
      { id: 'later', label: labels.later },
      { id: 'none', label: labels.none },
    ]
    // Your groups rename and reorder the four date groups; ones you leave out keep their default.
    const order = groupsProp?.length
      ? groupsProp.map((g) => ({ ...defaults.find((d) => d.id === g.id), ...g }))
      : defaults
    return groupItems(items, bucketOf, order)
  }, [items, groupBy, groupsProp, getDate, dayKey, weekStartsOn, locale, labels.today, labels.week, labels.later, labels.none, labels.overdue, labels.until])

  // The rows on screen, for selection-bar's hiddenCount.
  const visibleKeys = useMemo(
    () =>
      grouped.flatMap(({ group, items: rows }) =>
        collapsed.includes(group.id) ? [] : rows.slice(0, limits[group.id] ?? pageSize).map(getKey),
      ),
    [grouped, collapsed, limits, pageSize, getKey],
  )
  const visibleSig = visibleKeys.join('\u0000')
  const onVisible = useRef(onVisibleChange)
  useLayoutEffect(() => {
    onVisible.current = onVisibleChange
  })
  useEffect(() => {
    onVisible.current?.(visibleSig ? visibleSig.split('\u0000') : [])
  }, [visibleSig])

  // After "Show more", focus moves to the first new row so the keyboard carries on where it was.
  useEffect(() => {
    if (!focusKey.current) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row-key="${CSS.escape(focusKey.current)}"]`)
    focusKey.current = null
    el?.focus()
  }, [limits])

  const toggle = (id: string) => {
    const next = collapsed.includes(id) ? collapsed.filter((c) => c !== id) : [...collapsed, id]
    if (collapsedProp === undefined) setCollapsedState(next)
    onCollapsedChange?.(next)
  }

  const showMore = (id: string, rows: T[], shown: number) => {
    const add = Math.min(moreStep, rows.length - shown)
    focusKey.current = getKey(rows[shown])
    setLimits((l) => ({ ...l, [id]: shown + add }))
    setSaid(fill(labels.shown, { count: add.toLocaleString(locale) }))
  }

  const Heading = `h${headingLevel}` as 'h3'

  if (items.length === 0 || grouped.length === 0) {
    return (
      <div className={className}>
        {empty ?? <EmptyState variant="plain" title={labels.emptyTitle} description={labels.emptyDescription} />}
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      className={cn(
        'min-w-0',
        variant === 'card' ? 'overflow-clip rounded-2xl border bg-card text-card-foreground [--grouped-list-bg:var(--card)]' : '[--grouped-list-bg:var(--background)]',
        className,
      )}
      style={{ '--grouped-list-top': stickyTop } as CSSProperties}
    >
      <p role="status" className="sr-only">
        {said}
      </p>
      <div role="group" aria-label={label}>
        {grouped.map(({ group, items: rows }, gi) => {
          const open = !collapsed.includes(group.id)
          const shown = Math.min(limits[group.id] ?? pageSize, rows.length)
          const panelId = `${baseId}-${group.id}`
          const count = rows.length === 1 ? labels.countOne : fill(labels.count, { count: rows.length.toLocaleString(locale) })
          return (
            <section key={group.id} aria-label={`${group.label}, ${count}`} className={cn(gi > 0 && 'border-t')}>
              <Heading
                className="sticky top-(--grouped-list-top) z-[1] m-0 bg-[color-mix(in_oklab,var(--grouped-list-bg)_94%,transparent)] backdrop-blur-sm"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => toggle(group.id)}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-2 px-3 text-left outline-none sm:px-4',
                    'hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                  )}
                >
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      'size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
                      !open && '-rotate-90',
                    )}
                  />
                  <span className="text-[13px] font-semibold">{group.label}</span>
                  <span aria-hidden className="rounded-full bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground tabular-nums">
                    {rows.length.toLocaleString(locale)}
                  </span>
                  <span className="sr-only">, {count}</span>
                  {group.hint && <span className="ml-auto min-w-0 truncate pl-2 text-xs text-muted-foreground">{group.hint}</span>}
                </button>
              </Heading>
              {open && (
                <div id={panelId}>
                  <ul className="m-0 list-none divide-y p-0">
                    {rows.slice(0, shown).map((item, index) => {
                      const key = getKey(item)
                      return (
                        <li key={key} data-row-key={key} tabIndex={-1} className="outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                          {renderItem(item, { group, index })}
                        </li>
                      )
                    })}
                  </ul>
                  {shown < rows.length && (
                    <div className="border-t px-3 py-1.5 sm:px-4">
                      <button
                        type="button"
                        onClick={() => showMore(group.id, rows, shown)}
                        className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {fill(labels.showMore, {
                          count: Math.min(moreStep, rows.length - shown).toLocaleString(locale),
                          total: rows.length.toLocaleString(locale),
                        })}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
