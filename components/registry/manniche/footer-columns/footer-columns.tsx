// The classic site footer in the Tiles language: a brand block, three to five link columns, a newsletter tile and a
// legal row. Signature: the newsletter sits in its own tile beside the columns; on narrow boxes the columns go two-up
// and the newsletter tile comes first. It adapts to the box it sits in (container queries), not the viewport.
// Screen readers get a <footer> landmark, one <nav> with a list per column (each under an h3), a labelled email form
// whose errors are linked to the field, and a status region that announces the sent state. The ©-year is computed
// after mount unless `now` is passed, so the first render is pure. Under reduced motion nothing animates.
import { ArrowRight, Check, Globe } from 'lucide-react'
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ComponentPropsWithoutRef, type FormEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type FooterLink = {
  label: string
  href: string
  /** Opens in a new tab with rel="noopener noreferrer" and a hidden "(opens in a new tab)". */
  external?: boolean
}

export type FooterColumn = {
  /** The column heading, e.g. "Product". */
  title: string
  links: FooterLink[]
}

export type FooterNewsletter = {
  /** The tile heading. */
  title: string
  /** One sentence on what people get and how often. */
  description: string
  /** Called with the trimmed email when the form is valid. Reject to show the error state. Nothing is sent otherwise. */
  onSubmit?: (email: string) => Promise<void> | void
  /** Fine print under the form, e.g. a privacy link. */
  note?: ReactNode
}

export type FooterRegion = {
  /** Read aloud for the select, e.g. "Language". */
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

export type FooterColumnsLabels = {
  navigation?: string
  email?: string
  subscribe?: string
  subscribing?: string
  invalidEmail?: string
  emptyEmail?: string
  failed?: string
  sentTitle?: string
  sentBody?: string
  useAnother?: string
  newTab?: string
}

export type FooterColumnsProps = Omit<ComponentPropsWithoutRef<'footer'>, 'children'> & {
  /** The wordmark or logo. Rendered as given; wrap it in a link yourself if it should go home. */
  brand: ReactNode
  /** One line on what the company does. */
  description?: ReactNode
  /** Three to five link columns. */
  columns: FooterColumn[]
  /** The newsletter tile. Leave out to drop the tile and let the columns take the width. */
  newsletter?: FooterNewsletter
  /** The name after the © sign, e.g. "Halden Studio". */
  owner: string
  /** Legal links: privacy, terms, imprint. */
  legalLinks?: FooterLink[]
  /** A language or region select at the end of the legal row. */
  region?: FooterRegion
  /** Pins the © year and keeps the first render pure. When absent the year appears after mount. */
  now?: Date
  /** UI strings, for translation. */
  labels?: FooterColumnsLabels
}

const DEFAULT_LABELS: Required<FooterColumnsLabels> = {
  navigation: 'Footer',
  email: 'Email address',
  subscribe: 'Subscribe',
  subscribing: 'Subscribing',
  invalidEmail: 'That email does not look right. Check it for a typo, like name@example.com.',
  emptyEmail: 'Enter your email address, like name@example.com.',
  failed: 'We could not sign you up just now. Check your connection and try again.',
  sentTitle: 'You are on the list.',
  sentBody: 'We will write to',
  useAnother: 'Use another address',
  newTab: '(opens in a new tab)',
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// The page's ring colour, drawn inside the link's own box so a tile never clips it.
const LINK =
  'relative inline-flex min-h-11 items-center rounded-md text-sm text-muted-foreground transition-[color] duration-200 ease-out-quint hover:text-foreground focus-visible:text-foreground focus-visible:outline-offset-0'

function FooterAnchor({ link, newTab, className }: { link: FooterLink; newTab: string; className?: string }) {
  return (
    <a
      href={link.href}
      className={cn(LINK, className)}
      {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {link.label}
      {link.external && <span className="sr-only"> {newTab}</span>}
    </a>
  )
}

const noopSubscribe = () => () => {}
// null on the server and in the first client render, the real year once mounted.
function useYear(now?: Date) {
  const clientYear = useSyncExternalStore(noopSubscribe, () => new Date().getFullYear(), () => null)
  return now ? now.getFullYear() : clientYear
}

type Status = 'idle' | 'sending' | 'sent' | 'error'

function NewsletterTile({ data, labels }: { data: FooterNewsletter; labels: Required<FooterColumnsLabels> }) {
  const uid = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const sentRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [sentTo, setSentTo] = useState('')
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (status === 'sent') sentRef.current?.focus()
  }, [status])

  const check = (value: string) => {
    const v = value.trim()
    if (!v) return labels.emptyEmail
    return EMAIL.test(v) ? null : labels.invalidEmail
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (status === 'sending') return
    const problem = check(email)
    setError(problem)
    if (problem) {
      inputRef.current?.focus()
      return
    }
    const value = email.trim()
    setStatus('sending')
    try {
      await data.onSubmit?.(value)
      if (!mounted.current) return
      setSentTo(value)
      setStatus('sent')
    } catch {
      if (!mounted.current) return
      setStatus('error')
    }
  }

  const sent = status === 'sent'
  const errorId = `${uid}-error`
  const shown = error ?? (status === 'error' ? labels.failed : null)

  return (
    <section
      aria-labelledby={`${uid}-title`}
      className="flex min-w-0 flex-col rounded-[calc(var(--radius)*2+2px)] bg-card p-6 text-card-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]"
    >
      <h3
        id={`${uid}-title`}
        className="text-xl leading-[1.15] font-semibold tracking-[-0.02em] text-balance"
        style={{ fontFamily: 'var(--font-display, inherit)' }}
      >
        {data.title}
      </h3>
      <p className="mt-2 text-sm leading-normal text-pretty text-muted-foreground">{data.description}</p>

      {/* Always mounted, so the sent state is announced when it arrives. */}
      <div role="status" ref={sentRef} tabIndex={-1} className="outline-none">
        {sent && (
          <div className="mt-5 flex items-start gap-3 rounded-[14px] bg-muted p-4">
            <span className="mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-foreground text-background">
              <Check className="size-3.5" aria-hidden strokeWidth={2.5} />
            </span>
            <div className="min-w-0 text-sm leading-normal">
              <p className="font-medium">{labels.sentTitle}</p>
              <p className="text-muted-foreground">
                {labels.sentBody} <span className="font-mono text-[13px] break-all text-foreground tabular-nums">{sentTo}</span>.
              </p>
            </div>
          </div>
        )}
      </div>

      {sent ? (
        <button
          type="button"
          onClick={() => {
            setEmail('')
            setError(null)
            setStatus('idle')
            requestAnimationFrame(() => inputRef.current?.focus())
          }}
          className="mt-2 inline-flex min-h-11 w-fit items-center rounded-md text-sm text-muted-foreground underline underline-offset-4 transition-[color] duration-200 ease-out-quint hover:text-foreground"
        >
          {labels.useAnother}
        </button>
      ) : (
        <form noValidate onSubmit={submit} className="mt-5 grid gap-2">
          <label htmlFor={`${uid}-email`} className="text-[13px] font-medium">
            {labels.email}
          </label>
          <div className="flex flex-col gap-2 @min-[26rem]:flex-row @min-[56rem]:flex-col @min-[80rem]:flex-row">
            <input
              ref={inputRef}
              id={`${uid}-email`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              value={email}
              aria-invalid={shown ? true : undefined}
              aria-describedby={shown ? errorId : undefined}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(null)
                if (status === 'error') setStatus('idle')
              }}
              onBlur={() => {
                if (email.trim()) setError(check(email))
              }}
              className={cn(
                'h-11 min-w-0 flex-1 rounded-[14px] border bg-background px-3.5 text-base text-foreground placeholder:text-muted-foreground',
                'transition-[opacity] duration-200',
                shown ? 'border-destructive' : 'border-foreground/25',
              )}
            />
            <button
              type="submit"
              aria-disabled={status === 'sending' || undefined}
              className={cn(
                'inline-flex h-11 flex-none cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground',
                'transition-[opacity,transform] duration-200 ease-out-quint active:scale-[0.97] motion-reduce:transition-none',
                status === 'sending' && 'cursor-progress opacity-70',
              )}
            >
              {status === 'sending' ? labels.subscribing : labels.subscribe}
              {status !== 'sending' && <ArrowRight className="size-4" aria-hidden />}
            </button>
          </div>
          <p
            id={errorId}
            className={cn('text-[13px] leading-snug text-destructive', !shown && 'hidden')}
            role={status === 'error' ? 'alert' : undefined}
          >
            {shown}
          </p>
        </form>
      )}
      {data.note && <div className="mt-3 text-xs leading-normal text-muted-foreground">{data.note}</div>}
    </section>
  )
}

