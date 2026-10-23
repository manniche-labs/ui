// A toolbar that rises at the bottom of a list or table while rows are ticked: how many are picked, the actions that
// apply to all of them (a menu such as "Status" changes every row in one click), More for the rest, and Clear (Esc).
// A one-click change can hand back an undo: the bar shows a small notice with Undo above it for a few seconds.
// The bulk limit keeps one click small and visible: above `maxInstant` rows, or when some picked rows are not on
// screen (a collapsed group, past "Show more", another filter), a change goes to `onNeedsConfirm` instead, so the app
// can list the rows in a dialog first. Read-only actions (export, copy) skip the limit.
import { Check, ChevronDown, MoreHorizontal, Undo2, X } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SelectionBarResult = {
  /** What happened, said in the notice: "Moved 3 tasks to Done". */
  message: string
  /** Sets the change back. Leave it out for a notice without Undo. */
  undo?: () => void | Promise<void>
}

export type SelectionBarOption = {
  id: string
  label: string
  icon?: ReactNode
  /** Marks the value every picked row already has, with a check. */
  current?: boolean
}

export type SelectionBarAction = {
  id: string
  /** Visible on wide bars, and always the button's name. */
  label: string
  icon?: ReactNode
  /** Choices in a menu that opens upwards. Picking one runs the action with its id, in one click. */
  options?: SelectionBarOption[]
  /** Heading over the options, such as "Move {count} to". */
  menuLabel?: string
  /**
   * Runs the action on the picked rows, with the option's id for a menu. Return a result (or a promise of one) to show
   * a notice, with Undo when it has `undo`.
   */
  onSelect: (optionId?: string) => void | SelectionBarResult | Promise<void | SelectionBarResult>
  /** The action only reads (export, copy), so the bulk limit does not apply. */
  readOnly?: boolean
  disabled?: boolean
  /** Why it is off, read with the button and shown as its tooltip. */
  disabledReason?: string
}

export type SelectionBarConfirmRequest = {
  action: SelectionBarAction
  optionId?: string
  /** Rows picked. */
  count: number
  /** Picked rows that are not on screen. */
  hiddenCount: number
  /** "limit" when more than maxInstant rows are picked, "hidden" when some are not on screen. */
  reason: 'limit' | 'hidden'
  /** Runs the action after the app's own confirmation, with the same notice and Undo as a one-click change. */
  proceed: () => Promise<void>
}

export type SelectionBarLabels = {
  /** Name of the toolbar. Default "Selection". */
  toolbar?: string
  /** The count, with {count}. Default "{count} selected". */
  selected?: string
  /** Said when the selection is cleared. Default "Selection cleared". */
  cleared?: string
  /** The Clear button. Default "Clear selection". */
  clear?: string
  /** The More menu button. Default "More actions". */
  more?: string
  /** "Select all" in the More menu, with {count}. Default "Select all {count}". */
  selectAll?: string
  /** Default "Undo". */
  undo?: string
  /** Said after an undo. Default "Undone". */
  undone?: string
  /** Said when an undo failed. Default "Could not undo". */
  undoFailed?: string
  /** Name of the notice's close button. Default "Dismiss". */
  dismiss?: string
}

export type SelectionBarProps = {
  /** How many rows are picked. The bar shows while it is above 0 (and while a notice is up). */
  count: number
  /** Called by Clear, Esc and the More menu's Clear item. */
  onClear: () => void
  /** The quick actions, shown as buttons; one with `options` is a menu. */
  actions: SelectionBarAction[]
  /** Actions under More (…), as menu items. Clear selection is always added at the end. */
  more?: SelectionBarAction[]
  /** One click changes at most this many rows; above it the change goes to onNeedsConfirm. Default 10. */
  maxInstant?: number
  /** Picked rows that are not on screen. When above 0, a change goes to onNeedsConfirm. Default 0. */
  hiddenCount?: number
  /** Called instead of a change that is too big or reaches rows off screen. Without it, such a change runs. */
  onNeedsConfirm?: (request: SelectionBarConfirmRequest) => void
  /** Adds "Select all {count}" to More while fewer than that are picked. */
  onSelectAll?: () => void
  /** How many rows "Select all" would pick. */
  selectAllCount?: number
  /** Esc clears the selection, unless focus is in a text field or a dialog is open. Default true. */
  escapeClears?: boolean
  /** Seconds the notice with Undo stays, paused while hovered or focused. Default 8. */
  undoSeconds?: number
  /** "sticky" sits at the bottom of the scrolling box, in the flow; "fixed" sits at the bottom of the screen and leaves a spacer of its height. Default "sticky". */
  placement?: 'sticky' | 'fixed'
  /** BCP 47 locale for numbers. Default "en". */
  locale?: string
  /** Visible and spoken text, with English defaults. */
  labels?: SelectionBarLabels
  /** Classes for the bar. */
  className?: string
}

