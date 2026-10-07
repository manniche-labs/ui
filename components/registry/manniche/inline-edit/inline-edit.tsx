// Based on Watermelon UI's “Inline edit” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten as one reusable field: Enter saves, Esc cancels, and cancel restores the value.
import { Check, Pencil, X } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type InlineEditProps = {
  /** Name of the field, shown beside it and used in the edit button name. */
  label: string
  /** The saved text shown until editing starts. */
  value: string
  /** Called with the trimmed text when it is saved and differs from `value`. */
  onSave: (value: string) => void
  /** Icon shown before the label. */
  icon?: ReactNode
  /** Edits in a textarea; Enter adds a line and Ctrl or Cmd with Enter saves. */
  multiline?: boolean
  /** Shown when the value is empty. */
  placeholder?: string
  /** Verb in the edit button name, followed by the field label. */
  editLabel?: string
  /** Name of the save button. */
  saveLabel?: string
  /** Name of the cancel button. */
  cancelLabel?: string
  /** Classes for the outer row of label and value. */
  className?: string
}

/** A value that reads like text until you edit it. The pencil swaps for save and cancel. */
export function InlineEdit({
  label,
  value,
  onSave,
  icon,
  multiline = false,
  placeholder = 'Empty',
  editLabel = 'Edit',
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  className,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const field = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const pencil = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    if (editing) field.current?.select()
  }, [editing])

  const start = () => {
    setDraft(value)
    setEditing(true)
  }
  const stop = (save: boolean) => {
    if (save && draft.trim() !== value) onSave(draft.trim())
    setEditing(false)
    requestAnimationFrame(() => pencil.current?.focus())
  }

  const swap = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 24 } }
  const Field = multiline ? 'textarea' : 'input'

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}>
      <div className={cn('flex flex-col gap-1 sm:flex-row sm:gap-4', multiline ? 'sm:items-start' : 'sm:items-center', className)}>
        {/* While viewing there is no field to point at, so the label is plain text and the value is tied to the edit button instead. */}
        {editing ? (
          <label htmlFor={id} className="flex shrink-0 items-center gap-2.5 text-sm text-muted-foreground sm:w-32 sm:py-2.5 [&_svg]:size-4.5">
            {icon}
            {label}
          </label>
        ) : (
          <span className="flex shrink-0 items-center gap-2.5 text-sm text-muted-foreground sm:w-32 sm:py-2.5 [&_svg]:size-4.5">
            {icon}
            {label}
          </span>
        )}
        <div
          className={cn(
            'group flex min-h-11 w-full min-w-0 gap-2 overflow-hidden rounded-xl px-3 transition-colors duration-150 motion-reduce:transition-none',
            editing ? 'bg-muted' : 'hover:bg-muted/60',
            multiline ? 'items-start py-2' : 'items-center',
          )}
        >
          {editing ? (
            <Field
              ref={field}
              id={id}
              value={draft}
              rows={multiline ? 3 : undefined}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') stop(false)
                if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  stop(true)
                }
              }}
              className="w-full min-w-0 resize-none bg-transparent font-medium outline-none"
            />
          ) : (
            <p id={`${id}-value`} className={cn('w-full min-w-0 font-medium', multiline ? 'whitespace-pre-line' : 'truncate', !value && 'text-muted-foreground')}>
              {value || placeholder}
            </p>
          )}
          <div className="flex shrink-0 items-center">
            <AnimatePresence mode="popLayout" initial={false}>
              {editing ? (
                <motion.div key="edit" {...swap} className="flex gap-1">
                  <button
                    type="button"
                    aria-label={saveLabel}
                    onClick={() => stop(true)}
                    className="grid size-8 relative after:-inset-1.5 after:absolute after:content-[''] place-items-center rounded-lg bg-foreground text-background active:scale-95 motion-reduce:active:scale-100"
                  >
                    <Check className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={cancelLabel}
                    onClick={() => stop(false)}
                    className="grid size-8 relative after:-inset-1.5 after:absolute after:content-[''] place-items-center rounded-lg bg-card text-foreground shadow-sm active:scale-95 motion-reduce:active:scale-100"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="view"
                  ref={pencil}
                  {...swap}
                  type="button"
                  aria-label={`${editLabel} ${label.toLowerCase()}`}
                  aria-describedby={`${id}-value`}
                  onClick={start}
                  className="grid size-8 relative after:-inset-1.5 after:absolute after:content-[''] place-items-center rounded-lg border bg-card text-muted-foreground opacity-100 shadow-sm transition-opacity duration-150 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Pencil className="size-3.5" aria-hidden />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MotionConfig>
  )
}
