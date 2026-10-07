// A dense sitemap footer for big sites: 5-7 link groups, a brand block and a region or language picker.
// Signature: on a wide box every group is open and carries a mono count of its links; on a narrow box each group
// folds into a disclosure. The switch follows the width of the footer's own box (a ResizeObserver, not the
// viewport), and before it has been measured (server render) the groups are open, so nothing is hidden from a
// reader without scripts.
// Screen readers: a <footer> with a hidden h2; each group is an h3 (a button with aria-expanded when folded, plain
// text when open) over a real list; the picker is a nav with aria-current on the chosen region.
// Reduced motion: a group fades and lifts in when opened; under reduced motion it just appears. Height jumps by design.
import { ChevronDown } from 'lucide-react'
import { MotionConfig, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'

export type SitemapLink = {
  label: string
  href: string
  /** Opens in a new tab with `rel="noopener noreferrer"` and a hidden "(opens in a new tab)". */
  external?: boolean
}

export type SitemapGroup = {
  /** The group heading: "Product". */
  title: string
  links: SitemapLink[]
}

export type SitemapRegion = {
  /** What the link says: "Deutsch", "Denmark". */
  label: string
  href: string
  /** BCP 47 tag for `hreflang` and `lang` on the link: "de". */
  lang?: string
  /** The one the visitor is on. */
  current?: boolean
}

export type FooterSitemapProps = Omit<ComponentPropsWithoutRef<'footer'>, 'children'> & {
  /** The wordmark or logo slot. */
  brand: ReactNode
  /** One sentence about the site, under the brand. */
  description?: ReactNode
  /** The link groups, in order. Five to seven read best. */
  groups: SitemapGroup[]
  /** Regions or languages, as links. Left out, the picker is left out. */
  regions?: SitemapRegion[]
  /** The legal line: ©, terms, privacy. */
  legal?: ReactNode
  /** Width of the footer's box, in px, below which the groups fold. Default 640. */
  collapseBelow?: number
  /** Groups that start open when folded. Default none. */
  defaultOpen?: string[]
  /** Interface strings, for translation. */
  labels?: {
    /** Hidden heading of the footer. */
    heading?: string
    /** Name of the region picker. */
    regions?: string
    /** Hidden text after an external link. */
    newTab?: string
  }
}

const L = { heading: 'Sitemap', regions: 'Region and language', newTab: '(opens in a new tab)' }

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

/** True when the element's own box is at least `min` px wide. Null until measured. */
function useWide(min: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState<boolean | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= min))
    ro.observe(el)
    return () => ro.disconnect()
  }, [min])
  return [ref, wide] as const
}

function LinkList({ links, newTab }: { links: SitemapLink[]; newTab: string }) {
  return (
    <ul className="grid">
      {links.map((l) => (
        <li key={l.href + l.label}>
          <a
            href={l.href}
            {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className={cn(
              // The row is the 44 px target, so neighbouring targets never overlap.
              'inline-flex h-11 items-center rounded-sm text-[14.5px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline',
              focus,
            )}
          >
            {l.label}
            {l.external && <span className="sr-only"> {newTab}</span>}
          </a>
        </li>
      ))}
    </ul>
  )
}

function Group({ group, folded, open, onToggle, newTab }: { group: SitemapGroup; folded: boolean; open: boolean; onToggle: () => void; newTab: string }) {
  const id = useId()
  const reduce = useReducedMotion()
  const count = (
    <span className="font-mono text-[11px] text-muted-foreground tabular-nums" aria-hidden>
      {String(group.links.length).padStart(2, '0')}
    </span>
  )
  if (!folded) {
    return (
      <div className="min-w-0">
        <h3 className="flex min-h-11 items-center gap-2 text-[15px] font-medium tracking-[-0.01em]">
          {group.title}
          {count}
        </h3>
        <LinkList links={group.links} newTab={newTab} />
      </div>
    )
  }
  return (
    <div className="min-w-0 border-t first:border-t-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className={cn('flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-sm text-left text-[15px] font-medium tracking-[-0.01em]', focus)}
        >
          {group.title}
          {count}
          <ChevronDown
            aria-hidden
            className={cn('ml-auto size-4 flex-none text-muted-foreground transition-[transform] duration-200 ease-out-quint motion-reduce:transition-none', open && 'rotate-180')}
          />
        </button>
      </h3>
      <div id={id} role="region" aria-label={group.title} hidden={!open}>
        {open && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
            className="pb-3"
          >
            <LinkList links={group.links} newTab={newTab} />
          </motion.div>
        )}
      </div>
    </div>
  )
}

export function FooterSitemap({ brand, description, groups, regions, legal, collapseBelow = 640, defaultOpen = [], labels, className, ...rest }: FooterSitemapProps) {
  const t = { ...L, ...labels }
  const [ref, wide] = useWide(collapseBelow)
  const folded = wide === false
  const [open, setOpen] = useState<Set<string>>(() => new Set(defaultOpen))
  const toggle = (title: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (!next.delete(title)) next.add(title)
      return next
    })

  return (
    <footer className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)} {...rest}>
      <h2 className="sr-only">{t.heading}</h2>
      <MotionConfig reducedMotion="user">
        <div ref={ref} className="@container">
          <DataTile>
            <div className="grid gap-8 py-1 @min-[64rem]:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] @min-[64rem]:gap-12">
              <div className="grid content-start gap-3">
                <div className="text-lg font-semibold tracking-tight">{brand}</div>
                {description && <p className="max-w-[34ch] text-sm leading-relaxed text-pretty text-muted-foreground">{description}</p>}
              </div>
              <div
                className={cn(
                  'grid min-w-0',
                  folded ? 'grid-cols-1' : 'grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-x-6 gap-y-6',
                )}
              >
                {groups.map((g) => (
                  <Group key={g.title} group={g} folded={folded} open={open.has(g.title)} onToggle={() => toggle(g.title)} newTab={t.newTab} />
                ))}
              </div>
            </div>

            {(regions?.length || legal) && (
              <div className="mt-8 flex flex-col gap-4 border-t pt-5 @min-[48rem]:flex-row @min-[48rem]:items-center @min-[48rem]:justify-between">
                {regions && regions.length > 0 && (
                  <nav aria-label={t.regions}>
                    {/* 32 px pills + 12 px row gap: the 44 px hit areas of wrapped rows meet without overlapping. */}
                    <ul className="flex flex-wrap gap-x-1.5 gap-y-3">
                      {regions.map((r) => (
                        <li key={r.href + r.label}>
                          <a
                            href={r.href}
                            hrefLang={r.lang}
                            lang={r.lang}
                            aria-current={r.current ? 'true' : undefined}
                            className={cn(
                              'relative inline-flex h-8 min-w-11 items-center justify-center rounded-full px-3 text-[13.5px] underline-offset-4',
                              'before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-[""]',
                              r.current ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground',
                              focus,
                            )}
                          >
                            {r.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
                {legal && <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-muted-foreground">{legal}</div>}
              </div>
            )}
          </DataTile>
        </div>
      </MotionConfig>
    </footer>
  )
}
