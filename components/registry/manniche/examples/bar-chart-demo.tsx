import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BarChart, type BarPoint } from '@/registry/manniche/bar-chart/bar-chart'
import { BigNumber, DeltaPill, Pills } from '@/registry/manniche/chart-kit/chart-kit'
import { BASE } from '@/registry/manniche/chart-kit/chart-utils'
import { DataTile, TileFact } from '@/registry/manniche/data-tile/data-tile'

// Example data for the demo, not real spending. "Today" is Thursday 8 October.
const WEEK = {
  value: [38.4, 96.1, 54.75, 22.3, 42.1, 18.6, 64.2],
  previous: [44, 71.2, 88.5, 30.1, 25.9, 40.3, 52],
  label: ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
  title: ['Fri 2 Oct', 'Sat 3 Oct', 'Sun 4 Oct', 'Mon 5 Oct', 'Tue 6 Oct', 'Wed 7 Oct', 'Thu 8 Oct'],
}
const MONTH_VALUE = [
  33.39, 34.06, 72.09, 79.8, 51.12, 36.94, 31.12, 32.22, 45.66, 67.06, 64.45, 48.63, 29.11, 28.41, 36.01, 19.18, 71.35, 71.2,
  83.69, 26.21, 37.51, 23.78, 16.55, 86.34, 49.88, 71.24, 34.93, 35.79, 45.73, 19.75,
]
const MONTH_PREVIOUS = [
  18.06, 17.15, 66.72, 53, 78.01, 45.43, 14.94, 41.05, 22.39, 62.9, 78.52, 64.71, 31.49, 39.06, 51.39, 22.55, 72.87, 61.88,
  58.97, 28.46, 33.59, 49.91, 43.16, 91.32, 79.55, 67.43, 26.2, 33.91, 48.03, 50.15,
]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// 30 days back from Thu 8 Oct: Wed 9 Sep … Thu 8 Oct.
const MONTH_DATES = Array.from({ length: 30 }, (_, i) => {
  const d = i < 22 ? { date: 9 + i, mon: 'Sep' } : { date: i - 21, mon: 'Oct' }
  return { ...d, day: DAYS[(2 + i) % 7] }
})
const YEAR = {
  value: [1469.71, 1764.55, 1272.3, 1441.74, 1215.76, 1428.71, 1482.44, 1372.4, 1560.36, 1276.36, 1507.54, 412.65],
  previous: [1381.43, 1351.01, 1105.25, 1276.85, 1214.17, 1440.69, 1209.48, 1387.01, 1374.92, 1196.36, 1107.23, 1401.53],
  label: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
}

const zip = (value: number[], previous: number[], label: string[], title: string[]): BarPoint[] =>
  value.map((v, i) => ({ value: v, previous: previous[i], label: label[i], title: title[i] }))

const PERIODS = {
  week: {
    fact: 'Spent in the last 7 days',
    previous: 'Previous 7 days',
    data: zip(WEEK.value, WEEK.previous, WEEK.label, WEEK.title),
    bucket: 7,
    tickEvery: 1,
  },
  month: {
    fact: 'Spent in the last 30 days',
    previous: 'Previous 30 days',
    data: zip(
      MONTH_VALUE,
      MONTH_PREVIOUS,
      MONTH_DATES.map((d) => String(d.date)),
      MONTH_DATES.map((d) => `${d.day} ${d.date} ${d.mon}`),
    ),
    bucket: 7,
    tickEvery: 7,
  },
  year: {
    fact: 'Spent in the last 12 months',
    previous: 'Previous 12 months',
    data: zip(
      YEAR.value,
      YEAR.previous,
      YEAR.label,
      YEAR.label.map((m, i) => `${m} ${i < 2 ? 2025 : 2026}${i === 11 ? ', to date' : ''}`),
    ),
    bucket: 3,
    tickEvery: 1,
  },
}
type PeriodId = keyof typeof PERIODS
const OPTIONS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
]

// Groups of seven days are named by their first day; a short group at the start says its range.
const weekTitle = (points: BarPoint[], start: number) => {
  const first = MONTH_DATES[start]
  const last = MONTH_DATES[start + points.length - 1]
  return points.length === 7 ? `Week of ${first.date} ${first.mon}` : `${first.date}–${last.date} ${last.mon}`
}
const weekLabel = (_: BarPoint[], start: number) => `${MONTH_DATES[start].date} ${MONTH_DATES[start].mon}`

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)
const EUR = { currency: 'EUR', decimals: 2 }

