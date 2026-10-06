// A footer for products: how the service is doing right now, which version you are on, a few links, and a way
// back to the top. Signature: the status chip, which says it in words and a distinct shape (never colour alone)
// and carries a mono "Updated 14:20" that you pass in.
// Screen readers: a <footer> with a visually hidden h2; the chip is a polite status region ("Operational. Updated
// 14:20"); links are a real list. The back-to-top button scrolls and then moves focus to `focusTarget`, so the
// next Tab starts at the top of the page, not where the footer was.
// Reduced motion: the scroll is instant, the press feedback is dropped.
import { ArrowUp, CircleAlert, CircleCheck, CircleX } from 'lucide-react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'

export type ServiceStatus = 'operational' | 'degraded' | 'outage'

export type FooterStatusLink = {
  label: string
  href: string
  /** Opens in a new tab with `rel="noopener noreferrer"` and a hidden "(opens in a new tab)". */
  external?: boolean
}

export type FooterStatusProps = Omit<ComponentPropsWithoutRef<'footer'>, 'children'> & {
  /** How the service is doing. */
  status: ServiceStatus
  /** When the status was last checked, as text you format: "14:20". Shown in mono after "Updated". */
  updated?: string
  /** Where the full status page lives. Makes the chip a link. */
  statusHref?: string
  /** The running version, and the changelog it links to. */
  version?: { label: string; href: string }
  /** A short list of links. */
  links?: FooterStatusLink[]
  /** The id of the element at the top of the page that receives focus after "Back to top". */
  focusTarget?: string
  /** A quiet line at the end: © and the like. */
  legal?: ReactNode
  /** Interface strings, for translation. */
  labels?: {
    /** Hidden heading of the footer. */
    heading?: string
    operational?: string
    degraded?: string
    outage?: string
    updated?: string
    version?: string
    backToTop?: string
    /** Hidden text after an external link. */
    newTab?: string
    linksLabel?: string
  }
}

const L = {
  heading: 'Product status and links',
  operational: 'All systems operational',
  degraded: 'Degraded performance',
  outage: 'Service outage',
  updated: 'Updated',
  version: 'Version',
  backToTop: 'Back to top',
  newTab: '(opens in a new tab)',
  linksLabel: 'Product links',
}

const ICON = { operational: CircleCheck, degraded: CircleAlert, outage: CircleX }
// The colour only supports the icon and the words. Honey is weak on a light card, so the text stays foreground.
const DOT = { operational: 'text-success', degraded: 'text-chart-2', outage: 'text-destructive' }

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export function FooterStatus({ status, updated, statusHref, version, links = [], focusTarget, legal, labels, className, ...rest }: FooterStatusProps) {
  const t = { ...L, ...labels }
  const Icon = ICON[status]

  const toTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    const target = focusTarget ? document.getElementById(focusTarget) : null
    if (target) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    }
  }

  const chip = (
    <>
      <Icon aria-hidden className={cn('size-4 flex-none', DOT[status])} />
      <span className="text-sm font-medium">{t[status]}</span>
      {updated && (
        <span className="font-mono text-[12px] text-muted-foreground tabular-nums">
          {t.updated} {updated}
        </span>
      )}
    </>
  )
  const chipClass = 'inline-flex min-h-11 max-w-full flex-wrap items-center gap-x-2.5 gap-y-0.5 rounded-full bg-muted px-4 py-1.5'

  return (
    <footer className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)} {...rest}>
      <h2 className="sr-only">{t.heading}</h2>
      <div className="@container">
        <DataTile density="compact">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pb-1">
            <div role="status" className="min-w-0">
              {statusHref ? (
                <a href={statusHref} className={cn(chipClass, 'transition-[opacity] duration-200 ease-out-quint hover:opacity-80', focus)}>
                  {chip}
                </a>
              ) : (
                <p className={chipClass}>{chip}</p>
              )}
            </div>

            {version && (
              <a
                href={version.href}
                className={cn('inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm text-muted-foreground transition-[opacity] duration-200 ease-out-quint hover:text-foreground', focus)}
              >
                {t.version}
                <span className="rounded-full border px-2.5 py-0.5 font-mono text-[12px] text-foreground tabular-nums">{version.label}</span>
              </a>
            )}

            {links.length > 0 && (
              <nav aria-label={t.linksLabel} className="min-w-0 @min-[48rem]:ml-auto">
                <ul className="flex flex-wrap gap-x-5">
                  {links.map((l) => (
                    <li key={l.href + l.label}>
                      <a
                        href={l.href}
                        {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className={cn('inline-flex min-h-11 items-center rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline', focus)}
                      >
                        {l.label}
                        {l.external && <span className="sr-only">{t.newTab}</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <button
              type="button"
              onClick={toTop}
              className={cn(
                'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-[transform] duration-200 ease-out-quint hover:bg-muted active:scale-[0.97] motion-reduce:active:scale-100',
                focus,
                links.length === 0 && '@min-[48rem]:ml-auto',
                links.length > 0 && 'ml-auto',
              )}
            >
              <ArrowUp aria-hidden className="size-4" />
              {t.backToTop}
            </button>
          </div>
        </DataTile>
        {legal && <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-2 pt-5 pb-8 text-[13px] text-muted-foreground">{legal}</div>}
      </div>
    </footer>
  )
}
