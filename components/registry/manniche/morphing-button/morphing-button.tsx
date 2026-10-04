// Based on Watermelon UI's “Morphing button” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten as a real form with email validation, Esc and a thank-you state.
import { Bell, Check } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type MorphingButtonProps = {
  label?: string
  placeholder?: string
  submitLabel?: string
  doneLabel?: string
  onSubmit: (email: string) => void
  className?: string
}

/** A “Notify me” button that opens into an email field, then thanks the person and closes again. */
export function MorphingButton({
  label = 'Notify me',
  placeholder = 'Your email',
  submitLabel = 'Notify me',
  doneLabel = 'You are on the list',
  onSubmit,
  className,
}: MorphingButtonProps) {
  const [state, setState] = useState<'closed' | 'open' | 'done'>('closed')
  const [email, setEmail] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const box = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state === 'open') input.current?.focus()
    if (state !== 'done') return
    const t = setTimeout(() => setState('closed'), 2200)
    return () => clearTimeout(t)
  }, [state])

  // Clicking anywhere else closes an empty field.
  useEffect(() => {
    if (state !== 'open') return
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && !email && setState('closed')
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [state, email])

  const close = () => {
    setState('closed')
    requestAnimationFrame(() => opener.current?.focus())
  }

  const open = state === 'open'

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 240, damping: 20, mass: 1 }}>
      <motion.form
        ref={box}
        layout
        onSubmit={(e) => {
          e.preventDefault()
          if (!open) return setState('open')
          onSubmit(email.trim())
          setEmail('')
          setState('done')
        }}
        onKeyDown={(e) => e.key === 'Escape' && open && close()}
        style={{ borderRadius: 999 }}
        className={cn('flex items-center overflow-hidden border bg-muted', open ? 'w-full max-w-sm p-1' : 'p-0', className)}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {open && (
            <motion.label key="field" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="min-w-0 flex-1 px-4">
              <span className="sr-only">{placeholder}</span>
              <input
                ref={input}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent font-medium outline-none placeholder:text-muted-foreground"
              />
            </motion.label>
          )}
        </AnimatePresence>
        <motion.button
          ref={opener}
          layout
          type={open ? 'submit' : 'button'}
          onClick={() => !open && state !== 'done' && setState('open')}
          aria-expanded={open}
          className={cn(
            'flex min-h-11 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200',
            open ? 'bg-card px-5 shadow-sm' : 'px-6 hover:bg-foreground/5',
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {!open && (
              <motion.span
                key={state}
                layout
                initial={{ opacity: 0, scale: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0, filter: 'blur(4px)' }}
              >
                {state === 'done' ? <Check className="size-5 text-success" aria-hidden /> : <Bell className="size-5" aria-hidden />}
              </motion.span>
            )}
          </AnimatePresence>
          <motion.span layout="position" aria-live="polite">
            {state === 'done' ? doneLabel : open ? submitLabel : label}
          </motion.span>
        </motion.button>
      </motion.form>
    </MotionConfig>
  )
}