/** The mockup's Compare switch: a pill with a box that fills and ticks when pressed. */
function CompareToggle({ pressed, onPressedChange }: { pressed: boolean; onPressedChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-muted pr-3.5 pl-2.5 text-[13.5px] font-medium',
        pressed ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <span aria-hidden className="relative size-4 rounded-[6px]" style={{ boxShadow: `inset 0 0 0 1.5px ${BASE}` }}>
        <span
          className="absolute inset-0 rounded-[6px] bg-foreground transition-opacity duration-150 ease-out-quint motion-reduce:transition-none"
          style={{ opacity: pressed ? 1 : 0 }}
        />
        <span
          className="absolute top-0.5 left-[5px] h-2 w-1 border-r-2 border-b-2 border-card transition-[opacity,transform] duration-200 ease-out-quint motion-reduce:transition-none"
          style={{ opacity: pressed ? 1 : 0, transform: `rotate(45deg) scale(${pressed ? 1 : 0.4})` }}
        />
      </span>
      Compare
    </button>
  )
}

export default function BarChartDemo() {
  const [period, setPeriod] = useState<PeriodId>('week')
  const [compare, setCompare] = useState(false)
  const p = PERIODS[period]
  const total = sum(p.data.map((d) => d.value))
  const before = sum(p.data.map((d) => d.previous ?? 0))
  const month = PERIODS.month
  return (
    <div className="@container grid w-full gap-4">
      <DataTile
        title="Spending"
        action={
          <>
            <CompareToggle pressed={compare} onPressedChange={setCompare} />
            <Pills label="Period" options={OPTIONS} value={period} onChange={(id) => setPeriod(id as PeriodId)} />
          </>
        }
        footer={<span>Card payments on all cards. Example data.</span>}
      >
        <TileFact label={p.fact} aside={<DeltaPill value={((total - before) / before) * 100} format={{ decimals: 1, sign: true, suffix: '%' }} goodWhen="down" />}>
          <BigNumber value={total} size="xl" format={EUR} />
        </TileFact>
        <BarChart
          className="mt-[22px]"
          data={p.data}
          label={`Spending, ${p.fact.replace('Spent in the', '').trim()}`}
          format={EUR}
          compare={compare}
          bucket={p.bucket}
          tickEvery={p.tickEvery}
          bucketTitle={period === 'month' ? weekTitle : undefined}
          bucketLabel={period === 'month' ? weekLabel : undefined}
          labels={{ previous: p.previous, value: 'This period', point: 'Period' }}
        />
      </DataTile>

      <div className="grid gap-4 @min-[520px]:grid-cols-2">
        <DataTile title="Last 30 days" density="compact" footer={<span>Grouped by week when narrow. Example data.</span>}>
          <TileFact>
            <BigNumber value={sum(MONTH_VALUE)} size="md" format={EUR} />
          </TileFact>
          <BarChart
            className="mt-3.5"
            data={month.data}
            label="Spending, last 30 days"
            format={EUR}
            legend={false}
            tickEvery={7}
            bucketTitle={weekTitle}
            bucketLabel={weekLabel}
          />
        </DataTile>
        <DataTile title="This year" density="compact" inverted footer={<span>Example data.</span>}>
          <TileFact aside={<DeltaPill value={6.1} goodWhen="down" />}>
            <BigNumber value={sum(YEAR.value)} size="md" format={{ currency: 'EUR' }} />
          </TileFact>
          <BarChart
            className="mt-3.5"
            data={PERIODS.year.data}
            label="Spending, last 12 months, compared with the 12 months before"
            format={{ currency: 'EUR' }}
            compare
            bucket={3}
            labels={{ previous: 'Year before' }}
          />
        </DataTile>
      </div>

      <div className="grid gap-4 @min-[520px]:grid-cols-2">
        <DataTile title="No data" density="compact">
          <TileFact>
            <span className="text-muted-foreground">
              <BigNumber value={0} size="md" format={EUR} roll={false} />
            </span>
          </TileFact>
          <BarChart
            className="mt-3.5"
            data={WEEK.label.map((label) => ({ label, value: 0 }))}
            label="Spending, last 7 days"
            format={EUR}
            current={null}
            placeholder={
              <>
                <b className="text-base leading-[1.3] font-semibold">No spending yet</b>
                <span className="max-w-[34ch] text-[13.5px] text-pretty text-muted-foreground">
                  Payments show up here as soon as a card is used.
                </span>
              </>
            }
          />
        </DataTile>
        <DataTile title="Loading" density="compact">
          <TileFact>
            <span aria-hidden className="block h-[30px] w-36 rounded-xl bg-muted motion-safe:animate-pulse" />
          </TileFact>
          <BarChart className="mt-3.5" data={[]} label="Spending, last 7 days" loading labels={{ loading: 'Loading spending for the last 7 days' }} />
        </DataTile>
      </div>
    </div>
  )
}
