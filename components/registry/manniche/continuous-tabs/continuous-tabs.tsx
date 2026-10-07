// Based on Watermelon UI's “Continuous tabs” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten as an ARIA tablist with arrow keys.
import { LayoutGroup, MotionConfig, motion } from 'motion/react'
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ContinuousTab = {
  /** Stable key for the tab; this is what `value` and `onChange` carry. */
  id: string
  /** Text on the tab. */
  label: string
  /** Id of a panel you render yourself. It becomes the tab's `aria-controls`; give that panel `role="tabpanel"` and `aria-labelledby` set to the tab's id. */
  panelId?: string
}

export type ContinuousTabsProps = {
  /** The tabs, in order. */
  tabs: ContinuousTab[]
  /** Controlled active tab. */
  value?: string
  /** Tab that is active at the start when the tabs are not controlled. */
  defaultValue?: string
  /** Called with the tab id each time the active tab changes, by click or arrow key. */
  onChange?: (id: string) => void
  /** Read aloud for the whole row, e.g. "Sections". */
  label: string
  /** Base for the tab and panel ids. Tab buttons get `<id>-tab-<tab id>` and the built-in panel `<id>-panel-<tab id>`; a generated id is used when left out. */
  id?: string
  /** Renders the content of the active tab inside a built-in tabpanel that is wired to its tab. */
  children?: (active: string) => ReactNode
  /** Classes for the tab row. */
  className?: string
}

/** Tabs where a pill slides to the one you pick. Arrow keys, Home and End move between them. */
export function ContinuousTabs({ tabs, value, defaultValue, onChange, label, id, children, className }: ContinuousTabsProps) {
  const [own, setOwn] = useState(defaultValue ?? tabs[0]?.id)
  const active = value ?? own
  const group = useId()
  const base = id ?? group
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const pick = (id: string) => {
    setOwn(id)
    onChange?.(id)
  }

  const onKey = (e: KeyboardEvent, i: number) => {
    const n = tabs.length
    const to = ({ ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 } as Record<string, number>)[e.key]
    if (to === undefined) return
    e.preventDefault()
    refs.current[to]?.focus()
    pick(tabs[to].id)
  }

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id={group}>
        <>
        <div role="tablist" aria-label={label} className={cn('inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border bg-card p-1.5 shadow-sm', className)}>
          {tabs.map((tab, i) => {
            const on = tab.id === active
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  refs.current[i] = el
                }}
                id={`${base}-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={children ? (on ? `${base}-panel-${tab.id}` : undefined) : tab.panelId}
                tabIndex={on ? 0 : -1}
                onClick={() => pick(tab.id)}
                onKeyDown={(e) => onKey(e, i)}
                className="relative min-h-11 shrink-0 rounded-xl px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {on && (
                  <motion.span
                    layoutId="pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-foreground"
                  />
                )}
                <span className={cn('relative transition-colors duration-200 motion-reduce:transition-none', on ? 'text-background' : 'text-muted-foreground hover:text-foreground')}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
        {children && active && (
          <div id={`${base}-panel-${active}`} role="tabpanel" aria-labelledby={`${base}-tab-${active}`} tabIndex={0} className="outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {children(active)}
          </div>
        )}
        </>
      </LayoutGroup>
    </MotionConfig>
  )
}
