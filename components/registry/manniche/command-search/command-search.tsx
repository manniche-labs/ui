// CommandSearch: a site search that opens as a Cmd+K palette. The trigger is a search field set into the page (a real
// GET form, so it still searches without JavaScript); typing in it, pressing Enter, clicking it, Cmd/Ctrl+K or "/"
// opens a modal with the results grouped (Free, Pro, Templates, … from each item's `group`) and a preview of the
// active one beside them. With nothing found it echoes the query and offers a few searches that do find something.
//
// Keyboard: Up and Down move through the results (and wrap), Home and End jump to the first and last while the field
// is empty, Enter opens the active result, Cmd/Ctrl+Enter copies its install line, Esc closes. Focus goes back to
// whatever opened the search. "/" is a single-key shortcut, so `shortcuts={false}` turns it off (WCAG 2.1.4); it is
// also ignored while typing in a field. Cmd/Ctrl+K and the arrow keys always work.
//
// Screen readers: the field is a combobox over a listbox, the active result is announced through
// aria-activedescendant, and the number of hits is read from a polite status inside the dialog once typing pauses.
//
// Motion: a click on the trigger lifts the field into the palette and unfolds the results under it; other clicks fade
// and rise the palette in 220 ms. Opening or closing from the keyboard is instant, and so is everything under reduced
// motion. Only transform, opacity and filter move.
import { Search, X } from 'lucide-react'
import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/registry/manniche/badge/badge'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'

export type CommandSearchItem = {
  /** Unique id, such as "flux-image". Shown in mono under the title and matched by the search. */
  id: string
  /** The name people know it by, such as "Flux Image". */
  title: string
  /** One or two sentences. Shown in the preview and searched for words of three letters or more. */
  description?: string
  /** The group it is listed under, such as "Free", "Pro" or "Templates". Groups show in the order they first appear. */
  group: string
  /** A category, shown as a neutral badge and matched from its start. */
  category?: string
  /** Shows a Free or Pro badge, and lets "free" and "pro" find it. */
  tier?: 'free' | 'pro'
  /** Marks it as recently added in the preview. */
  isNew?: boolean
  /** An image for the thumbnail and the preview. Without one, its initials and name stand in. */
  poster?: string
  /** The install line shown in the preview; Cmd/Ctrl+Enter copies it. */
  install?: string
  /** Where Enter or a click goes when there is no `onSelect`. */
  href?: string
  /** Extra words that should find it, matched like the description. */
  keywords?: string[]
}

export type CommandSearchLabels = {
  /** The trigger field's placeholder; `{count}` becomes the number of items. Default "Search components". */
  placeholder?: string
  /** Names the trigger field and its search landmark. Give a second search on the page its own. Default "Search". */
  searchLabel?: string
  /** Read after the trigger field's name. Default "When you type here, the search opens in a dialog with the results." */
  triggerHint?: string
  /** Between the Cmd+K and "/" hints. Default "or". */
  or?: string
  /** Names the dialog. Default "Search". */
  dialog?: string
  /** The palette field's placeholder, also its name. Default "Name, category, free or pro". */
  inputPlaceholder?: string
  /** The close button. Default "Close search". */
  close?: string
  /** Names the list of results. Default "Results". */
  results?: string
  /** Names the preview pane. Default "Preview". */
  preview?: string
  /** Tier badges. Defaults "Free", "Pro" and "New". */
  free?: string
  pro?: string
  new?: string
  /** A group's count with an empty field. Default "{shown} of {total}". */
  groupCount?: string
  /** A group's count while searching. Default "{shown} of {total} hits". */
  groupHits?: string
  /** The footer count with an empty field. Default "{count} in total". */
  total?: string
  /** The footer count while searching. Default "{count} hits of {total}". */
  hitsOf?: string
  /** Read after typing pauses. Defaults "{count} hits" and "{count} hit". */
  hits?: string
  hit?: string
  /** The no-results heading; `{query}` becomes what was typed. Default "Nothing matches “{query}”". */
  noneTitle?: string
  /** Under it when there are suggestions. Default "Try a shorter word, or one of these:". */
  noneText?: string
  /** Under it when there are none. Default "Try a shorter word." */
  noneTextAlone?: string
  /** Read when nothing matches. Default "Nothing matches {query}." */
  noneLive?: string
  /** Names the suggestion buttons. Default "Suggestions". */
  suggestions?: string
  /** Shown when there are no items at all. Default "Nothing to search yet." */
  empty?: string
  /** Footer key hints. Defaults "select", "open", "copy install" and "close". */
  keySelect?: string
  keyOpen?: string
  keyCopy?: string
  keyClose?: string
  /** After Cmd/Ctrl+Enter; `{id}` becomes the item's id. Defaults "Copied: {id}" and "Could not copy". */
  copied?: string
  copyFailed?: string
}

