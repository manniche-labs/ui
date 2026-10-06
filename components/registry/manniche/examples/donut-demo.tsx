import { useState } from 'react'
import { Pills } from '@/registry/manniche/chart-kit/chart-kit'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'
import { Donut } from '@/registry/manniche/donut/donut'

// Example figures for the demo, not real data.
const CATEGORIES = ['Groceries', 'Transport', 'Eating out', 'Shopping', 'Bills']
const PERIODS = [
  { id: 'week', label: 'Week', long: 'last 7 days', values: [90.84, 47.1, 74.02, 40.37, 84.12] },
  { id: 'month', label: 'Month', long: 'last 30 days', values: [414.96, 179.82, 235.14, 152.15, 401.13] },
  { id: 'year', label: 'Year', long: 'last 12 months', values: [5023.4, 1944.54, 2592.72, 2268.63, 4375.23] },
]
const EUR = { currency: 'EUR' }

export default function DonutDemo() {
  const [period, setPeriod] = useState('month')
  const p = PERIODS.find((x) => x.id === period) ?? PERIODS[1]
  const data = CATEGORIES.map((label, i) => ({ label, value: p.values[i] }))
  return (
    <div className="grid w-full gap-4">
      <DataTile
        title="Spending by category"
        action={<Pills label="Period" options={PERIODS} value={period} onChange={setPeriod} />}
        footer={<span>Card and account payments. Example data.</span>}
      >
        <p className="text-sm leading-[1.3] font-medium text-muted-foreground">Where the money went, {p.long}</p>
        <Donut className="mt-4" data={data} label={`Spending by category, ${p.long}`} format={EUR} labels={{ total: 'Spent' }} />
      </DataTile>
      <div className="grid gap-4 sm:grid-cols-2">
        <DataTile title="Wallet" density="compact" footer={<span>Example data.</span>}>
          <Donut layout="stack" data={data} label="Wallet spending by category" format={EUR} labels={{ total: 'Spent' }} />
        </DataTile>
        <DataTile title="Monthly budget" density="compact" inverted footer={<span>Of a €1,800 month. Example data.</span>}>
          <Donut
            layout="stack"
            data={[
              { label: 'Spent', value: 1383.2, color: 'var(--chart-1)' },
              { label: 'Planned', value: 240, color: 'var(--chart-3)' },
            ]}
            total={1800}
            label="Monthly budget, spent and planned"
            format={EUR}
            labels={{ total: 'Budget' }}
          />
        </DataTile>
      </div>
    </div>
  )
}
