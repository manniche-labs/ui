import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
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

export type ToasterLabels = {
  /** Name of the notifications region. */
  notifications?: string
  /** Name of each close button. */
  close?: string
  /** Read before the title of a success toast. */
  success?: string
  /** Read before the title of an error toast. */
  error?: string
}

function toneText(tone: Tone, labels: ToasterLabels) {
  const { success = 'Success', error = 'Error' } = labels
  return tone === 'success' ? success : tone === 'error' ? error : ''
}

function Item({ t, labels }: { t: Toast; labels: ToasterLabels }) {
  const { close = 'Close' } = labels
  const tone = toneText(t.tone, labels)
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
        <p className="font-medium">
          {tone && <span className="sr-only">{tone}: </span>}
          {t.title}
        </p>
        {t.description && <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>}
      </div>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action!.onClick()
            dismiss(t.id)
          }}
          className="min-h-9 shrink-0 rounded-lg bg-muted px-3 text-sm font-medium transition-colors duration-150 hover:bg-accent motion-reduce:transition-none"
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => dismiss(t.id)}
        className="-my-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground motion-reduce:transition-none"
        aria-label={close}
      >
        <X className="size-4" aria-hidden />
      </button>
    </li>
  )
}

export type ToasterProps = {
  /** Classes for the fixed region that holds the toasts. */
  className?: string
  /** Screen reader text with English defaults. Keys: `notifications`, `close`, `success` and `error`. */
  labels?: ToasterLabels
}

type Announcement = { id: number; text: string }

/**
 * Put one Toaster near the root of the app. Toasts stack in the bottom right corner.
 * A new toast is read out through two hidden regions: errors through an alert, the rest politely, each starting with its tone.
 */
export function Toaster({ className, labels = {} }: ToasterProps) {
  const list = useSyncExternalStore(subscribe, () => items, () => items)
  const { notifications = 'Notifications' } = labels
  const seen = useRef(items.reduce((m, t) => Math.max(m, t.id), 0))
  const [polite, setPolite] = useState<Announcement | null>(null)
  const [assertive, setAssertive] = useState<Announcement | null>(null)

  useEffect(() => {
    const fresh = list.filter((t) => t.id > seen.current && !t.leaving)
    if (!fresh.length) return
    seen.current = Math.max(seen.current, ...fresh.map((t) => t.id))
    const say = (tone: 'error' | 'other') => {
      const own = fresh.filter((t) => (t.tone === 'error') === (tone === 'error'))
      if (!own.length) return null
      const text = own
        .map((t) => [toneText(t.tone, labels) && `${toneText(t.tone, labels)}:`, t.title, t.description].filter(Boolean).join(' '))
        .join('. ')
      return { id: own[own.length - 1].id, text }
    }
    const e = say('error')
    const p = say('other')
    if (e) setAssertive(e)
    if (p) setPolite(p)
  }, [list, labels])

  return (
    <section aria-label={notifications} className={cn('pointer-events-none fixed right-4 bottom-4 left-4 z-50 sm:left-auto sm:w-96', className)}>
      <style href="manniche-toast" precedence="default">
        {'@keyframes manniche-toast-in { from { opacity: 0; transform: translateY(12px) scale(.97) } }' +
          '@keyframes manniche-toast-out { to { opacity: 0; transform: translateY(6px) scale(.97) } }'}
      </style>
      {/* Always in the DOM, so a new message is announced. They never wrap the toasts or their buttons. */}
      <p role="status" className="sr-only">
        {polite && <span key={polite.id}>{polite.text}</span>}
      </p>
      <p role="alert" className="sr-only">
        {assertive && <span key={assertive.id}>{assertive.text}</span>}
      </p>
      <ol className="flex flex-col gap-2">
        {list.map((t) => (
          <Item key={t.id} t={t} labels={labels} />
        ))}
      </ol>
    </section>
  )
}
