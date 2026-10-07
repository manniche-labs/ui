// Based on Watermelon UI's “Floating input” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten in CSS only, with a linked label, hint and error.
import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type FloatingInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> & {
  /** Text of the label that floats from inside the field up into its border. */
  label: string
  /** Quiet help text under the field; it is replaced by `error` while there is one. */
  hint?: string
  /** Shown in red under the field, and marks the field invalid. */
  error?: string
}

/** A text field whose label sits inside it and floats up into the border when you type or focus. */
export function FloatingInput({ label, hint, error, className, id, ...props }: FloatingInputProps) {
  const own = useId()
  const fieldId = id ?? own
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`

  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        <input
          id={fieldId}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'peer h-12 w-full rounded-xl border bg-background px-4 pt-1 outline-none transition-[border-color,box-shadow] duration-200',
            'focus:border-ring focus:ring-3 focus:ring-ring/20',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
          )}
          {...props}
        />
        <label
          htmlFor={fieldId}
          className={cn(
            'pointer-events-none absolute top-0 left-3 origin-left -translate-y-1/2 bg-background px-1 text-xs text-muted-foreground transition-all duration-200 ease-out',
            'peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base',
            'peer-focus:top-0 peer-focus:text-xs peer-focus:text-ring',
            error && 'text-destructive peer-focus:text-destructive',
            'motion-reduce:transition-none',
          )}
        >
          {label}
        </label>
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 px-1 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {/* Always in the page, so an error that appears while typing is announced; the hint is not part of it. */}
      <p id={errorId} role="alert" className={cn('px-1 text-xs text-destructive', error && 'mt-1.5')}>
        {error}
      </p>
    </div>
  )
}
