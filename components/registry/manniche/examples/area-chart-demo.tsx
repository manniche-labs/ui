import { useState } from 'react'
import { AreaChart, type AreaPoint } from '@/registry/manniche/area-chart/area-chart'
import { BigNumber, DeltaPill, Pills } from '@/registry/manniche/chart-kit/chart-kit'
import { BASE, INK } from '@/registry/manniche/chart-kit/chart-utils'
import { DataTile, TileFact, TileLegend } from '@/registry/manniche/data-tile/data-tile'

// Example data for the demo, not a real account. "Today" is Thursday 8 October; the series runs from Wed 9 Sep.
const BALANCE = [
  779.01, 744.95, 672.86, 593.06, 541.94, 505, 473.88, 441.66, 396, 328.94, 264.49, 215.86, 186.75, 158.34, 122.33, 103.15, 31.8,
  -39.4, -123.09, -149.3, -186.81, 2239.41, 2222.86, 2136.52, 2086.64, 2015.4, 2180.47, 2144.68, 2110.95, 2091.2,
]
const BEFORE = [
  887.04, 869.89, 803.17, 790.17, 712.16, 666.73, 691.79, 650.74, 628.35, 565.45, 486.93, 422.22, 390.73, 351.67, 300.28, 317.73,
  244.86, 182.98, 124.01, 95.55, 61.96, 2462.05, 2418.89, 2327.57, 2248.02, 2180.59, 2154.39, 2160.48, 2112.45, 2062.3,
]
const SAVINGS = [
  4752.22, 4760.73, 4778.07, 4787.34, 4811.17, 4829.03, 4847.02, 4858.13, 4871.38, 4890.76, 4902.57, 4912.03, 4934.81, 4952.59,
  4977.06, 5003.36, 5017.89, 5040.18, 5053.94, 5075.84, 5094.66, 5119.94, 5331.3, 5339.23, 5365.48, 5379.73, 5407.23, 5431.19,
  5447.78, 5470.58,
]
const TRAVEL = [
  734.46, 709.81, 709.81, 709.81, 709.81, 709.81, 690.84, 690.84, 690.84, 690.84, 690.84, 690.84, 690.84, 690.84, 690.84, 690.84,
  690.84, 690.84, 690.84, 690.84, 670.53, 670.53, 644.24, 628.45, 628.45, 603.42, 603.42, 601.37, 601.37, 612.08,
]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DATES = Array.from({ length: 30 }, (_, i) => {
  const d = i < 22 ? { date: 9 + i, mon: 'Sep' } : { date: i - 21, mon: 'Oct' }
  return { ...d, day: DAYS[(2 + i) % 7] }
})

const points = (values: number[], previous?: number[]): AreaPoint[] =>
  values.map((value, i) => ({
    label: i === values.length - 1 ? 'Today' : `${DATES[i].date} ${DATES[i].mon}`,
    title: `${DATES[i].day} ${DATES[i].date} ${DATES[i].mon}`,
    value,
    previous: previous?.[i],
  }))

const EUR = { currency: 'EUR', decimals: 2 }
const BALANCE_DATA = points(BALANCE, BEFORE)
const POTS = {
  savings: { name: 'Savings pot', data: points(SAVINGS) },
  travel: { name: 'Travel pot', data: points(TRAVEL) },
}
type PotId = keyof typeof POTS
const POT_OPTIONS = [
  { id: 'savings', label: 'Savings' },
  { id: 'travel', label: 'Travel' },
]

export default function AreaChartDemo() {
  // The figure follows the crosshair, so the chart's selection is controlled here.
  const [active, setActive] = useState<number | null>(null)
  const [pot, setPot] = useState<PotId>('savings')
  const i = active ?? BALANCE.length - 1
  const p = POTS[pot]
  const last = p.data[p.data.length - 1].value
  return (
    <div className="@container grid w-full gap-4">
      <DataTile
        title="Balance"
        action={
          <TileLegend
            items={[
              { label: 'Last 30 days', color: INK, shape: 'line' },
              { label: '30 days before', color: BASE, shape: 'dashed' },
            ]}
          />
        }
        footer={<span>Everyday account, end-of-day balance. Example data.</span>}
      >
        <TileFact
          label={active === null ? 'Everyday account balance' : `Balance on ${BALANCE_DATA[i].title}`}
          aside={<DeltaPill value={BALANCE[i] - BEFORE[i]} format={{ ...EUR, sign: true }} />}
        >
          <BigNumber value={BALANCE[i]} size="xl" format={EUR} />
        </TileFact>
        <AreaChart
          className="mt-[22px]"
          data={BALANCE_DATA}
          label="Everyday account balance, last 30 days compared with the 30 days before"
          format={EUR}
          tickEvery={7}
          activeIndex={active}
          onActiveIndexChange={setActive}
          labels={{ value: 'Last 30 days', previous: '30 days before' }}
        />
      </DataTile>

      <div className="grid gap-4 @min-[520px]:grid-cols-2">
        <DataTile
          title={p.name}
          density="compact"
          inverted
          action={<Pills label="Pot" options={POT_OPTIONS} value={pot} onChange={(id) => setPot(id as PotId)} />}
          footer={<span>Example data.</span>}
        >
          <TileFact aside={<DeltaPill value={((last - p.data[0].value) / p.data[0].value) * 100} format={{ decimals: 1, sign: true, suffix: '%' }} />}>
            <BigNumber value={last} size="md" format={EUR} />
          </TileFact>
          <AreaChart className="mt-3.5" data={p.data} label={`${p.name} balance, last 30 days`} format={EUR} tickEvery={14} />
        </DataTile>
        <DataTile title="Joint account" density="compact" footer={<span>Opened today. Example data.</span>}>
          <TileFact>
            <span className="text-muted-foreground">
              <BigNumber value={0} size="md" format={EUR} roll={false} />
            </span>
          </TileFact>
          <AreaChart
            className="mt-3.5"
            data={[]}
            label="Joint account balance"
            placeholder={
              <>
                <b className="text-base leading-[1.3] font-semibold">No balance history yet</b>
                <span className="max-w-[34ch] text-[13.5px] text-pretty text-muted-foreground">The line starts after the first day closes.</span>
              </>
            }
          />
        </DataTile>
      </div>
    </div>
  )
}
