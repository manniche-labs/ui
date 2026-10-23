// Settings as one window over the app, on the native <dialog>: the sections on the left, the chosen one on the right.
// On a narrow screen it fills the screen and works in two steps, the list of sections first and then one section
// with Back. The section is controlled (`section` and `onSectionChange`), so a link or a warning elsewhere can open
// the window straight on "Connections". Sections can carry an icon and a badge, such as "Login rejected", and the
// window has a footer slot. `useSettingsShortcut` opens it on Cmd+, or Ctrl+, as desktop apps do.
// Also exports SettingsRow (a label, a line under it and a control, 44 px or taller) and SettingsHeading.
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SettingsSection = {
  id: string
  label: string
  icon?: ReactNode
  /** A short word beside the label, such as "Login rejected" or "New". */
  badge?: string
  /** "warning" draws the badge in the destructive colour, for something that needs a look. Default "neutral". */
  badgeTone?: 'neutral' | 'warning'
  /** A line under the section's title. */
  description?: string
  /** Sections with the same group sit together under that small heading in the list. */
  group?: string
  /** What the section holds. A function is only called while the section shows. */
  content: ReactNode | (() => ReactNode)
}

export type SettingsWindowLabels = {
  /** Name of the close button. Default "Close settings". */
  close?: string
  /** The Back button on narrow screens. Default "All settings". */
  back?: string
  /** Name of the section list. Default "Sections". */
  sections?: string
}

export type SettingsWindowProps = {
  /** Shows the window as a modal dialog. */
  open: boolean
  /** Called with false on Esc, the close button or a click on the backdrop. */
  onOpenChange: (open: boolean) => void
  /** The sections, in the order they list. */
  sections: SettingsSection[]
  /** The section on show, controlled. null shows the list step on a narrow screen and the first section on a wide one. */
  section: string | null
  /** Called when a section is picked, or with null for Back. */
  onSectionChange: (section: string | null) => void
  /** The window's title. Default "Settings". */
  title?: string
  /** Under the section list on wide screens and under the list step on narrow ones, such as a version line. */
  footer?: ReactNode
  /** Below this width in px the window fills the screen and works in two steps. Default 720. */
  narrowBelow?: number
  /** Visible and spoken text, with English defaults. */
  labels?: SettingsWindowLabels
  className?: string
}

const DEFAULT_LABELS: Required<SettingsWindowLabels> = {
  close: 'Close settings',
  back: 'All settings',
  sections: 'Sections',
}

function useNarrow(below: number) {
  const query = `(max-width: ${below - 0.02}px)`
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Calls `onOpen` on Cmd+, (Mac) or Ctrl+, (elsewhere), the shortcut desktop apps use for settings. */
export function useSettingsShortcut(onOpen: () => void, { enabled = true }: { enabled?: boolean } = {}) {
  const latest = useRef(onOpen)
  useLayoutEffect(() => {
    latest.current = onOpen
  })
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key === ',') {
        e.preventDefault()
        latest.current()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [enabled])
}

const CONTROL_FOCUS = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

