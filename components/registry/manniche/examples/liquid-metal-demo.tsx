import { ArrowRight } from 'lucide-react'
import { LiquidMetal } from '@/registry/manniche/liquid-metal/liquid-metal'

export default function LiquidMetalDemo() {
  return (
    <div className="flex flex-col items-center gap-6">
      <LiquidMetal className="aspect-[1.586] w-full max-w-sm rounded-3xl shadow-xl">
        <div className="flex h-full flex-col justify-between p-6 text-neutral-950">
          <p className="text-sm font-semibold tracking-[0.2em] uppercase">Members</p>
          <div>
            <p className="font-mono text-lg tracking-widest">0042 1987 5531</p>
            <p className="text-sm">Platinum since 2021</p>
          </div>
        </div>
      </LiquidMetal>
      <LiquidMetal className="rounded-full p-[3px]">
        <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-medium text-white">
          Join the club
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </LiquidMetal>
    </div>
  )
}
