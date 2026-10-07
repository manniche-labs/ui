// Based on Watermelon UI's “Integration card” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten as a list of rows that open into a detail card, with no brand icons.
import { Check, Plus, X } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Integration = {
  id: string
  name: string
  description: string
  icon: ReactNode
  tags?: string[]
  /** Short lines shown in the open card, e.g. what it listens for and what it does. */
  triggers?: string[]
  actions?: string[]
  connected?: boolean
}

export type IntegrationCardProps = {
  /** The heading of the list, also the name of the card. Default “Integrations”. */
  title?: string
  /** The integrations to list; each row opens into a detail dialog. */
  items: Integration[]
  /** Called with the item id and the new state when the connect button is pressed. The state changes once the returned promise resolves. */
  onConnectChange?: (id: string, connected: boolean) => Promise<void> | void
  /** The text on the button that connects an integration. Default “Connect”. */
  connectLabel?: string
  /** The text on the badge of a connected row. Default “Connected”. */
  connectedLabel?: string
  /** The text on the button that disconnects an integration. Default “Disconnect”. */
  disconnectLabel?: string
  /** The heading above the triggers list in the dialog. Default “Triggers”. */
  triggersLabel?: string
  /** The heading above the actions list in the dialog. Default “Actions”. */
  actionsLabel?: string
  /** The accessible name of the close button in the dialog. Default “Close”. */
  closeLabel?: string
  /** Classes for the outer section. */
  className?: string
}

/** A list of integrations. Each row opens into a card with what it does and a connect button. */
export function IntegrationCard({
  title = 'Integrations',
  items,
  onConnectChange,
  connectLabel = 'Connect',
  connectedLabel = 'Connected',
  disconnectLabel = 'Disconnect',
  triggersLabel = 'Triggers',
  actionsLabel = 'Actions',
  closeLabel = 'Close',
  className,
}: IntegrationCardProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [state, setState] = useState(() => Object.fromEntries(items.map((i) => [i.id, !!i.connected])))
  const [busy, setBusy] = useState<string | null>(null)
  const base = useId()
  const rows = useRef<Record<string, HTMLButtonElement | null>>({})
  const closeRef = useRef<HTMLButtonElement>(null)
  const open = items.find((i) => i.id === openId)

  // Focus moves into the card when it opens. It depends on the id, so a parent re-render never pulls focus back.
  useEffect(() => {
    if (openId) closeRef.current?.focus()
  }, [openId])

  // The card sits inline with the page, so it is a non-modal dialog: Tab moves on as usual, and Escape closes it.
  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    close()
  }

  const close = () => {
    const id = openId
    setOpenId(null)
    if (id) requestAnimationFrame(() => rows.current[id]?.focus())
  }

  const toggle = async (id: string) => {
    const next = !state[id]
    setBusy(id)
    try {
      await onConnectChange?.(id, next)
      setState((s) => ({ ...s, [id]: next }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
      <motion.section
        layout
        className={cn('relative w-full max-w-md overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-sm', className)}
        aria-label={title}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!open ? (
            <motion.div key="list" layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="px-5 pt-5 pb-2 text-sm font-semibold">{title}</h3>
              <ul className="p-2">
                {items.map((it) => (
                  <li key={it.id}>
                    <button
                      ref={(el) => {
                        rows.current[it.id] = el
                      }}
                      type="button"
                      onClick={() => setOpenId(it.id)}
                      aria-haspopup="dialog"
                      className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors duration-150 hover:bg-muted/60"
                    >
                      <motion.span
                        layoutId={`${base}-icon-${it.id}`}
                        className="grid size-10 shrink-0 place-items-center rounded-xl border bg-card shadow-sm [&_svg]:size-5"
                      >
                        {it.icon}
                      </motion.span>
                      <span className="min-w-0 flex-1">
                        <motion.span layoutId={`${base}-name-${it.id}`} className="block w-fit text-sm font-medium">
                          {it.name}
                        </motion.span>
                        <span className="block truncate text-xs text-muted-foreground">{it.description}</span>
                      </span>
                      {state[it.id] && (
                        // The text is pulled towards the text colour, so it keeps 4.5:1 on the green tint in light and dark.
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-[color-mix(in_oklab,var(--success)_75%,var(--foreground))]">
                          <Check className="size-3" strokeWidth={3} aria-hidden />
                          {connectedLabel}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.div
              key={open.id}
              layout="position"
              role="dialog"
              aria-modal="false"
              aria-labelledby={`${base}-title`}
              onKeyDown={onKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col p-5"
            >
              <div className="flex items-start gap-3">
                <motion.span
                  layoutId={`${base}-icon-${open.id}`}
                  className="grid size-12 shrink-0 place-items-center rounded-2xl border bg-card shadow-md [&_svg]:size-6"
                >
                  {open.icon}
                </motion.span>
                <div className="min-w-0 flex-1">
                  <motion.h4 layoutId={`${base}-name-${open.id}`} id={`${base}-title`} className="w-fit font-semibold">
                    {open.name}
                  </motion.h4>
                  <p className="text-sm text-muted-foreground">{open.description}</p>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  aria-label={closeLabel}
                  className="grid size-9 relative after:-inset-1 after:absolute after:content-[''] shrink-0 place-items-center rounded-full hover:bg-muted"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-4 space-y-4">
                {!!open.tags?.length && (
                  <ul className="flex flex-wrap gap-1.5">
                    {open.tags.map((t) => (
                      <li key={t} className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
                {[
                  [triggersLabel, open.triggers],
                  [actionsLabel, open.actions],
                ].map(([label, list]) =>
                  list?.length ? (
                    <div key={label as string}>
                      <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
                      <ul className="space-y-1 text-sm">
                        {(list as string[]).map((l) => (
                          <li key={l} className="flex gap-2">
                            <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" aria-hidden />
                            {l}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )}
              </motion.div>

              <button
                type="button"
                onClick={() => busy !== open.id && toggle(open.id)}
                aria-disabled={busy === open.id}
                aria-busy={busy === open.id}
                className={cn(
                  'mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors duration-150 aria-disabled:opacity-60',
                  state[open.id] ? 'border bg-card hover:bg-muted' : 'bg-foreground text-background hover:bg-foreground/90',
                )}
              >
                {state[open.id] ? <X className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                {state[open.id] ? disconnectLabel : connectLabel}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </MotionConfig>
  )
}
