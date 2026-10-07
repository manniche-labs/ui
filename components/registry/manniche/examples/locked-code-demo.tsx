import { LockedCode, type LockedCodeProps } from '@/registry/manniche/locked-code/locked-code'

// The stub is placeholder lines, never real source: it ships in the page's HTML even though it is blurred.
const STUB = `"use client"

// Placeholder lines drawn behind the lock.
// They are not the component's source.
import { cn } from "@/lib/utils"

export type PlaceholderProps = {
  className?: string
}

export function Placeholder({ className }: PlaceholderProps) {
  return <div className={cn("relative", className)} />
}`

// Each specimen is a different Pro component, so the three regions on this page have different names.
const pro = (name: string): LockedCodeProps => ({
  name,
  stub: STUB,
  unlockHref: '/lab/ui/pro#priser',
  price: '€49',
  priceNote: 'Introductory price until 31 December 2026, then €79',
  facts: ['One-time payment', 'One developer', 'Key arrives by email right away'],
  commands: [
    { label: 'CLI', value: `npx shadcn@latest add @manniche-pro/${name}`, prefix: 'npx shadcn@latest add' },
    {
      label: 'MCP',
      value:
        'claude mcp add --transport http manniche-ui https://mikkelmanniche.dk/api/mcp --header "Authorization: Bearer $MANNICHE_PRO_KEY"',
      prefix: 'claude mcp add',
    },
  ],
  envVar: 'MANNICHE_PRO_KEY',
  setupHref: '/lab/ui/pro#pro-start',
  labels: { body: '{name} is part of Manniche UI Pro. A key opens the source of every Pro effect.' },
})

// The second specimen holds the hover/focus look still, through the parts' data-slot attributes.
const HOT =
  '[&_[data-slot=locked-code-light]]:opacity-100 [&_[data-slot=locked-code-unlock]]:ring-2 [&_[data-slot=locked-code-unlock]]:ring-ring [&_[data-slot=locked-code-unlock]]:ring-offset-2 [&_[data-slot=locked-code-unlock]]:ring-offset-card'

export default function LockedCodeDemo() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-6 sm:px-6 sm:py-10">
      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Locked</h2>
        <LockedCode {...pro('flux-image')} />
      </section>
      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Unlock link hovered or focused: the key slot lights (held still here)
        </h2>
        <LockedCode {...pro('warp-type')} commands={[]} className={HOT} />
      </section>
      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Narrow, 375 px</h2>
        <div className="w-full max-w-[375px]">
          <LockedCode {...pro('dot-globe')} />
        </div>
      </section>
    </div>
  )
}
