// A delivery board: client progress, a date strip (opens on `now` when it is in the strip), roadmap lanes with initials avatars and a small assistant tile.
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'

export type BoardClient = { id: string; name: string; progress: number }
export type BoardItem = { id: string; title: string; owners: string[] }
export type BoardLane = { id: string; title: string; items: BoardItem[] }

export type DeliveryBoardData = {
  clients: { title: string; items: BoardClient[] }
  /** ISO dates "YYYY-MM-DD", one per chip. */
  days: string[]
  roadmap: { title: string; lanes: BoardLane[] }
  assistant: { title: string; text: string; action: string }
}

export type DeliveryBoardLabels = { note?: string; daysLabel?: string }

export type DeliveryBoardProps = {
  data: DeliveryBoardData
  labels?: DeliveryBoardLabels
  now?: Date
  onAssistant?: () => void
  className?: string
}

/** Local calendar date as "YYYY-MM-DD". */
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const initials = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export function DeliveryBoard({ data, labels, now, onAssistant, className }: DeliveryBoardProps) {
  const note = labels?.note ?? 'Example data.'
  const today = now && isoDay(now)
  const [day, setDay] = useState(today && data.days.includes(today) ? today : data.days[0])
  return (
    <div className={cn('@container w-full rounded-2xl bg-background p-3 text-foreground', className)}>
      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-6">
        <div className="@2xl:col-span-4">
          <DataTile className="h-full" title={data.clients.title} footer={note}>
            <ul className="flex flex-col gap-3">
              {data.clients.items.map((c) => (
                <li key={c.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="tabular-nums text-muted-foreground">{c.progress}%</span>
                  </div>
                  <div role="progressbar" aria-label={c.name} aria-valuenow={c.progress} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${c.progress}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </DataTile>
        </div>
        <div className="@2xl:col-span-2">
          <DataTile className="h-full" title={data.assistant.title} inverted>
            <p className="text-sm opacity-80">{data.assistant.text}</p>
            <button type="button" onClick={onAssistant} className="mt-4 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {data.assistant.action}
            </button>
          </DataTile>
        </div>
        <div className="@2xl:col-span-6">
          <div role="group" aria-label={labels?.daysLabel ?? 'Day'} className="flex gap-1 overflow-x-auto rounded-full border border-border bg-card p-1">
            {data.days.map((d) => {
              const date = new Date(`${d}T12:00:00Z`)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={d === day}
                  aria-current={d === today ? 'date' : undefined}
                  onClick={() => setDay(d)}
                  className={cn('relative flex min-w-11 flex-1 flex-col items-center rounded-full px-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring', d === day && 'bg-foreground text-background hover:text-background')}
                >
                  <span>{date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })}</span>
                  <span className="text-sm font-medium tabular-nums">{date.getUTCDate()}</span>
                  {d === today && <span aria-hidden className="absolute bottom-0.5 size-1 rounded-full bg-current" />}
                </button>
              )
            })}
          </div>
        </div>
        <div className="@2xl:col-span-6">
          <DataTile className="h-full" title={data.roadmap.title} footer={note}>
            <div className="grid grid-cols-1 gap-4 @xl:grid-cols-3">
              {data.roadmap.lanes.map((lane) => (
                <section key={lane.id} aria-label={lane.title} className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{lane.title}</h3>
                  <ul className="flex flex-col gap-2">
                    {lane.items.map((it) => (
                      <li key={it.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">{it.title}</span>
                        <span className="flex -space-x-1.5">
                          {it.owners.map((o) => (
                            <span key={o} title={o} role="img" aria-label={o} className="grid size-6 place-items-center rounded-full border border-card bg-muted text-[10px] font-medium">
                              {initials(o)}
                            </span>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </DataTile>
        </div>
      </div>
    </div>
  )
}
