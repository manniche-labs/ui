// A people-ops screen: hiring funnel, today's schedule, payroll list and an attendance dot matrix.
import { cn } from '@/lib/utils'
import { BarChart, type BarPoint } from '@/registry/manniche/bar-chart/bar-chart'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'
import { DotMatrix } from '@/registry/manniche/dot-matrix/dot-matrix'
import { TransactionList, type Transaction } from '@/registry/manniche/transaction-list/transaction-list'
import type { ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'

export type PeopleOpsData = {
  funnel: { title: string; stages: BarPoint[] }
  today: { title: string; items: { id: string; time: string; title: string; who: string }[] }
  payroll: { title: string; items: Transaction[]; today?: string; format?: ValueFormat }
  attendance: { title: string; data: number[][]; rows: string[]; columns: string[] }
}

export type PeopleOpsLabels = { note?: string }

export type PeopleOpsProps = {
  /** The hiring funnel, today's schedule, payroll list and attendance matrix to show. */
  data: PeopleOpsData
  /** Visible text and screen reader text, with English defaults. Key: note, the footer text on the tiles. */
  labels?: PeopleOpsLabels
  /** Classes for the outer container. */
  className?: string
}

export function PeopleOps({ data, labels, className }: PeopleOpsProps) {
  const note = labels?.note ?? 'Example data.'
  return (
    <div className={cn('@container w-full rounded-2xl bg-background p-3 text-foreground', className)}>
      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-6">
        <div className="@2xl:col-span-3">
          <DataTile className="h-full" title={data.today.title} inverted>
            <ol className="flex flex-col gap-3">
              {data.today.items.map((it) => (
                <li key={it.id} className="flex items-baseline gap-3 text-sm">
                  <time className="w-12 shrink-0 tabular-nums opacity-70">{it.time}</time>
                  <span className="min-w-0 flex-1 truncate font-medium">{it.title}</span>
                  <span className="opacity-70">{it.who}</span>
                </li>
              ))}
            </ol>
          </DataTile>
        </div>
        <div className="@2xl:col-span-3">
          <DataTile className="h-full" title={data.funnel.title} footer={note}>
            <BarChart data={data.funnel.stages} label={data.funnel.title} current={null} />
          </DataTile>
        </div>
        <div className="@2xl:col-span-3">
          <DataTile className="h-full" title={data.payroll.title} footer={note}>
            <TransactionList data={data.payroll.items} label={data.payroll.title} today={data.payroll.today} format={data.payroll.format} />
          </DataTile>
        </div>
        <div className="@2xl:col-span-3">
          <DataTile className="h-full" title={data.attendance.title} footer={note}>
            <DotMatrix data={data.attendance.data} rows={data.attendance.rows} columns={data.attendance.columns} label={data.attendance.title} />
          </DataTile>
        </div>
      </div>
    </div>
  )
}
