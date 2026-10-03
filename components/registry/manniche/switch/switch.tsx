import { MotionConfig, motion } from 'motion/react'
import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

export type SwitchProps = {
  /** Controlled state. */
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  /** Visible label. Leave it out and pass `aria-label` instead. */
  label?: string
  'aria-label'?: string
  disabled?: boolean
  className?: string
}

/** A switch whose knob stretches as you press it and springs across, like the one on a phone. */
export function Switch({ checked, defaultChecked = false, onChange, label, disabled, className, ...aria }: SwitchProps) {
  const [own, setOwn] = useState(defaultChecked)
  const on = checked ?? own
  const id = useId()

  const flip = () => {
    setOwn(!on)
    onChange?.(!on)
  }

  return (
    <MotionConfig reducedMotion="user">
      <span className={cn('inline-flex items-center gap-3', className)}>
        <motion.button
          id={id}
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={aria['aria-label']}
          disabled={disabled}
          onClick={flip}
          whileTap="pressed"
          className={cn(
            'relative flex h-8 w-[52px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40',
            on ? 'justify-end bg-emerald-500' : 'justify-start bg-muted',
          )}
        >
          <motion.span
            layout
            // Pressed, the knob stretches towards the side it is about to move to.
            variants={{ pressed: { scaleX: 1.2 } }}
            style={{ originX: on ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 46 }}
            className="block h-[26px] w-[26px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.18),0_0_0_0.5px_rgb(0_0_0/0.06)]"
          />
        </motion.button>
        {label && (
          <label htmlFor={id} className="text-sm font-medium select-none">
            {label}
          </label>
        )}
      </span>
    </MotionConfig>
  )
}
