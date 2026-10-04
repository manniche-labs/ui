// Based on Watermelon UI's “Split button” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten with keyboard support, focus handling and a choice callback.
import { ChevronLeft } from 'lucide-react'
import { MotionConfig, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type SplitButtonOption = { id: string; label: string }

export type SplitButtonProps = {
  label: string
  options: SplitButtonOption[]
  onSelect: (id: string) => void
  backLabel?: string
  className?: string
}

/** A button that splits into its options. Pick one, or go back with the arrow or Esc. */
export function SplitButton({ label, options, onSelect, backLabel = 'Back', className }: SplitButtonProps) {
  const [open, setOpen] = useState(false)
  const main = useRef<HTMLButtonElement>(null)
  const row = useRef<HTMLDivElement>(null)
  const moved = useRef(false)

  // Focus follows the buttons, so a keyboard user never lands on one that just faded out.
  useEffect(() => {
    if (!moved.current) return
    if (open) row.current?.querySelector<HTMLButtonElement>('[data-option]')?.focus()
    else main.current?.focus()
  }, [open])

  const toggle = (next: boolean) => {
    moved.current = true
    setOpen(next)
  }

  const swap = (shown: boolean) => ({
    opacity: shown ? 1 : 0,
    filter: shown ? 'blur(0px)' : 'blur(8px)',
  })

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', bounce: 0.45, duration: 0.8 }}>
      <div
        className={cn('relative grid min-h-14 place-items-center font-medium', className)}
        onKeyDown={(e) => e.key === 'Escape' && open && toggle(false)}
      >
        <motion.button
          ref={main}
          type="button"
          aria-expanded={open}
          inert={open}
          onClick={() => toggle(true)}
          initial={false}
          animate={{ ...swap(!open), scaleX: open ? 1.5 : 1, scaleY: open ? 0.9 : 1 }}
          whileTap={{ scale: 1.08 }}
          className="col-start-1 row-start-1 min-h-11 rounded-full bg-primary px-7 text-primary-foreground"
        >
          {label}
        </motion.button>
        <motion.div
          ref={row}
          role="group"
          aria-label={label}
          inert={!open}
          initial={false}
          animate={{ ...swap(open), scaleX: open ? 1 : 0.3, scaleY: open ? 1 : 0.9 }}
          className="col-start-1 row-start-1 flex flex-wrap items-center justify-center gap-2"
        >
          <motion.button
            type="button"
            aria-label={backLabel}
            onClick={() => toggle(false)}
            whileTap={{ scale: 1.1 }}
            className="grid size-11 place-items-center rounded-full bg-muted text-foreground"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </motion.button>
          {options.map((o) => (
            <motion.button
              key={o.id}
              data-option
              type="button"
              onClick={() => {
                onSelect(o.id)
                toggle(false)
              }}
              whileTap={{ scale: 1.06 }}
              className="min-h-11 rounded-full bg-muted px-5 text-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground"
            >
              {o.label}
            </motion.button>
          ))}
        </motion.div>
      </div>
    </MotionConfig>
  )
}
