import { ArrowUp, Paperclip, Square, X } from 'lucide-react'
import { useId, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
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
  /**
   * "glass" draws a frosted panel for use over photos and video: the background shows through blurred, behind a thin
   * light edge. Without backdrop-filter, with reduced transparency or with more contrast it falls back to the card.
   * Default "default".
   */
  variant?: 'default' | 'glass'
  /**
   * Start as a small pill with the attach button and the placeholder. It grows into the full box with send when it is
   * focused or holds text or files, and shrinks back when it is empty and loses focus. The pill is 20rem wide; set
   * `--prompt-pill-width` to change it. Off by default.
   */
  collapsed?: boolean
  /** The attach button's icon. Default a paperclip. */
  attachIcon?: ReactNode
  /** Classes for the form. */
  className?: string
}

// The halo's light: a short bright head with a fading tail, on a square far larger than the field, so it sweeps the
// long edges evenly. Only the 1.5 px border strip of it shows.
const HALO_LIGHT =
  'bg-[conic-gradient(from_0deg,transparent_0_52%,color-mix(in_oklab,var(--color-primary)_26%,transparent)_74%,var(--color-primary)_95%,color-mix(in_oklab,var(--color-primary)_30%,var(--color-card))_97.5%,transparent_98%)]'

// The frosted panel: the card thinned out over a blur, a thin light edge and a soft drop shadow. It falls back to the
// plain card when the browser cannot blur, and for visitors who ask for less transparency or more contrast.
const GLASS = cn(
  'bg-[color-mix(in_oklab,var(--card)_68%,transparent)] backdrop-blur-xl backdrop-saturate-150 dark:bg-[color-mix(in_oklab,var(--card)_56%,transparent)]',
  'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5),0_10px_36px_-14px_rgba(0,0,0,0.4)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),0_10px_36px_-14px_rgba(0,0,0,0.6)]',
  'supports-[not(backdrop-filter:blur(1px))]:bg-card',
  '[@media(prefers-reduced-transparency:reduce)]:bg-card [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none',
  'contrast-more:bg-card contrast-more:backdrop-blur-none',
)
// Round buttons on glass take a tint of the text colour instead of the solid muted fill.
const GLASS_KEY = 'bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] hover:bg-[color-mix(in_oklab,var(--foreground)_14%,transparent)]'

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
  variant = 'default',
  collapsed = false,
  attachIcon,
  className,
}: PromptInputProps) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const area = useRef<HTMLTextAreaElement>(null)
  const picker = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [focused, setFocused] = useState(false)

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
  // A collapsed prompt opens while it has focus or anything in it, and while a reply is being written.
  const open = !collapsed || focused || busy || text.length > 0 || files.length > 0
  const glass = variant === 'glass'

  function send(e?: { preventDefault(): void }) {
    e?.preventDefault()
    if (!canSend) return
    onSubmit(text.trim(), files)
    setText('')
    setFiles([])
    area.current?.focus()
  }

  // Focus moving between the field and the buttons keeps a collapsed prompt open; leaving the form closes it.
  function onBlur(e: FocusEvent<HTMLFormElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter makes a new line. Never send while an IME is composing.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  const attach = accept !== undefined && (
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
        className={cn(
          'grid size-11 place-items-center rounded-full bg-muted text-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_8%,var(--muted))]',
          glass && GLASS_KEY,
          // On a collapsed prompt it sits in the bottom-left corner, so it stays put while the box grows around it.
          collapsed && [
            'absolute transition-[left,bottom] duration-300 ease-out-quint motion-reduce:transition-none',
            open ? 'bottom-2.5 left-2.5' : 'bottom-1.5 left-1.5',
          ],
        )}
        aria-label="Attach files"
      >
        {attachIcon ?? <Paperclip className="size-5" strokeWidth={2} aria-hidden />}
      </button>
    </>
  )

  const row = (
    <div className="flex items-center gap-2 pt-1">
      {collapsed ? accept !== undefined && <span aria-hidden className="size-11 shrink-0" /> : attach}
      <div className="flex min-w-0 flex-1 items-center gap-2">{footer}</div>

      {/* Separate keys, so React swaps the element instead of turning Stop into a submit button mid-click. */}
      {busy ? (
        <button
          key="stop"
          type="button"
          onClick={onStop}
          className={cn(
            'grid size-11 place-items-center rounded-full bg-muted text-foreground transition-transform duration-150 ease-out-quint active:scale-95 motion-reduce:transition-none',
            glass && GLASS_KEY,
          )}
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
            'transition-[transform,opacity] duration-150 ease-out-quint active:scale-95 motion-reduce:transition-none',
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
  )

  return (
    <form
      onSubmit={send}
      data-armed={armed ? '' : undefined}
      data-open={collapsed ? (open ? '' : undefined) : undefined}
      onFocus={collapsed ? () => setFocused(true) : undefined}
      onBlur={collapsed ? onBlur : undefined}
      className={cn(
        'rounded-[calc(var(--radius)*2+2px)] bg-card p-2.5 shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]',
        glass && GLASS,
        'focus-within:shadow-[0_0_0_1px_var(--color-ring),0_0_0_4px_color-mix(in_oklch,var(--color-ring)_18%,transparent)]',
        // Windows high contrast drops box-shadow, so the frame and focus come back as a real border and outline there only.
        'forced-colors:border forced-colors:border-[CanvasText] forced-colors:focus-within:outline-2 forced-colors:focus-within:outline-[Highlight]',
        (halo || collapsed) && 'relative',
        collapsed && [
          'mx-auto w-full transition-[max-width,padding,border-radius] duration-300 ease-out-quint motion-reduce:transition-none',
          open ? 'max-w-full' : 'max-w-[min(100%,var(--prompt-pill-width,20rem))] rounded-[28px] p-1.5',
        ],
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
                className="grid size-7 relative after:-inset-2 after:absolute after:content-[''] place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground"
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
        className={cn(
          'block w-full resize-none bg-transparent px-2.5 py-2.5 text-base leading-6 outline-none placeholder:text-muted-foreground focus-visible:outline-none',
          glass && 'placeholder:text-[color-mix(in_oklab,var(--foreground)_68%,transparent)]',
          // Closed, the text starts after the attach button; open, it runs the full width above the buttons.
          collapsed && 'transition-[padding] duration-300 ease-out-quint motion-reduce:transition-none',
          collapsed && !open && accept !== undefined && 'pl-[54px]',
        )}
      />
      <span id={hintId} className="sr-only">
        Enter sends. Shift and Enter makes a new line.
      </span>

      {collapsed && attach}

      {collapsed ? (
        // Closed, the row folds to nothing and is inert, so Tab never lands on a hidden button. The negative margin
        // and padding give the buttons' focus outline room inside the clip.
        <div
          inert={!open}
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-out-quint motion-reduce:transition-none',
            open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="-m-1 min-h-0 overflow-hidden p-1">{row}</div>
        </div>
      ) : (
        row
      )}
    </form>
  )
}
