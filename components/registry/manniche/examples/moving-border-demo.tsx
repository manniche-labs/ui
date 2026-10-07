import { MovingBorder } from '@/registry/manniche/moving-border/moving-border'

export default function MovingBorderDemo() {
  return (
    <div className="grid justify-items-center gap-6">
      <MovingBorder>
        <div className="grid gap-1.5 px-8 py-6 text-center">
          <p className="text-sm text-muted-foreground">Most chosen</p>
          <p className="font-[family-name:var(--font-display,inherit)] text-[34px] leading-none font-extrabold tracking-[-0.045em]">Business</p>
          <p className="text-sm text-muted-foreground">Website, shop and bookings</p>
        </div>
      </MovingBorder>

      <MovingBorder variant="iridescent" duration={10} className="max-w-full">
        <div className="grid w-[340px] max-w-full gap-2.5 px-[22px] pt-5 pb-[22px]">
          <svg viewBox="0 0 40 40" aria-hidden className="size-10 fill-none stroke-foreground stroke-1">
            <circle cx="20" cy="20" r="18.5" />
            <circle cx="20" cy="20" r="13" />
            <path d="M11.5 14a10 10 0 0 1 6-4.6" />
          </svg>
          <p className="font-mono text-[11px] leading-none font-medium tracking-[0.04em] text-muted-foreground tabular-nums">coated element · demo</p>
          <h3 className="text-[19px] leading-tight font-semibold tracking-[-0.02em]">Thin-film ring</h3>
          <p className="text-[13.5px] leading-normal text-pretty text-muted-foreground">
            The ring carries a band of hues around the signal colour, the way coated glass catches light. Only the border is lit.
          </p>
        </div>
      </MovingBorder>

      <div className="flex flex-wrap justify-center gap-4">
        <MovingBorder duration={3} className="rounded-full">
          <button type="button" className="min-h-11 px-6 text-sm font-medium">
            Book a call
          </button>
        </MovingBorder>
        <MovingBorder variant="iridescent" duration={7} className="rounded-full">
          <button
            type="button"
            className="min-h-11 px-6 text-sm font-medium transition-transform duration-[120ms] ease-out-quint focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none"
          >
            Continue
          </button>
        </MovingBorder>
      </div>
    </div>
  )
}