const DEFAULT_LABELS: Required<SelectionBarLabels> = {
  toolbar: 'Selection',
  selected: '{count} selected',
  cleared: 'Selection cleared',
  clear: 'Clear selection',
  more: 'More actions',
  selectAll: 'Select all {count}',
  undo: 'Undo',
  undone: 'Undone',
  undoFailed: 'Could not undo',
  dismiss: 'Dismiss',
}

type Notice = { id: number; message: string; undo?: () => void | Promise<void>; tone: 'default' | 'error'; done?: boolean }

const fill = (text: string, count: number, locale: string) => text.replace('{count}', count.toLocaleString(locale))

// Buttons on the inverted bar: 44 px tall, quiet until hovered, an outline in the bar's text colour on focus.
const BAR_BUTTON =
  'relative inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[13.5px] font-medium whitespace-nowrap text-background/90 outline-none transition-colors duration-150 hover:bg-background/12 hover:text-background focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-background aria-expanded:bg-background/12 disabled:pointer-events-none disabled:opacity-45 aria-disabled:opacity-45 motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0'
const ICON_BUTTON = 'w-11 px-0'
const SEPARATOR = 'mx-1 h-5 w-px shrink-0 bg-background/20 @max-[22rem]:mx-0.5'

/** True when the key press happened where Esc means something else: a text field or an open dialog. */
function escapeBelongsElsewhere(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  if (t?.closest('dialog[open], [aria-modal="true"]')) return true
  if (t?.isContentEditable) return true
  if (t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return true
  if (t instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color'].includes(t.type)) return true
  return false
}

/** Says the count politely a moment after it settles, so a quick run of ticks is read once. */
function useCountAnnouncement(count: number, labels: Required<SelectionBarLabels>, locale: string) {
  const [said, setSaid] = useState('')
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      if (count === 0) return
    }
    const t = window.setTimeout(() => setSaid(count > 0 ? fill(labels.selected, count, locale) : labels.cleared), 350)
    return () => window.clearTimeout(t)
  }, [count, labels.selected, labels.cleared, locale])
  return said
}

/** Keeps the bar mounted for its leave animation once it should go. */
function usePresence(show: boolean, ms = 160) {
  const [mounted, setMounted] = useState(show)
  // Mount at once when it should show (React's "adjust state while rendering").
  if (show && !mounted) setMounted(true)
  const leaving = mounted && !show
  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(() => setMounted(false), ms)
    return () => window.clearTimeout(t)
  }, [leaving, ms])
  return { mounted, leaving }
}

type MenuProps = {
  items: { key: string; label: string; icon?: ReactNode; current?: boolean; disabled?: boolean; hint?: string; onSelect: () => void; separatorBefore?: boolean }[]
  heading?: string
  align: 'start' | 'end'
  buttonLabel: string
  buttonContent: ReactNode
  buttonClassName: string
  disabled?: boolean
  /** An action is running: the button keeps focus but does nothing. */
  busy?: boolean
  title?: string
  tabIndex: number
  onFocus: () => void
}

