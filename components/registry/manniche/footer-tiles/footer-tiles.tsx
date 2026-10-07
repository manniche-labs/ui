// The footer as a small bento of four tiles: address, opening hours, links and social links, with a legal row under
// them. Signature: the open-now dot is the only --primary on the page. Whether the place is open is computed from the
// weekly schedule, the time zone and `now`, so a visitor in another zone still sees the shop's own time. The dot is
// never the only signal: the words "Open now" or "Closed, opens at 09:00" sit beside it, and a closed place shows a
// hollow ring. Screen readers get a <footer> landmark, an h2 (hidden), one h3 per tile, <address>, real lists, and
// opening hours as a list of day ranges with today marked in text. The ©-year and the status are computed after mount
// unless `now` is passed; until then the tile shows a neutral "Opening hours" line. When `now` is absent the status
// refreshes every 30 seconds. Under reduced motion nothing animates (the only motion is colour-free opacity on hover).
import { ArrowUpRight } from 'lucide-react'
import { useId, useSyncExternalStore, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'

export type FooterTilesLink = {
  label: string
  href: string
  /** Opens in a new tab with rel="noopener noreferrer" and a hidden "(opens in a new tab)". */
  external?: boolean
}

/** 0 is Sunday, 1 Monday, up to 6 Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type OpeningRange = {
  day: Weekday
  /** 24-hour "HH:MM" in the place's own time zone. */
  open: string
  /** 24-hour "HH:MM", later than `open` on the same day. A day may have several ranges (a lunch break). */
  close: string
}

export type FooterTilesAddress = {
  /** The place's name, e.g. "Halden Studio, Munich". */
  name: string
  /** Street, postcode and city, one entry per line. */
  lines: string[]
  /** Link for the "Directions" action, e.g. a map URL. */
  directionsHref: string
}

export type FooterTilesHours = {
  /** An IANA time zone, e.g. "Europe/Berlin". The schedule is read in this zone. */
  timeZone: string
  schedule: OpeningRange[]
}

export type FooterTilesSocial = {
  label: string
  href: string
  /** A small icon, decorative: the label carries the meaning. */
  icon: ReactNode
}

export type FooterTilesLabels = {
  heading?: string
  navigation?: string
  address?: string
  directions?: string
  hours?: string
  links?: string
  social?: string
  openNow?: string
  closed?: string
  /** `{time}` is replaced with the closing time. */
  closesAt?: string
  /** `{time}` is replaced with the opening time (later today). */
  opensAt?: string
  /** `{day}` and `{time}` are replaced with the next opening. */
  opensOn?: string
  today?: string
  /** `{zone}` is replaced with the time zone. */
  zoneNote?: string
  /** Shown before the status is known (server render, first paint). */
  unknown?: string
  /** Seven short day names, Sunday first. */
  days?: [string, string, string, string, string, string, string]
  shut?: string
  newTab?: string
}

export type FooterTilesProps = Omit<ComponentPropsWithoutRef<'footer'>, 'children'> & {
  /** The address tile: place name, address lines and a directions link. */
  address: FooterTilesAddress
  /** The opening hours tile: the time zone and the weekly schedule behind "open now". */
  hours: FooterTilesHours
  /** Links tile: a short list of pages. */
  links: FooterTilesLink[]
  /** Social tile: each with an icon and text. */
  social: FooterTilesSocial[]
  /** The name after the © sign. */
  owner: string
  /** Legal links under the tiles. */
  legalLinks?: FooterTilesLink[]
  /** The moment to judge "open now" by. When absent the real time is used after mount and refreshed every 30 s. */
  now?: Date
  /** UI strings, for translation. */
  labels?: FooterTilesLabels
}

const DEFAULT_LABELS: Required<FooterTilesLabels> = {
  heading: 'Footer',
  navigation: 'Footer links',
  address: 'Visit',
  directions: 'Directions',
  hours: 'Opening hours',
  links: 'Explore',
  social: 'Follow',
  openNow: 'Open now',
  closed: 'Closed',
  closesAt: 'closes {time}',
  opensAt: 'opens at {time}',
  opensOn: 'opens {day} {time}',
  today: 'Today',
  zoneNote: 'Times in {zone}.',
  unknown: 'Opening hours',
  days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  shut: 'Closed',
  newTab: '(opens in a new tab)',
}

// Time logic ----------------------------------------------------------------------------------------------------

const WEEKDAYS: Record<string, Weekday> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** The weekday and minute of the day in the given zone, or null for a zone the browser does not know. */
function zonedParts(date: Date, timeZone: string): { day: Weekday; minutes: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
    const day = WEEKDAYS[get('weekday')]
    if (day === undefined) return null
    return { day, minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')) }
  } catch {
    return null
  }
}

