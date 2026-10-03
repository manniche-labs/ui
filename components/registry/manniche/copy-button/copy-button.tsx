// Based on Watermelon UI's “Copy confirm” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten to handle a refused clipboard.
import { Check, Copy, X } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type State = 'idle' | 'copied' | 'failed'

export type CopyButtonProps = {
  /** The text that lands on the clipboard. */
  value: string
  labels?: { copy?: string; copied?: string; failed?: string }
  className?: string
}

/** Copies a value, and the label and icon roll over to say it worked (or that the browser said no). */
export function CopyButton({ value, labels = {}, className }: CopyButtonProps) {
  const { copy = 'Copy', copied = 'Copied', failed = 'Not copied' } = labels
  const [state, setState] = useState<State>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const t = setTimeout(() => setState('idle'), 1800)
    return () => clearTimeout(t)
  }, [state])

  const run = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  const text = { idle: copy, copied, failed }[state]
  const Icon = { idle: Copy, copied: Check, failed: X }[state]

  return (
    <MotionConfig reducedMotion="user">
      <motion.button
        type="button"
        onClick={run}
        whileTap={{ scale: 0.97 }}
        className={cn(
          'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-300',
          state === 'copied' ? 'bg-emerald-600 text-white' : state === 'failed' ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground',
          className,
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={state}
            initial={{ opacity: 0, scale: 0.3, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.3, filter: 'blur(4px)' }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
          >
            <Icon className="size-4" aria-hidden />
          </motion.span>
        </AnimatePresence>
        <span className="relative inline-flex" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={text} className="inline-flex">
              {text.split('').map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 6, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 32, delay: i * 0.025 } }}
                  exit={{ opacity: 0, y: -6, scale: 0.7 }}
                  className="inline-block whitespace-pre"
                >
                  {ch}
                </motion.span>
              ))}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.button>
    </MotionConfig>
  )
}
