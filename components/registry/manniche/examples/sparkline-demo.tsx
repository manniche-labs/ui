import { useState } from 'react'
import { BigNumber, DeltaPill, Pills } from '@/registry/manniche/chart-kit/chart-kit'
import { valueParts } from '@/registry/manniche/chart-kit/chart-utils'
import { DataTile, TileFact } from '@/registry/manniche/data-tile/data-tile'
import { Sparkline, type SparkPoint } from '@/registry/manniche/sparkline/sparkline'

// Example data for the demo, not real accounts. The last 30 days end on Thursday 8 October.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DATES = Array.from({ length: 30 }, (_, i) => {
  const d = i < 22 ? { date: 9 + i, mon: 'Sep' } : { date: i - 21, mon: 'Oct' }
  return `${DAYS[(2 + i) % 7]} ${d.date} ${d.mon}`
})
const SAVINGS = [
  4752.22, 4760.73, 4778.07, 4787.34, 4811.17, 4829.03, 4847.02, 4858.13, 4871.38, 4890.76, 4902.57, 4912.03, 4934.81, 4952.59,
  4977.06, 5003.36, 5017.89, 5040.18, 5053.94, 5075.84, 5094.66, 5119.94, 5331.3, 5339.23, 5365.48, 5379.73, 5407.23, 5431.19,
  5447.78, 5470.58,
]
const EVERYDAY = [
  779.01, 744.95, 672.86, 593.06, 541.94, 505, 473.88, 441.66, 396, 328.94, 264.49, 215.86, 186.75, 158.34, 122.33, 103.15, 31.8,
  -39.4, -123.09, -149.3, -186.81, 2239.41, 2222.86, 2136.52, 2086.64, 2015.4, 2180.47, 2144.68, 2110.95, 2091.2,
]
const TRAVEL = [
  734.46, 709.81, 709.81, 709.81, 709.81, 709.81, 690.84, 690.84, 690.84, 690.84, 690.84, 690.84, 690.84, 690.84, 690.84, 690.84,
  690.84, 690.84, 690.84, 690.84, 670.53, 670.53, 644.24, 628.45, 628.45, 603.42, 603.42, 601.37, 601.37, 612.08,
]
const ONLINE = [
  117.84, 157.84, 197.84, 237.84, 277.84, 317.84, 314.49, 310.56, 308.81, 348.81, 346.62, 342.92, 382.92, 380.32, 378.28, 418.28,
  415.86, 455.86, 455.62, 495.62, 490.13, 485.78, 483.59, 479.38, 519.38, 518.88, 558.88, 558.17, 598.17, 145.2,
]
const TOTAL = EVERYDAY.map((v, i) => Math.round((v + SAVINGS[i] + TRAVEL[i] + ONLINE[i]) * 100) / 100)

const dated = (values: number[]): SparkPoint[] => values.map((value, i) => ({ value, label: DATES[i] }))
const EUR = { currency: 'EUR', decimals: 2 }
const change = (xs: number[]) => ((xs[xs.length - 1] - xs[0]) / Math.abs(xs[0])) * 100

const ACCOUNTS = [
  { name: 'Everyday', sub: 'Debit •••• 4821', values: EVERYDAY },
  { name: 'Travel', sub: 'Multi-currency', values: TRAVEL },
  { name: 'Online', sub: 'Virtual', values: ONLINE },
]

const RANGES = [
  { id: 'month', label: '30 days' },
  { id: 'week', label: '7 days' },
]

/** A balance for the table: the euro sign muted, as on the big numbers. */
function Money({ value }: { value: number }) {
  const p = valueParts(value, EUR)
  return (
    <>
      {p.sign}
      <span className="text-muted-foreground">{p.unit}</span>
      {p.whole}
      {p.fraction}
    </>
  )
}

export default function SparklineDemo() {
  const [range, setRange] = useState('month')
  const total = range === 'week' ? TOTAL.slice(-7) : TOTAL
  const totalPoints = dated(TOTAL).slice(-total.length)
  return (
    <div className="@container grid w-full gap-4">
      <DataTile title="Accounts" footer={<span>A 30-day trend beside each balance. Example data.</span>}>
        <TileFact label="Savings pot">
          <div className="flex w-full flex-wrap items-end justify-between gap-4">
            <BigNumber value={SAVINGS[SAVINGS.length - 1]} size="lg" format={EUR} />
            <Sparkline data={dated(SAVINGS)} label="Savings pot, last 30 days" format={EUR} width={132} height={44} />
          </div>
        </TileFact>
        <table className="mt-[22px] w-full border-collapse text-sm tabular-nums">
          <caption className="sr-only">Accounts with a 30-day trend</caption>
          <thead>
            <tr>
              <th scope="col" className="pb-2 text-left font-mono text-[11px] leading-none font-normal text-muted-foreground">
                Account
              </th>
              <th scope="col" className="px-3.5 pb-2 text-left font-mono text-[11px] leading-none font-normal text-muted-foreground">
                30 days
              </th>
              <th scope="col" className="pb-2 text-right font-mono text-[11px] leading-none font-normal text-muted-foreground">
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {ACCOUNTS.map((a, i) => (
              <tr key={a.name}>
                <th scope="row" className="border-t border-border py-[9px] text-left align-middle font-normal">
                  <span className="block font-medium">{a.name}</span>
                  <span className="block font-mono text-[11px] leading-[1.3] text-muted-foreground">{a.sub}</span>
                </th>
                <td className="w-[124px] border-t border-border px-3.5 align-middle">
                  <Sparkline
                    data={dated(a.values)}
                    label={`${a.name}, last 30 days`}
                    format={EUR}
                    height={28}
                    table={false}
                    delay={120 + i * 80}
                  />
                </td>
                <td className="border-t border-border py-[9px] text-right align-middle">
                  <Money value={a.values[a.values.length - 1]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTile>

      <div className="grid gap-4 @min-[520px]:grid-cols-2">
        <DataTile
          title="Total balance"
          density="compact"
          inverted
          action={<Pills label="Range" options={RANGES} value={range} onChange={setRange} />}
          footer={<span>All four accounts. Example data.</span>}
        >
          <TileFact aside={<DeltaPill value={change(total)} format={{ decimals: 1, sign: true, suffix: '%' }} />}>
            <BigNumber value={total[total.length - 1]} size="md" format={EUR} />
          </TileFact>
          <Sparkline
            className="mt-3.5"
            data={totalPoints}
            label={`Total balance, last ${range === 'week' ? 7 : 30} days`}
            format={EUR}
            height={56}
          />
        </DataTile>
        <DataTile title="Other states" density="compact" footer={<span>Example data.</span>}>
          <ul className="grid gap-3 text-sm">
            <li className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">No marker, one scale</span>
              <span className="flex gap-3">
                <Sparkline data={TRAVEL} label="Travel, last 30 days" format={EUR} width={64} current={null} domain={[0, 800]} table={false} />
                <Sparkline data={ONLINE} label="Online, last 30 days" format={EUR} width={64} current={null} domain={[0, 800]} table={false} />
              </span>
            </li>
            <li className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Loading</span>
              <Sparkline data={[]} label="Savings, last 30 days" loading width={132} />
            </li>
            <li className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">No data yet</span>
              <Sparkline data={[]} label="New pot, last 30 days" width={132} />
            </li>
          </ul>
        </DataTile>
      </div>
    </div>
  )
}
