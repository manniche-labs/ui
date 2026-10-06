import { useState } from 'react'
import { BigNumber, DeltaPill, Pills } from '@/registry/manniche/chart-kit/chart-kit'
import { DataTile, TileFact } from '@/registry/manniche/data-tile/data-tile'

// Example figures for the demo, not real data.
const PERIODS = [
  { id: 'week', label: 'Week', value: 18420.5, change: 6.2 },
  { id: 'month', label: 'Month', value: 74310.25, change: -2.4 },
  { id: 'year', label: 'Year', value: 912880, change: 11.8 },
]

export default function DataTileDemo() {
  const [period, setPeriod] = useState('week')
  const p = PERIODS.find((x) => x.id === period) ?? PERIODS[0]
  return (
    <div className="grid w-full gap-4">
      <DataTile
        title="Revenue"
        action={<Pills label="Period" options={PERIODS} value={period} onChange={setPeriod} />}
        footer={<span>Paid orders, VAT included. Example data.</span>}
      >
        <TileFact label={`This ${p.label.toLowerCase()}`} aside={<DeltaPill value={p.change} />}>
          <BigNumber value={p.value} size="xl" format={{ currency: 'EUR', decimals: p.value % 1 ? 2 : 0 }} />
        </TileFact>
      </DataTile>
      <div className="grid gap-4 sm:grid-cols-2">
        <DataTile title="Refunds" density="compact">
          <TileFact aside={<DeltaPill value={-0.6} goodWhen="down" />}>
            <BigNumber value={1.8} size="md" format={{ decimals: 1, suffix: '%' }} />
          </TileFact>
        </DataTile>
        <DataTile title="Orders today" density="compact" inverted>
          <TileFact aside={<DeltaPill value={14} format={{ suffix: '' }} />}>
            <BigNumber value={312} size="md" />
          </TileFact>
        </DataTile>
      </div>
    </div>
  )
}
