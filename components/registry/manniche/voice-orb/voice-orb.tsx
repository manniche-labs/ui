import { MotionConfig, motion, useSpring } from 'motion/react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

export type VoiceOrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

export type VoiceOrbProps = {
  state: VoiceOrbState
  /** 0 to 1, the loudness right now (from the microphone or the voice being played). */
  level?: number
  /** Diameter in px. */
  size?: number
  labels?: Partial<Record<VoiceOrbState, string>>
  className?: string
}

const EN: Record<VoiceOrbState, string> = { idle: 'Voice assistant ready', listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking' }

// How fast the colour layers turn in each state, in seconds per round.
const SPIN: Record<VoiceOrbState, [number, number]> = { idle: [18, 26], listening: [9, 13], thinking: [2.6, 3.8], speaking: [6, 8] }

/**
 * A round orb for a voice assistant. Colour layers turn slowly when idle and fast while thinking,
 * and the orb swells with the loudness of whoever is talking.
 */
export function VoiceOrb({ state, level = 0, size = 160, labels = {}, className }: VoiceOrbProps) {
  const t = { ...EN, ...labels }
  const live = state === 'listening' || state === 'speaking'
  const swell = useSpring(1, { stiffness: 300, damping: 30 })
  const glow = useSpring(0.35, { stiffness: 200, damping: 30 })

  useEffect(() => {
    const l = live ? Math.min(1, Math.max(0, level)) : 0
    swell.set(1 + l * 0.14)
    glow.set(0.35 + l * 0.6)
  }, [level, live, swell, glow])

  const [a, b] = SPIN[state]

  return (
    <MotionConfig reducedMotion="user">
      <div role="status" aria-label={t[state]} className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
        {/* Soft light around the orb, stronger when it's loud. */}
        <motion.span aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,var(--color-primary),transparent)] blur-2xl" style={{ opacity: glow, scale: swell }} />

        <motion.span
          aria-hidden
          className="relative size-full overflow-hidden rounded-full bg-[oklch(0.25_0.06_265)] shadow-[inset_0_-8px_24px_rgb(0_0_0/0.35)]"
          style={{ scale: swell }}
          animate={state === 'thinking' ? { opacity: [1, 0.8, 1] } : { opacity: 1 }}
          transition={state === 'thinking' ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
        >
          {/* Two colour layers turning opposite ways; blurred so they melt into each other. */}
          <span
            className="absolute -inset-1/4 animate-spin bg-[conic-gradient(from_0deg,oklch(0.72_0.17_250),oklch(0.78_0.14_200),transparent_45%,oklch(0.7_0.2_300),transparent_80%)] blur-xl motion-reduce:animate-none"
            style={{ animationDuration: `${a}s` }}
          />
          <span
            className="absolute -inset-1/4 animate-spin bg-[conic-gradient(from_120deg,transparent,oklch(0.85_0.12_180),transparent_35%,oklch(0.65_0.22_280),transparent_70%)] opacity-80 mix-blend-screen blur-lg motion-reduce:animate-none"
            style={{ animationDuration: `${b}s`, animationDirection: 'reverse' }}
          />
          {/* A glassy highlight on top. */}
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_26%,rgb(255_255_255/0.55),transparent_42%)]" />
        </motion.span>
      </div>
    </MotionConfig>
  )
}