type Status =
  | { open: true; day: Weekday; closes: string }
  | { open: false; day: Weekday; next?: { day: Weekday; time: string; today: boolean } }

/** Is the place open at `date`, and if not, when does it open next? Null when the zone is unknown. */
function openStatus(hours: FooterTilesHours, date: Date): Status | null {
  const at = zonedParts(date, hours.timeZone)
  if (!at) return null
  const forDay = (d: Weekday) => hours.schedule.filter((r) => r.day === d).sort((a, b) => toMinutes(a.open) - toMinutes(b.open))
  const current = forDay(at.day).find((r) => toMinutes(r.open) <= at.minutes && at.minutes < toMinutes(r.close))
  if (current) return { open: true, day: at.day, closes: current.close }
  for (let offset = 0; offset <= 7; offset++) {
    const day = ((at.day + offset) % 7) as Weekday
    const later = forDay(day).find((r) => offset > 0 || toMinutes(r.open) > at.minutes)
    if (later) return { open: false, day: at.day, next: { day, time: later.open, today: offset === 0 } }
  }
  return { open: false, day: at.day }
}

const noopSubscribe = () => () => {}
const subscribeMinute = (onChange: () => void) => {
  const id = setInterval(onChange, 30_000)
  return () => clearInterval(id)
}
// A whole-minute timestamp, so the snapshot only changes when the minute does. Null on the server and first render.
const minuteNow = () => Math.floor(Date.now() / 60_000) * 60_000

function useNow(now?: Date): Date | null {
  const live = useSyncExternalStore(now ? noopSubscribe : subscribeMinute, minuteNow, () => null)
  if (now) return now
  return live === null ? null : new Date(live)
}

const noopYearSubscribe = () => () => {}
function useYear(now: Date | null) {
  const clientYear = useSyncExternalStore(noopYearSubscribe, () => new Date().getFullYear(), () => null)
  return now ? now.getFullYear() : clientYear
}

/** Merges consecutive days with the same hours into one line: "Mon–Fri 09:00–18:00". Monday first. */
function dayGroups(schedule: OpeningRange[], days: string[], shut: string) {
  const order: Weekday[] = [1, 2, 3, 4, 5, 6, 0]
  const text = (d: Weekday) =>
    schedule
      .filter((r) => r.day === d)
      .sort((a, b) => toMinutes(a.open) - toMinutes(b.open))
      .map((r) => `${r.open}–${r.close}`)
      .join(', ') || shut
  const groups: { first: Weekday; last: Weekday; days: Weekday[]; text: string }[] = []
  for (const d of order) {
    const t = text(d)
    const prev = groups[groups.length - 1]
    if (prev && prev.text === t) {
      prev.last = d
      prev.days.push(d)
    } else groups.push({ first: d, last: d, days: [d], text: t })
  }
  return groups.map((g) => ({
    key: `${g.first}-${g.last}`,
    label: g.first === g.last ? days[g.first] : `${days[g.first]}–${days[g.last]}`,
    days: g.days,
    text: g.text,
    shut: g.text === shut,
  }))
}

// Pieces --------------------------------------------------------------------------------------------------------

const ROW =
  'relative flex min-h-11 items-center justify-between gap-3 rounded-md text-sm text-foreground transition-[opacity] duration-200 ease-out-quint motion-reduce:transition-none hover:opacity-70 focus-visible:opacity-100 focus-visible:outline-offset-0'

function ext(external?: boolean) {
  return external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
}

function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? '')
}

