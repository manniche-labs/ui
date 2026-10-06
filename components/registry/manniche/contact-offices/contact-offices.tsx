// Contact offices: one tile per office with address, phone, weekly hours, local time and an open/closed signal.
// Signature: the open office carries the one --primary dot; the open office closest to closing says "Closes in
// 40 min" in mono; closed offices say when they open next ("Opens Mon 09:00").
// Screen readers: a list of offices with an h3 each; the status is text, never colour alone; hours are a table.
// Time: pass `now` for a fixed time; otherwise the section renders a neutral placeholder on the server and reads
// the clock in an effect after mount, ticking once a minute. Reduced motion: nothing animates.
import { useEffect, useId, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { Check, Copy, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

export type OfficeHours = {
  /** Day of week, 0 = Sunday ... 6 = Saturday. */
  day: number
  /** "09:00" in the office's local time. */
  open: string
  /** "17:00" in the office's local time. */
  close: string
}

export type ContactOffice = {
  id: string
  city: string
  address: string
  phone?: string
  /** IANA zone, e.g. "Europe/Berlin". */
  timeZone: string
  hours: OfficeHours[]
  /** Link to a map or directions. */
  directionsHref?: string
}

export type ContactOfficesProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  heading: ReactNode
  intro?: ReactNode
  offices: ContactOffice[]
  /** A fixed time; when absent the clock runs after mount. */
  now?: Date
  labels?: {
    open?: string; closed?: string; localTime?: string; copyAddress?: string; copied?: string; failed?: string
    directions?: string; newTab?: string; hours?: string; day?: string; closesIn?: (min: number) => string; opensAt?: (day: string, time: string) => string
    days?: string[]
  }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function localParts(now: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]))
  return { day: DAYS.indexOf(p.weekday), minutes: Number(p.hour) * 60 + Number(p.minute), clock: `${p.hour}:${p.minute}` }
}

type OfficeStatus = { open: boolean; clock: string; closesIn?: number; next?: { day: number; time: string } }

/** Whether an office is open at `now`, how long until it closes, or when it opens next. */
function officeStatus(o: ContactOffice, now: Date): OfficeStatus {
  const { day, minutes, clock } = localParts(now, o.timeZone)
  const today = o.hours.find((h) => h.day === day && minutes >= toMin(h.open) && minutes < toMin(h.close))
  if (today) return { open: true, clock, closesIn: toMin(today.close) - minutes }
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7
    const h = o.hours.filter((x) => x.day === d).sort((a, b) => toMin(a.open) - toMin(b.open)).find((x) => i > 0 || toMin(x.open) > minutes)
    if (h) return { open: false, clock, next: { day: d, time: h.open } }
  }
  return { open: false, clock }
}

function CopyAddress({ text, L }: { text: string; L: { copyAddress: string; copied: string; failed: string } }) {
  const [s, setS] = useState<'idle' | 'copied' | 'failed'>('idle')
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])
  const run = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setS('copied')
    } catch {
      setS('failed')
    }
    clearTimeout(t.current)
    t.current = setTimeout(() => setS('idle'), 1800)
  }
  return (
    <>
      <button type="button" onClick={run} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-muted px-3.5 text-sm font-medium outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring">
        {s === 'copied' ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {s === 'copied' ? L.copied : s === 'failed' ? L.failed : L.copyAddress}
      </button>
      <span role="status" aria-live="polite" className="sr-only">{s === 'copied' ? L.copied : s === 'failed' ? L.failed : ''}</span>
    </>
  )
}

export function ContactOffices({ heading, intro, offices, now, labels = {}, className, ...rest }: ContactOfficesProps) {
  const L = {
    open: 'Open now', closed: 'Closed', localTime: 'Local time', copyAddress: 'Copy address', copied: 'Copied', failed: 'Not copied',
    directions: 'Directions', newTab: '(opens in a new tab)', hours: 'Opening hours',
    closesIn: (m: number) => (m >= 60 ? `Closes in ${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `Closes in ${m} min`),
    opensAt: (d: string, t: string) => `Opens ${d} ${t}`,
    days: DAYS,
    ...labels,
  }
  const uid = useId()
  const [clock, setClock] = useState<Date | null>(null)
  useEffect(() => {
    if (now) return
    const first = setTimeout(() => setClock(new Date()), 0)
    const id = setInterval(() => setClock(new Date()), 60_000)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [now])
  const at = now ?? clock
  const statuses = at ? offices.map((o) => officeStatus(o, at)) : null
  const soonest = statuses
    ? statuses.reduce<number>((best, s, i) => (s.open && (best < 0 || (s.closesIn ?? 1e9) < (statuses[best].closesIn ?? 1e9)) ? i : best), -1)
    : -1

  return (
    <section aria-labelledby={`${uid}-h`} className={cn('@container mx-auto w-full max-w-6xl px-4 py-12 sm:px-6', className)} {...rest}>
      <header className="max-w-2xl">
        <h2 id={`${uid}-h`} className="font-[family-name:var(--font-display,inherit)] text-3xl font-semibold tracking-tight text-balance @min-[40rem]:text-4xl">{heading}</h2>
        {intro && <p className="mt-3 text-muted-foreground">{intro}</p>}
      </header>
      <ul className="mt-8 grid list-none gap-3 p-0 @min-[44rem]:grid-cols-2">
        {offices.map((o, i) => {
          const st = statuses?.[i]
          return (
            <li key={o.id} className="min-w-0">
              <article className="flex h-full flex-col rounded-[26px] bg-card p-6 text-card-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-[family-name:var(--font-display,inherit)] text-2xl font-semibold">{o.city}</h3>
                  <span className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium" aria-live="polite">
                    <span aria-hidden className={cn('size-2 rounded-full', st?.open ? 'bg-primary' : 'bg-muted-foreground/50')} />
                    {st ? (st.open ? L.open : L.closed) : <span className="inline-block h-3 w-14" aria-hidden />}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                  {L.localTime} {st ? st.clock : '--:--'} · {o.timeZone}
                </p>
                {st && (
                  <p className="mt-3 min-h-5 font-mono text-xs tabular-nums">
                    {st.open && i === soonest && st.closesIn !== undefined && st.closesIn <= 120 && L.closesIn(st.closesIn)}
                    {!st.open && st.next && L.opensAt(L.days[st.next.day], st.next.time)}
                  </p>
                )}
                <address className="mt-3 text-sm not-italic">
                  {o.address}
                  {o.phone && (<><br /><a className="underline underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring tabular-nums" href={`tel:${o.phone.replace(/[^\d+]/g, '')}`}>{o.phone}</a></>)}
                </address>
                <table className="mt-4 w-full text-left font-mono text-xs tabular-nums text-muted-foreground">
                  <caption className="sr-only">{L.hours}</caption>
                  <tbody>
                    {[...o.hours].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7)).map((h) => (
                      <tr key={h.day + h.open}>
                        <th scope="row" className="py-0.5 pr-3 font-normal">{L.days[h.day]}</th>
                        <td className="py-0.5">{h.open} to {h.close}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  <CopyAddress text={`${o.city}, ${o.address}`} L={L} />
                  {o.directionsHref && (
                    <a href={o.directionsHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring">
                      <MapPin className="size-4" aria-hidden />{L.directions}<span className="sr-only"> {o.city} {L.newTab}</span>
                    </a>
                  )}
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
