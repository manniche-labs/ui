// Based on Watermelon UI's “Dialog stack” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten on the native <dialog> with any content per step.
import { ArrowLeft, X } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type DialogStackControls = { next: () => void; back: () => void; close: () => void }

export type DialogStackStep = {
  id: string
  title: string
  content: (controls: DialogStackControls) => ReactNode
}

export type DialogStackProps = {
  /** Whether the dialog is shown. */
  open: boolean
  /** Called with the new open state when the dialog is closed. */
  onOpenChange: (open: boolean) => void
  /** The pages of the stack, each with an id, a title and a function that renders its content. */
  steps: DialogStackStep[]
  /** Name of the close button. */
  closeLabel?: string
  /** Name of the back button. */
  backLabel?: string
  /** Classes for the dialog element. */
  className?: string
}

/**
 * A dialog where each next step lands on top and the earlier ones peek out behind it.
 * Esc or the back arrow goes one step down; closing on the first step closes the dialog.
 */
export function DialogStack({ open, onOpenChange, steps, closeLabel = 'Close', backLabel = 'Back', className }: DialogStackProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) {
      setIndex(0)
      d.showModal()
    } else if (!open && d.open) d.close()
  }, [open])

  const close = () => onOpenChange(false)
  const controls: DialogStackControls = {
    next: () => setIndex((i) => Math.min(i + 1, steps.length - 1)),
    back: () => setIndex((i) => Math.max(i - 1, 0)),
    close,
  }

  return (
    <dialog
      ref={dialog}
      aria-label={steps[index]?.title}
      onCancel={(e) => {
        // Esc steps back first, like the arrow.
        if (index > 0) {
          e.preventDefault()
          controls.back()
        }
      }}
      onClose={close}
      onClick={(e) => e.target === dialog.current && close()}
      className={cn(
        'm-auto w-[min(24rem,calc(100vw-2rem))] overflow-visible bg-transparent p-0 pt-10 text-card-foreground',
        'backdrop:bg-black/30 backdrop:backdrop-blur-[2px]',
        className,
      )}
    >
      <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
        <div className="relative grid">
          <AnimatePresence initial={false}>
            {steps.slice(0, index + 1).map((step, i) => {
              const depth = index - i
              const top = depth === 0
              return (
                <motion.section
                  key={step.id}
                  inert={!top}
                  aria-hidden={!top}
                  initial={{ y: 48, opacity: 0, scale: 0.96 }}
                  animate={{ y: depth * -18, scale: 1 - depth * 0.05, opacity: depth > 2 ? 0 : 1 - depth * 0.25 }}
                  exit={{ y: 48, opacity: 0, scale: 0.96 }}
                  style={{ zIndex: i, transformOrigin: 'top center' }}
                  className="col-start-1 row-start-1 self-start overflow-hidden rounded-3xl border bg-card shadow-2xl"
                >
                  <header className="flex items-center gap-1 border-b bg-muted/50 py-1.5 pr-1.5 pl-2">
                    {i > 0 && (
                      <button
                        type="button"
                        aria-label={backLabel}
                        onClick={controls.back}
                        className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <ArrowLeft className="size-4.5" aria-hidden />
                      </button>
                    )}
                    <h2 className={cn('flex-1 text-sm font-medium text-muted-foreground', i === 0 && 'pl-3')}>{step.title}</h2>
                    <button
                      type="button"
                      aria-label={closeLabel}
                      onClick={close}
                      className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-4.5" aria-hidden />
                    </button>
                  </header>
                  <div className="p-5">{step.content(controls)}</div>
                </motion.section>
              )
            })}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </dialog>
  )
}
