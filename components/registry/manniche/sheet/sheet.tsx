import { X } from 'lucide-react'
import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SheetProps = {
  /** Whether the sheet is open. */
  open: boolean
  /** Called with the new open state when the sheet should close: the close button, Esc, a click outside or a drag down. */
  onOpenChange: (open: boolean) => void
  /** Accessible name, and the heading at the top of the sheet. */
  title: string
  /** The content below the title. */
  children: ReactNode
  /** Visible text and screen reader text. Key: `close` (the name of the close button). */
  labels?: { close?: string }
  /** Classes for the dialog. */
  className?: string
}

/**
 * A panel that slides up from the bottom. Close it with the button in the corner, drag it down, press Esc or tap outside.
 * Built on the native <dialog>, so focus is trapped and returns to the opener on close.
 */
export function Sheet({ open, onOpenChange, title, children, labels = {}, className }: SheetProps) {
  const { close = 'Close' } = labels
  const dialog = useRef<HTMLDialogElement>(null)
  const drag = useRef<{ y: number; id: number } | null>(null)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) {
      d.style.transform = ''
      d.showModal()
    } else if (!open && d.open) d.close()
  }, [open])

  function down(e: PointerEvent<HTMLDivElement>) {
    drag.current = { y: e.clientY, id: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
    dialog.current!.style.transition = 'none'
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    dialog.current!.style.transform = `translateY(${Math.max(0, e.clientY - drag.current.y)}px)`
  }
  function up(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const d = dialog.current!
    const dy = e.clientY - drag.current.y
    drag.current = null
    d.style.transition = ''
    if (dy > d.offsetHeight * 0.3) onOpenChange(false)
    else d.style.transform = ''
  }

  return (
    <dialog
      ref={dialog}
      onClose={() => onOpenChange(false)}
      onClick={(e) => e.target === dialog.current && onOpenChange(false)}
      aria-label={title}
      className={cn(
        'mx-auto mt-auto mb-0 w-full max-w-xl rounded-t-3xl border border-b-0 bg-card p-0 text-card-foreground shadow-2xl',
        'max-h-[85dvh] overflow-hidden transition-transform duration-300 ease-out-quint motion-reduce:transition-none',
        'backdrop:bg-black/40 open:animate-[manniche-sheet-in_380ms_cubic-bezier(0.23,1,0.32,1)] motion-reduce:open:animate-none',
        className,
      )}
    >
      <style href="manniche-sheet" precedence="default">
        {'@keyframes manniche-sheet-in { from { transform: translateY(100%) } }'}
      </style>
      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="cursor-grab touch-none px-6 pt-3 pr-16 pb-2 active:cursor-grabbing"
      >
        <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-border" aria-hidden />
        <h2 className="text-lg font-medium">{title}</h2>
      </div>
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        aria-label={close}
        className="absolute top-2 right-3 grid size-11 place-items-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground motion-reduce:transition-none"
      >
        <X className="size-5" aria-hidden />
      </button>
      <div className="max-h-[calc(85dvh-5rem)] overflow-y-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">{children}</div>
    </dialog>
  )
}
