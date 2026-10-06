import { useState } from 'react'
import { BubbleChart, type BubbleDatum } from '@/registry/manniche/bubble-chart/bubble-chart'
import { Pills } from '@/registry/manniche/chart-kit/chart-kit'
import { formatValue } from '@/registry/manniche/chart-kit/chart-utils'
import { DataTile, TileLegend } from '@/registry/manniche/data-tile/data-tile'

// Example figures for the demo, not real data.
const CATS = ['Groceries', 'Transport', 'Eating out', 'Shopping', 'Bills']
const MERCHANTS = [
  { name: 'Harbour Market', cat: 0, visits: 6, avg: 48.2 },
  { name: 'City Transit', cat: 1, visits: 18, avg: 3.1 },
  { name: 'Corner Bakery', cat: 2, visits: 12, avg: 6.4 },
  { name: 'Green Leaf Café', cat: 2, visits: 9, avg: 9.8 },
  { name: 'Northwind Books', cat: 3, visits: 2, avg: 31.5 },
  { name: 'Pixel & Plug', cat: 3, visits: 1, avg: 58.9 },
  { name: 'Lumen Energy', cat: 4, visits: 1, avg: 74 },
  { name: 'Fresh Fields', cat: 0, visits: 4, avg: 27.35 },
]
const EUR = { currency: 'EUR' }

// Each merchant's colour follows its category, in the order of CATS.
const color = (cat: number) => `var(--chart-${cat + 1})`
const merchants: BubbleDatum[] = MERCHANTS.map((m) => ({
  label: m.name,
  value: Math.round(m.visits * m.avg * 100) / 100,
  x: m.visits,
  y: m.avg,
  group: CATS[m.cat],
  color: color(m.cat),
}))

const PERIODS = [
  { id: 'month', label: 'Month', values: [398.6, 55.8, 165, 121.9, 74] },
  { id: 'year', label: 'Year', values: [5023.4, 1944.54, 2592.72, 2268.63, 4375.23] },
]

export default function BubbleChartDemo() {
  const [period, setPeriod] = useState('month')
  const p = PERIODS.find((x) => x.id === period) ?? PERIODS[0]
  return (
    <div className="grid w-full gap-4">
      <DataTile
        title="Where you shop"
        action={<TileLegend items={CATS.map((label, i) => ({ label, color: color(i), shape: 'dot' as const }))} />}
        footer={<span>Position by visits and average spend, size by the month's total. Example data.</span>}
      >
        <p className="text-sm leading-[1.3] font-medium text-muted-foreground">How often you go, what you spend each time</p>
        <BubbleChart
          className="mt-4"
          data={merchants}
          label="Merchants by visits and average spend, sized by total this month"
          format={{ ...EUR, decimals: 2 }}
          yFormat={{ ...EUR, decimals: 2 }}
          labels={{
            item: 'Merchant',
            group: 'Category',
            value: 'Total',
            valueNote: 'this month',
            x: 'Visits',
            y: 'Average',
            xUnit: 'visits',
            describe: (d, t) => `${d.label}: ${t.x} visits, average ${t.y}, total ${t.value}`,
          }}
        />
      </DataTile>
      <div className="grid gap-4 sm:grid-cols-2">
        <DataTile
          title="By category"
          density="compact"
          action={<Pills label="Period" options={PERIODS} value={period} onChange={setPeriod} />}
          footer={<span>Packed, largest first. Example data.</span>}
        >
          <BubbleChart
            data={CATS.map((label, i) => ({ label, value: p.values[i] }))}
            label={`Spending by category, last ${period}`}
            format={EUR}
            labels={{ item: 'Category', value: 'Spent' }}
          />
        </DataTile>
        <DataTile title="Wallet" density="compact" inverted footer={<span>{formatValue(1383.2, EUR)} this month. Example data.</span>}>
          <BubbleChart
            data={merchants.slice(0, 5)}
            label="Wallet merchants by visits and average spend"
            format={{ ...EUR, decimals: 2 }}
            yFormat={EUR}
            labels={{ item: 'Merchant', group: 'Category', value: 'Total', x: 'Visits', y: 'Average', xUnit: 'visits' }}
          />
        </DataTile>
      </div>
    </div>
  )
}
