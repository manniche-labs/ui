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
  placeholder?: string
  /** Accessible name for the text field. */
  label?: string
  /** Lets the visitor attach files. The value is passed to the file input's accept. */
  accept?: string
  /** Optional choices next to the buttons, e.g. a model picker. */
  footer?: ReactNode
  maxRows?: number
  className?: string
}

export function PromptInput({
  onSubmit,
  onStop,
  busy = false,
  placeholder = 'Ask anything',
  label = 'Message',
  accept,
  footer,
  maxRows = 8,
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
      className={cn(
        'rounded-2xl border bg-card p-2 shadow-sm transition-[border-color,box-shadow] duration-150',
        'focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-ring)_18%,transparent)]',
        className,
      )}
    >
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 px-1 pt-1 pb-2" aria-label="Attached files">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-1 rounded-lg bg-muted py-1 pr-1 pl-2.5 text-sm">
              <span className="max-w-48 truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => setFiles((all) => all.filter((_, j) => j !== i))}
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
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
        className="block w-full resize-none bg-transparent px-2 py-2 text-base leading-6 outline-none placeholder:text-muted-foreground focus-visible:outline-none"
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
              className="grid size-11 place-items-center rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
              aria-label="Attach files"
            >
              <Paperclip className="size-5" aria-hidden />
            </button>
          </>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">{footer}</div>

        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className="grid size-11 place-items-center rounded-xl bg-foreground text-background transition-transform duration-150 ease-out-quint active:scale-95"
            aria-label="Stop"
          >
            <Square className="size-4 fill-current" aria-hidden />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className={cn(
              'grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground',
              'transition-[transform,opacity] duration-150 ease-out-quint active:scale-95',
              'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
            )}
            aria-label="Send"
          >
            <ArrowUp className="size-5" aria-hidden />
          </button>
        )}
      </div>
    </form>
  )
}
