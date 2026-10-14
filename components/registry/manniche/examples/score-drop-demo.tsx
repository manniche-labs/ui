import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { ScoreDrop } from '@/registry/manniche/score-drop/score-drop'

// Example scores for the demo, not real data.
const SCORES = [58, 73, 91, 64, 47, 86]

export default function ScoreDropDemo() {
  const [i, setI] = useState(0)
  const [focus, setFocus] = useState(72)
  return (
    <div className="grid w-full max-w-[680px] justify-items-center gap-6 sm:grid-cols-2 sm:items-start">
      <div className="grid w-full justify-items-center gap-3">
        <ScoreDrop
          value={SCORES[i]}
          title={
            <>
              How calm did <strong>the team</strong> feel this week?
            </>
          }
          caption="out of 100"
          glow="oklch(0.7 0.19 48)"
        />
        <button
          type="button"
          onClick={() => setI((n) => (n + 1) % SCORES.length)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-muted px-4 text-sm font-medium text-foreground transition-transform duration-150 ease-out-quint active:scale-[0.96] motion-reduce:transition-none"
        >
          <RotateCcw className="size-4" strokeWidth={2} aria-hidden />
          Next week
        </button>
      </div>
      <div className="grid w-full justify-items-center gap-3">
        <ScoreDrop
          value={focus}
          onValueChange={setFocus}
          title={
            <>
              Rate <strong>today’s focus</strong>
            </>
          }
          caption="Drag the ruler or use the arrow keys"
          valueText={(v) => `${v} out of 100`}
        />
        <p className="text-center text-[13px] text-muted-foreground">Example data.</p>
      </div>
    </div>
  )
}