export type CommandSearchProps = {
  /** Everything that can be found. Counts in the palette are taken from this list. */
  items: CommandSearchItem[]
  /** Called with the chosen item after the palette has closed. Without it, the item's `href` is followed. */
  onSelect?: (item: CommandSearchItem) => void
  /** Your own preview for the active item, in place of the poster, title, description, badges and install line. */
  renderPreview?: (item: CommandSearchItem) => ReactNode
  /**
   * Searches to offer when nothing matches, shown with their hit counts (ones with no hits are left out, at most
   * four). A function gets the query, for mapping words in another language. Default: the commonest categories.
   */
  suggestions?: string[] | ((query: string) => string[])
  /** Single-key shortcuts: "/" opens the search. Turn off for WCAG 2.1.4; Cmd/Ctrl+K keeps working. Default true. */
  shortcuts?: boolean
  /** Listen on the whole page for Cmd/Ctrl+K (and "/"). Turn off on a second search on the same page. Default true. */
  hotkeys?: boolean
  /** Results per group while searching. Default 8. */
  limit?: number
  /** Results per group with an empty field. Default 5. */
  initialLimit?: number
  /** Controls whether the palette is open. Leave it out to let the component keep track. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Controls the text in the field (the trigger and the palette share it). */
  query?: string
  /** The starting text, such as `?q=` from the URL. */
  defaultQuery?: string
  onQueryChange?: (query: string) => void
  /** Where the trigger form sends `?q=` without JavaScript. Default: the current page. */
  action?: string
  /** The query parameter's name. Default "q". */
  name?: string
  /** Words for other languages. */
  labels?: CommandSearchLabels
  /** Classes for the trigger field. */
  className?: string
}

type Mode = 'key' | 'pointer' | 'lift'
type Hit = { item: CommandSearchItem; score: number; index: number }

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'
const noop = () => () => {}
const isMac = () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)

// Another modal is up when a native modal dialog is open, or a visible dialog from a library such as Radix
// (role=dialog, alertdialog or aria-modal). `own` and what is inside it do not count.
function otherDialogOpen(own: Element | null = null) {
  const found = document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"], [aria-modal="true"]')
  return [...found].some((el) => el !== own && !own?.contains(el) && el.getClientRects().length > 0)
}

// Only web and mail links are followed, so an item's href can never run script.
function safeHref(href: string) {
  try {
    const url = new URL(href, location.href)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function fill(template: string, values: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1]
    return <Fragment key={i}>{key && key in values ? values[key] : part}</Fragment>
  })
}
const fillText = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (m, key: string) => (key in values ? String(values[key]) : m))

const termsOf = (q: string) => q.trim().toLowerCase().split(/\s+/).filter(Boolean)
const initials = (id: string) =>
  id
    .split(/[-_\s]+/)
    .map((s) => s[0] ?? '')
    .join('')
    .slice(0, 3)

// Each word must match somewhere; where it matches sets how high the item ranks.
function score(item: CommandSearchItem, terms: string[], tierWords: string[]) {
  const id = item.id.toLowerCase()
  const title = item.title.toLowerCase()
  const cat = item.category?.toLowerCase() ?? ''
  const text = [item.description, ...(item.keywords ?? [])].join(' ').toLowerCase()
  let total = 0
  for (const w of terms) {
    let k = 0
    if (id.startsWith(w) || title.startsWith(w)) k = 5
    else if (id.includes(w) || title.includes(w)) k = 4
    else if (cat && cat.startsWith(w)) k = 3
    else if (tierWords.some((t) => t === w || (w.length > 2 && t.startsWith(w)))) k = 2
    else if (w.length > 2 && text.includes(w)) k = 1
    if (!k) return 0
    total += k
  }
  return total
}

// The words that find an item by its group or tier, such as "pro".
const groupWords = (item: CommandSearchItem, tierWords: string[]) =>
  [item.group.toLowerCase(), item.tier ? tierWords[item.tier === 'free' ? 0 : 1] : ''].filter(Boolean)

const countHits = (items: CommandSearchItem[], q: string, tierWords: string[]) => {
  const terms = termsOf(q)
  return items.filter((i) => score(i, terms, groupWords(i, tierWords))).length
}

// A long command breaks between words first, then after a slash. Each piece is kept whole (so flux-image or
// --header never splits at its hyphen) unless it is wider than the line on its own.
const breakable = (s: string) =>
  s.split(/( +)/).map((word, w) =>
    word.trim() ? (
      <Fragment key={w}>
        {word.split(/(?<=\/)(?!\/)/).map((part, i) => (
          <span key={i} className="inline-block max-w-full">
            {part}
          </span>
        ))}
      </Fragment>
    ) : (
      word
    ),
  )

