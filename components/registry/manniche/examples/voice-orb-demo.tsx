import { useEffect, useState } from 'react'
import { VoiceOrb, type VoiceOrbState } from '@/registry/manniche/voice-orb/voice-orb'

const STATES: VoiceOrbState[] = ['idle', 'listening', 'thinking', 'speaking']

export default function VoiceOrbDemo() {
  const [state, setState] = useState<VoiceOrbState>('listening')
  const [level, setLevel] = useState(0)

  // Stand-in for a microphone: a wobbling loudness while someone is talking.
  useEffect(() => {
    if (state !== 'listening' && state !== 'speaking') return
    let raf = 0
    const tick = (now: number) => {
      const s = now / 1000
      setLevel(Math.max(0, Math.sin(s * 7) * 0.5 + Math.sin(s * 2.3) * 0.4 + Math.sin(s * 13) * 0.2))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [state])

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <VoiceOrb state={state} level={level} />
      <div role="group" aria-label="State" className="flex flex-wrap justify-center gap-1 rounded-full bg-muted p-1">
        {STATES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={state === s}
            onClick={() => setState(s)}
            className="min-h-10 rounded-full px-3.5 text-sm text-muted-foreground capitalize transition-colors duration-150 hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
