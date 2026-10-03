import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accessible name, and the heading at the top of the sheet. */
  title: string
  children: ReactNode
  className?: string
}

/**
 * A panel that slides up from the bottom. Drag it down, press Esc or tap outside to close.
 * Built on the native <dialog>, so focus is trapped and returns to the opener on close.
 */
export function Sheet({ open, onOpenChange, title, children, className }: SheetProps) {
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
        'max-h-[85dvh] overflow-hidden transition-transform duration-300 ease-out-quint',
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
        className="cursor-grab touch-none px-6 pt-3 pb-2 active:cursor-grabbing"
      >
        <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-border" aria-hidden />
        <h2 className="text-lg font-medium">{title}</h2>
      </div>
      <div className="max-h-[calc(85dvh-5rem)] overflow-y-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">{children}</div>
    </dialog>
  )
}
