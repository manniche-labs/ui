import { MovingBorder } from '@/registry/manniche/moving-border/moving-border'

export default function MovingBorderDemo() {
  return (
    <div className="grid justify-items-center gap-6">
      <MovingBorder>
        <div className="grid gap-1 px-8 py-6 text-center">
          <p className="text-sm text-muted-foreground">Most chosen</p>
          <p className="font-serif text-3xl">Business</p>
          <p className="text-sm text-muted-foreground">Website, shop and bookings</p>
        </div>
      </MovingBorder>
      <MovingBorder duration={3} className="rounded-xl">
        <button type="button" className="min-h-11 px-5 text-sm font-medium">
          Book a call
        </button>
      </MovingBorder>
    </div>
  )
}
