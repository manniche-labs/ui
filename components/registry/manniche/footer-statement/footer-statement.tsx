// A closing statement footer in the Tiles language. Signature: one very large display line in an inverted tile that
// spans the width. The line sets itself to the box with fluid type (a clamp on the container's width) and never breaks
// inside a word: it wraps between words, balanced, and the smallest size still fits the longest word at 280 px.
// Under the tile sits one quiet row of links and the legal line. The tile has one action, an email address in mono and
// a copy button that says "Copied" in a live region. Screen readers get a <footer> landmark, an h2 for the statement,
// a <nav> list for the links and the copy result announced politely. The ©-year is computed after mount unless `now`
// is passed. Under reduced motion nothing animates (the only motion is a short opacity/transform on press).
import { ArrowUpRight, Check, Copy } from 'lucide-react'
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'

export type FooterStatementLink = {
  label: string
  href: string
  /** Opens in a new tab with rel="noopener noreferrer" and a hidden "(opens in a new tab)". */
  external?: boolean
}

export type FooterStatementLabels = {
  navigation?: string
  copy?: string
  copied?: string
  failed?: string
  emailLead?: string
  newTab?: string
}

export type FooterStatementProps = Omit<ComponentPropsWithoutRef<'footer'>, 'children'> & {
  /** The statement, one sentence, e.g. "Let's make the next one together." */
  headline: string
  /** The one primary action beside the email, e.g. "Start a project". */
  action: FooterStatementLink
  /** The email address shown in mono with a mailto link and a copy button. */
  email?: string
  /** A quiet row of links under the tile. */
  links?: FooterStatementLink[]
  /** The name after the © sign. */
  owner: string
  /** Legal links on the last line: privacy, terms, imprint. */
  legalLinks?: FooterStatementLink[]
  /** Pins the © year and keeps the first render pure. When absent the year appears after mount. */
  now?: Date
  /** UI strings, for translation. */
  labels?: FooterStatementLabels
}

const DEFAULT_LABELS: Required<FooterStatementLabels> = {
  navigation: 'Footer',
  copy: 'Copy',
  copied: 'Copied',
  failed: 'Not copied',
  emailLead: 'Or write to',
  newTab: '(opens in a new tab)',
}

const noopSubscribe = () => () => {}
// null on the server and in the first client render, the real year once mounted.
function useYear(now?: Date) {
  const clientYear = useSyncExternalStore(noopSubscribe, () => new Date().getFullYear(), () => null)
  return now ? now.getFullYear() : clientYear
}

const QUIET =
  'relative inline-flex min-h-11 items-center rounded-md text-[13px] text-muted-foreground transition-[color] duration-200 ease-out-quint hover:text-foreground focus-visible:text-foreground focus-visible:outline-offset-0'

function Anchor({ link, newTab, className }: { link: FooterStatementLink; newTab: string; className?: string }) {
  return (
    <a href={link.href} className={className} {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {link.label}
      {link.external && <span className="sr-only"> {newTab}</span>}
    </a>
  )
}

type CopyState = 'idle' | 'copied' | 'failed'

function EmailCopy({ email, labels }: { email: string; labels: Required<FooterStatementLabels> }) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(email)
      setState('copied')
    } catch {
      setState('failed')
    }
    timer.current = setTimeout(() => setState('idle'), 1800)
  }

  const text = { idle: labels.copy, copied: labels.copied, failed: labels.failed }[state]
  const Icon = state === 'copied' ? Check : Copy
  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-11 min-w-[5.75rem] cursor-pointer items-center justify-center gap-2 rounded-full border border-border px-4 text-[13px] font-medium text-foreground transition-[opacity,transform] duration-200 ease-out-quint hover:opacity-80 active:scale-[0.97] motion-reduce:transition-none"
      >
        <Icon className="size-3.5" aria-hidden />
        {/* The visible word is the same text the live region announces. */}
        <span aria-hidden>{text}</span>
        <span className="sr-only">
          {labels.copy} {email}
        </span>
      </button>
      <span role="status" className="sr-only">
        {state === 'idle' ? '' : text}
      </span>
    </>
  )
}

/** A closing statement in an inverted tile with one action, then a quiet row of links and the legal line. */
export function FooterStatement({
  headline,
  action,
  email,
  links = [],
  owner,
  legalLinks = [],
  now,
  labels,
  className,
  ...rest
}: FooterStatementProps) {
  const l = { ...DEFAULT_LABELS, ...labels }
  const year = useYear(now)
  const headingId = useId()

  return (
    <footer {...rest} aria-labelledby={headingId} className={cn('@container w-full bg-background text-foreground', className)}>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 @min-[40rem]:py-16 sm:px-6">
        <DataTile inverted>
          <div className="flex flex-col gap-10 py-4 @min-[40rem]:gap-14 @min-[40rem]:px-4 @min-[40rem]:py-8">
            <h2
              id={headingId}
              // Fluid: 11 % of the box's width, never below 36 px (the longest word still fits at 280 px) nor above 128 px.
              className="max-w-[16ch] leading-[0.98] font-extrabold tracking-[-0.045em] text-balance [hyphens:none] [overflow-wrap:normal] [word-break:normal]"
              style={{ fontFamily: 'var(--font-display, inherit)', fontStretch: '86%', fontSize: 'clamp(2.25rem, 11cqi, 8rem)' }}
            >
              {headline}
            </h2>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <a
                href={action.href}
                {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group/action inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition-[opacity,transform] duration-200 ease-out-quint hover:opacity-90 active:scale-[0.97] motion-reduce:transition-none"
              >
                {action.label}
                {action.external && <span className="sr-only"> {l.newTab}</span>}
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
              {email && (
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm text-muted-foreground">{l.emailLead}</span>
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex min-h-11 items-center rounded-md font-mono text-sm break-all underline decoration-border underline-offset-4 transition-[opacity] duration-200 hover:opacity-80"
                  >
                    {email}
                  </a>
                  <EmailCopy email={email} labels={l} />
                </div>
              )}
            </div>
          </div>
        </DataTile>

        <div className="mt-4 flex flex-col gap-x-8 gap-y-1 px-1 @min-[40rem]:flex-row @min-[40rem]:items-center @min-[40rem]:justify-between @min-[40rem]:px-2">
          {links.length > 0 && (
            <nav aria-label={l.navigation}>
              <ul className="flex flex-wrap gap-x-6">
                {links.map((link) => (
                  <li key={link.href + link.label}>
                    <Anchor link={link} newTab={l.newTab} className={QUIET} />
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div className="flex flex-wrap items-center gap-x-5">
            <p className="min-h-11 content-center font-mono text-xs text-muted-foreground tabular-nums">
              &copy; {year ?? ''}
              {year ? ' ' : ''}
              {owner}
            </p>
            {legalLinks.length > 0 && (
              <ul className="flex flex-wrap gap-x-5">
                {legalLinks.map((link) => (
                  <li key={link.href + link.label}>
                    <Anchor link={link} newTab={l.newTab} className={QUIET} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
