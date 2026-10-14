import { useState } from 'react'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'
import {
  DateRangePanel,
  DateRangePicker,
  type DateRange,
  type DateRangeApplyDetail,
} from '@/registry/manniche/date-range-picker/date-range-picker'
import { presetRange, previousPeriod } from '@/registry/manniche/date-range-picker/dates'

// A fixed "today", so the demo looks the same on every day it is opened.
const TODAY = new Date(2026, 9, 14)
const fmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' })
const span = (r: DateRange) => fmt.formatRange(r.start, r.end)

export default function DateRangePickerDemo() {
  const [range, setRange] = useState<DateRange | null>(() => presetRange('last7', TODAY))
  const [compare, setCompare] = useState(true)
  const [inline, setInline] = useState<DateRangeApplyDetail | null>(null)

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight">Traffic</h2>
          <p className="text-[13.5px] text-muted-foreground">
            {range ? span(range) : 'No period'}
            {range && compare && ` compared with ${span(previousPeriod(range))}`}
          </p>
        </div>
        <DateRangePicker
          align="end"
          today={TODAY}
          max={TODAY}
          value={range}
          onChange={setRange}
          compare={compare}
          onCompareChange={setCompare}
        />
      </div>

      <DataTile
        title="Report period"
        footer={
          <span aria-live="polite">
            {inline
              ? `Applied ${span(inline.range)}${inline.compare ? `, compared with ${span(inline.previous)}` : ''}.`
              : 'Nothing applied yet. Example data.'}
          </span>
        }
      >
        <DateRangePanel
          today={TODAY}
          max={TODAY}
          defaultValue={presetRange('lastMonth', TODAY)}
          onApply={setInline}
          onCancel={() => setInline(null)}
          className="shadow-none"
        />
      </DataTile>
    </div>
  )
}