/** A menu that opens upwards from its button: arrow keys, Home and End move, Enter picks, Esc closes back to the button. */
function BarMenu({ items, heading, align, buttonLabel, buttonContent, buttonClassName, disabled, busy, title, tabIndex, onFocus }: MenuProps) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const id = useId()

  const focusItem = (at: number | 'first' | 'last') => {
    const list = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [])
    if (!list.length) return
    const i = at === 'first' ? 0 : at === 'last' ? list.length - 1 : (at + list.length) % list.length
    list[i].focus()
  }

  useLayoutEffect(() => {
    if (open) focusItem('first')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) button.current?.focus()
  }

  const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const list = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [])
    const at = list.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') focusItem(at + 1)
    else if (e.key === 'ArrowUp') focusItem(at - 1)
    else if (e.key === 'Home') focusItem('first')
    else if (e.key === 'End') focusItem('last')
    else if (e.key === 'Escape') close()
    else if (e.key === 'Tab') return setOpen(false)
    else return
    e.preventDefault()
    // The bar's own Esc (clear) and the toolbar's arrows never see it.
    e.stopPropagation()
  }

  return (
    <span className="relative flex">
      <button
        ref={button}
        type="button"
        data-bar-item=""
        tabIndex={tabIndex}
        onFocus={onFocus}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={buttonLabel}
        title={title}
        disabled={disabled}
        aria-disabled={busy || undefined}
        onClick={() => !busy && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            e.stopPropagation()
            if (open) focusItem(e.key === 'ArrowUp' ? 'last' : 'first')
            else setOpen(true)
          }
        }}
        className={buttonClassName}
      >
        {buttonContent}
      </button>
      {open && (
        <div
          ref={menu}
          id={id}
          role="menu"
          aria-label={heading ?? buttonLabel}
          onKeyDown={onMenuKey}
          className={cn(
            'absolute bottom-[calc(100%+10px)] z-10 grid w-max min-w-48 max-w-[min(18rem,calc(100vw-2rem))] gap-px rounded-xl border bg-card p-1 text-card-foreground shadow-xl',
            'animate-[manniche-selbar-menu_160ms_cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none',
            align === 'start' ? 'left-0' : 'right-0',
          )}
        >
          {heading && (
            <p aria-hidden className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
              {heading}
            </p>
          )}
          {items.map((item) => (
            <div key={item.key} role="none" className={cn(item.separatorBefore && 'mt-1 border-t pt-1')}>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-disabled={item.disabled || undefined}
                title={item.hint}
                onClick={() => {
                  if (item.disabled) return
                  close()
                  item.onSelect()
                }}
                className={cn(
                  'flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm outline-none',
                  'hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                  'aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
                )}
              >
                {item.icon}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="sr-only">, {item.hint}</span>}
                {item.current && <Check aria-hidden className="!text-foreground" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </span>
  )
}

/**
 * The toolbar for many rows at once. Put it after the list, inside the same scrolling box. It shows while `count` is
 * above 0, rises in calmly (still under reduced motion), and keeps 44 px targets.
 */
export function SelectionBar({
  count,
  onClear,
  actions,
  more = [],
  maxInstant = 10,
  hiddenCount = 0,
  onNeedsConfirm,
  onSelectAll,
  selectAllCount,
  escapeClears = true,
  undoSeconds = 8,
  placement = 'sticky',
  locale = 'en',
  labels: labelsProp,
  className,
}: SelectionBarProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)
  const [focusAt, setFocusAt] = useState(0)
  const [paused, setPaused] = useState(false)
  const bar = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)
  const nextId = useRef(1)
  const said = useCountAnnouncement(count, labels, locale)
  const { mounted, leaving } = usePresence(count > 0)

  // Esc clears, unless the key belongs to a field, a menu or a dialog.
  useEffect(() => {
    if (!escapeClears || count === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || escapeBelongsElsewhere(e)) return
      e.preventDefault()
      onClear()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [escapeClears, count, onClear])

  // The notice leaves on its own after undoSeconds, paused while it is hovered or holds focus.
  useEffect(() => {
    if (!notice || paused) return
    const t = window.setTimeout(() => setNotice(null), notice.done ? 2500 : notice.undo ? undoSeconds * 1000 : 4000)
    return () => window.clearTimeout(t)
  }, [notice, paused, undoSeconds])

  // With placement "fixed", a spacer of the bar's height keeps the last rows reachable.
  useLayoutEffect(() => {
    if (placement !== 'fixed' || !wrap.current) return
    const el = wrap.current
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [placement, mounted, notice])

  const show = useCallback((r: void | SelectionBarResult) => {
    if (!r) return
    setPaused(false)
    setNotice({ id: nextId.current++, message: r.message, undo: r.undo, tone: 'default' })
  }, [])

  const run = useCallback(
    async (action: SelectionBarAction, optionId?: string) => {
      setBusy(true)
      try {
        show(await action.onSelect(optionId))
      } finally {
        setBusy(false)
      }
    },
    [show],
  )

  const trigger = (action: SelectionBarAction, optionId?: string) => {
    if (busy || action.disabled) return
    const reason = action.readOnly ? null : hiddenCount > 0 ? 'hidden' : count > maxInstant ? 'limit' : null
    if (reason && onNeedsConfirm) {
      onNeedsConfirm({ action, optionId, count, hiddenCount, reason, proceed: () => run(action, optionId) })
      return
    }
    void run(action, optionId)
  }

  const undo = async () => {
    if (!notice?.undo) return
    const fn = notice.undo
    // The Undo button leaves the page without a blur, so the pause it set is lifted here.
    setPaused(false)
    setNotice({ ...notice, undo: undefined, message: notice.message })
    try {
      await fn()
      setNotice({ id: nextId.current++, message: labels.undone, tone: 'default', done: true })
    } catch {
      setNotice({ id: nextId.current++, message: labels.undoFailed, tone: 'error', done: true })
    }
  }

  // Roving focus: one Tab stop in the toolbar, arrows move between its controls (APG toolbar).
  const onToolbarKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    const list = Array.from(bar.current?.querySelectorAll<HTMLElement>('[data-bar-item]:not(:disabled)') ?? [])
    const at = list.indexOf(document.activeElement as HTMLElement)
    if (at < 0) return
    e.preventDefault()
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (at + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length
    list[next].focus()
  }

  const moreItems: MenuProps['items'] = [
    ...more.map((a) => ({
      key: a.id,
      label: a.label,
      icon: a.icon,
      disabled: a.disabled,
      hint: a.disabled ? a.disabledReason : undefined,
      onSelect: () => trigger(a),
    })),
    ...(onSelectAll && selectAllCount !== undefined && selectAllCount > count
      ? [{ key: '__all', label: fill(labels.selectAll, selectAllCount, locale), onSelect: onSelectAll, separatorBefore: more.length > 0 }]
      : []),
    { key: '__clear', label: labels.clear, icon: <X />, onSelect: onClear, separatorBefore: true },
  ]

  // Index of each focusable control, for the roving tab stop.
  // Actions come first, then More and Clear, which are never disabled.
  const usable = (i: number) => i < actions.length + 2 && !actions[i]?.disabled
  const firstUsable = actions.findIndex((a) => !a.disabled)
  const active = usable(focusAt) ? focusAt : firstUsable < 0 ? actions.length : firstUsable
  let index = 0
  const stop = () => {
    const i = index++
    return { tabIndex: i === active ? 0 : -1, onFocus: () => setFocusAt(i) }
  }

  return (
    <>
      <style href="manniche-selbar" precedence="default">
        {'@keyframes manniche-selbar-in { from { opacity: 0; transform: translateY(10px) } }' +
          '@keyframes manniche-selbar-out { to { opacity: 0; transform: translateY(8px) } }' +
          '@keyframes manniche-selbar-menu { from { opacity: 0; transform: translateY(4px) scale(.98) } }'}
      </style>
      {/* Always in the page, so the count and the notice are spoken when they change. */}
      <p role="status" className="sr-only">
        {said}
      </p>
      {placement === 'fixed' && mounted && <div aria-hidden style={{ height }} />}
      <div
        ref={wrap}
        className={cn(
          '@container pointer-events-none z-20 flex flex-col items-center gap-2 px-2',
          placement === 'sticky' ? 'sticky bottom-[calc(env(safe-area-inset-bottom)+12px)] mt-3' : 'fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+12px)]',
          !mounted && !notice && 'hidden',
        )}
      >
        {notice && (
          <div
            key={notice.id}
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className="pointer-events-auto flex max-w-full items-center gap-1 rounded-xl border bg-card py-1 pr-1 pl-3.5 text-sm text-card-foreground shadow-lg animate-[manniche-selbar-in_220ms_cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none"
          >
            <span role={notice.tone === 'error' ? 'alert' : 'status'} className={cn('min-w-0 py-2 pr-1', notice.tone === 'error' && 'text-destructive')}>
              {notice.message}
            </span>
            {notice.undo && (
              <button
                type="button"
                onClick={() => void undo()}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-muted px-3 font-medium outline-none hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring [&_svg]:size-4"
              >
                <Undo2 aria-hidden />
                {labels.undo}
              </button>
            )}
            <button
              type="button"
              aria-label={labels.dismiss}
              onClick={() => {
                setPaused(false)
                setNotice(null)
              }}
              className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}
        {mounted && (
          <div
            ref={bar}
            role="toolbar"
            aria-label={labels.toolbar}
            aria-busy={busy || undefined}
            onKeyDown={onToolbarKey}
            className={cn(
              'pointer-events-auto flex max-w-full items-center rounded-[14px] bg-foreground p-1 text-background shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_80%,transparent),0_12px_32px_rgb(0_0_0/0.28),0_2px_6px_rgb(0_0_0/0.16)]',
              leaving
                ? 'animate-[manniche-selbar-out_160ms_ease-in_forwards]'
                : 'animate-[manniche-selbar-in_220ms_cubic-bezier(0.23,1,0.32,1)]',
              'motion-reduce:animate-none',
              className,
            )}
          >
            <span aria-hidden className="shrink-0 pr-1.5 pl-2.5 text-[13.5px] font-medium whitespace-nowrap tabular-nums @max-[22rem]:hidden">
              {fill(labels.selected, Math.max(count, 1), locale)}
            </span>
            {/* Too narrow for the words: the count alone, as a chip. The live region still says it in full. */}
            <span aria-hidden className="mx-1 hidden h-7 min-w-7 shrink-0 place-items-center rounded-lg bg-background/15 px-1.5 text-[13px] font-semibold tabular-nums @max-[22rem]:grid">
              {Math.max(count, 1).toLocaleString(locale)}
            </span>
            <span aria-hidden className={SEPARATOR} />
            <div className="flex min-w-0 items-center gap-0.5">
              {actions.map((action) => {
                const name = action.disabled && action.disabledReason ? `${action.label}, ${action.disabledReason}` : action.label
                if (action.options?.length) {
                  return (
                    <BarMenu
                      key={action.id}
                      {...stop()}
                      align="start"
                      heading={action.menuLabel ? fill(action.menuLabel, count, locale) : undefined}
                      buttonLabel={name}
                      title={action.disabled ? action.disabledReason : undefined}
                      disabled={action.disabled}
                      busy={busy}
                      buttonClassName={cn(BAR_BUTTON, 'px-2.5')}
                      buttonContent={
                        <>
                          {action.icon}
                          <span className={cn(action.icon && 'hidden @min-[26rem]:inline')}>{action.label}</span>
                          <ChevronDown aria-hidden className="!size-3.5 opacity-70" />
                        </>
                      }
                      items={action.options.map((o) => ({ key: o.id, label: o.label, icon: o.icon, current: o.current, onSelect: () => trigger(action, o.id) }))}
                    />
                  )
                }
                const { tabIndex, onFocus } = stop()
                return (
                  <button
                    key={action.id}
                    type="button"
                    data-bar-item=""
                    tabIndex={tabIndex}
                    onFocus={onFocus}
                    aria-label={name}
                    title={action.disabled ? action.disabledReason : undefined}
                    disabled={action.disabled}
                    aria-disabled={busy || undefined}
                    onClick={() => trigger(action)}
                    className={cn(BAR_BUTTON, action.icon && '@max-[26rem]:w-11 @max-[26rem]:px-0')}
                  >
                    {action.icon}
                    <span aria-hidden className={cn(action.icon && 'hidden @min-[26rem]:inline')}>
                      {action.label}
                    </span>
                  </button>
                )
              })}
              <BarMenu
                {...stop()}
                align="end"
                buttonLabel={labels.more}
                busy={busy}
                buttonClassName={cn(BAR_BUTTON, ICON_BUTTON)}
                buttonContent={<MoreHorizontal aria-hidden />}
                items={moreItems}
              />
            </div>
            <span aria-hidden className={SEPARATOR} />
            <button type="button" data-bar-item="" {...stop()} aria-label={labels.clear} aria-keyshortcuts={escapeClears ? 'Escape' : undefined} title={escapeClears ? `${labels.clear} (Esc)` : undefined} onClick={onClear} className={cn(BAR_BUTTON, ICON_BUTTON)}>
              <X aria-hidden />
            </button>
          </div>
        )}
      </div>
    </>
  )
}
