// A wallet screen in Tiles: balance, a fanned stack of payment cards, cash flow, a spending donut and subscriptions.
// Compose-only: every chart is a Manniche primitive; the screen owns layout and copy.
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BigNumber, DeltaPill, Pills } from '@/registry/manniche/chart-kit/chart-kit'
import { formatValue, type ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'
import { BarChart, type BarPoint } from '@/registry/manniche/bar-chart/bar-chart'
import { CardStack, type StackCard } from '@/registry/manniche/card-stack/card-stack'
import { Donut, type DonutDatum } from '@/registry/manniche/donut/donut'

export type WalletSubscription = { id: string; name: string; amount: number; renews: string }
export type WalletPeriod = { id: string; label: string; long: string; flow: BarPoint[]; spending: DonutDatum[] }

export type WalletDashboardProps = {
  /** The balance, cards, spending periods and subscriptions to show. */
  data: {
    balance: number
    change: number
    cards: StackCard[]
    periods: WalletPeriod[]
    subscriptions: WalletSubscription[]
  }
  /** How amounts are formatted. Default euro with two decimals. */
  format?: ValueFormat
  /** The page heading (h1). Default "Wallet". */
  title?: string
  /** Footer text on the balance tile. Default "Example data." */
  note?: string
  /** Visible text and screen reader text, with English defaults. */
  labels?: {
    balance?: string
    cards?: string
    cashFlow?: string
    spending?: string
    subscriptions?: string
    period?: string
    perMonth?: string
    renews?: (date: string) => string
    monthlyTotal?: string
  }
  /** Reserved for date-aware content; the screen itself is static. */
  now?: Date
  /** Classes for the outer container. */
  className?: string
}

const DEFAULT_FORMAT: ValueFormat = { currency: 'EUR', decimals: 2 }

/** Wallet overview: balance, card stack, cash flow, spending by category and recurring payments. */
export function WalletDashboard({ data, format = DEFAULT_FORMAT, title = 'Wallet', note = 'Example data.', labels, className }: WalletDashboardProps) {
  const l = {
    balance: 'Total balance',
    cards: 'Cards',
    cashFlow: 'Cash flow',
    spending: 'Spending',
    subscriptions: 'Subscriptions',
    period: 'Period',
    perMonth: 'a month',
    renews: (d: string) => `Renews ${d}`,
    monthlyTotal: 'Monthly total',
    ...labels,
  }
  const [periodId, setPeriodId] = useState(data.periods[0]?.id ?? '')
  const period = data.periods.find((p) => p.id === periodId) ?? data.periods[0]
  const monthly = data.subscriptions.reduce((s, x) => s + x.amount, 0)
  return (
    <div className={cn('@container w-full font-sans text-foreground', className)}>
      <div className="grid gap-4 @3xl:grid-cols-6 @6xl:grid-cols-12">
        <div className="@3xl:col-span-6 @6xl:col-span-12">
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight">{title}</h1>
        </div>
        <DataTile headingLevel={2} title={l.balance} className="@3xl:col-span-3 @6xl:col-span-4" footer={<span>{note}</span>}>
          <BigNumber value={data.balance} format={format} size="lg" />
          <div className="mt-3">
            <DeltaPill value={data.change} format={{ decimals: 1, suffix: '%', sign: true }} />
          </div>
        </DataTile>
        <DataTile headingLevel={2} title={l.cards} className="@3xl:col-span-3 @6xl:col-span-4">
          <CardStack data={data.cards} label={l.cards} format={format} />
        </DataTile>
        <DataTile headingLevel={2}
          title={l.cashFlow}
          className="@3xl:col-span-6 @6xl:col-span-4"
          action={<Pills label={l.period} options={data.periods.map(({ id, label }) => ({ id, label }))} value={periodId} onChange={setPeriodId} />}
        >
          {period && <BarChart data={period.flow} label={`${l.cashFlow}, ${period.long}`} format={{ ...format, decimals: 0 }} />}
        </DataTile>
        <DataTile headingLevel={2} title={l.spending} className="@3xl:col-span-3 @6xl:col-span-6">
          {period && <Donut data={period.spending} label={`${l.spending}, ${period.long}`} format={format} />}
        </DataTile>
        <DataTile headingLevel={2}
          title={l.subscriptions}
          className="@3xl:col-span-3 @6xl:col-span-6"
          footer={
            <span>
              {l.monthlyTotal}: <strong className="tabular-nums">{formatValue(monthly, { ...format, decimals: 2 })}</strong>
            </span>
          }
        >
          {/* The tile's heading names the list; a hidden <li> as its label would be counted as an extra item. */}
          <ul aria-label={l.subscriptions} className="divide-y divide-border">
            {data.subscriptions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3 text-sm">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {s.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">{l.renews(s.renews)}</span>
                </span>
                <span className="font-medium tabular-nums">
                  {formatValue(s.amount, { ...format, decimals: 2 })}
                  <span className="sr-only"> {l.perMonth}</span>
                </span>
              </li>
            ))}
          </ul>
        </DataTile>
      </div>
    </div>
  )
}

export default WalletDashboard
