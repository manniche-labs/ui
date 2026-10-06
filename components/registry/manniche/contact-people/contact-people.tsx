// Contact people: a grid of person cards (initials or image avatar, name, role, language chips, email with a copy
// button, optional "Book a call"). A team filter appears as Pills when there is more than one team.
// Signature: copying an email shows "Copied" in place, announced through a live region.
// Screen readers: a section named by its h2, a list of people with an h3 each; the filter is a radio group and the
// result count is announced. Reduced motion: the press feedback on the buttons is dropped; nothing else moves.
import { useEffect, useId, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Pills } from '@/registry/manniche/chart-kit/chart-kit'

export type ContactPerson = {
  id: string
  name: string
  role: string
  /** Team name; used for the filter. */
  team?: string
  /** Language chips: "English", "Deutsch". */
  languages?: string[]
  email: string
  /** Optional booking link. */
  bookHref?: string
  /** Image slot; initials are shown when absent. */
  avatar?: ReactNode
}

export type ContactPeopleProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  /** The section heading (h2). */
  heading: ReactNode
  intro?: ReactNode
  people: ContactPerson[]
  labels?: { all?: string; filter?: string; copy?: string; copied?: string; failed?: string; book?: string; languages?: string; shown?: (n: number) => string }
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')

function CopyEmail({ email, L }: { email: string; L: { copy: string; copied: string; failed: string } }) {
  const [s, setS] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const run = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setS('copied')
    } catch {
      setS('failed')
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setS('idle'), 1800)
  }
  return (
    <>
      <button type="button" onClick={run}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-muted px-3.5 text-sm font-medium outline-offset-2 transition-[opacity,transform] duration-200 ease-out-quint focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100">
        {s === 'copied' ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        <span aria-hidden className="font-mono text-xs">{s === 'copied' ? L.copied : s === 'failed' ? L.failed : L.copy}</span>
        <span className="sr-only">{L.copy}: {email}</span>
      </button>
      <span role="status" aria-live="polite" className="sr-only">{s === 'copied' ? L.copied : s === 'failed' ? L.failed : ''}</span>
    </>
  )
}

export function ContactPeople({ heading, intro, people, labels = {}, className, ...rest }: ContactPeopleProps) {
  const L = { all: 'Everyone', filter: 'Team', copy: 'Copy email', copied: 'Copied', failed: 'Not copied', book: 'Book a call', languages: 'Languages', shown: (n: number) => `${n} people shown`, ...labels }
  const uid = useId()
  const teams = Array.from(new Set(people.map((p) => p.team).filter((t): t is string => !!t)))
  const [team, setTeam] = useState('all')
  // A team that is no longer in `people` falls back to everyone, so the list never ends up empty with no way out.
  const active = team === 'all' || teams.includes(team) ? team : 'all'
  const list = active === 'all' ? people : people.filter((p) => p.team === active)
  return (
    <section aria-labelledby={`${uid}-h`} className={cn('@container mx-auto w-full max-w-6xl px-4 py-12 sm:px-6', className)} {...rest}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 id={`${uid}-h`} className="font-[family-name:var(--font-display,inherit)] text-3xl font-semibold tracking-tight text-balance @min-[40rem]:text-4xl">{heading}</h2>
          {intro && <p className="mt-3 text-muted-foreground">{intro}</p>}
        </div>
        {teams.length > 1 && (
          <Pills label={L.filter} value={active} onChange={setTeam} options={[{ id: 'all', label: L.all }, ...teams.map((t) => ({ id: t, label: t }))]} />
        )}
      </header>
      <p role="status" aria-live="polite" className="sr-only">{L.shown(list.length)}</p>
      <ul className="mt-8 grid list-none gap-3 p-0 @min-[34rem]:grid-cols-2 @min-[62rem]:grid-cols-3">
        {list.map((p) => (
          <li key={p.id} className="min-w-0">
            <article className="flex h-full flex-col rounded-[26px] bg-card p-6 text-card-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-muted font-mono text-sm" aria-hidden={p.avatar ? undefined : true}>
                  {p.avatar ?? initials(p.name)}
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold break-words text-pretty">{p.name}</h3>
                  <p className="text-sm text-muted-foreground">{p.role}</p>
                </div>
              </div>
              {p.languages && p.languages.length > 0 && (
                <ul aria-label={L.languages} className="mt-4 flex list-none flex-wrap gap-1.5 p-0">
                  {p.languages.map((l) => (
                    <li key={l} className="rounded-full bg-muted px-2.5 py-1 text-xs">{l}</li>
                  ))}
                </ul>
              )}
              <p className="mt-4 font-mono text-xs break-all text-muted-foreground">{p.email}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <CopyEmail email={p.email} L={L} />
                {p.bookHref && (
                  <a href={p.bookHref} className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring">
                    {L.book}<span className="sr-only">: {p.name}</span>
                  </a>
                )}
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
