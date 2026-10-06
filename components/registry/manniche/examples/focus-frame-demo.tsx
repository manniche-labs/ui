import { Pause, Play } from 'lucide-react'
import { useState } from 'react'
import { FocusFrame, type FocusFrameWord } from '@/registry/manniche/focus-frame/focus-frame'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'

const SENTENCE = 'A good instrument does one thing exactly, then gets out of your way.'
const TOTAL = SENTENCE.split(' ').length

export default function FocusFrameDemo() {
  const reduce = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const [word, setWord] = useState<FocusFrameWord | null>(null)

  return (
    <div className="@container grid w-full gap-10 px-2">
      <FocusFrame
        rounds={0}
        paused={paused}
        onFocusWord={setWord}
        className="text-[clamp(1.75rem,8.4cqi,3rem)] leading-[1.36] font-light tracking-[-0.03em] text-balance"
      >
        {SENTENCE}
      </FocusFrame>

      {/* A camera-style readout and a pause button, built from the onFocusWord callback and the paused prop. */}
      <div className="flex min-h-11 items-center gap-[18px] font-mono text-[11.5px] text-muted-foreground tabular-nums">
        <span aria-hidden className="relative pl-3">
          <span className="absolute top-1/2 left-0 -mt-[3px] size-1.5 rounded-full shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_30%,transparent)]" />
          <span
            className={`absolute top-1/2 left-0 -mt-[3px] size-1.5 rounded-full bg-primary transition-opacity duration-120 ease-[cubic-bezier(0.23,1,0.32,1)] ${word?.locked ? 'opacity-100' : 'opacity-0'}`}
          />
          af
        </span>
        <span aria-hidden>
          word <b className="font-medium text-foreground">{String((word?.index ?? 0) + 1).padStart(2, '0')}/{TOTAL}</b>
        </span>
        <span aria-hidden className="hidden @sm:inline">
          width <b className="font-medium text-foreground">{Math.round(word?.width ?? 0)} px</b>
        </span>
        {!reduce && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-md px-3 hover:text-foreground"
          >
            {paused ? <Play aria-hidden className="size-3 fill-current" /> : <Pause aria-hidden className="size-3 fill-current" />}
            {paused ? 'run' : 'hold'}
            <span className="sr-only"> the frame</span>
          </button>
        )}
      </div>
    </div>
  )
}
