import { TiltCard } from '@/registry/manniche/tilt-card/tilt-card'

export default function TiltCardDemo() {
  return (
    <TiltCard className="mx-auto max-w-sm">
      <div data-depth="1" className="h-36 rounded-xl bg-[linear-gradient(135deg,#f97316,#db2777_50%,#4f46e5)]" />
      <p data-depth="2" className="mt-4 font-medium">
        New website in two weeks
      </p>
      <p data-depth="1" className="mt-1 text-sm text-muted-foreground">
        Move the mouse over the card.
      </p>
    </TiltCard>
  )
}
