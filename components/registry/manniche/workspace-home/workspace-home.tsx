// A workspace home screen (WIP: pill navbar, large search, offer tile, deals bars; the week schedule is still missing).
import { Search } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BarChart, type BarPoint } from '@/registry/manniche/bar-chart/bar-chart'
import { BigNumber } from '@/registry/manniche/chart-kit/chart-kit'
import { DataTile, TileFact } from '@/registry/manniche/data-tile/data-tile'

export type WorkspaceHomeData = {
  nav: { id: string; label: string }[]
  offer: { title: string; text: string; action: string }
  deals: { title: string; total: number; points: BarPoint[]; currency?: string }
}

export type WorkspaceHomeLabels = { search?: string; searchLabel?: string; navLabel?: string; note?: string }

export type WorkspaceHomeProps = {
  data: WorkspaceHomeData
  labels?: WorkspaceHomeLabels
  onSearch?: (query: string) => void
  onOffer?: () => void
  className?: string
}

export function WorkspaceHome({ data, labels, onSearch, onOffer, className }: WorkspaceHomeProps) {
  const t = { search: 'Search the workspace', searchLabel: 'Search', navLabel: 'Workspace', note: 'Example data.', ...labels }
  const [current, setCurrent] = useState(data.nav[0]?.id)
  const [q, setQ] = useState('')
  const money = { currency: data.deals.currency ?? 'EUR', decimals: 0 }
  return (
    <div className={cn('@container flex w-full flex-col gap-3 rounded-2xl bg-background p-3 text-foreground', className)}>
      <nav aria-label={t.navLabel} className="flex gap-1 self-start overflow-x-auto rounded-full border border-border bg-card p-1">
        {data.nav.map((n) => (
          <button
            key={n.id}
            type="button"
            aria-current={n.id === current ? 'page' : undefined}
            onClick={() => setCurrent(n.id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
              n.id === current && 'bg-foreground text-background hover:text-background',
            )}
          >
            {n.label}
          </button>
        ))}
      </nav>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          onSearch?.(q)
        }}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 focus-within:outline-2 focus-within:outline-ring"
      >
        <Search className="size-5 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t.searchLabel}
          placeholder={t.search}
          className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
        />
      </form>
      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-5">
        <div className="@2xl:col-span-2">
          <DataTile title={data.offer.title} inverted>
            <p className="text-sm opacity-80">{data.offer.text}</p>
            <button
              type="button"
              onClick={onOffer}
              className="mt-4 rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground transition-transform active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {data.offer.action}
            </button>
          </DataTile>
        </div>
        <div className="@2xl:col-span-3">
          <DataTile title={data.deals.title} footer={t.note}>
            <TileFact>
              <BigNumber value={data.deals.total} format={money} size="lg" />
            </TileFact>
            <BarChart data={data.deals.points} label={data.deals.title} format={money} />
          </DataTile>
        </div>
      </div>
    </div>
  )
}
