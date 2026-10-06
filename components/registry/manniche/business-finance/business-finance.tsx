// A business finance screen in Tiles: income against payments, a growth ring, a stock sparkline, activity and a
// verification checklist.
import { cn } from '@/lib/utils'
import { BigNumber, DeltaPill } from '@/registry/manniche/chart-kit/chart-kit'
import type { ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { DataTile, TileLegend } from '@/registry/manniche/data-tile/data-tile'
import { AreaChart, type AreaPoint } from '@/registry/manniche/area-chart/area-chart'
import { Donut } from '@/registry/manniche/donut/donut'
import { Sparkline } from '@/registry/manniche/sparkline/sparkline'
import { TransactionList, type Transaction } from '@/registry/manniche/transaction-list/transaction-list'

export type VerificationStep = { id: string; label: string; done: boolean; hint?: string }

export type BusinessFinanceProps = {
  data: {
    /** Income per period, with `previous` holding payments for the same period. */
    cashflow: AreaPoint[]
    income: number
    incomeChange: number
    /** Growth toward the target, 0 to 1. */
    growth: number
    growthTarget: string
    stock: { label: string; value: number }[]
    stockName: string
    activity: Transaction[]
    verification: VerificationStep[]
  }
  format?: ValueFormat
  title?: string
  note?: string
  today?: string
  now?: Date
  labels?: { income?: string; payments?: string; growth?: string; stock?: string; activity?: string; verification?: string; stepsDone?: (done: number, total: number) => string; done?: string; todo?: string }
  className?: string
}

const DEFAULT_FORMAT: ValueFormat = { currency: 'EUR', decimals: 0 }

/** Business finance: cash flow, growth ring, stock sparkline, activity and a verification checklist. */
export function BusinessFinance({ data, format = DEFAULT_FORMAT, title = 'Business finance', note = 'Example data.', today, labels, className }: BusinessFinanceProps) {
  const l = {
    income: 'Income',
    payments: 'Payments',
    growth: 'Growth',
    stock: 'Stock',
    activity: 'Activity',
    verification: 'Verification',
    stepsDone: (d: number, t: number) => `${d} of ${t} steps done`,
    done: 'Done',
    todo: 'To do',
    ...labels,
  }
  const doneCount = data.verification.filter((s) => s.done).length
  const pct = Math.round(data.growth * 100)
  return (
    <div className={cn('@container w-full font-sans text-foreground', className)}>
      <div className="grid gap-4 @3xl:grid-cols-6 @6xl:grid-cols-12">
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight @3xl:col-span-6 @6xl:col-span-12">{title}</h1>
        <DataTile
          title={`${l.income} / ${l.payments}`}
          className="@3xl:col-span-6 @6xl:col-span-8"
          footer={<span>{note}</span>}
          action={<TileLegend items={[{ label: l.income, color: 'var(--chart-1)' }, { label: l.payments, color: 'var(--chart-3)', shape: 'dashed' }]} />}
        >
          <div className="flex flex-wrap items-center gap-3">
            <BigNumber value={data.income} format={format} size="lg" />
            <DeltaPill value={data.incomeChange} format={{ decimals: 1, suffix: '%', sign: true }} />
          </div>
          <AreaChart className="mt-4" data={data.cashflow} label={`${l.income} and ${l.payments}`} format={format} compare />
        </DataTile>
        <DataTile title={l.growth} inverted className="@3xl:col-span-3 @6xl:col-span-4">
          <Donut data={[{ label: l.growth, value: pct }, { label: data.growthTarget, value: Math.max(0, 100 - pct) }]} label={`${l.growth}, ${pct} percent of ${data.growthTarget}`} format={{ suffix: '%' }} total={100} />
        </DataTile>
        <DataTile title={l.stock} className="@3xl:col-span-3 @6xl:col-span-4">
          <p className="text-sm font-medium text-muted-foreground">{data.stockName}</p>
          <Sparkline className="mt-3" data={data.stock} label={`${l.stock}, ${data.stockName}`} height={72} />
        </DataTile>
        <DataTile title={l.verification} className="@3xl:col-span-3 @6xl:col-span-4" footer={<span>{l.stepsDone(doneCount, data.verification.length)}</span>}>
          <ol className="space-y-3">
            {data.verification.map((s) => (
              <li key={s.id} className="flex items-start gap-3 text-sm">
                <span
                  aria-hidden
                  className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[11px]', s.done ? 'border-transparent bg-foreground text-background' : 'border-border text-transparent')}
                >
                  ✓
                </span>
                <span>
                  <span className="font-medium">{s.label}</span>
                  <span className="sr-only"> ({s.done ? l.done : l.todo})</span>
                  {s.hint && <span className="block text-xs text-muted-foreground">{s.hint}</span>}
                </span>
              </li>
            ))}
          </ol>
        </DataTile>
        <DataTile title={l.activity} className="@3xl:col-span-6 @6xl:col-span-4">
          <TransactionList data={data.activity} label={l.activity} today={today} format={{ ...format, decimals: 2 }} limit={4} />
        </DataTile>
      </div>
    </div>
  )
}

export default BusinessFinance
