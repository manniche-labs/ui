// A "front desk" footer: one inverted tile that puts a person, a way to reach them and the time where they are
// in front of the visitor. Signature: the office clocks, set in mono, which tick on the minute (not on a timer
// that drifts) and say "Same time" when every office is in the same offset.
// Screen readers: a <footer> with one h2, the contact person as plain text, the offices as a list where each time
// is a <time> element. The clocks never announce themselves. Copy results go through a polite live region.
// Reduced motion: the copy icon swaps with opacity only, nothing else moves.
import { ArrowUpRight, Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'

export type DeskOffice = {
  /** The place, as shown: "Munich". */
  city: string
  /** An IANA time zone: "Europe/Berlin". */
  timeZone: string
}

export type FooterDeskProps = Omit<ComponentPropsWithoutRef<'footer'>, 'children'> & {
  /** The display line of the section (the h2): "Talk to a person." */
  heading: ReactNode
  /** One quiet sentence under the heading. */
  description?: ReactNode
  /** The person at the desk. */
  contact: {
    name: string
    role: string
    /** One or two letters for the avatar. Defaults to the initials of the name. */
    initials?: string
    /** Replaces the initials, for a photo. Give it an empty alt: the name is written out next to it. */
    avatar?: ReactNode
  }
  /** The address that gets the copy button. */
  email: string
  /** "Book a call". Left out, the link is left out. */
  bookCall?: { label: string; href: string; external?: boolean }
  /** The offices whose local time is shown, in the order given. */
  offices: DeskOffice[]
  /** The moment to show. Left out, the clocks read the real time after mount and tick once a minute. */
  now?: Date
  /** BCP 47 locale for the times. Default: the visitor's. */
  locale?: string
  /** 12-hour clocks. Default false. */
  hour12?: boolean
  /** A quiet line under the tile: ©, legal links. */
  legal?: ReactNode
  /** Interface strings, for translation. */
  labels?: {
    /** Name of the group of clocks. */
    offices?: string
    /** Shown when all offices share one offset. */
    sameTime?: string
    /** Shown instead of a time before the clock has been read. */
    pending?: string
    copy?: string
    copied?: string
    copyFailed?: string
    /** Hidden text after an external link. */
    newTab?: string
  }
}

const L = {
  offices: 'Local time',
  sameTime: 'Same time',
  pending: '--:--',
  copy: 'Copy email',
  copied: 'Copied',
  copyFailed: 'Not copied. Select the address instead.',
  newTab: '(opens in a new tab)',
}

/** Minutes the zone is ahead of UTC at this moment, or null for a zone the browser does not know. */
function offsetMinutes(at: Date, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).formatToParts(at)
    const n = (t: string) => Number(parts.find((p) => p.type === t)?.value)
    const wall = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'))
    return Math.round((wall - Math.floor(at.getTime() / 1000) * 1000) / 60000)
  } catch {
    return null
  }
}

function clock(at: Date, timeZone: string, locale: string | undefined, hour12: boolean) {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit', hour12 }).format(at)
  } catch {
    return null
  }
}

/** The current time, read after mount and refreshed exactly on each minute. A fixed `now` is used as given. */
function useMinuteClock(fixed?: Date) {
  const [at, setAt] = useState<Date | null>(null)
  useEffect(() => {
    if (fixed) return
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      setAt(new Date())
      timer = setTimeout(tick, 60000 - (Date.now() % 60000) + 20)
    }
    tick()
    return () => clearTimeout(timer)
  }, [fixed])
  return fixed ?? at
}

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? (words.at(-1)?.[0] ?? '') : '')).toUpperCase()
}

