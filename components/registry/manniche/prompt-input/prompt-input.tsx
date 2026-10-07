import { ArrowUp, Paperclip, Square, X } from 'lucide-react'
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type PromptInputProps = {
  /** Called with the trimmed text and the attached files. */
  onSubmit: (text: string, files: File[]) => void
  /** Called when the visitor presses stop while a reply is being written. */
  onStop?: () => void
  /** True while a reply is being written. The send button turns into a stop button. */
  busy?: boolean
  /** Placeholder in the text field. */
  placeholder?: string
  /** Accessible name for the text field. */
  label?: string
  /** Lets the visitor attach files. The value is passed to the file input's accept. */
  accept?: string
  /** Optional choices next to the buttons, e.g. a model picker. */
  footer?: ReactNode
  /** How many lines the field grows to before it scrolls. */
  maxRows?: number
  /** Lights the border while there is something to send: a band of primary light runs round the ring. Off by default. */
  halo?: boolean
  /** Classes for the form. */
  className?: string
}

// The halo's light: a short bright head with a fading tail, on a square far larger than the field, so it sweeps the
// long edges evenly. Only the 1.5 px border strip of it shows.
const HALO_LIGHT =
  'bg-[conic-gradient(from_0deg,transparent_0_52%,color-mix(in_oklab,var(--color-primary)_26%,transparent)_74%,var(--color-primary)_95%,color-mix(in_oklab,var(--color-primary)_30%,var(--color-card))_97.5%,transparent_98%)]'

export function PromptInput({
  onSubmit,
  onStop,
  busy = false,
  placeholder = 'Ask anything',
  label = 'Message',
  accept,
  footer,
  maxRows = 8,
  halo = false,
  className,
}: PromptInputProps) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const area = useRef<HTMLTextAreaElement>(null)
  const picker = useRef<HTMLInputElement>(null)
  const hintId = useId()

  // Grow with the text up to maxRows, then scroll.
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    const line = parseFloat(getComputedStyle(el).lineHeight) || 24
    el.style.height = `${Math.min(el.scrollHeight, line * maxRows + 16)}px`
  }, [text, maxRows])

  const canSend = !busy && (text.trim().length > 0 || files.length > 0)
  // With the halo on, the ring comes alive whenever the field is ready to send.
  const armed = halo && canSend

  function send(e?: { preventDefault(): void }) {
    e?.preventDefault()
    if (!canSend) return
    onSubmit(text.trim(), files)
    setText('')
    setFiles([])
    area.current?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter makes a new line. Never send while an IME is composing.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  return (
    <form
      onSubmit={send}
      data-armed={armed ? '' : undefined}
      className={cn(
        'rounded-[calc(var(--radius)*2+2px)] bg-card p-2.5 shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]',
        'focus-within:shadow-[0_0_0_1px_var(--color-ring),0_0_0_4px_color-mix(in_oklch,var(--color-ring)_18%,transparent)]',
        // Windows high contrast drops box-shadow, so the frame and focus come back as a real border and outline there only.
        'forced-colors:border forced-colors:border-[CanvasText] forced-colors:focus-within:outline-2 forced-colors:focus-within:outline-[Highlight]',
        halo && 'relative',
        className,
      )}
    >
      {halo && (
        // Sits over the border and is masked to a 1.5 px ring, so the light is in the edge itself and never spills.
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-px overflow-hidden rounded-[inherit] p-[1.5px] [mask:linear-gradient(black,black)_content-box_exclude,linear-gradient(black,black)]"
        >
          <span
            className={cn(
              'absolute inset-0 bg-[color-mix(in_oklab,var(--color-primary)_42%,var(--color-card))]',
              'transition-opacity duration-200 ease-out-quint motion-reduce:transition-none',
              armed ? 'opacity-100' : 'opacity-0',
            )}
          />
          <span
            style={{ animationDuration: '3.2s' }}
            className={cn(
              'absolute top-1/2 left-1/2 aspect-square w-[max(220%,640px)] -translate-x-1/2 -translate-y-1/2 animate-spin',
              HALO_LIGHT,
              'transition-opacity duration-200 ease-out-quint motion-reduce:animate-none motion-reduce:rotate-45 motion-reduce:transition-none',
              armed ? 'opacity-100' : 'opacity-0 [animation-play-state:paused]',
            )}
          />
        </span>
      )}
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 px-1 pt-1 pb-2" aria-label="Attached files">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3 text-sm">
              <span className="max-w-48 truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => setFiles((all) => all.filter((_, j) => j !== i))}
                className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground"
                aria-label={`Remove ${f.name}`}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <textarea
        ref={area}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={label}
        aria-describedby={hintId}
        className="block w-full resize-none bg-transparent px-2.5 py-2.5 text-base leading-6 outline-none placeholder:text-muted-foreground focus-visible:outline-none"
      />
      <span id={hintId} className="sr-only">
        Enter sends. Shift and Enter makes a new line.
      </span>

      <div className="flex items-center gap-2 pt-1">
        {accept !== undefined && (
          <>
            <input
              ref={picker}
              type="file"
              multiple
              accept={accept}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? [])
                setFiles((all) => [...all, ...picked])
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => picker.current?.click()}
              className="grid size-11 place-items-center rounded-full bg-muted text-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_8%,var(--muted))]"
              aria-label="Attach files"
            >
              <Paperclip className="size-5" strokeWidth={2} aria-hidden />
            </button>
          </>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">{footer}</div>

        {/* Separate keys, so React swaps the element instead of turning Stop into a submit button mid-click. */}
        {busy ? (
          <button
            key="stop"
            type="button"
            onClick={onStop}
            className="grid size-11 place-items-center rounded-full bg-muted text-foreground transition-transform duration-150 ease-out-quint active:scale-95"
            aria-label="Stop"
          >
            <Square className="size-4 fill-current" aria-hidden />
          </button>
        ) : (
          <button
            key="send"
            type="submit"
            disabled={!canSend}
            className={cn(
              'grid size-11 place-items-center rounded-full bg-foreground text-card',
              'transition-[transform,opacity] duration-150 ease-out-quint active:scale-95',
              'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
            )}
            aria-label="Send"
          >
            <ArrowUp
              className={cn(
                'size-5',
                halo && 'transition-transform duration-[180ms] ease-out-quint motion-reduce:transition-none',
                halo && !canSend && 'translate-y-0.5',
              )}
              aria-hidden
            />
          </button>
        )}
      </div>
    </form>
  )
}
