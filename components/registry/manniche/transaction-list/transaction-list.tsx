// A list of payments grouped by day: "Today", "Yesterday", then the date, each with the day's net on the right.
// A row is a category glyph, the name, the category and time, and the signed amount in tabular mono with a real
// minus. Money coming in gets a plus, an arrow glyph and the success colour; a pending payment gets a dashed chip
// with a clock, a failed one a filled chip with a cross, a struck-through amount and its reason. None of these
// depends on colour alone. A limit hides the older rows behind a "Show more" button.
// With `onSelect` every row is a button; without it the rows are plain list items.
// Screen readers: each day is a heading followed by a list. Each row is read as one sentence, "Harbour Market,
// −€48.20, pending, Groceries, 12:58", and the visual pieces are hidden so nothing is read twice. Showing more
// rows says how many came in.
// Reduced motion: new rows appear at once instead of rising in.
import { ArrowDown, ChevronDown, Clock3, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useId, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { EASE, formatValue, seriesColor, valueParts, type ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { useAnnounce } from '@/registry/manniche/chart-kit/use-chart'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type Transaction = {
  /** Unique and stable. */
  id: string
  /** Who was paid, or who paid you. */
  name: string
  /** Negative for money out, positive for money in. */
  amount: number
  /** "YYYY-MM-DD", or "YYYY-MM-DDTHH:MM" to show a time. Read as written, without time zone maths. */
  date: string
  /** Shown under the name and used to pick the glyph's colour. */
  category?: string
  /** The glyph's colour. Default from `categories`, else a series colour per category; money in uses --success. */
  color?: string
  /** Replaces the initials (or the arrow for money in) in the glyph. */
  glyph?: ReactNode
  /** "pending" for a payment that has not cleared, "failed" for one that did not go through. */
  status?: 'pending' | 'failed'
  /** A short reason under a failed amount, such as "Card limit reached". */
  note?: string
}

export type TransactionListLabels = {
  /** The name of a day group. `offset` is days before `today`, or null without `today`. */
  day?: (date: string, offset: number | null, locale: string) => string
  pending?: string
  failed?: string
  /** Read after the amount of money that came in. */
  incoming?: string
  /** Read before a day's total. */
  net?: string
  more?: (hidden: number) => string
  less?: string
  /** Read when more rows are shown. */
  shown?: (count: number) => string
  /** The one-line sentence a row is read as. */
  row?: (item: Transaction, parts: { amount: string; status: string; time: string }) => string
  empty?: string
  loading?: string
}

export type TransactionListProps = Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> & {
  /** The payments. Days are sorted newest first; rows keep your order within a day. */
  data: Transaction[]
  /** The accessible name of the list, such as "Recent transactions". */
  label: string
  /** "YYYY-MM-DD" of today, so the first days read "Today" and "Yesterday". Without it every day shows its date. */
  today?: string
  /** The amounts' format. Default two decimals; pass a currency for money. */
  format?: ValueFormat
  /** Colours per category name, such as { Groceries: 'var(--chart-1)' }. */
  categories?: Record<string, string>
  /** Show this many rows and put the rest behind "Show more". Default all. */
  limit?: number
  /** Makes each row a button and is called with its payment. */
  onSelect?: (item: Transaction) => void
  /** The id of the row that is open elsewhere, marked with the signal colour. Needs `onSelect`. */
  selectedId?: string
  /** The level of the day headings. Default 4. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
  /** Show placeholder rows while the data loads. */
  loading?: boolean
  /** What to show when there are no payments. Default a short line. */
  empty?: ReactNode
  /** "compact" tightens the rows. Default follows the tile. */
  density?: 'comfortable' | 'compact'
  labels?: TransactionListLabels
}

const dayName = (date: string, offset: number | null, locale: string) => {
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Yesterday'
  const [y, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replace(',', '')
}

const DEFAULT_LABELS: Required<TransactionListLabels> = {
  day: dayName,
  pending: 'Pending',
  failed: 'Failed',
  incoming: 'in',
  net: 'Net',
  more: (n) => `Show ${n} more`,
  less: 'Show fewer',
  shown: (n) => `${n} more transactions shown`,
  row: (t, p) => [t.name, p.amount, p.status, t.category, p.time].filter(Boolean).join(', '),
  empty: 'No transactions yet.',
  loading: 'Loading transactions',
}

// Row metrics as variables, so a compact tile (or the prop) can swap them in one place.
const METRICS =
  '[--tx-g:44px] [--tx-gr:14px] [--tx-gt:14px] [--tx-ic:18px] [--tx-row:62px] [--tx-gap:14px] [--tx-nm:15px] [--tx-dt:16px] [--tx-db:6px] ' +
  'group-data-[density=compact]/tile:[--tx-g:36px] group-data-[density=compact]/tile:[--tx-gr:11px] group-data-[density=compact]/tile:[--tx-gt:12.5px] ' +
  'group-data-[density=compact]/tile:[--tx-ic:16px] group-data-[density=compact]/tile:[--tx-row:52px] group-data-[density=compact]/tile:[--tx-gap:12px] ' +
  'group-data-[density=compact]/tile:[--tx-nm:14px] group-data-[density=compact]/tile:[--tx-dt:10px] group-data-[density=compact]/tile:[--tx-db:4px]'
const DENSITY_VARS = {
  comfortable: { '--tx-g': '44px', '--tx-gr': '14px', '--tx-gt': '14px', '--tx-ic': '18px', '--tx-row': '62px', '--tx-gap': '14px', '--tx-nm': '15px', '--tx-dt': '16px', '--tx-db': '6px' },
  compact: { '--tx-g': '36px', '--tx-gr': '11px', '--tx-gt': '12.5px', '--tx-ic': '16px', '--tx-row': '52px', '--tx-gap': '12px', '--tx-nm': '14px', '--tx-dt': '10px', '--tx-db': '4px' },
} as Record<string, CSSProperties>

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}

/** Two letters for the glyph: the first letters of the first two words, or the first two of one word. */
function initials(name: string) {
  const words = name.replace(/^refund,\s*/i, '').match(/[\p{L}\p{N}]+/gu) ?? []
  if (!words.length) return '·'
  const [a = '', b = ''] = words
  return (b ? a.slice(0, 1) + b.slice(0, 1) : a.slice(0, 2)).toUpperCase()
}

export function TransactionList({
  data,
  label,
  today,
  format = { decimals: 2 },
  categories,
  limit,
  onSelect,
  selectedId,
  headingLevel = 4,
  loading = false,
  empty,
  density,
  labels: labelsProp,
  className,
  style: styleProp,
  ...rest
}: TransactionListProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const locale = format.locale ?? 'en-GB'
  const reduced = useReducedMotion()
  const { say, region } = useAnnounce()
  const baseId = useId()
  const [expanded, setExpanded] = useState(false)
  // Rows that mount after the first paint (a filter, new data, "Show more") rise in; the first paint is still.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setSettled(true))
    return () => cancelAnimationFrame(r)
  }, [])

  const H = `h${headingLevel}` as 'h4'
  const style = { ...(density ? DENSITY_VARS[density] : null), ...styleProp }
  const autoColors = new Map<string, string>()
  for (const t of data) {
    if (t.category && !categories?.[t.category] && !autoColors.has(t.category) && t.amount <= 0)
      autoColors.set(t.category, seriesColor(autoColors.size))
  }
  const colorOf = (t: Transaction) =>
    t.color ??
    (t.amount > 0 && t.status !== 'failed' ? 'var(--success)' : undefined) ??
    (t.category ? (categories?.[t.category] ?? autoColors.get(t.category)) : undefined) ??
    'var(--muted-foreground)'

  if (loading) {
    return (
      <div role="status" aria-label={labels.loading} className={cn(METRICS, 'grid gap-1', className)} style={style} {...rest}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} aria-hidden className={cn('grid grid-cols-[var(--tx-g)_minmax(0,1fr)_auto] items-center gap-(--tx-gap) p-2', 'min-h-(--tx-row)')}>
            <span className={cn('rounded-[14px] bg-muted motion-safe:animate-pulse', 'size-(--tx-g)')} />
            <span className="grid gap-2">
              <span className="h-3.5 w-2/3 max-w-40 rounded-full bg-muted motion-safe:animate-pulse" />
              <span className="h-3 w-1/3 max-w-24 rounded-full bg-muted motion-safe:animate-pulse" />
            </span>
            <span className="h-3.5 w-16 rounded-full bg-muted motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (!data.length) {
    return (
      <div role="group" aria-label={label} className={cn('grid min-h-[124px] place-items-center px-4 py-8 text-center', className)} style={styleProp} {...rest}>
        {empty ?? <p className="text-[13.5px] text-muted-foreground">{labels.empty}</p>}
      </div>
    )
  }

  // Group by day, newest day first; keep the given order inside a day.
  const groups: { date: string; items: Transaction[] }[] = []
  const byDay = new Map<string, Transaction[]>()
  for (const t of data) {
    const d = t.date.slice(0, 10)
    if (!byDay.has(d)) {
      const items: Transaction[] = []
      byDay.set(d, items)
      groups.push({ date: d, items })
    }
    byDay.get(d)!.push(t)
  }
  groups.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  const total = data.length
  const cap = limit !== undefined && limit < total && !expanded ? limit : total
  const hidden = total - cap
  const todayN = today ? dayNumber(today) : null

  let shown = 0
  let fresh = 0
  const sections = groups.flatMap((g) => {
    if (shown >= cap) return []
    const items = g.items.slice(0, cap - shown)
    shown += items.length
    return [{ ...g, items, all: g.items }]
  })

  const amountSign = { ...format, sign: true }

  return (
    <div role="group" aria-label={label} className={cn(METRICS, 'grid min-w-0', className)} style={style} {...rest}>
      {sections.map((g, gi) => {
        const net = g.all.filter((t) => t.status !== 'failed').reduce((s, t) => s + t.amount, 0)
        const offset = todayN === null ? null : todayN - dayNumber(g.date)
        const headId = `${baseId}-d${gi}`
        return (
          <section key={g.date} aria-labelledby={headId} className="min-w-0">
            <H
              id={headId}
              className={cn(
                'flex items-baseline justify-between gap-3 px-2 text-[13px] leading-[1.3] font-medium text-muted-foreground',
                gi === 0 ? 'pt-0.5' : 'pt-(--tx-dt)',
                'pb-(--tx-db)',
              )}
            >
              <span className="min-w-0 truncate">{labels.day(g.date, offset, locale)}</span>
              <span className="flex-none font-mono text-[11.5px] tabular-nums">
                <span className="sr-only">, {labels.net} </span>
                {formatValue(net, amountSign)}
              </span>
            </H>
            <ul className="grid">
              {g.items.map((t) => {
                const k = fresh
                const animate = settled && !reduced
                if (animate) fresh++
                return (
                  <motion.li
                    key={t.id}
                    initial={animate ? { opacity: 0, y: 6 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: EASE, delay: Math.min(k * 0.03, 0.36) }}
                    className="min-w-0"
                  >
                    <Row
                      item={t}
                      color={colorOf(t)}
                      format={format}
                      labels={labels}
                      onSelect={onSelect}
                      selected={onSelect !== undefined && selectedId === t.id}
                    />
                  </motion.li>
                )
              })}
            </ul>
          </section>
        )
      })}
      {limit !== undefined && limit < total && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => {
            if (!expanded) say(labels.shown(hidden))
            setExpanded(!expanded)
          }}
          className={cn(
            'relative isolate mt-1 inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[14px] px-3 text-[13.5px] font-medium text-foreground',
            'before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-muted before:opacity-60 before:transition-opacity before:duration-150 hover:before:opacity-100',
            'transition-transform duration-150 ease-out-quint active:scale-[0.98] motion-reduce:transition-none motion-reduce:before:transition-none',
          )}
        >
          {expanded ? labels.less : labels.more(hidden)}
          <ChevronDown
            aria-hidden
            className={cn('size-4 transition-transform duration-200 ease-out-quint motion-reduce:transition-none', expanded && 'rotate-180')}
          />
        </button>
      )}
      {region}
    </div>
  )
}

