// A health overview: three vital figures, a patient card, a score dial and calorie bars with macros.
import { cn } from '@/lib/utils'
import { BarChart, type BarPoint } from '@/registry/manniche/bar-chart/bar-chart'
import { BigNumber } from '@/registry/manniche/chart-kit/chart-kit'
import { DataTile, TileFact } from '@/registry/manniche/data-tile/data-tile'
import { Dial, type DialZone } from '@/registry/manniche/dial/dial'
import { Donut, type DonutDatum } from '@/registry/manniche/donut/donut'

export type HealthOverviewData = {
  vitals: { id: string; title: string; value: number; unit: string }[]
  patient: { name: string; details: { label: string; value: string }[] }
  score: { title: string; value: number; zones: DialZone[]; caption: string }
  calories: { title: string; points: BarPoint[]; macros: DonutDatum[]; macrosTitle: string }
}

export type HealthOverviewLabels = { note?: string }

export type HealthOverviewProps = { data: HealthOverviewData; labels?: HealthOverviewLabels; className?: string }

export function HealthOverview({ data, labels, className }: HealthOverviewProps) {
  const note = labels?.note ?? 'Example data.'
  return (
    <div className={cn('@container w-full rounded-2xl bg-background p-3 text-foreground', className)}>
      <div className="grid grid-cols-1 gap-3 @lg:grid-cols-3 @3xl:grid-cols-6">
        {data.vitals.map((v) => (
          <div key={v.id} className="@3xl:col-span-2">
            <DataTile className="h-full" title={v.title} density="compact">
              <TileFact aside={<span className="text-sm text-muted-foreground">{v.unit}</span>}>
                <BigNumber value={v.value} size="lg" />
              </TileFact>
            </DataTile>
          </div>
        ))}
        <div className="@lg:col-span-3 @3xl:col-span-3">
          <DataTile className="h-full" title={data.patient.name} inverted>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {data.patient.details.map((d) => (
                <div key={d.label}>
                  <dt className="opacity-70">{d.label}</dt>
                  <dd className="font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
          </DataTile>
        </div>
        <div className="@lg:col-span-3 @3xl:col-span-3">
          <DataTile className="h-full" title={data.score.title} footer={note}>
            <Dial value={data.score.value} min={0} max={100} zones={data.score.zones} label={data.score.title} caption={data.score.caption} />
          </DataTile>
        </div>
        <div className="@lg:col-span-3 @3xl:col-span-4">
          <DataTile className="h-full" title={data.calories.title} footer={note}>
            <BarChart data={data.calories.points} label={data.calories.title} format={{ suffix: ' kcal' }} />
          </DataTile>
        </div>
        <div className="@lg:col-span-3 @3xl:col-span-2">
          <DataTile className="h-full" title={data.calories.macrosTitle} footer={note}>
            <Donut data={data.calories.macros} label={data.calories.macrosTitle} format={{ suffix: ' g' }} />
          </DataTile>
        </div>
      </div>
    </div>
  )
}
