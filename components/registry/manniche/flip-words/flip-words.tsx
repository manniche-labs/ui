import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type FlipWordsProps = {
  /** The words to cycle through. The first one is shown under reduced motion. */
  words: string[]
  /** Milliseconds each word stays. */
  interval?: number
  /** How many rounds before it stops on the last word, so it never moves forever. 0 keeps going. */
  rounds?: number
  className?: string
}

/**
 * One word in a sentence that swaps for the next with a soft lift and blur.
 * It pauses while the pointer or focus is on it. Screen readers hear all the words once, not each swap.
 * Under reduced motion it shows the first word and stays still.
 */
export function FlipWords({ words, interval = 2600, rounds = 3, className }: FlipWordsProps) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [still] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const done = rounds > 0 && i >= words.length * rounds - 1

  useEffect(() => {
    if (still || paused || done || words.length < 2) return
    const t = setTimeout(() => setI((n) => n + 1), interval)
    return () => clearTimeout(t)
  }, [i, still, paused, done, interval, words.length])

  const word = words[i % words.length] ?? ''

  return (
    <MotionConfig reducedMotion="user">
      <span
        className={cn('relative inline-grid align-baseline', className)}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <span className="sr-only">{words.join(', ')}</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={i}
            aria-hidden
            initial={{ opacity: 0, y: '0.4em', filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: '-0.4em', filter: 'blur(6px)' }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="col-start-1 row-start-1 whitespace-nowrap"
          >
            {word}
          </motion.span>
        </AnimatePresence>
      </span>
    </MotionConfig>
  )
}
