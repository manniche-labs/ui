// Based on the rolling digits in Watermelon UI's “Stepper” and “Pagination”
// (MIT, © 2026 Watermelon Platform Contributors, github.com/WatermelonCorp/watermelon-platform).
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export type RollingNumberProps = {
  /** The number shown. Each digit rolls when it changes. */
  value: number
  /** Passed to Intl.NumberFormat, e.g. "da-DK". Leave it out for plain digits. */
  locale?: string
  /** Classes for the inner span that holds the digits. */
  className?: string
}

/** A number whose changed digits roll up or down. Screen readers get the whole number once. */
export function RollingNumber({ value, locale, className }: RollingNumberProps) {
  // Remember the last value in state (not a ref), so the direction survives a double render.
  const [last, setLast] = useState({ value, dir: 1 })
  const dir = last.value === value ? last.dir : value > last.value ? 1 : -1
  if (last.value !== value) setLast({ value, dir })
  const text = locale ? new Intl.NumberFormat(locale).format(value) : String(value)
  const chars = text.split('')

  return (
    <MotionConfig reducedMotion="user">
      <span className={cn('inline-flex tabular-nums', className)}>
        <span className="sr-only">{text}</span>
        <span aria-hidden className="inline-flex">
          {chars.map((ch, i) => {
            // Count from the right, so the ones stay the ones when the number grows a digit.
            const place = chars.length - i
            return (
              <span key={place} className="relative inline-flex min-w-[1ch] justify-center overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                  <motion.span
                    key={ch}
                    initial={{ y: `${dir * 70}%`, opacity: 0, filter: 'blur(2px)' }}
                    animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                    exit={{ y: `${dir * -70}%`, opacity: 0, filter: 'blur(2px)' }}
                    transition={{ type: 'spring', stiffness: 260, damping: 32 }}
                    className="inline-block"
                  >
                    {ch}
                  </motion.span>
                </AnimatePresence>
              </span>
            )
          })}
        </span>
      </span>
    </MotionConfig>
  )
}
