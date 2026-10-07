import { useState } from 'react'
import { BigNumber, Pills } from '@/registry/manniche/chart-kit/chart-kit'
import { DataTile, TileFact } from '@/registry/manniche/data-tile/data-tile'
import { DotMatrix, DotMatrixKey } from '@/registry/manniche/dot-matrix/dot-matrix'

// Example figures for the demo, not real data: card payments per hour over four weeks, Mon–Sun × 07–22.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 16 }, (_, i) => 7 + i)
const pad = (h: number) => String(h).padStart(2, '0')
const COLUMNS = HOURS.map(pad)
const COLUMN_TITLES = HOURS.map((h) => `${pad(h)}:00–${pad(h + 1)}:00`)
const ALL = [
  [1, 3, 3, 1, 1, 6, 3, 0, 1, 1, 2, 5, 3, 1, 0, 0],
  [1, 3, 2, 0, 1, 5, 5, 0, 0, 0, 2, 5, 5, 2, 1, 0],
  [1, 2, 2, 1, 1, 3, 5, 0, 1, 1, 3, 7, 5, 1, 1, 0],
  [1, 2, 2, 0, 1, 7, 4, 0, 1, 0, 2, 6, 3, 3, 0, 0],
  [1, 4, 2, 0, 1, 6, 4, 0, 1, 1, 2, 3, 6, 3, 3, 2],
  [1, 1, 1, 2, 3, 4, 4, 5, 3, 2, 2, 2, 2, 0, 1, 0],
  [0, 2, 1, 5, 5, 7, 4, 5, 3, 4, 0, 2, 3, 1, 1, 0],
]
// The groceries share of the same payments, to show new values gliding in place.
const GROCERIES = ALL.map((r, d) => r.map((v, h) => Math.max(0, Math.round(v * (d >= 5 ? 0.7 : 0.4) + ((h + d) % 5 === 0 ? 1 : 0) - 0.3))))
const SETS = [
  { id: 'all', label: 'All', data: ALL },
  { id: 'groceries', label: 'Groceries', data: GROCERIES },
]
// Thursday 14:20.
const NOW = 3 * HOURS.length + HOURS.indexOf(14)
const unit = (v: number) => (v === 1 ? 'payment' : 'payments')

function busiest(data: number[][]) {
  let best = { v: -1, d: 0, h: 0 }
  data.forEach((r, d) => r.forEach((v, h) => v > best.v && (best = { v, d, h })))
  return best
}

export default function DotMatrixDemo() {
  const [set, setSet] = useState('all')
  const data = (SETS.find((s) => s.id === set) ?? SETS[0]).data
  const best = busiest(data)
  const top = busiest(ALL)
  return (
    <div className="grid w-full gap-4">
      <DataTile
        title="When you pay"
        inverted
        action={<Pills label="Payments" options={SETS} value={set} onChange={setSet} />}
        footer={
          <span>
            Dots grow with the number of card payments; the signal dot is now. Example data.
          </span>
        }
      >
        <TileFact
          label="Busiest hour for card payments"
          aside={
            <span className="inline-flex h-[26px] items-center rounded-full bg-muted px-2.5 text-[12.5px] font-medium whitespace-nowrap tabular-nums">
              {DAYS[best.d]}, {best.v} {unit(best.v)} in 4 weeks
            </span>
          }
        >
          <BigNumber value={HOURS[best.h]} format={{ suffix: ':00' }} size="xl" />
        </TileFact>
        <div className="mt-[22px] flex justify-end">
          <DotMatrixKey />
        </div>
        <DotMatrix
          className="mt-3"
          data={data}
          rows={DAYS}
          columns={COLUMNS}
          columnTitles={COLUMN_TITLES}
          current={NOW}
          label="Card payments per hour over the last 4 weeks"
          labels={{ row: 'Day', unit, note: 'Over 4 weeks', hint: 'Use the arrow keys to read each hour.' }}
        />
      </DataTile>
      <div className="grid gap-4 sm:grid-cols-2">
        <DataTile
          title="Card payments by hour"
          density="compact"
          action={
            <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[12.5px] font-medium whitespace-nowrap text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] tabular-nums">
              Busiest {DAYS[top.d]} {COLUMNS[top.h]}:00
            </span>
          }
          footer={<span>Example data.</span>}
        >
          <DotMatrix
            data={ALL}
            rows={DAYS.map((d) => d.slice(0, 1))}
            rowTitles={DAYS}
            columns={COLUMNS}
            columnTitles={COLUMN_TITLES}
            current={NOW}
            label="Card payments per hour over the last 4 weeks"
            labels={{ row: 'Day', unit, note: 'Over 4 weeks', hint: 'Use the arrow keys to read each hour.' }}
          />
        </DataTile>
        <DataTile title="Loading" density="compact" footer={<span>Example data.</span>}>
          <DotMatrix data={[]} rows={DAYS.map((d) => d.slice(0, 1))} columns={COLUMNS} loading label="Card payments per hour" />
        </DataTile>
      </div>
    </div>
  )
}
