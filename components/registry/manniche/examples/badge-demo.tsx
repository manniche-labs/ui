import { Badge } from '@/registry/manniche/badge/badge'

// Every variant, alone and the way they sit together on a gallery card. The "New" labels are example data.
export default function BadgeDemo() {
  return (
    <div className="grid w-full gap-6">
      <div className="grid gap-3 rounded-[calc(var(--radius)*2+2px)] bg-card p-6 text-card-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]">
        <p className="text-sm text-muted-foreground">Variants</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">controls</Badge>
          <Badge variant="free">Free</Badge>
          <Badge variant="pro">Pro</Badge>
          <Badge variant="new">New</Badge>
          <Badge variant="demo">Demo data</Badge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Together, as on a card</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>surfaces</Badge>
          <Badge variant="new">New</Badge>
          <Badge variant="pro">Pro</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>agent</Badge>
          <Badge variant="free">MIT</Badge>
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="demo">Demo data</Badge>
        The “New” labels above are examples; no dates exist yet.
      </p>
    </div>
  )
}
