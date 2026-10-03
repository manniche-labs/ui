import { SpotlightCard } from '@/registry/manniche/spotlight-card/spotlight-card'

export default function SpotlightCardDemo() {
  return (
    <SpotlightCard>
      <p className="font-medium">Free returns</p>
      <p className="mt-1 text-sm text-muted-foreground">30 days, no questions.</p>
    </SpotlightCard>
  )
}
