import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  /** The verb and the thing, e.g. “Delete project”. Never “Yes” or “OK”. */
  confirmLabel: string
  /** What happens if they back out, e.g. “Keep project”. Never “No” or “Cancel” alone. */
  cancelLabel: string
  onConfirm: () => void
  /** Red, for actions that destroy something. Leave it off for everything else. */
  destructive?: boolean
  /** When set, the confirm button stays off until this exact text is typed, e.g. the project name. */
  typeToConfirm?: string
  className?: string
}

/**
 * A confirmation on the native <dialog> that follows the rules for dangerous actions:
 * both buttons say what they do, the safe one has focus and sits where “OK” usually is (right),
 * and the destructive one sits apart on the left, so a habitual Enter or click keeps the data.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive = false,
  typeToConfirm,
  className,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const keep = useRef<HTMLButtonElement>(null)
  const [typed, setTyped] = useState('')
  const titleId = useId()
  const descId = useId()
  const inputId = useId()

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) {
      setTyped('')
      d.showModal()
      keep.current?.focus()
    } else if (!open && d.open) d.close()
  }, [open])

  const close = () => onOpenChange(false)
  const ready = typeToConfirm === undefined || typed === typeToConfirm

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={close}
      onClick={(e) => e.target === dialog.current && close()}
      className={cn(
        'm-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl border bg-card p-0 text-card-foreground shadow-2xl',
        'backdrop:bg-black/30 backdrop:backdrop-blur-[2px]',
        'opacity-100 transition-[opacity,transform] duration-200 ease-out-quint starting:scale-95 starting:opacity-0 motion-reduce:transition-none',
        className,
      )}
    >
      <form
        method="dialog"
        className="grid gap-4 p-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ready) return
          onConfirm()
          close()
        }}
      >
        <h2 id={titleId} className="text-lg font-semibold text-balance">
          {title}
        </h2>
        {description && (
          <div id={descId} className="text-sm text-pretty text-muted-foreground">
            {description}
          </div>
        )}
        {typeToConfirm !== undefined && (
          <div className="grid gap-1.5">
            <label htmlFor={inputId} className="text-sm">
              Type <strong className="font-mono font-medium select-all">{typeToConfirm}</strong> to confirm
            </label>
            <input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="min-h-11 rounded-xl border bg-background px-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}
        <div className="mt-2 flex flex-wrap-reverse items-center justify-between gap-3">
          <button
            type="submit"
            disabled={!ready}
            className={cn(
              'inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium transition-[background-color,opacity,transform] duration-150 ease-out-quint active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
              destructive ? 'bg-destructive text-white hover:bg-destructive/90' : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {confirmLabel}
          </button>
          <button
            ref={keep}
            type="button"
            onClick={close}
            className="inline-flex min-h-11 items-center rounded-xl border bg-card px-4 text-sm font-medium transition-[background-color,transform] duration-150 ease-out-quint hover:bg-muted active:scale-[0.97]"
          >
            {cancelLabel}
          </button>
        </div>
      </form>
    </dialog>
  )
}