/** The settings window. Focus stays inside while it is open and goes back where it was when it closes. */
export function SettingsWindow({
  open,
  onOpenChange,
  sections,
  section,
  onSectionChange,
  title = 'Settings',
  footer,
  narrowBelow = 720,
  labels: labelsProp,
  className,
}: SettingsWindowProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const dialog = useRef<HTMLDialogElement>(null)
  const nav = useRef<HTMLDivElement>(null)
  const pane = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const sectionTitleId = useId()
  const narrow = useNarrow(narrowBelow)

  const known = sections.find((s) => s.id === section)
  const shown = known ?? (narrow ? undefined : sections[0])
  // Narrow screens show the list step until a section is picked.
  const step: 'list' | 'section' = narrow && !known ? 'list' : 'section'

  // A layout effect, so the dialog is shown before the focus effect below runs in the same commit.
  useLayoutEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) {
      opener.current = document.activeElement as HTMLElement | null
      d.showModal()
    } else if (!open && d.open) d.close()
  }, [open])

  // The section last opened on a narrow screen, so Back lands on it in the list.
  const lastOpened = useRef<string | null>(null)
  useEffect(() => {
    if (known) lastOpened.current = known.id
  }, [known])

  // Focus on open and on each step: the current section in the list, or Back inside a section on a narrow screen.
  useLayoutEffect(() => {
    if (!open) return
    if (narrow && step === 'section') return back.current?.focus()
    const items = Array.from(nav.current?.querySelectorAll<HTMLElement>('button[data-section]') ?? [])
    const target = narrow ? lastOpened.current : shown?.id
    ;(items.find((b) => b.dataset.section === target) ?? items[0])?.focus()
    // Only on open and on a change of step; picking a section with the mouse keeps focus where it is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, narrow, step])

  // A new section starts at the top.
  useLayoutEffect(() => {
    pane.current?.scrollTo?.({ top: 0 })
  }, [shown?.id])

  const onClose = () => {
    onOpenChange(false)
    const el = opener.current
    opener.current = null
    if (el?.isConnected) requestAnimationFrame(() => el.focus())
  }

  // Up, Down, Home and End move between sections, as in a list.
  const onNavKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    const items = Array.from(nav.current?.querySelectorAll<HTMLElement>('button[data-section]') ?? [])
    const at = items.indexOf(document.activeElement as HTMLElement)
    if (at < 0) return
    e.preventDefault()
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[next].focus()
    // On a wide screen the pane follows the focus, as in a desktop settings window.
    if (!narrow) onSectionChange(items[next].dataset.section!)
  }

  const groups: { name?: string; items: SettingsSection[] }[] = []
  for (const s of sections) {
    const last = groups[groups.length - 1]
    if (last && last.name === s.group) last.items.push(s)
    else groups.push({ name: s.group, items: [s] })
  }

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label={labels.close}
      className={cn(
        'relative grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground after:absolute after:-inset-1 hover:bg-muted hover:text-foreground',
        CONTROL_FOCUS,
      )}
    >
      <X className="size-4" aria-hidden />
    </button>
  )

  const list = (
    <nav aria-label={labels.sections} className="flex min-h-0 flex-1 flex-col">
      <div ref={nav} onKeyDown={onNavKey} className="min-h-0 flex-1 overflow-y-auto p-2">
        {groups.map((g, gi) => (
          <div key={`${g.name ?? ''}-${gi}`} className={cn(gi > 0 && 'mt-3')}>
            {g.name && <p className="px-2.5 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">{g.name}</p>}
            <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-0.5 p-0">
              {g.items.map((s) => {
                const current = !narrow && shown?.id === s.id
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      data-section={s.id}
                      aria-current={current ? 'page' : undefined}
                      onClick={() => onSectionChange(s.id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm',
                        narrow ? 'min-h-12' : 'min-h-10',
                        'text-foreground/85 hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:font-medium aria-[current=page]:text-foreground',
                        'outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                        '[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground',
                      )}
                    >
                      {s.icon}
                      <span className="min-w-0 flex-1 truncate">{s.label}</span>
                      {s.badge && (
                        <span
                          className={cn(
                            'shrink-0 rounded-md px-1.5 text-[11px] leading-5 font-medium whitespace-nowrap',
                            s.badgeTone === 'warning'
                              ? 'bg-destructive/12 text-[color-mix(in_oklab,var(--destructive)_78%,var(--foreground))]'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <span className="sr-only">, </span>
                          {s.badge}
                        </span>
                      )}
                      {narrow && <ChevronRight aria-hidden className="!size-4 text-muted-foreground" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      {footer && <div className="border-t px-4 py-3 text-xs text-muted-foreground">{footer}</div>}
    </nav>
  )

  const body = shown && (typeof shown.content === 'function' ? (shown.content as () => ReactNode)() : shown.content)

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
      aria-labelledby={titleId}
      className={cn(
        'm-auto max-w-none overflow-hidden border-0 bg-card p-0 text-card-foreground backdrop:bg-black/45',
        narrow
          ? 'h-dvh max-h-none w-screen rounded-none'
          : 'h-[min(42.5rem,calc(100dvh-4rem))] w-[min(65rem,calc(100vw-4rem))] rounded-2xl border shadow-2xl',
        'open:animate-[manniche-pop_220ms_cubic-bezier(0.23,1,0.32,1)] motion-reduce:open:animate-none',
        className,
      )}
    >
      <style href="manniche-pop" precedence="default">
        {'@keyframes manniche-pop { from { opacity: 0; transform: translateY(8px) scale(.98) } }'}
      </style>
      {open && (
        <div className={cn('flex h-full min-h-0', narrow && 'flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]')}>
          {(!narrow || step === 'list') && (
            <div className={cn('flex min-h-0 flex-col', narrow ? 'flex-1' : 'w-60 shrink-0 border-r bg-muted/40')}>
              <div className="flex min-h-14 items-center gap-2 px-4">
                <h2 id={titleId} className="m-0 min-w-0 flex-1 truncate text-base font-semibold">
                  {title}
                </h2>
                {narrow && closeButton}
              </div>
              {list}
            </div>
          )}
          {step === 'section' && shown && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className={cn('flex min-h-14 shrink-0 items-center gap-1 border-b pr-3', narrow ? 'pl-1' : 'pl-6')}>
                {narrow && (
                  <>
                    <h2 id={titleId} className="sr-only">
                      {title}
                    </h2>
                    <button
                      ref={back}
                      type="button"
                      onClick={() => onSectionChange(null)}
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg pr-3 pl-1.5 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <ChevronLeft aria-hidden className="size-4" />
                      {labels.back}
                    </button>
                  </>
                )}
                {!narrow && (
                  <h3 id={sectionTitleId} className="m-0 min-w-0 flex-1 truncate text-base font-semibold">
                    {shown.label}
                  </h3>
                )}
                {narrow && <span className="flex-1" />}
                {closeButton}
              </div>
              <div ref={pane} role="region" aria-labelledby={sectionTitleId} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className={cn('w-full max-w-2xl', narrow ? 'px-4 py-4' : 'px-6 py-5')}>
                  {narrow && (
                    <h3 id={sectionTitleId} className="m-0 mb-1 text-xl font-semibold">
                      {shown.label}
                    </h3>
                  )}
                  {shown.description && <p className="mt-0 mb-4 text-sm text-muted-foreground">{shown.description}</p>}
                  {body}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}

export type SettingsRowProps = {
  /** What the setting is called. */
  label: ReactNode
  /** One line on what it does. */
  description?: ReactNode
  /**
   * The control. Pass a function to get the ids of the label and the line, for `aria-labelledby` and
   * `aria-describedby` on the control.
   */
  children?: ReactNode | ((ids: { labelId: string; descriptionId?: string }) => ReactNode)
  /** Puts the control under the text instead of beside it, for wide controls. Default false. */
  stacked?: boolean
  className?: string
}

/** One setting: its name and a line on what it does, with the control at the end. Rows are 44 px or taller, split by hairlines. */
export function SettingsRow({ label, description, children, stacked = false, className }: SettingsRowProps) {
  const id = useId()
  const labelId = `${id}-label`
  const descriptionId = description ? `${id}-desc` : undefined
  const control = typeof children === 'function' ? children({ labelId, descriptionId }) : children
  return (
    <div
      className={cn(
        'flex min-h-11 gap-x-4 gap-y-2 border-b py-3 last:border-b-0',
        stacked ? 'flex-col' : 'flex-wrap items-center justify-between',
        className,
      )}
    >
      <div className="min-w-0 flex-[1_1_14rem]">
        <div id={labelId} className="text-sm font-medium">
          {label}
        </div>
        {description && (
          <div id={descriptionId} className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      {control !== undefined && control !== null && <div className={cn('flex shrink-0 items-center', stacked && 'w-full')}>{control}</div>}
    </div>
  )
}

/** A small heading over a run of rows inside a section. */
export function SettingsHeading({ children, level = 4, className }: { children: ReactNode; level?: 3 | 4 | 5; className?: string }) {
  const Tag = `h${level}` as 'h4'
  return <Tag className={cn('mt-6 mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase first:mt-0', className)}>{children}</Tag>
}