function Row({
  item: t,
  color,
  format,
  labels,
  onSelect,
  selected,
}: {
  item: Transaction
  color: string
  format: ValueFormat
  labels: Required<TransactionListLabels>
  onSelect?: (item: Transaction) => void
  selected: boolean
}) {
  const failed = t.status === 'failed'
  const pending = t.status === 'pending'
  const incoming = t.amount > 0 && !failed
  const p = valueParts(t.amount, { ...format, sign: true })
  const time = t.date.length > 10 ? t.date.slice(11, 16) : ''
  const amount = formatValue(t.amount, { ...format, sign: true })
  const status = failed ? [labels.failed, t.note].filter(Boolean).join(': ') : pending ? labels.pending : incoming ? labels.incoming : ''
  const sentence = labels.row(t, { amount, status, time })
  const unit = p.unit && <span className="text-muted-foreground">{p.unit}</span>

  const body = (
    <>
      <span className="sr-only">{sentence}</span>
      <span
        aria-hidden
        className={cn(
          'grid flex-none place-items-center text-foreground',
          'size-(--tx-g) rounded-(--tx-gr) text-(length:--tx-gt)',
        )}
        style={{ background: `color-mix(in oklab, ${color} 18%, var(--card))`, fontFamily: 'var(--font-display, inherit)', fontWeight: 700 }}
      >
        {t.glyph ?? (incoming ? <ArrowDown className="size-(--tx-ic)" strokeWidth={2} /> : initials(t.name))}
      </span>
      <span aria-hidden className="grid min-w-0 gap-0.5">
        <span className={cn('truncate leading-[1.25] font-medium text-foreground', 'text-(length:--tx-nm)')}>{t.name}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-[1.3] text-muted-foreground">
          <span className="min-w-0 truncate">{[t.category, time].filter(Boolean).join(' · ')}</span>
          {pending && (
            <span className="inline-flex h-[22px] flex-none items-center gap-1 rounded-full px-2 text-[11.5px] font-medium outline-1 -outline-offset-1 outline-dashed outline-[color-mix(in_oklab,var(--foreground)_35%,transparent)]">
              <Clock3 className="size-3" strokeWidth={2.2} />
              {labels.pending}
            </span>
          )}
          {failed && (
            <span
              className="inline-flex h-[22px] flex-none items-center gap-1 rounded-full px-2 text-[11.5px] font-medium"
              style={{
                background: 'color-mix(in oklab, var(--destructive) 13%, var(--card))',
                color: 'color-mix(in oklab, var(--destructive) 85%, var(--foreground))',
              }}
            >
              <X className="size-3" strokeWidth={2.6} />
              {labels.failed}
            </span>
          )}
        </span>
      </span>
      <span aria-hidden className="grid justify-items-end gap-0.5 text-right">
        <span
          className={cn(
            'font-mono leading-[1.2] whitespace-nowrap tabular-nums',
            'text-(length:--tx-nm)',
            failed ? 'font-medium text-muted-foreground line-through decoration-[1.5px]' : 'font-semibold',
          )}
          style={incoming ? { color: 'color-mix(in oklab, var(--success) 85%, var(--foreground))' } : failed ? undefined : { color: 'var(--foreground)' }}
        >
          {p.sign}
          {!p.unitAfter && unit}
          {p.whole}
          {p.fraction}
          {p.unitAfter && <> {unit}</>}
          {p.suffix}
        </span>
        {failed && t.note && <span className="max-w-[24ch] font-mono text-[11px] leading-[1.3] text-muted-foreground">{t.note}</span>}
      </span>
    </>
  )

  const grid = cn(
    'relative grid w-full min-w-0 items-center rounded-[16px] p-2 text-left',
    'min-h-(--tx-row) grid-cols-[var(--tx-g)_minmax(0,1fr)_auto] gap-(--tx-gap)',
  )
  if (!onSelect) return <div className={grid}>{body}</div>
  return (
    <button
      type="button"
      aria-current={selected || undefined}
      onClick={() => onSelect(t)}
      className={cn(
        grid,
        'isolate cursor-pointer before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-muted before:opacity-0 before:transition-opacity before:duration-150 hover:before:opacity-100',
        'transition-transform duration-150 ease-out-quint active:scale-[0.98] motion-reduce:transition-none motion-reduce:before:transition-none',
        selected && 'before:opacity-100',
      )}
    >
      {selected && <span aria-hidden className="absolute top-3 bottom-3 -left-0.5 w-[3px] rounded-full bg-primary" />}
      {body}
    </button>
  )
}