const pill =
  'inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export function FooterDesk({
  heading,
  description,
  contact,
  email,
  bookCall,
  offices,
  now,
  locale,
  hour12 = false,
  legal,
  labels,
  className,
  ...rest
}: FooterDeskProps) {
  const t = { ...L, ...labels }
  const at = useMinuteClock(now)
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')
  const reset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(reset.current), [])

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
    clearTimeout(reset.current)
    reset.current = setTimeout(() => setCopy('idle'), 2400)
  }

  const offsets = at ? offices.map((o) => offsetMinutes(at, o.timeZone)) : []
  const same = offices.length > 1 && offsets.length > 0 && offsets.every((o) => o !== null && o === offsets[0])

  return (
    <footer className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)} {...rest}>
      <div className="@container">
        <DataTile inverted className="overflow-hidden">
          <div className="grid gap-10 py-2 @min-[56rem]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] @min-[56rem]:gap-14 @min-[56rem]:py-4">
            <div className="flex min-w-0 flex-col gap-8">
              <div className="grid gap-4">
                <h2
                  className="text-[clamp(32px,6.4cqi,64px)] leading-[0.98] font-extrabold tracking-[-0.04em] text-balance"
                  style={{ fontFamily: 'var(--font-display, inherit)', fontStretch: '86%' }}
                >
                  {heading}
                </h2>
                {description && <p className="max-w-[44ch] text-[15px] leading-relaxed text-pretty text-muted-foreground">{description}</p>}
              </div>

              <div className="flex items-center gap-3.5">
                <span
                  aria-hidden={contact.avatar ? undefined : true}
                  className="grid size-12 flex-none place-items-center overflow-hidden rounded-full bg-muted font-mono text-[13px] font-medium tracking-wide"
                >
                  {contact.avatar ?? (contact.initials ?? initialsOf(contact.name))}
                </span>
                <p className="grid min-w-0 gap-0.5">
                  <span className="text-[15px] leading-tight font-medium">{contact.name}</span>
                  <span className="text-sm leading-tight text-muted-foreground">{contact.role}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
                <span className="inline-flex min-h-11 max-w-full items-center rounded-full bg-muted pr-1.5 pl-4">
                  <a
                    href={`mailto:${email}`}
                    className="flex min-h-11 min-w-0 items-center rounded-sm font-mono text-[13px] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring"
                  >
                    <span className="truncate">{email}</span>
                  </a>
                  <button
                    type="button"
                    onClick={copyEmail}
                    className="relative ml-2 grid size-9 flex-none cursor-pointer place-items-center rounded-full text-muted-foreground transition-[opacity] duration-200 ease-out-quint hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring before:absolute before:-inset-1 before:content-['']"
                  >
                    <span className="sr-only">{t.copy}</span>
                    <Copy aria-hidden className={cn('absolute size-4 transition-[opacity] duration-200 ease-out-quint', copy === 'copied' ? 'opacity-0' : 'opacity-100')} />
                    <Check aria-hidden className={cn('absolute size-4 transition-[opacity] duration-200 ease-out-quint', copy === 'copied' ? 'opacity-100' : 'opacity-0')} />
                  </button>
                </span>
                {bookCall && (
                  <a
                    href={bookCall.href}
                    {...(bookCall.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={cn(pill, 'bg-foreground text-background transition-[transform] duration-200 ease-out-quint active:scale-[0.98]')}
                  >
                    {bookCall.label}
                    <ArrowUpRight aria-hidden className="size-4" />
                    {bookCall.external && <span className="sr-only"> {t.newTab}</span>}
                  </a>
                )}
                <span role="status" className={cn('text-[13px] text-muted-foreground', copy === 'idle' && 'sr-only')}>
                  {copy === 'copied' ? t.copied : copy === 'failed' ? t.copyFailed : ''}
                </span>
              </div>
            </div>

            <div className="grid min-w-0 content-start gap-3">
              <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <h3 className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">{t.offices}</h3>
                {same && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] leading-none">
                    <Check aria-hidden className="size-3" />
                    {t.sameTime}
                  </span>
                )}
              </div>
              <ul className="grid gap-3 @min-[26rem]:grid-cols-2 @min-[56rem]:grid-cols-1">
                {offices.map((o, i) => {
                  const text = at ? clock(at, o.timeZone, locale, hour12) : null
                  const off = offsets[i]
                  return (
                    <li key={`${o.city}-${o.timeZone}`} className="flex items-baseline justify-between gap-4 rounded-[14px] bg-muted px-4 py-3.5">
                      <span className="grid min-w-0 gap-0.5">
                        <span className="text-[15px] leading-tight font-medium">{o.city}</span>
                        <span className="font-mono text-[11px] leading-tight text-muted-foreground tabular-nums">
                          {off === null || off === undefined ? o.timeZone : `UTC${off >= 0 ? '+' : '−'}${Math.floor(Math.abs(off) / 60)}${Math.abs(off) % 60 ? `:${String(Math.abs(off) % 60).padStart(2, '0')}` : ''}`}
                        </span>
                      </span>
                      <time
                        dateTime={at ? at.toISOString() : undefined}
                        className="font-mono text-[clamp(24px,4cqi,32px)] leading-none font-medium tracking-tight tabular-nums"
                      >
                        {text ?? t.pending}
                      </time>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </DataTile>
        {legal && <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-2 pt-5 pb-8 text-[13px] text-muted-foreground">{legal}</div>}
      </div>
    </footer>
  )
}
