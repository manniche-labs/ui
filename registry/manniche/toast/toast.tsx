import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'success' | 'error'

type Toast = {
  id: number
  title: string
  description?: string
  tone: Tone
  /** Milliseconds before it leaves. Infinity keeps it until closed. */
  duration: number
  action?: { label: string; onClick: () => void }
  leaving?: boolean
}

export type ToastOptions = Partial<Pick<Toast, 'description' | 'tone' | 'duration' | 'action'>>

let items: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Show a toast from anywhere. Returns its id, which `dismiss` takes. */
export function toast(title: string, options: ToastOptions = {}) {
  const id = nextId++
  const item: Toast = { id, title, tone: 'default', duration: 4000, ...options }
  items = [...items, item].slice(-4)
  emit()
  return id
}

export function dismiss(id: number) {
  items = items.map((t) => (t.id === id ? { ...t, leaving: true } : t))
  emit()
  // Matches the leave animation; under reduced motion the item is simply gone a moment later.
  setTimeout(() => {
    items = items.filter((t) => t.id !== id)
    emit()
  }, 200)
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

function Item({ t }: { t: Toast }) {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || t.leaving || !Number.isFinite(t.duration)) return
    const id = setTimeout(() => dismiss(t.id), t.duration)
    return () => clearTimeout(id)
  }, [paused, t.leaving, t.duration, t.id])

  return (
    <li
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-card p-3 pl-4 text-card-foreground shadow-lg',
        t.leaving
          ? 'animate-[manniche-toast-out_200ms_ease-in_forwards]'
          : 'animate-[manniche-toast-in_300ms_cubic-bezier(0.23,1,0.32,1)]',
        'motion-reduce:animate-none',
      )}
    >
      {t.tone === 'success' && <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />}
      {t.tone === 'error' && <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />}
      <div className="min-w-0 flex-1 py-0.5">
        <p className="font-medium">{t.title}</p>
        {t.description && <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>}
      </div>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action!.onClick()
            dismiss(t.id)
          }}
          className="min-h-9 shrink-0 rounded-lg bg-muted px-3 text-sm font-medium transition-colors duration-150 hover:bg-accent"
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => dismiss(t.id)}
        className="-my-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
        aria-label="Close"
      >
        <X className="size-4" aria-hidden />
      </button>
    </li>
  )
}

/** Put one Toaster near the root of the app. Toasts stack in the bottom right corner. */
export function Toaster({ className }: { className?: string }) {
  const list = useSyncExternalStore(subscribe, () => items, () => items)

  return (
    <section aria-label="Notifications" className={cn('pointer-events-none fixed right-4 bottom-4 left-4 z-50 sm:left-auto sm:w-96', className)}>
      <style href="manniche-toast" precedence="default">
        {'@keyframes manniche-toast-in { from { opacity: 0; transform: translateY(12px) scale(.97) } }' +
          '@keyframes manniche-toast-out { to { opacity: 0; transform: translateY(6px) scale(.97) } }'}
      </style>
      <ol aria-live="polite" className="flex flex-col gap-2">
        {list.map((t) => (
          <Item key={t.id} t={t} />
        ))}
      </ol>
    </section>
  )
}
