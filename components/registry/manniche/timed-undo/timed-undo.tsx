// Based on Watermelon UI's “Timed undo action” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten so the action actually runs when the time is up.
import { Undo2 } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type TimedUndoProps = {
  /** Seconds the person has to change their mind. */
  seconds?: number
  /** Text on the button before it is pressed. */
  label?: string
  /** Text on the button while the countdown runs. */
  undoLabel?: string
  /** Runs when the countdown reaches zero without an undo. */
  onConfirm: () => void
  /** Called when the person undoes during the countdown. */
  onUndo?: () => void
  /** Classes for the button. */
  className?: string
}

/** A destructive button that waits a few seconds and can be undone in the meantime. */
export function TimedUndo({ seconds = 5, label = 'Delete', undoLabel = 'Undo', onConfirm, onUndo, className }: TimedUndoProps) {
  const [left, setLeft] = useState<number | null>(null)
  const confirm = useRef(onConfirm)
  useEffect(() => {
    confirm.current = onConfirm
  })
  const waiting = left !== null

  useEffect(() => {
    if (left === null) return
    const t = setTimeout(() => {
      if (left > 1) return setLeft(left - 1)
      setLeft(null)
      confirm.current()
    }, 1000)
    return () => clearTimeout(t)
  }, [left])

  const toggle = () => {
    if (waiting) {
      setLeft(null)
      onUndo?.()
    } else setLeft(seconds)
  }

  const fade = { initial: { opacity: 0, filter: 'blur(2px)' }, animate: { opacity: 1, filter: 'blur(0px)' }, exit: { opacity: 0, filter: 'blur(2px)' } }

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 260, damping: 32 }}>
      <motion.button
        layout
        type="button"
        onClick={toggle}
        style={{ borderRadius: 14 }}
        className={cn(
          'inline-flex min-h-11 items-center gap-2 overflow-hidden px-1.5 font-medium transition-colors duration-300 motion-reduce:transition-none',
          waiting ? 'bg-destructive/10 text-destructive' : 'bg-destructive px-5 text-white',
          className,
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {waiting && (
            <motion.span key="icon" {...fade} className="grid size-8 place-items-center rounded-[10px] bg-destructive text-white">
              <Undo2 className="size-4" aria-hidden />
            </motion.span>
          )}
          <motion.span key={waiting ? 'undo' : 'label'} layout="position" {...fade} className="px-1">
            {waiting ? undoLabel : label}
          </motion.span>
          {waiting && (
            <motion.span key="count" {...fade} className="grid h-8 min-w-8 place-items-center overflow-hidden rounded-[10px] bg-destructive px-2 text-white tabular-nums">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={left}
                  initial={{ y: -14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 14, opacity: 0 }}
                  aria-hidden
                >
                  {left}
                </motion.span>
              </AnimatePresence>
            </motion.span>
          )}
        </AnimatePresence>
        {/* Said once when the countdown starts, not every second. */}
        <span className="sr-only" aria-live="polite">
          {waiting ? `${label} in ${seconds} seconds. Press again to undo.` : ''}
        </span>
      </motion.button>
    </MotionConfig>
  )
}
