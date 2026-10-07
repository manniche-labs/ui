// A spend-control screen: icon rail, an upsell panel, virtual cards, the spending bars and a bubble chart of merchants.
// Built from the Tiles primitives. All figures are example data passed in as props.
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BarChart, type BarPoint } from '@/registry/manniche/bar-chart/bar-chart'
import { BubbleChart, type BubbleDatum } from '@/registry/manniche/bubble-chart/bubble-chart'
import { BigNumber, DeltaPill } from '@/registry/manniche/chart-kit/chart-kit'
import { DataTile, TileFact } from '@/registry/manniche/data-tile/data-tile'

export type SpendCard = { id: string; name: string; last4: string; spent: number; limit: number; frozen?: boolean }
export type SpendRailItem = { id: string; label: string; icon: LucideIcon; current?: boolean }

export type SpendControlData = {
  rail: SpendRailItem[]
  cards: SpendCard[]
  spending: BarPoint[]
  spendingTotal: number
  spendingChange: number
  merchants: BubbleDatum[]
  upsell: { title: string; text: string; action: string }
}

export type SpendControlLabels = {
  title?: string
  cards?: string
  spending?: string
  merchants?: string
  limit?: string
  frozen?: string
  note?: string
  navLabel?: string
}

export type SpendControlProps = {
  /** The navigation items, spending bars, virtual cards, merchants and upsell tile to show. */
  data: SpendControlData
  /** Visible text and screen reader text, with English defaults. Keys: title, cards, spending, merchants, limit, frozen, note, navLabel. */
  labels?: SpendControlLabels
  /** The current time. When given, its date is shown in the header. */
  now?: Date
  /** ISO 4217 currency code for all amounts. Default "EUR". */
  currency?: string
  /** Called with no arguments when the upsell tile's button is pressed. */
  onUpsell?: () => void
  /** Classes for the outer container. */
  className?: string
}

const L: Required<SpendControlLabels> = {
  title: 'Spend control',
  cards: 'Virtual cards',
  spending: 'Spending, last 7 days',
  merchants: 'Merchants by visits and average spend',
  limit: 'of',
  frozen: 'Frozen',
  note: 'Example data.',
  navLabel: 'Sections',
}

export function SpendControl({ data, labels, now, currency = 'EUR', onUpsell, className }: SpendControlProps) {
  const t = { ...L, ...labels }
  const money = { currency, decimals: 0 }
  const date = now?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div className={cn('@container w-full rounded-2xl bg-background p-3 text-foreground', className)}>
      {/* Container queries match an ancestor, so the row/column switch sits one level in. */}
      <div className="flex flex-col gap-3 @sm:flex-row">
        <nav aria-label={t.navLabel} className="flex shrink-0 items-center gap-1 self-start overflow-x-auto rounded-xl border border-border bg-card p-1.5 @sm:flex-col @sm:self-stretch">
          {data.rail.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-label={item.label}
              title={item.label}
              aria-current={item.current ? 'page' : undefined}
              className={cn(
                'grid size-10 relative after:-inset-0.5 after:absolute after:content-[""] place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                item.current && 'bg-foreground text-background hover:bg-foreground hover:text-background',
              )}
            >
              <item.icon className="size-4" aria-hidden />
            </a>
          ))}
        </nav>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 @2xl:grid-cols-6">
          <header className="@2xl:col-span-6">
            {date && <p className="text-xs text-muted-foreground">{date}</p>}
            <h2 className="text-lg font-semibold tracking-tight">{t.title}</h2>
          </header>
          <div className="@2xl:col-span-4">
            <DataTile className="h-full" title={t.spending} footer={t.note}>
              <TileFact aside={<DeltaPill value={data.spendingChange} goodWhen="down" />}>
                <BigNumber value={data.spendingTotal} format={money} size="xl" />
              </TileFact>
              <BarChart data={data.spending} label={t.spending} format={money} />
            </DataTile>
          </div>
          <div className="@2xl:col-span-2">
            <DataTile className="h-full" title={data.upsell.title} inverted>
              <p className="text-sm opacity-80">{data.upsell.text}</p>
              <button
                type="button"
                onClick={onUpsell}
                className="mt-4 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {data.upsell.action}
              </button>
            </DataTile>
          </div>
          <div className="@2xl:col-span-2">
            <DataTile className="h-full" title={t.cards}>
              <ul className="flex flex-col gap-3">
                {data.cards.map((c) => {
                  const pct = c.limit > 0 ? Math.min(100, Math.round((c.spent / c.limit) * 100)) : 0
                  return (
                    // A frozen card is muted through its colours, not opacity, so its text keeps 4.5:1.
                    <li key={c.id} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className={cn('truncate font-medium', c.frozen && 'text-muted-foreground')}>{c.name}</span>
                        <span className="tabular-nums text-xs text-muted-foreground">
                          {c.frozen ? t.frozen : `•••• ${c.last4}`}
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={c.name}
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="h-1.5 overflow-hidden rounded-full bg-muted"
                      >
                        <div className={cn('h-full rounded-full', c.frozen ? 'bg-muted-foreground' : 'bg-foreground')} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {c.spent.toLocaleString('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 })} {t.limit}{' '}
                        {c.limit.toLocaleString('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 })}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </DataTile>
          </div>
          <div className="@2xl:col-span-4">
            <DataTile className="h-full" title={t.merchants}>
              <BubbleChart data={data.merchants} label={t.merchants} format={money} yFormat={money} />
            </DataTile>
          </div>
        </div>
      </div>
    </div>
  )
}
