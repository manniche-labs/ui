// The one-row footer for apps and docs: wordmark, inline links, a light / dark / system switch and the © line.
// Signature: it is 56 px tall on a wide box and every control still has a 44 px target. On a narrow box it wraps into
// two centred rows (brand and links, then © and theme) rather than squeezing. It does not touch the DOM theme itself:
// the app owns the theme and passes `theme` and `onThemeChange`. Screen readers get a <footer> landmark, a <nav> list
// for the links, and the theme switch as a labelled radio group (arrow keys, Home and End). The ©-year is computed
// after mount unless `now` is passed. Under reduced motion the switch's pill jumps instead of sliding.
import { useSyncExternalStore, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Pills } from '@/registry/manniche/chart-kit/chart-kit'

export type FooterSlimLink = {
  label: string
  href: string
  /** Opens in a new tab with rel="noopener noreferrer" and a hidden "(opens in a new tab)". */
  external?: boolean
}

export type FooterSlimTheme = 'light' | 'dark' | 'system'

export type FooterSlimLabels = {
  navigation?: string
  theme?: string
  light?: string
  dark?: string
  system?: string
  newTab?: string
}

export type FooterSlimProps = Omit<ComponentPropsWithoutRef<'footer'>, 'children'> & {
  /** The wordmark or logo, rendered as given. */
  brand: ReactNode
  /** Inline links: docs, status, privacy. Keep to about five. */
  links?: FooterSlimLink[]
  /** The name after the © sign. */
  owner: string
  /** The current theme choice. The switch only shows when `onThemeChange` is also given. */
  theme?: FooterSlimTheme
  /** Called with the picked theme. Apply it to your app yourself; this footer never touches the DOM. */
  onThemeChange?: (theme: FooterSlimTheme) => void
  /** Pins the © year and keeps the first render pure. When absent the year appears after mount. */
  now?: Date
  /** UI strings, for translation. */
  labels?: FooterSlimLabels
}

const DEFAULT_LABELS: Required<FooterSlimLabels> = {
  navigation: 'Footer',
  theme: 'Theme',
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  newTab: '(opens in a new tab)',
}

const noopSubscribe = () => () => {}
// null on the server and in the first client render, the real year once mounted.
function useYear(now?: Date) {
  const clientYear = useSyncExternalStore(noopSubscribe, () => new Date().getFullYear(), () => null)
  return now ? now.getFullYear() : clientYear
}

/** A one-row footer for apps and docs, with a theme switch. */
export function FooterSlim({ brand, links = [], owner, theme, onThemeChange, now, labels, className, ...rest }: FooterSlimProps) {
  const l = { ...DEFAULT_LABELS, ...labels }
  const year = useYear(now)
  const options = [
    { id: 'light', label: l.light },
    { id: 'dark', label: l.dark },
    { id: 'system', label: l.system },
  ]

  return (
    <footer {...rest} className={cn('@container w-full border-t border-border bg-background text-foreground', className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-1 @min-[56rem]:min-h-14 @min-[56rem]:flex-nowrap @min-[56rem]:justify-between sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-6 @min-[56rem]:justify-start">
          <div className="inline-flex min-h-11 items-center text-[15px] font-semibold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-display, inherit)' }}>
            {brand}
          </div>
          {links.length > 0 && (
            <nav aria-label={l.navigation}>
              <ul className="flex flex-wrap justify-center gap-x-1 @min-[56rem]:justify-start">
                {links.map((link) => (
                  <li key={link.href + link.label}>
                    <a
                      href={link.href}
                      {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="relative inline-flex min-h-11 items-center rounded-md px-2 text-[13px] text-muted-foreground transition-[color] duration-200 ease-out-quint hover:text-foreground focus-visible:text-foreground focus-visible:outline-offset-0"
                    >
                      {link.label}
                      {link.external && <span className="sr-only"> {l.newTab}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
          <p className="min-h-11 content-center font-mono text-xs text-muted-foreground tabular-nums">
            &copy; {year ?? ''}
            {year ? ' ' : ''}
            {owner}
          </p>
          {theme && onThemeChange && (
            <Pills
              label={l.theme}
              options={options}
              value={theme}
              onChange={(id) => onThemeChange(id as FooterSlimTheme)}
            />
          )}
        </div>
      </div>
    </footer>
  )
}
