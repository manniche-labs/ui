import { Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Command = {
  id: string
  label: string
  /** Heading the command is listed under. */
  group?: string
  /** Extra words that should also find it. */
  keywords?: string[]
  /** Shown on the right, e.g. a shortcut. */
  hint?: ReactNode
  icon?: ReactNode
  onSelect: () => void
}

export type CommandPaletteProps = {
  commands: Command[]
  open: boolean
  onOpenChange: (open: boolean) => void
  placeholder?: string
  /** Open and close with Cmd+K / Ctrl+K. */
  hotkey?: boolean
  className?: string
}

/**
 * A searchable list of commands in a modal. Built on the native <dialog>, so focus is trapped
 * and Esc closes it. The input is a combobox; arrow keys move, Enter runs the command.
 */
export function CommandPalette({ commands, open, onOpenChange, placeholder = 'Type a command or search', hotkey = true, className }: CommandPaletteProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const listId = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) {
      setQuery('')
      setActive(0)
      d.showModal()
    } else if (!open && d.open) d.close()
  }, [open])

  useEffect(() => {
    if (!hotkey) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [hotkey, open, onOpenChange])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => [c.label, c.group, ...(c.keywords ?? [])].some((s) => s?.toLowerCase().includes(q)))
  }, [commands, query])

  const groups = useMemo(() => {
    const map = new Map<string, Command[]>()
    for (const c of shown) map.set(c.group ?? '', [...(map.get(c.group ?? '') ?? []), c])
    return [...map]
  }, [shown])

  const current = Math.min(active, shown.length - 1)

  function run(c: Command | undefined) {
    if (!c) return
    onOpenChange(false)
    c.onSelect()
  }

  useEffect(() => {
    document.getElementById(`${listId}-${current}`)?.scrollIntoView({ block: 'nearest' })
  }, [current, listId])

  let index = 0
  return (
    <dialog
      ref={dialog}
      onClose={() => onOpenChange(false)}
      onClick={(e) => e.target === dialog.current && onOpenChange(false)}
      aria-label="Command palette"
      className={cn(
        'm-0 mx-auto mt-[14vh] w-[min(36rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-2xl border bg-card p-0 text-card-foreground shadow-2xl',
        'backdrop:bg-black/40 open:animate-[manniche-pop_220ms_cubic-bezier(0.23,1,0.32,1)] motion-reduce:open:animate-none',
        className,
      )}
    >
      <style href="manniche-pop" precedence="default">
        {'@keyframes manniche-pop { from { opacity: 0; transform: translateY(8px) scale(.98) } }'}
      </style>
      <div className="flex items-center gap-3 border-b px-4">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (!shown.length) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((current + 1) % shown.length)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((current - 1 + shown.length) % shown.length)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              run(shown[current])
            }
          }}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={shown.length ? `${listId}-${current}` : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:shadow-[inset_0_-2px_0_var(--color-ring)]"
        />
      </div>

      <div id={listId} role="listbox" aria-label="Commands" className="max-h-80 overflow-y-auto p-1.5">
        {shown.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">No commands match “{query}”.</p>}
        {groups.map(([group, list]) => (
          <div key={group} role="group" aria-label={group || undefined}>
            {group && <p className="px-3 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group}</p>}
            {list.map((c) => {
              const i = index++
              return (
                <div
                  key={c.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === current}
                  onPointerMove={() => i !== current && setActive(i)}
                  onClick={() => run(c)}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[0.9375rem] aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  {c.icon && <span className="text-muted-foreground [&_svg]:size-4">{c.icon}</span>}
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  {c.hint && <span className="text-sm text-muted-foreground">{c.hint}</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </dialog>
  )
}