function marked(id: string, terms: string[]) {
  const lower = id.toLowerCase()
  const w = terms.find((t) => lower.includes(t))
  if (!w) return id
  const at = lower.indexOf(w)
  return (
    <>
      {id.slice(0, at)}
      <mark className="bg-transparent text-foreground underline decoration-foreground/40 underline-offset-[3px]">
        {id.slice(at, at + w.length)}
      </mark>
      {id.slice(at + w.length)}
    </>
  )
}

const CAP =
  'bg-muted shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent),inset_0_-1.5px_0_rgb(0_0_0/0.14),0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)] dark:shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent),inset_0_-1.5px_0_rgb(0_0_0/0.5),0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)]'
const WELL =
  'bg-background shadow-[inset_0_1px_2px_rgb(0_0_0/0.08),inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_7%,transparent)] dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.55),inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_6%,transparent)]'
const RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card'
const DOTS =
  'bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_9%,transparent)_1px,transparent_1.3px)] bg-background'

function Kbd({ children, large }: { children: ReactNode; large?: boolean }) {
  return (
    <kbd
      className={cn(
        'inline-grid flex-none place-items-center font-mono leading-none font-medium text-muted-foreground',
        large ? 'h-[26px] min-w-[26px] rounded-[7px] px-1.5 text-xs' : 'h-5 min-w-5 rounded-[5px] px-[5px] text-[11px]',
        CAP,
      )}
    >
      {children}
    </kbd>
  )
}

