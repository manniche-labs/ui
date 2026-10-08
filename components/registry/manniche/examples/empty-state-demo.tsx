import { useState } from 'react'
import { Filter, Users } from 'lucide-react'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'
import { EmptyState } from '@/registry/manniche/empty-state/empty-state'

const button =
  'inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring'
const quiet =
  'inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring'

export default function EmptyStateDemo() {
  const [query, setQuery] = useState('')
  return (
    <section aria-label="Empty states" className="grid w-full gap-4">
      <EmptyState
        icon={<Users />}
        title="No segments yet"
        description="A segment picks contacts by rules, so a campaign only reaches the people it is for."
        examples={['Bought in the last 90 days', 'Customer tag: VIP', 'Opened a mail this month']}
        action={
          <button type="button" className={button}>
            New segment
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <EmptyState
          density="compact"
          icon={<Filter />}
          title="No saved filters"
          description="Save a filter from the list view to come back to it in one click."
          action={
            <button type="button" className={button}>
              Open the list
            </button>
          }
          secondaryAction={
            <a href="#filters" className={quiet}>
              How filters work
            </a>
          }
        />
        <EmptyState density="compact" title="Nothing to review" description="New drafts show up here as soon as someone asks for a review." />
      </div>
      <DataTile title="Customers">
        <label className="mb-3 flex flex-col gap-1.5 text-[13.5px] text-muted-foreground">
          Search customers
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try any name"
            className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <EmptyState
          variant="plain"
          live={query !== ''}
          title={query ? `No customers match "${query}"` : 'No customers yet'}
          description={query ? 'Check the spelling, or search by email instead.' : 'Customers appear here after their first order.'}
        />
      </DataTile>
    </section>
  )
}
