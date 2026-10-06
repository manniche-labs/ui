import { useState } from 'react'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'
import { Dial, type DialZone } from '@/registry/manniche/dial/dial'

// Example figures for the demo, not real data.
const ZONES: DialZone[] = [
  { label: 'Under', to: 0.85, color: 'var(--chart-1)' },
  { label: 'On track', to: 1.1, color: 'var(--success)' },
  { label: 'Over', to: 1.6, color: 'var(--destructive)' },
]
const PACE = { decimals: 2, suffix: '×' }

export default function DialDemo() {
  const [used, setUsed] = useState(77)
  const [pace, setPace] = useState(0.92)
  return (
    <div className="grid w-full gap-4">
      <DataTile
        title="Monthly budget"
        inverted
        footer={<span>Focus a dial and use the arrow keys, or drag along it. Example data.</span>}
      >
        <Dial
          value={used}
          onValueChange={setUsed}
          label="Monthly budget used"
          caption="of €1 800 budget"
          valueText={(v) => `${v} percent of the monthly budget`}
        />
        <div className="mt-5 border-t border-border pt-[18px]">
          <Dial
            value={pace}
            onValueChange={setPace}
            zones={ZONES}
            step={0.05}
            format={PACE}
            label="Spending pace"
            caption="your daily budget so far"
            valueText={(v) => `${v.toFixed(2)} times the daily budget`}
          />
        </div>
      </DataTile>
      <div className="grid gap-4 sm:grid-cols-2">
        <DataTile title="Wallet" density="compact" footer={<span>Example data.</span>}>
          <Dial value={77} segments={20} label="Monthly budget used" caption="used" />
          <p className="mt-3 text-center text-[13.5px] text-muted-foreground tabular-nums">€1,383 of €1,800</p>
        </DataTile>
        <DataTile title="Pace" density="compact" footer={<span>Read-only. Example data.</span>}>
          <Dial value={1.24} zones={ZONES} format={PACE} label="Spending pace" caption="your daily budget" />
        </DataTile>
      </div>
    </div>
  )
}
