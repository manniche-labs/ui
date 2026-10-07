import { MotionConfig, motion } from 'motion/react'
import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

type SwitchBaseProps = {
  /** Controlled state. */
  checked?: boolean
  /** Starting state when the switch is not controlled. */
  defaultChecked?: boolean
  /** Called with the new state each time the switch is flipped. */
  onChange?: (checked: boolean) => void
  /** Turns the switch off for pointer and keyboard. */
  disabled?: boolean
  /** Classes for the outer span that wraps the switch and its label. */
  className?: string
}

/** The switch always has a name: pass a visible `label`, or an `aria-label` when there is no room for one. */
export type SwitchProps = SwitchBaseProps &
  (
    | {
        /** Visible label, linked to the switch. */
        label: string
        /** Optional spoken name that replaces the visible label for screen readers. */
        'aria-label'?: string
      }
    | {
        label?: undefined
        /** Spoken name for a switch without a visible label. */
        'aria-label': string
      }
  )

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
