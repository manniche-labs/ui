// Based on Watermelon UI's “Save toggle” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten to wait for a real save and to follow the theme through CSS variables.
import { Check, LoaderCircle } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type SaveToggleProps = {
  saved: boolean
  /** Runs the save. The button spins until it settles; a rejection puts it back. */
  onSave: () => Promise<void> | void
  onUnsave: () => void
  label?: string
  savedLabel?: string
  className?: string
}

type Phase = 'idle' | 'saving' | 'done'

/** A save button that shrinks to a spinner, pops a check, and widens again as “Saved”. Press again to unsave. */
export function SaveToggle({ saved, onSave, onUnsave, label = 'Save', savedLabel = 'Saved', className }: SaveToggleProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (phase !== 'done') return
    const t = setTimeout(() => setPhase('idle'), 700)
    return () => clearTimeout(t)
  }, [phase])

  const press = async () => {
    if (phase !== 'idle') return
    if (saved) return onUnsave()
    setPhase('saving')
    try {
      await onSave()
      if (alive.current) setPhase('done')
    } catch {
      if (alive.current) setPhase('idle')
    }
  }

  const round = phase !== 'idle'
  const shown = phase === 'saving' ? 'spin' : phase === 'done' ? 'check' : saved ? 'saved' : 'save'
  const swap = { initial: { opacity: 0, y: 12, filter: 'blur(3px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, exit: { opacity: 0, y: -12, filter: 'blur(3px)' } }

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
      <motion.button
        type="button"
        aria-pressed={saved}
        aria-busy={phase === 'saving'}
        onClick={press}
        initial={false}
        animate={{ width: round ? 48 : 116 }}
        className={cn(
          'relative grid h-12 place-items-center overflow-hidden rounded-full font-medium transition-[background-color,color,box-shadow] duration-200 active:scale-[0.97]',
          round ? 'bg-foreground text-background' : saved ? 'bg-card text-foreground ring-2 ring-border' : 'bg-muted text-foreground',
          className,
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={shown} {...swap} className="col-start-1 row-start-1 flex items-center gap-1.5 whitespace-nowrap">
            {shown === 'spin' && <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />}
            {shown === 'check' && (
              <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
                <Check className="size-5" strokeWidth={3} aria-hidden />
              </motion.span>
            )}
            {shown === 'saved' && (
              <>
                <span className="grid size-5 place-items-center rounded-full bg-foreground text-background">
                  <Check className="size-3" strokeWidth={3.5} aria-hidden />
                </span>
                {savedLabel}
              </>
            )}
            {shown === 'save' && label}
          </motion.span>
        </AnimatePresence>
        <span className="sr-only" aria-live="polite">
          {phase === 'done' ? savedLabel : ''}
        </span>
      </motion.button>
    </MotionConfig>
  )
}
