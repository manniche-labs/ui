// A sales-floor screen: a segmented arc dial for the target, a live call card, performance bars and revenue by source.
import { Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BarChart, type BarPoint } from '@/registry/manniche/bar-chart/bar-chart'
import type { ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'
import { Dial, type DialZone } from '@/registry/manniche/dial/dial'
import { Donut, type DonutDatum } from '@/registry/manniche/donut/donut'

export type SalesFloorData = {
  target: { title: string; value: number; max: number; zones: DialZone[]; caption: string; format?: ValueFormat }
  call: { title: string; contact: string; company: string; status: string; duration: string; action: string }
  performance: { title: string; points: BarPoint[]; format?: ValueFormat; /** The bar to mark as current, if the bars are periods. Default none. */ current?: number | null }
  sources: { title: string; items: DonutDatum[]; format?: ValueFormat }
}

export type SalesFloorLabels = { note?: string }

export type SalesFloorProps = {
  /** The target dial, current call, performance bars and lead sources to show. */
  data: SalesFloorData
  /** Visible text and screen reader text, with English defaults. Key: note, the footer text on the tiles. */
  labels?: SalesFloorLabels
  /** Called with no arguments when the call tile's end-call button is pressed. */
  onEndCall?: () => void
  /** Classes for the outer container. */
  className?: string
}

export function SalesFloor({ data, labels, onEndCall, className }: SalesFloorProps) {
  const note = labels?.note ?? 'Example data.'
  return (
    <div className={cn('@container w-full rounded-2xl bg-background p-3 text-foreground', className)}>
      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-6">
        <div className="@2xl:col-span-3">
          <DataTile className="h-full" title={data.call.title} inverted>
            <div className="flex flex-wrap items-center gap-3">
              <span aria-hidden className="grid size-11 place-items-center rounded-full bg-muted">
                <Phone className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{data.call.contact}</p>
                <p className="truncate text-sm opacity-70">{data.call.company}</p>
              </div>
              <span role="status" className="ml-auto text-sm whitespace-nowrap tabular-nums">
                {data.call.status} · {data.call.duration}
              </span>
            </div>
            <button
              type="button"
              onClick={onEndCall}
              className="mt-4 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {data.call.action}
            </button>
          </DataTile>
        </div>
        <div className="@2xl:col-span-3">
          <DataTile className="h-full" title={data.target.title} footer={note}>
            <Dial
              value={data.target.value}
              max={data.target.max}
              zones={data.target.zones}
              label={data.target.title}
              caption={data.target.caption}
              format={data.target.format}
              segments={24}
            />
          </DataTile>
        </div>
        <div className="@2xl:col-span-4">
          <DataTile className="h-full" title={data.performance.title} footer={note}>
            <BarChart data={data.performance.points} label={data.performance.title} format={data.performance.format} current={data.performance.current ?? null} />
          </DataTile>
        </div>
        <div className="@2xl:col-span-2">
          <DataTile className="h-full" title={data.sources.title} footer={note}>
            <Donut data={data.sources.items} label={data.sources.title} format={data.sources.format} />
          </DataTile>
        </div>
      </div>
    </div>
  )
}