function HoursTile({ hours, now, labels }: { hours: FooterTilesHours; now: Date | null; labels: Required<FooterTilesLabels> }) {
  const status = now ? openStatus(hours, now) : null
  const groups = dayGroups(hours.schedule, labels.days, labels.shut)

  // Closed with no next opening only happens for an empty schedule: then "Closed" stands alone.
  let line: string = status && !status.open && !status.next ? '' : labels.unknown
  if (status?.open) line = fill(labels.closesAt, { time: status.closes })
  else if (status?.next) {
    line = status.next.today
      ? fill(labels.opensAt, { time: status.next.time })
      : fill(labels.opensOn, { day: labels.days[status.next.day], time: status.next.time })
  }

  return (
    <DataTile
      title={labels.hours}
      footer={<span className="font-mono text-xs tabular-nums">{fill(labels.zoneNote, { zone: hours.timeZone })}</span>}
    >
      <p className="flex min-h-6 items-center gap-2.5 text-sm font-medium">
        {status ? (
          <>
            <span
              aria-hidden
              className={cn('size-2.5 flex-none rounded-full', status.open ? 'bg-primary' : 'border-[1.5px] border-muted-foreground')}
            />
            <span>
              {status.open ? labels.openNow : labels.closed}
              {line && (
                <span className="font-normal text-muted-foreground">
                  {status.open ? ' · ' : ', '}
                  <span className="font-mono text-[13px] tabular-nums">{line}</span>
                </span>
              )}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">{line}</span>
        )}
      </p>
      <ul className="mt-4 grid gap-1.5 border-t border-border pt-4">
        {groups.map((g) => {
          const isToday = status !== null && g.days.includes(status.day)
          return (
            <li key={g.key} className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className={cn('flex items-baseline gap-2 whitespace-nowrap', isToday ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {g.label}
                {isToday && <span className="rounded-full bg-muted px-2 py-px text-[11px] font-medium text-foreground">{labels.today}</span>}
              </span>
              <span className={cn('font-mono text-xs tabular-nums', isToday ? 'text-foreground' : 'text-muted-foreground', g.shut && 'font-sans text-[13.5px]')}>
                {g.text}
              </span>
            </li>
          )
        })}
      </ul>
    </DataTile>
  )
}

/** A four-tile footer: address, opening hours with an open-now signal, links and social links. */
export function FooterTiles({ address, hours, links, social, owner, legalLinks = [], now, labels, className, ...rest }: FooterTilesProps) {
  const l = { ...DEFAULT_LABELS, ...labels }
  const clock = useNow(now)
  const year = useYear(clock)
  const headingId = useId()

  return (
    <footer {...rest} aria-labelledby={headingId} className={cn('@container w-full bg-background text-foreground', className)}>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 @min-[40rem]:py-16 sm:px-6">
        <h2 id={headingId} className="sr-only">
          {l.heading}
        </h2>
        <div className="grid gap-3 @min-[36rem]:grid-cols-2 @min-[64rem]:grid-cols-4 @min-[64rem]:gap-4">
          <DataTile
            title={l.address}
            footer={
              <a
                href={address.directionsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="-my-1 inline-flex min-h-11 items-center gap-1.5 rounded-md font-medium text-foreground transition-[opacity] duration-200 motion-reduce:transition-none hover:opacity-70 focus-visible:outline-offset-0"
              >
                {l.directions}
                <span className="sr-only">
                  {' '}
                  {l.newTab}
                </span>
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
            }
          >
            <address className="text-sm leading-relaxed not-italic">
              <span className="block font-medium">{address.name}</span>
              {address.lines.map((line) => (
                <span key={line} className="block text-muted-foreground">
                  {line}
                </span>
              ))}
            </address>
          </DataTile>

          <HoursTile hours={hours} now={clock} labels={l} />

          <DataTile title={l.links}>
            <nav aria-label={l.navigation}>
              <ul className="-my-1.5">
                {links.map((link) => (
                  <li key={link.href + link.label}>
                    <a href={link.href} {...ext(link.external)} className={ROW}>
                      {link.label}
                      {link.external && <span className="sr-only"> {l.newTab}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </DataTile>

          <DataTile title={l.social}>
            <ul className="-my-1.5">
              {social.map((s) => (
                <li key={s.href + s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className={ROW}>
                    <span className="flex items-center gap-3">
                      <span aria-hidden className="grid size-5 flex-none place-items-center text-muted-foreground [&>svg]:size-[18px]">
                        {s.icon}
                      </span>
                      {s.label}
                      <span className="sr-only"> {l.newTab}</span>
                    </span>
                    <ArrowUpRight className="size-4 flex-none text-muted-foreground" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </DataTile>
        </div>

        <div className="mt-4 flex flex-col gap-x-6 gap-y-0 px-1 @min-[40rem]:flex-row @min-[40rem]:items-center @min-[40rem]:justify-between @min-[40rem]:px-2">
          <p className="min-h-11 content-center font-mono text-xs text-muted-foreground tabular-nums">
            &copy; {year ?? ''}
            {year ? ' ' : ''}
            {owner}
          </p>
          {legalLinks.length > 0 && (
            <ul className="flex flex-wrap gap-x-5">
              {legalLinks.map((link) => (
                <li key={link.href + link.label}>
                  <a
                    href={link.href}
                    {...ext(link.external)}
                    className="relative inline-flex min-h-11 items-center rounded-md text-[13px] text-muted-foreground transition-[color] duration-200 ease-out-quint motion-reduce:transition-none hover:text-foreground focus-visible:text-foreground focus-visible:outline-offset-0"
                  >
                    {link.label}
                    {link.external && <span className="sr-only"> {l.newTab}</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  )
}
