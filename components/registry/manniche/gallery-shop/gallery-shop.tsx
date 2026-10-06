// A gallery shop screen: vertical side menu, a two-tone headline, counters, events and collections.
// No images: collections are drawn as colour tiles so the demo carries no third-party media.
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BigNumber } from '@/registry/manniche/chart-kit/chart-kit'
import { DataTile, TileFact } from '@/registry/manniche/data-tile/data-tile'

export type GalleryShopData = {
  menu: { id: string; label: string }[]
  headline: { strong: string; soft: string }
  counters: { id: string; title: string; value: number }[]
  events: { title: string; items: { id: string; date: string; title: string; place: string }[] }
  collections: { title: string; items: { id: string; name: string; works: number; color: string }[] }
}

export type GalleryShopLabels = { note?: string; menuLabel?: string; works?: (n: number) => string }

export type GalleryShopProps = { data: GalleryShopData; labels?: GalleryShopLabels; className?: string }

export function GalleryShop({ data, labels, className }: GalleryShopProps) {
  const note = labels?.note ?? 'Example data.'
  const works = labels?.works ?? ((n: number) => `${n} works`)
  const [current, setCurrent] = useState(data.menu[0]?.id)
  return (
    <div className={cn('@container flex w-full gap-3 rounded-2xl bg-background p-3 text-foreground', className)}>
      <nav aria-label={labels?.menuLabel ?? 'Gallery'} className="hidden w-40 shrink-0 flex-col gap-1 @lg:flex">
        {data.menu.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-current={m.id === current ? 'page' : undefined}
            onClick={() => setCurrent(m.id)}
            className={cn('rounded-xl px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring', m.id === current && 'bg-foreground text-background hover:bg-foreground hover:text-background')}
          >
            {m.label}
          </button>
        ))}
      </nav>
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 @2xl:grid-cols-6">
        <h2 className="px-1 text-[clamp(28px,4vw,48px)] font-semibold leading-tight tracking-tight @2xl:col-span-6">
          {data.headline.strong} <span className="text-muted-foreground">{data.headline.soft}</span>
        </h2>
        {data.counters.map((c) => (
          <div key={c.id} className="@2xl:col-span-2">
            <DataTile title={c.title} density="compact">
              <TileFact>
                <BigNumber value={c.value} size="lg" />
              </TileFact>
            </DataTile>
          </div>
        ))}
        <div className="@2xl:col-span-3">
          <DataTile title={data.events.title} inverted>
            <ul className="flex flex-col gap-3">
              {data.events.items.map((e) => (
                <li key={e.id} className="flex flex-col text-sm">
                  <span className="text-xs opacity-70">{e.date} · {e.place}</span>
                  <span className="font-medium">{e.title}</span>
                </li>
              ))}
            </ul>
          </DataTile>
        </div>
        <div className="@2xl:col-span-3">
          <DataTile title={data.collections.title} footer={note}>
            <ul className="grid grid-cols-2 gap-2">
              {data.collections.items.map((c) => (
                <li key={c.id} className="flex flex-col gap-1.5">
                  <span aria-hidden className="aspect-[4/3] rounded-xl" style={{ background: c.color }} />
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{works(c.works)}</span>
                </li>
              ))}
            </ul>
          </DataTile>
        </div>
      </div>
    </div>
  )
}
