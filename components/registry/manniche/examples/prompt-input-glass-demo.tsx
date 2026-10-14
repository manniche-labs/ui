import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PromptInput } from '@/registry/manniche/prompt-input/prompt-input'

// A dusk scene painted with gradients and blurred like a photo, so the demo needs no image.
const SCENE = [
  'radial-gradient(38% 30% at 72% 30%, oklch(0.93 0.07 70 / 0.95), transparent 70%)',
  'radial-gradient(60% 40% at 20% 78%, oklch(0.62 0.16 40 / 0.9), transparent 70%)',
  'radial-gradient(50% 35% at 85% 85%, oklch(0.5 0.14 20 / 0.85), transparent 70%)',
  'radial-gradient(70% 45% at 30% 20%, oklch(0.42 0.09 255 / 0.9), transparent 70%)',
  'linear-gradient(180deg, oklch(0.27 0.05 260) 0%, oklch(0.45 0.07 320) 46%, oklch(0.7 0.12 55) 64%, oklch(0.3 0.05 40) 100%)',
].join(', ')

export default function PromptInputGlassDemo() {
  const [busy, setBusy] = useState(false)

  return (
    <div className="relative isolate grid min-h-[420px] w-full place-items-center overflow-hidden rounded-[calc(var(--radius)*2+2px)] px-4 py-14 sm:px-10">
      <div aria-hidden className="absolute -inset-10 -z-10 blur-2xl" style={{ background: SCENE }} />
      {/* A few soft bokeh lights, so the blur behind the glass has something to bend. */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <span className="absolute top-[18%] left-[14%] size-16 rounded-full bg-[oklch(0.95_0.06_80/0.55)] blur-md" />
        <span className="absolute top-[58%] left-[62%] size-24 rounded-full bg-[oklch(0.85_0.12_50/0.5)] blur-lg" />
        <span className="absolute top-[30%] right-[10%] size-10 rounded-full bg-[oklch(0.98_0.02_90/0.7)] blur-sm" />
        <span className="absolute bottom-[12%] left-[30%] size-12 rounded-full bg-[oklch(0.8_0.14_30/0.55)] blur-md" />
      </div>

      <div className="grid w-full max-w-xl justify-items-center gap-5">
        <p className="text-center text-[22px] leading-tight font-medium tracking-[-0.01em] text-balance text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.35)]">
          Where should we start?
        </p>
        <PromptInput
          variant="glass"
          collapsed
          accept="image/*,.pdf"
          attachIcon={<Plus className="size-5" strokeWidth={2} aria-hidden />}
          busy={busy}
          placeholder="Ask anything"
          onSubmit={() => {
            setBusy(true)
            setTimeout(() => setBusy(false), 2000)
          }}
          onStop={() => setBusy(false)}
          className="w-full"
        />
        <p className="rounded-full bg-black/35 px-3 py-1 text-center text-[13px] text-white backdrop-blur-sm">
          Click or tab into the pill. It shrinks back when it is empty.
        </p>
      </div>
    </div>
  )
}