/** A search field that opens a Cmd+K palette with grouped results and a preview of the active one. */
export function CommandSearch({
  items,
  onSelect,
  renderPreview,
  suggestions,
  shortcuts = true,
  hotkeys = true,
  limit = 8,
  initialLimit = 5,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  query: queryProp,
  defaultQuery = '',
  onQueryChange,
  action,
  name = 'q',
  labels = {},
  className,
}: CommandSearchProps) {
  const L = {
    placeholder: 'Search components',
    searchLabel: 'Search',
    triggerHint: 'When you type here, the search opens in a dialog with the results.',
    or: 'or',
    dialog: 'Search',
    inputPlaceholder: 'Name, category, free or pro',
    close: 'Close search',
    results: 'Results',
    preview: 'Preview',
    free: 'Free',
    pro: 'Pro',
    new: 'New',
    groupCount: '{shown} of {total}',
    groupHits: '{shown} of {total} hits',
    total: '{count} in total',
    hitsOf: '{count} hits of {total}',
    hits: '{count} hits',
    hit: '{count} hit',
    noneTitle: 'Nothing matches “{query}”',
    noneText: 'Try a shorter word, or one of these:',
    noneTextAlone: 'Try a shorter word.',
    noneLive: 'Nothing matches {query}.',
    suggestions: 'Suggestions',
    empty: 'Nothing to search yet.',
    keySelect: 'select',
    keyOpen: 'open',
    keyCopy: 'copy install',
    keyClose: 'close',
    copied: 'Copied: {id}',
    copyFailed: 'Could not copy',
    ...labels,
  }

  const [ownOpen, setOwnOpen] = useState(defaultOpen)
  const isOpen = openProp ?? ownOpen
  const setOpen = (v: boolean) => {
    setOwnOpen(v)
    onOpenChange?.(v)
  }
  const [ownQuery, setOwnQuery] = useState(defaultQuery)
  const query = queryProp ?? ownQuery
  const setQuery = (v: string) => {
    setOwnQuery(v)
    onQueryChange?.(v)
  }

  const [active, setActive] = useState(0)
  const [live, setLive] = useState('')
  const [toast, setToast] = useState<{ text: ReactNode; on: boolean }>({ text: '', on: false })
  const reduced = useReducedMotion()
  const mac = useSyncExternalStore(noop, isMac, () => true)

  const fieldId = useId()
  const hintId = useId()
  const listId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const fieldRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const mode = useRef<Mode>('pointer')
  const returnTo = useRef<HTMLElement | null>(null)
  const pressedOn = useRef<EventTarget | null>(null)
  const closing = useRef(false)
  const scrollToActive = useRef(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // ── Results ──
  const tierWords = useMemo(() => [L.free.toLowerCase(), L.pro.toLowerCase()], [L.free, L.pro])
  const terms = useMemo(() => termsOf(query), [query])
  const searching = terms.length > 0

  const { groups, options, found } = useMemo(() => {
    const byGroup = new Map<string, { hits: Hit[]; size: number }>()
    items.forEach((item, index) => {
      const g = byGroup.get(item.group) ?? { hits: [], size: 0 }
      g.size++
      const s = searching ? score(item, terms, groupWords(item, tierWords)) : 1
      if (s) g.hits.push({ item, score: s, index })
      byGroup.set(item.group, g)
    })
    const cap = searching ? limit : initialLimit
    const groups: { label: string; shown: CommandSearchItem[]; matched: number; size: number }[] = []
    let found = 0
    for (const [label, g] of byGroup) {
      found += g.hits.length
      if (!g.hits.length) continue
      g.hits.sort((a, b) => b.score - a.score || a.index - b.index)
      groups.push({ label, shown: g.hits.slice(0, cap).map((h) => h.item), matched: g.hits.length, size: g.size })
    }
    return { groups, options: groups.flatMap((g) => g.shown), found }
  }, [items, terms, searching, limit, initialLimit, tierWords])

  const none = options.length === 0
  const current = none ? -1 : Math.min(active, options.length - 1)
  const activeItem = none ? undefined : options[current]
  const anyInstall = items.some((i) => i.install)

  const suggested = useMemo(() => {
    if (!none) return []
    let words: string[]
    if (typeof suggestions === 'function') words = suggestions(query.trim())
    else if (suggestions) words = suggestions
    else {
      const freq = new Map<string, number>()
      for (const i of items) if (i.category) freq.set(i.category, (freq.get(i.category) ?? 0) + 1)
      words = [...freq].sort((a, b) => b[1] - a[1]).map(([c]) => c)
    }
    return [...new Set(words)]
      .map((w) => [w, countHits(items, w, tierWords)] as const)
      .filter(([, n]) => n > 0)
      .slice(0, 4)
  }, [none, suggestions, query, items, tierWords])

  const liveText = !searching
    ? ''
    : none
      ? fillText(L.noneLive, { query: query.trim() })
      : fillText(found === 1 ? L.hit : L.hits, { count: found })

  // ── Opening and closing ──
  const slabVisible = () => {
    const r = formRef.current?.getBoundingClientRect()
    return !!r && r.bottom > 0 && r.top < innerHeight && !matchMedia('(max-width: 720px)').matches
  }

  // `from` is where focus goes back to; the search field when the field itself opened it.
  const openWith = (how: Mode, from?: HTMLElement | null) => {
    if (isOpen) return
    mode.current = how
    returnTo.current = from ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setOpen(true)
  }

  const close = async (how: 'key' | 'pointer') => {
    const d = dialogRef.current
    if (!d?.open || closing.current) return
    closing.current = true
    const runs: Animation[] = []
    if (!reduced && how !== 'key') {
      const opts = { easing: EASE, fill: 'forwards' as const }
      runs.push(scrimRef.current!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, ...opts }))
      if (mode.current === 'lift' && slabVisible()) {
        const s = formRef.current!.getBoundingClientRect()
        const r = rowRef.current!.getBoundingClientRect()
        const k = s.width / r.width
        const dy = s.top + (s.height - r.height * k) / 2 - r.top
        runs.push(
          rowRef.current!.animate(
            [{ transform: 'none' }, { transform: `translate(${s.left - r.left}px, ${dy}px) scale(${k})` }],
            {
              duration: 240,
              ...opts,
            },
          ),
          sheetRef.current!.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-8px)' }], {
            duration: 140,
            ...opts,
          }),
        )
      } else {
        runs.push(
          boxRef.current!.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(4px)' }], {
            duration: 150,
            ...opts,
          }),
        )
      }
      await Promise.all(runs.map((a) => a.finished.catch(() => {})))
    }
    if (formRef.current) delete formRef.current.dataset.lifted
    d.close()
    runs.forEach((a) => a.cancel())
    closing.current = false
  }

  // Show or hide the dialog when `open` changes, and play the way in.
  useLayoutEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (isOpen && !d.open) {
      returnTo.current ??= document.activeElement instanceof HTMLElement ? document.activeElement : null
      d.showModal()
      const input = inputRef.current
      input?.focus()
      input?.setSelectionRange(input.value.length, input.value.length)
      if (reduced || mode.current === 'key') return
      const opts = { easing: EASE }
      scrimRef.current!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, ...opts })
      if (mode.current === 'lift' && slabVisible()) {
        // The field rises out of the page into the palette, and the results unfold under it.
        const s = formRef.current!.getBoundingClientRect()
        const r = rowRef.current!.getBoundingClientRect()
        const k = s.width / r.width
        const dy = s.top + (s.height - r.height * k) / 2 - r.top
        formRef.current!.dataset.lifted = ''
        rowRef.current!.animate(
          [{ transform: `translate(${s.left - r.left}px, ${dy}px) scale(${k})` }, { transform: 'none' }],
          {
            duration: 300,
            ...opts,
          },
        )
        sheetRef.current!.animate(
          [
            { opacity: 0, transform: 'translateY(-10px)', filter: 'blur(4px)' },
            { opacity: 1, transform: 'none', filter: 'blur(0px)' },
          ],
          { duration: 260, delay: 40, fill: 'backwards', ...opts },
        )
      } else if (matchMedia('(max-width: 720px)').matches) {
        boxRef.current!.animate(
          [
            { opacity: 0, transform: 'translateY(16px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 260, ...opts },
        )
      } else {
        boxRef.current!.animate(
          [
            { opacity: 0, transform: 'translateY(8px) scale(.98)' },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: 220,
            ...opts,
          },
        )
      }
    } else if (!isOpen && d.open) {
      d.close()
    }
    // Nothing to do when only `reduced` changes: it is read at the moment the palette opens.
  }, [isOpen, reduced])

  // After the dialog has closed, by any route: tell the owner, put the field back and return focus.
  const onClosed = () => {
    if (formRef.current) delete formRef.current.dataset.lifted
    const from = returnTo.current
    returnTo.current = null
    mode.current = 'pointer'
    if (isOpen) setOpen(false)
    // The browser usually puts focus back itself, and onSelect may have moved it on purpose: leave that alone.
    const now = document.activeElement
    if (now && now !== document.body && !dialogRef.current?.contains(now)) return
    const field = fieldRef.current
    const back = !from || from === document.body || from === field || !from.isConnected ? field : from
    back?.focus({ preventScroll: true })
  }

  const choose = (item: CommandSearchItem) => {
    const d = dialogRef.current
    if (d?.open) d.close()
    if (onSelect) onSelect(item)
    else if (item.href) {
      const url = safeHref(item.href)
      if (url) window.location.assign(url)
    }
  }

  const showToast = (text: ReactNode) => {
    clearTimeout(toastTimer.current)
    setToast({ text, on: true })
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, on: false })), 2200)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const copyInstall = async (item: CommandSearchItem) => {
    if (!item.install) return
    try {
      await navigator.clipboard.writeText(item.install)
      showToast(
        fill(L.copied, { id: <code className="font-mono text-[12.5px] text-muted-foreground">{item.id}</code> }),
      )
    } catch {
      showToast(L.copyFailed)
    }
  }

  // Cmd/Ctrl+K anywhere toggles the palette; "/" opens it when single-key shortcuts are on and no field has focus.
  const keys = useRef({ openWith, close, isOpen, shortcuts })
  useLayoutEffect(() => {
    keys.current = { openWith, close, isOpen, shortcuts }
  })
  useEffect(() => {
    if (!hotkeys) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const k = keys.current
      const otherModal = otherDialogOpen(dialogRef.current)
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        if (otherModal) return
        e.preventDefault()
        if (k.isOpen) void k.close('key')
        else k.openWith('key')
        return
      }
      if (!k.shortcuts || k.isOpen || otherModal || e.metaKey || e.ctrlKey || e.altKey || e.key !== '/') return
      const t = e.target
      if (
        t instanceof Element &&
        t.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
      )
        return
      e.preventDefault()
      k.openWith('key')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [hotkeys])

  // Announce the number of hits once typing pauses.
  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => setLive(liveText), 450)
    return () => clearTimeout(t)
  }, [isOpen, liveText])

  // A new query starts the list from the top.
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 })
  }, [query])

  // Keep the active result in view when the keys move it.
  useEffect(() => {
    if (!scrollToActive.current || current < 0) return
    scrollToActive.current = false
    document.getElementById(`${listId}-${current}`)?.scrollIntoView({ block: 'nearest' })
  }, [current, listId])

  const move = (to: number) => {
    if (none) return
    scrollToActive.current = true
    setActive((to + options.length) % options.length)
  }
  const type = (v: string) => {
    setQuery(v)
    setActive(0)
  }

  const onInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    // Enter and the arrows belong to the IME while it is composing (Chinese, Japanese, Korean input).
    if (e.nativeEvent.isComposing) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      move(current + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      move(current - 1)
    } else if (e.key === 'Home' && !query) {
      e.preventDefault()
      move(0)
    } else if (e.key === 'End' && !query) {
      e.preventDefault()
      move(options.length - 1)
    } else if (e.key === 'Enter' && activeItem) {
      e.preventDefault()
      if (e.metaKey || e.ctrlKey) void copyInstall(activeItem)
      else choose(activeItem)
    }
  }

  const keyHint = hotkeys ? (shortcuts ? 'Meta+K Control+K /' : 'Meta+K Control+K') : undefined
  const mod = mac ? '⌘' : 'Ctrl'
  let index = 0

  return (
    <>
      <style href="manniche-command-search" precedence="default">
        {'html:has(dialog[data-slot="command-search-dialog"][open]){overflow:hidden}'}
      </style>

      <form
        ref={formRef}
        role="search"
        aria-label={L.searchLabel}
        action={action}
        method="get"
        data-slot="command-search"
        onSubmit={(e) => {
          e.preventDefault()
          openWith('key', fieldRef.current)
        }}
        // A mouse opens on press, which feels instant; touch opens on the click, so the tap cannot land on the palette.
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button === 0) {
            e.preventDefault()
            openWith('lift', fieldRef.current)
          }
        }}
        onClick={(e) => {
          if (e.detail !== 0) openWith('lift', fieldRef.current)
        }}
        className={cn(
          '@container relative flex h-[72px] cursor-text items-center gap-4 rounded-[18px] pr-3.5 pl-6 data-[lifted]:opacity-0 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring max-[480px]:gap-3 max-[480px]:pl-4',
          'bg-background shadow-[inset_0_2px_8px_rgb(0_0_0/0.08),inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent)] dark:shadow-[inset_0_2px_8px_rgb(0_0_0/0.6),inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_7%,transparent)]',
          className,
        )}
      >
        <Search className="size-[22px] flex-none text-muted-foreground" strokeWidth={1.6} aria-hidden />
        <label htmlFor={fieldId} className="sr-only">
          {L.searchLabel}
        </label>
        <input
          ref={fieldRef}
          id={fieldId}
          name={name}
          type="search"
          value={query}
          onChange={(e) => {
            type(e.target.value)
            openWith('key', fieldRef.current)
          }}
          placeholder={fillText(L.placeholder, { count: items.length })}
          autoComplete="off"
          spellCheck={false}
          aria-haspopup="dialog"
          aria-describedby={hintId}
          aria-keyshortcuts={keyHint}
          className="h-full min-w-0 flex-1 bg-transparent text-[21px] tracking-[-0.012em] text-foreground outline-none placeholder:text-muted-foreground max-[480px]:text-lg [&::-webkit-search-cancel-button]:hidden"
        />
        <span id={hintId} className="sr-only">
          {L.triggerHint}
        </span>
        {hotkeys && (
          <span
            aria-hidden
            className="hidden items-center gap-2.5 text-[13px] leading-none text-muted-foreground [@media(hover:hover)]:@min-[520px]:flex"
          >
            <span className="inline-flex gap-1">
              <Kbd large>{mod}</Kbd>
              <Kbd large>K</Kbd>
            </span>
            {shortcuts && (
              <>
                <span>{L.or}</span>
                <Kbd large>/</Kbd>
              </>
            )}
          </span>
        )}
      </form>

      <dialog
        ref={dialogRef}
        data-slot="command-search-dialog"
        aria-label={L.dialog}
        onCancel={(e) => {
          e.preventDefault()
          void close('key')
        }}
        onClose={onClosed}
        onPointerDown={(e) => {
          pressedOn.current = e.target
        }}
        onClick={(e) => {
          // A text selection dragged out of the field ends on the scrim: that is not a click outside.
          const outside = (t: EventTarget | null) => t === scrimRef.current || t === dialogRef.current
          if (outside(e.target) && (e.detail === 0 || outside(pressedOn.current)))
            void close(e.detail === 0 ? 'key' : 'pointer')
        }}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-foreground backdrop:bg-transparent"
      >
        <div ref={scrimRef} className="absolute inset-0 bg-black/45 dark:bg-black/80" />
        <div
          ref={boxRef}
          className="absolute inset-x-0 top-[min(12vh,120px)] mx-auto flex w-[min(920px,calc(100vw-96px))] flex-col max-[720px]:inset-y-0 max-[720px]:w-full"
        >
          <div
            ref={rowRef}
            className="relative z-[1] flex h-[68px] origin-top-left items-center gap-3.5 rounded-t-[20px] bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))] pr-3 pl-[22px] shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_6%,transparent),0_0_0_1px_color-mix(in_oklab,var(--foreground)_14%,transparent)] has-[input:focus-visible]:shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_6%,transparent),inset_0_-2px_0_var(--color-ring),0_0_0_1px_color-mix(in_oklab,var(--foreground)_14%,transparent)] max-[720px]:h-16 max-[720px]:rounded-none max-[720px]:pr-1.5 max-[720px]:pl-4"
          >
            <Search className="size-5 flex-none text-muted-foreground" strokeWidth={1.6} aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => type(e.target.value)}
              onKeyDown={onInputKey}
              role="combobox"
              aria-expanded={!none}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeItem ? `${listId}-${current}` : undefined}
              aria-label={L.inputPlaceholder}
              placeholder={L.inputPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="h-full min-w-0 flex-1 bg-transparent text-[19px] tracking-[-0.01em] text-ellipsis text-foreground outline-none placeholder:text-muted-foreground max-[720px]:text-[17px]"
            />
            <button
              type="button"
              aria-label={L.close}
              onClick={(e) => void close(e.detail === 0 ? 'key' : 'pointer')}
              className={cn(
                'inline-flex size-11 flex-none items-center justify-center rounded-[10px] text-muted-foreground hover:bg-muted hover:text-foreground',
                RING,
              )}
            >
              <span className="max-[720px]:hidden">
                <Kbd>esc</Kbd>
              </span>
              <X className="hidden size-5 max-[720px]:block" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
          <p role="status" className="sr-only">
            {live}
          </p>

          <div
            ref={sheetRef}
            className="flex flex-col overflow-hidden rounded-b-[20px] bg-card shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_14%,transparent)] max-[720px]:min-h-0 max-[720px]:flex-1 max-[720px]:rounded-none max-[720px]:shadow-none"
          >
            <div
              className={cn(
                'grid h-[min(460px,62vh)] border-t border-border max-[720px]:h-auto max-[720px]:min-h-0 max-[720px]:flex-1',
                none ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_340px] max-[820px]:grid-cols-1',
              )}
            >
              <div
                ref={listRef}
                id={listId}
                role="listbox"
                aria-label={L.results}
                hidden={none}
                className="overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]"
              >
                {groups.map((g, gi) => (
                  <div key={g.label} role="group" aria-labelledby={`${listId}-g${gi}`} className="pt-0.5 pb-2">
                    <div
                      id={`${listId}-g${gi}`}
                      className="flex items-baseline justify-between gap-3 px-3 pt-3 pb-2 text-[13px] leading-none text-muted-foreground"
                    >
                      <b className="font-medium text-foreground/85">{g.label}</b>
                      <span className="tabular-nums">
                        {fillText(searching ? L.groupHits : L.groupCount, {
                          shown: g.shown.length,
                          total: searching ? g.matched : g.size,
                        })}
                      </span>
                    </div>
                    {g.shown.map((item) => {
                      const i = index++
                      const on = i === current
                      return (
                        <div
                          key={item.id}
                          id={`${listId}-${i}`}
                          role="option"
                          aria-selected={on}
                          onPointerMove={() => i !== current && setActive(i)}
                          onClick={() => choose(item)}
                          className={cn(
                            'group/opt relative grid min-h-[52px] cursor-pointer scroll-m-2 grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-[12px] py-1.5 pr-2.5 pl-3 max-[720px]:min-h-14',
                            on && CAP,
                          )}
                        >
                          <span
                            aria-hidden
                            className="absolute top-3 bottom-3 left-[3px] w-0.5 rounded-full bg-primary opacity-0 group-aria-selected/opt:opacity-100"
                          />
                          {item.poster ? (
                            <img
                              src={item.poster}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="h-[30px] w-12 rounded-[6px] bg-background object-cover outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                            />
                          ) : (
                            <span
                              aria-hidden
                              className={cn(
                                'grid h-[30px] w-12 place-items-center rounded-[6px] bg-[length:6px_6px] font-mono text-[11px] leading-none font-medium tracking-[-0.02em] text-muted-foreground outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
                                DOTS,
                              )}
                            >
                              {initials(item.id)}
                            </span>
                          )}
                          <span className="grid min-w-0 gap-[3px]">
                            <span className="truncate text-[15px] leading-[1.3] text-foreground">{item.title}</span>
                            <span className="truncate font-mono text-xs leading-[1.3] text-muted-foreground">
                              {marked(item.id, terms)}
                            </span>
                          </span>
                          <span className="flex gap-1.5">
                            {item.category && <Badge className="max-[480px]:hidden">{item.category}</Badge>}
                            {item.tier && <Badge variant={item.tier}>{item.tier === 'pro' ? L.pro : L.free}</Badge>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {none ? (
                <div className="grid content-center justify-items-center gap-2.5 overflow-y-auto px-6 py-12 text-center">
                  {items.length === 0 ? (
                    <p className="text-[15px] text-muted-foreground">{L.empty}</p>
                  ) : (
                    <>
                      <p className="max-w-full font-serif text-2xl leading-[1.2] tracking-[-0.015em] text-balance text-foreground [overflow-wrap:anywhere]">
                        {fill(L.noneTitle, { query: query.trim() })}
                      </p>
                      <p className="max-w-[46ch] text-[15px] leading-[1.55] text-pretty text-muted-foreground">
                        {suggested.length ? L.noneText : L.noneTextAlone}
                      </p>
                      {suggested.length > 0 && (
                        <div
                          role="group"
                          aria-label={L.suggestions}
                          className="mt-1.5 flex flex-wrap justify-center gap-1.5"
                        >
                          {suggested.map(([word, n]) => (
                            <button
                              key={word}
                              type="button"
                              onClick={() => {
                                type(word)
                                inputRef.current?.focus()
                              }}
                              className={cn(
                                'inline-flex h-11 items-center gap-[7px] rounded-[10px] px-3.5 font-mono text-[12.5px] leading-none font-medium text-foreground transition-transform duration-100 ease-out-quint active:translate-y-px motion-reduce:transition-none',
                                CAP,
                                RING,
                              )}
                            >
                              {word}
                              <span className="text-muted-foreground tabular-nums">{n}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <section
                  aria-label={L.preview}
                  className="flex min-h-0 flex-col gap-3.5 overflow-hidden border-l border-border p-4 max-[820px]:hidden"
                >
                  {activeItem &&
                    (renderPreview ? (
                      renderPreview(activeItem)
                    ) : (
                      <>
                        {activeItem.poster ? (
                          <img
                            src={activeItem.poster}
                            alt=""
                            className="aspect-[16/10] min-h-0 w-full shrink rounded-[12px] bg-background object-cover outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                          />
                        ) : (
                          <div
                            aria-hidden
                            className={cn(
                              'flex aspect-[16/10] min-h-0 w-full shrink items-end rounded-[12px] bg-[length:12px_12px] p-3.5 outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
                              DOTS,
                            )}
                          >
                            <span className="font-mono text-2xl leading-[1.05] font-medium tracking-[-0.04em] break-words text-foreground/85">
                              {activeItem.id}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-serif text-2xl leading-[1.15] tracking-[-0.015em] text-foreground">
                            {activeItem.title}
                          </p>
                          {activeItem.description && (
                            <p className="mt-2 line-clamp-4 text-sm leading-[1.55] text-pretty text-muted-foreground">
                              {activeItem.description}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeItem.category && <Badge>{activeItem.category}</Badge>}
                          {activeItem.isNew && <Badge variant="new">{L.new}</Badge>}
                          {activeItem.tier && (
                            <Badge variant={activeItem.tier}>{activeItem.tier === 'pro' ? L.pro : L.free}</Badge>
                          )}
                        </div>
                        {activeItem.install && (
                          <p
                            className={cn(
                              'mt-auto rounded-[10px] px-3 py-2.5 font-mono text-[11.5px] leading-normal text-foreground/85 [overflow-wrap:anywhere]',
                              WELL,
                            )}
                          >
                            <span className="text-muted-foreground">
                              {activeItem.install.slice(0, activeItem.install.lastIndexOf(' ') + 1)}
                            </span>
                            {breakable(activeItem.install.slice(activeItem.install.lastIndexOf(' ') + 1))}
                          </p>
                        )}
                      </>
                    ))}
                </section>
              )}
            </div>

            <div
              aria-hidden
              className="flex h-12 items-center gap-5 border-t border-border px-4 text-[13px] leading-none whitespace-nowrap text-muted-foreground max-[720px]:hidden"
            >
              <span className={cn('inline-flex items-center gap-[7px]', none && 'opacity-40')}>
                <span className="inline-flex gap-1">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                </span>
                {L.keySelect}
              </span>
              <span className={cn('inline-flex items-center gap-[7px]', none && 'opacity-40')}>
                <Kbd>↵</Kbd>
                {L.keyOpen}
              </span>
              {anyInstall && (
                <span className={cn('inline-flex items-center gap-[7px]', none && 'opacity-40')}>
                  <span className="inline-flex gap-1">
                    <Kbd>{mod}</Kbd>
                    <Kbd>↵</Kbd>
                  </span>
                  {L.keyCopy}
                </span>
              )}
              <span className="inline-flex items-center gap-[7px]">
                <Kbd>esc</Kbd>
                {L.keyClose}
              </span>
              <span className="ml-auto tabular-nums">
                {searching
                  ? fillText(L.hitsOf, { count: found, total: items.length })
                  : fillText(L.total, { count: items.length })}
              </span>
            </div>
          </div>
        </div>

        <div
          role="status"
          className={cn(
            'pointer-events-none fixed bottom-7 left-1/2 z-10 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2.5 rounded-[12px] px-4 py-3 text-sm text-foreground transition-[opacity,translate] duration-200 ease-out-quint motion-reduce:transition-none',
            CAP,
            'bg-card',
            toast.on ? 'translate-y-0 opacity-100' : 'translate-y-2.5 opacity-0',
          )}
        >
          {toast.on && toast.text}
        </div>
      </dialog>
    </>
  )
}
