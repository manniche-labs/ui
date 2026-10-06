// A rental portfolio screen: portfolio figures, income vs payout, rent collection and recent transfers.
import { cn } from '@/lib/utils'
import { AreaChart, type AreaPoint } from '@/registry/manniche/area-chart/area-chart'
import { BigNumber } from '@/registry/manniche/chart-kit/chart-kit'
import type { ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { DataTile, TileFact } from '@/registry/manniche/data-tile/data-tile'
import { Dial, type DialZone } from '@/registry/manniche/dial/dial'
import { TransactionList, type Transaction } from '@/registry/manniche/transaction-list/transaction-list'

export type RentalPortfolioData = {
  figures: { id: string; title: string; value: number; format?: ValueFormat }[]
  income: { title: string; points: AreaPoint[]; format?: ValueFormat }
  collection: { title: string; value: number; zones: DialZone[]; caption: string }
  transfers: { title: string; items: Transaction[]; today?: string; format?: ValueFormat }
}

export type RentalPortfolioLabels = { note?: string }

export type RentalPortfolioProps = { data: RentalPortfolioData; labels?: RentalPortfolioLabels; className?: string }

export function RentalPortfolio({ data, labels, className }: RentalPortfolioProps) {
  const note = labels?.note ?? 'Example data.'
  return (
    <div className={cn('@container w-full rounded-2xl bg-background p-3 text-foreground', className)}>
      <div className="grid grid-cols-1 gap-3 @lg:grid-cols-3 @3xl:grid-cols-6">
        {data.figures.map((f, i) => (
          <div key={f.id} className={cn('@3xl:col-span-2', i === 0 && '@lg:col-span-3 @3xl:col-span-2')}>
            <DataTile title={f.title} inverted={i === 0} density="compact">
              <TileFact>
                <BigNumber value={f.value} format={f.format} size="lg" />
              </TileFact>
            </DataTile>
          </div>
        ))}
        <div className="@lg:col-span-3 @3xl:col-span-4">
          <DataTile title={data.income.title} footer={note}>
            <AreaChart data={data.income.points} label={data.income.title} format={data.income.format} compare />
          </DataTile>
        </div>
        <div className="@lg:col-span-3 @3xl:col-span-2">
          <DataTile title={data.collection.title} footer={note}>
            <Dial value={data.collection.value} min={0} max={100} zones={data.collection.zones} label={data.collection.title} caption={data.collection.caption} format={{ suffix: '%' }} />
          </DataTile>
        </div>
        <div className="@lg:col-span-3 @3xl:col-span-6">
          <DataTile title={data.transfers.title} footer={note}>
            <TransactionList data={data.transfers.items} label={data.transfers.title} today={data.transfers.today} format={data.transfers.format} />
          </DataTile>
        </div>
      </div>
    </div>
  )
}
