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
  data: SpendControlData
  labels?: SpendControlLabels
  now?: Date
  currency?: string
  onUpsell?: () => void
  className?: string
}

const L: Required<SpendControlLabels> = {
  title: 'Spend control',
  cards: 'Virtual cards',
  spending: 'Spending this week',
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
    <div className={cn('@container flex w-full gap-3 rounded-2xl bg-background p-3 text-foreground', className)}>
      <nav aria-label={t.navLabel} className="hidden shrink-0 flex-col items-center gap-1 rounded-xl border border-border bg-card p-1.5 @sm:flex">
        {data.rail.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-label={item.label}
            title={item.label}
            aria-current={item.current ? 'page' : undefined}
            className={cn(
              'grid size-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
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
          <DataTile title={t.spending} footer={t.note}>
            <TileFact aside={<DeltaPill value={data.spendingChange} goodWhen="down" />}>
              <BigNumber value={data.spendingTotal} format={money} size="xl" />
            </TileFact>
            <BarChart data={data.spending} label={t.spending} format={money} />
          </DataTile>
        </div>
        <div className="@2xl:col-span-2">
          <DataTile title={data.upsell.title} inverted>
            <p className="text-sm opacity-80">{data.upsell.text}</p>
            <button
              type="button"
              onClick={onUpsell}
              className="mt-4 rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground transition-transform active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {data.upsell.action}
            </button>
          </DataTile>
        </div>
        <div className="@2xl:col-span-2">
          <DataTile title={t.cards}>
            <ul className="flex flex-col gap-3">
              {data.cards.map((c) => {
                const pct = Math.min(100, Math.round((c.spent / c.limit) * 100))
                return (
                  <li key={c.id} className={cn('flex flex-col gap-1.5', c.frozen && 'opacity-60')}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{c.name}</span>
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
                      <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
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
          <DataTile title={t.merchants}>
            <BubbleChart data={data.merchants} label={t.merchants} format={money} yFormat={money} />
          </DataTile>
        </div>
      </div>
    </div>
  )
}
