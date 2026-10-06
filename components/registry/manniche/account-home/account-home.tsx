// An account home screen in Tiles: the payment card, the balance, a three-state spending dial and recent transactions.
import { cn } from '@/lib/utils'
import { BigNumber, DeltaPill } from '@/registry/manniche/chart-kit/chart-kit'
import type { ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { DataTile, TileFact } from '@/registry/manniche/data-tile/data-tile'
import { CardStack, type StackCard } from '@/registry/manniche/card-stack/card-stack'
import { Dial, type DialZone } from '@/registry/manniche/dial/dial'
import { TransactionList, type Transaction } from '@/registry/manniche/transaction-list/transaction-list'

export type AccountHomeProps = {
  data: {
    card: StackCard
    balance: number
    change: number
    /** Spending pace against the budget: 1 is exactly on budget. */
    pace: number
    budget: number
    transactions: Transaction[]
    categories?: Record<string, string>
  }
  format?: ValueFormat
  title?: string
  note?: string
  /** "YYYY-MM-DD" of today, so the list reads "Today" and "Yesterday". */
  today?: string
  now?: Date
  labels?: { card?: string; balance?: string; pace?: string; paceCaption?: string; transactions?: string; budget?: string; zones?: [string, string, string] }
  className?: string
}

const DEFAULT_FORMAT: ValueFormat = { currency: 'EUR', decimals: 2 }

/** Account home: card, balance, spending pace dial (under, on track, over) and transactions. */
export function AccountHome({ data, format = DEFAULT_FORMAT, title = 'Account', note = 'Example data.', today, labels, className }: AccountHomeProps) {
  const l = { card: 'Card', balance: 'Balance', pace: 'Spending pace', paceCaption: 'of your daily budget', transactions: 'Recent transactions', budget: 'Budget this month', zones: ['Under', 'On track', 'Over'] as [string, string, string], ...labels }
  const zones: DialZone[] = [
    { label: l.zones[0], to: 0.85, color: 'var(--chart-1)' },
    { label: l.zones[1], to: 1.1, color: 'var(--success)' },
    { label: l.zones[2], to: 1.6, color: 'var(--destructive)' },
  ]
  return (
    <div className={cn('@container w-full font-sans text-foreground', className)}>
      <div className="grid gap-4 @3xl:grid-cols-6 @6xl:grid-cols-12">
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight @3xl:col-span-6 @6xl:col-span-12">{title}</h1>
        <DataTile title={l.card} className="@3xl:col-span-3 @6xl:col-span-4">
          <CardStack data={[data.card]} label={l.card} format={format} hideAmount />
        </DataTile>
        <DataTile title={l.balance} inverted className="@3xl:col-span-3 @6xl:col-span-4" footer={<span>{note}</span>}>
          <BigNumber value={data.balance} format={format} size="lg" />
          <div className="mt-3">
            <DeltaPill value={data.change} format={{ decimals: 1, suffix: '%', sign: true }} />
          </div>
          <div className="mt-5">
            <TileFact label={l.budget}>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: format.currency ?? 'EUR' }).format(data.budget)}</TileFact>
          </div>
        </DataTile>
        <DataTile title={l.pace} className="@3xl:col-span-6 @6xl:col-span-4">
          <Dial value={data.pace} zones={zones} format={{ decimals: 2, suffix: '×' }} label={l.pace} caption={l.paceCaption} />
        </DataTile>
        <DataTile title={l.transactions} className="@3xl:col-span-6 @6xl:col-span-12">
          <TransactionList data={data.transactions} label={l.transactions} today={today} format={format} categories={data.categories} limit={5} />
        </DataTile>
      </div>
    </div>
  )
}

export default AccountHome
