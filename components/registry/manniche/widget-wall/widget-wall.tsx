// A wall of small widgets (WIP: KPI sparkline tiles, a ranked lollipop and a bar chart). Built from Tiles primitives.
import { cn } from '@/lib/utils'
import { BarChart, type BarPoint } from '@/registry/manniche/bar-chart/bar-chart'
import { BigNumber, DeltaPill } from '@/registry/manniche/chart-kit/chart-kit'
import type { ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { DataTile, TileFact } from '@/registry/manniche/data-tile/data-tile'
import { Lollipop, type LollipopDatum } from '@/registry/manniche/lollipop/lollipop'
import { Sparkline } from '@/registry/manniche/sparkline/sparkline'

export type WidgetKpi = { id: string; title: string; value: number; change: number; series: number[]; format?: ValueFormat; lowerIsBetter?: boolean }

export type WidgetWallData = {
  kpis: WidgetKpi[]
  ranking: { title: string; items: LollipopDatum[]; format?: ValueFormat }
  weekly: { title: string; points: BarPoint[]; format?: ValueFormat }
}

export type WidgetWallLabels = { note?: string }

export type WidgetWallProps = { data: WidgetWallData; labels?: WidgetWallLabels; className?: string }

export function WidgetWall({ data, labels, className }: WidgetWallProps) {
  const note = labels?.note ?? 'Example data.'
  return (
    <div className={cn('@container w-full rounded-2xl bg-background p-3 text-foreground', className)}>
      <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2 @3xl:grid-cols-6">
        {data.kpis.map((k) => (
          <div key={k.id} className="@3xl:col-span-2">
            <DataTile title={k.title} density="compact">
              <TileFact aside={<DeltaPill value={k.change} goodWhen={k.lowerIsBetter ? 'down' : 'up'} />}>
                <BigNumber value={k.value} format={k.format} size="md" />
              </TileFact>
              <Sparkline data={k.series} label={k.title} format={k.format} />
            </DataTile>
          </div>
        ))}
        <div className="@lg:col-span-2 @3xl:col-span-3">
          <DataTile title={data.weekly.title} footer={note}>
            <BarChart data={data.weekly.points} label={data.weekly.title} format={data.weekly.format} />
          </DataTile>
        </div>
        <div className="@lg:col-span-2 @3xl:col-span-3">
          <DataTile title={data.ranking.title} footer={note}>
            <Lollipop data={data.ranking.items} label={data.ranking.title} format={data.ranking.format} />
          </DataTile>
        </div>
      </div>
    </div>
  )
}
