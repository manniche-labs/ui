import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Source = {
  /** The page's title. */
  title: string
  href: string
  /** A line from the source that backs the claim. */
  quote?: string
}

function host(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, '')
  } catch {
    return href
  }
}

export type CitationProps = {
  /** The source's number, counted from 1. It matches its place in <Sources>. */
  n: number
  /** The source the number points to. */
  source: Source
  /** Classes for the link. */
  className?: string
}

/** A small numbered link after a claim. It jumps to the source in the list below and names it for screen readers. */
export function Citation({ n, source, className }: CitationProps) {
  return (
    <a
      href={`#source-${n}`}
      title={`${source.title} (${host(source.href)})`}
      className={cn(
        // The visible chip is small; the ::after area makes it 24 px to tap without moving the text around it.
        'relative ml-0.5 inline-grid h-[1.4em] min-w-[1.4em] place-items-center rounded-md bg-muted px-1 align-[0.45em] text-[0.7em] leading-none font-medium text-muted-foreground tabular-nums no-underline transition-colors duration-150 hover:bg-primary hover:text-primary-foreground',
        "after:absolute after:-inset-x-1.5 after:-inset-y-2 after:content-['']",
        className,
      )}
    >
      <span aria-hidden>{n}</span>
      <span className="sr-only">Source {n}: {source.title}</span>
    </a>
  )
}

export type SourcesProps = {
  /** The sources, listed in order and numbered from 1. */
  sources: Source[]
  /** Heading of the list and name of the section. */
  title?: string
  /** Classes for the outer section. */
  className?: string
}

/** The numbered list the citations point to. Links open in a new tab. */
export function Sources({ sources, title = 'Sources', className }: SourcesProps) {
  return (
    <section aria-label={title} className={cn('text-sm', className)}>
      <h3 className="mb-2 font-medium">{title}</h3>
      <ol className="space-y-1">
        {sources.map((s, i) => (
          <li key={s.href + i} id={`source-${i + 1}`} className="scroll-mt-24">
            <a
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className="group flex min-h-11 items-start gap-3 rounded-xl px-2 py-2 leading-6 transition-colors duration-150 hover:bg-muted target:bg-muted"
            >
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-muted text-xs font-medium text-muted-foreground tabular-nums group-hover:bg-card">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-pretty">{s.title}</span>
                <span className="block truncate text-muted-foreground">{host(s.href)}</span>
                {s.quote && <span className="mt-1 block border-l-2 pl-3 text-muted-foreground italic">{s.quote}</span>}
              </span>
              <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}