/** A site footer with link columns, a newsletter tile and a legal row. */
export function FooterColumns({
  brand,
  description,
  columns,
  newsletter,
  owner,
  legalLinks = [],
  region,
  now,
  labels,
  className,
  ...rest
}: FooterColumnsProps) {
  const l = { ...DEFAULT_LABELS, ...labels }
  const year = useYear(now)
  const regionId = useId()

  return (
    <footer {...rest} className={cn('@container w-full bg-background text-foreground', className)}>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 @min-[40rem]:py-16 sm:px-6">
        <div
          className={cn(
            'grid gap-x-12 gap-y-10',
            newsletter && '@min-[56rem]:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] @min-[56rem]:items-start',
          )}
        >
          {newsletter && (
            <div className="order-first min-w-0 @min-[56rem]:order-last">
              <NewsletterTile data={newsletter} labels={l} />
            </div>
          )}
          <div className="grid min-w-0 gap-10">
            <div className="max-w-sm">
              <div className="text-lg font-semibold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-display, inherit)' }}>
                {brand}
              </div>
              {description && <p className="mt-3 text-sm leading-normal text-pretty text-muted-foreground">{description}</p>}
            </div>
            <nav aria-label={l.navigation}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-8 @min-[40rem]:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]">
                {columns.map((col) => (
                  <div key={col.title} className="min-w-0">
                    <h3 className="font-mono text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">{col.title}</h3>
                    <ul className="mt-2">
                      {col.links.map((link) => (
                        <li key={link.href + link.label}>
                          <FooterAnchor link={link} newTab={l.newTab} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-x-8 gap-y-2 border-t border-border pt-4 @min-[40rem]:flex-row @min-[40rem]:items-center @min-[40rem]:justify-between">
          <div className="flex min-w-0 flex-col gap-x-6 @min-[40rem]:flex-row @min-[40rem]:items-center">
            <p className="min-h-11 content-center font-mono text-xs text-muted-foreground tabular-nums">
              &copy; {year ?? ''}
              {year ? ' ' : ''}
              {owner}
            </p>
            {legalLinks.length > 0 && (
              <ul className="flex flex-wrap gap-x-5">
                {legalLinks.map((link) => (
                  <li key={link.href + link.label}>
                    <FooterAnchor link={link} newTab={l.newTab} className="text-[13px]" />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {region && (
            <div className="relative flex w-fit items-center">
              <label htmlFor={regionId} className="sr-only">
                {region.label}
              </label>
              <Globe className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden />
              <select
                id={regionId}
                value={region.value}
                onChange={(e) => region.onChange(e.target.value)}
                className="h-11 cursor-pointer rounded-full border border-foreground/25 bg-background pr-4 pl-9 text-[13px] text-foreground"
              >
                {region.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
