import { useState } from 'react'
import { Pills } from '@/registry/manniche/chart-kit/chart-kit'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'
import { Lollipop } from '@/registry/manniche/lollipop/lollipop'

// Example figures for the demo, not real data: visits and the average spend per visit over 30 days.
const MERCHANTS = [
  { label: 'Harbour Market', category: 'Groceries', visits: 6, avg: 48.2 },
  { label: 'City Transit', category: 'Transport', visits: 18, avg: 3.1 },
  { label: 'Corner Bakery', category: 'Eating out', visits: 12, avg: 6.4 },
  { label: 'Green Leaf Café', category: 'Eating out', visits: 9, avg: 9.8 },
  { label: 'Northwind Books', category: 'Shopping', visits: 2, avg: 31.5 },
  { label: 'Pixel & Plug', category: 'Shopping', visits: 1, avg: 58.9 },
  { label: 'Lumen Energy', category: 'Bills', visits: 1, avg: 74 },
  { label: 'Fresh Fields', category: 'Groceries', visits: 4, avg: 27.35 },
]
const DATA = MERCHANTS.map((m) => ({
  label: m.label,
  value: Math.round(m.visits * m.avg * 100) / 100,
  details: [
    { label: 'Visits', value: String(m.visits) },
    { label: 'Category', value: m.category },
  ],
}))
const EUR = { currency: 'EUR', decimals: 2 }
const SORTS = [
  { id: 'value', label: 'Amount' },
  { id: 'label', label: 'A–Z' },
]

export default function LollipopDemo() {
  const [sort, setSort] = useState<'value' | 'label'>('value')
  return (
    <div className="grid w-full gap-4">
      <DataTile
        title="Top merchants"
        action={<Pills label="Sort" options={SORTS} value={sort} onChange={(id) => setSort(id as 'value' | 'label')} />}
        footer={<span>Card payments, last 30 days. Example data.</span>}
      >
        <p className="text-sm leading-[1.3] font-medium text-muted-foreground">Top merchants, last 30 days</p>
        <Lollipop className="mt-4" data={DATA} label="Top merchants by spend, last 30 days" format={EUR} sort={sort} limit={6} />
      </DataTile>
      <div className="grid gap-4 sm:grid-cols-2">
        <DataTile title="Top four" density="compact" footer={<span>Example data.</span>}>
          <Lollipop data={DATA} label="Top merchants, last 30 days" format={EUR} limit={4} axis={false} />
        </DataTile>
        <DataTile title="Most visits" density="compact" inverted footer={<span>Visits in 30 days. Example data.</span>}>
          <Lollipop
            data={MERCHANTS.map((m) => ({ label: m.label, value: m.visits }))}
            label="Merchants by visits, last 30 days"
            limit={4}
          />
        </DataTile>
      </div>
    </div>
  )
}
