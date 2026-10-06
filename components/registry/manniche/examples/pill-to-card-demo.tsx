import { PillToCard } from '@/registry/manniche/pill-to-card/pill-to-card'

const button =
  'inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border px-4 text-sm leading-none font-medium outline-none transition-[transform] duration-120 ease-[cubic-bezier(0.23,1,0.32,1)] active:[transform:scale(.97)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none'

export default function PillToCardDemo() {
  return (
    <div className="grid min-h-[300px] w-full place-items-center">
      <PillToCard name="Ada Lovelace" role="Analyst">
        <div className="mt-4 flex justify-between border-y border-border py-2 font-mono text-[11px] leading-[1.4] text-muted-foreground">
          <span>profile</span>
          <span>demo</span>
        </div>
        <p className="mt-3 mb-4 text-sm leading-normal text-pretty">
          Wrote the first published algorithm meant for a machine, in her notes on Babbage’s Analytical Engine.
        </p>
        <div className="flex gap-2">
          <button type="button" className={`${button} border-transparent bg-primary text-primary-foreground`}>
            Message
          </button>
          <button type="button" className={`${button} border-border bg-card text-card-foreground`}>
            View profile
          </button>
        </div>
      </PillToCard>
    </div>
  )
}
