import { useState } from 'react'
import { Badge } from '@/registry/manniche/badge/badge'
import { FilterBar, type FilterState, type FilterTier } from '@/registry/manniche/filter-bar/filter-bar'

// Two bars over the same example catalogue. The first filters in place and takes keys 1 to 4. The second starts on a
// category with no hits under its tier (New + hooks: the chip stays, showing 0) and has its shortcuts off.
// Every count is worked out from the example list below; none is typed in by hand.

type Group = { cat: string; free: number; pro: number; fresh: number }

const CATALOGUE: Group[] = [
  { cat: 'templates', free: 9, pro: 4, fresh: 1 },
  { cat: 'widgets', free: 12, pro: 3, fresh: 0 },
  { cat: 'controls', free: 10, pro: 2, fresh: 1 },
  { cat: 'surfaces', free: 8, pro: 3, fresh: 2 },
  { cat: 'agent', free: 7, pro: 1, fresh: 0 },
  { cat: 'image', free: 2, pro: 6, fresh: 1 },
  { cat: 'background', free: 3, pro: 5, fresh: 0 },
  { cat: 'motion', free: 5, pro: 3, fresh: 0 },
  { cat: 'text', free: 4, pro: 3, fresh: 1 },
  { cat: 'image-gallery', free: 1, pro: 5, fresh: 0 },
  { cat: 'overlays', free: 4, pro: 1, fresh: 0 },
  { cat: 'button', free: 3, pro: 2, fresh: 0 },
  { cat: 'cursor', free: 1, pro: 3, fresh: 0 },
  { cat: 'navigation', free: 3, pro: 1, fresh: 0 },
  { cat: 'webgl', free: 0, pro: 4, fresh: 0 },
  { cat: 'games', free: 0, pro: 3, fresh: 0 },
  { cat: 'hooks', free: 3, pro: 0, fresh: 0 },
]

const inTier = (g: Group, tier: FilterTier) =>
  tier === 'all' ? g.free + g.pro : tier === 'free' ? g.free : tier === 'pro' ? g.pro : g.fresh

function countsFor({ filter, category }: FilterState) {
  const groups = category ? CATALOGUE.filter((g) => g.cat === category) : CATALOGUE
  const sum = (tier: FilterTier) => groups.reduce((n, g) => n + inTier(g, tier), 0)
  const counts = { all: sum('all'), free: sum('free'), pro: sum('pro'), new: sum('new') }
  // Categories with hits under this tier, most first; the chosen one stays even at 0, so the grid can say why it is empty.
  const categories = CATALOGUE.map((g) => ({ name: g.cat, count: inTier(g, filter) }))
    .filter((c) => c.count > 0 || c.name === category)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const allCount = CATALOGUE.reduce((n, g) => n + inTier(g, filter), 0)
  const shown = category ? (categories.find((c) => c.name === category)?.count ?? 0) : allCount
  return { counts, categories, allCount, shown }
}

export default function FilterBarDemo() {
  const [live, setLive] = useState<FilterState>({ filter: 'all', category: null })
  const [edge, setEdge] = useState<FilterState>({ filter: 'new', category: 'hooks' })
  const a = countsFor(live)
  const b = countsFor(edge)

  return (
    <div className="grid w-full min-w-0 gap-10">
      <div className="grid min-w-0 gap-4">
        <FilterBar value={live} onChange={setLive} counts={a.counts} categories={a.categories} allCount={a.allCount} />
        <p role="status" className="text-sm text-muted-foreground">
          Showing <span className="text-foreground tabular-nums">{a.shown}</span> example items
        </p>
      </div>

      <div className="grid min-w-0 gap-4">
        <p className="text-sm text-muted-foreground">No hits in a category, shortcuts off</p>
        <FilterBar
          value={edge}
          onChange={setEdge}
          counts={b.counts}
          categories={b.categories}
          allCount={b.allCount}
          shortcuts={false}
          labels={{ filter: 'Tier', category: 'Topic' }}
        />
        <p role="status" className="text-sm text-muted-foreground">
          {b.shown === 0 ? `Nothing in “${edge.category}” under this tier. Pick another tier or “all”.` : `Showing ${b.shown} example items`}
        </p>
      </div>

      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="demo">Demo data</Badge>
        Counts come from an example catalogue, not a real one.
      </p>
    </div>
  )
}
