// A page, panel or tile with nothing in it yet: an icon on a raised key, a title, one line on what goes here, a few
// example labels and the action that starts things. The dashed edge is the Tiles sign for "not real yet". `plain`
// drops the frame, so it can sit inside a data-tile or a chart's placeholder without a frame in a frame.
// Screen readers meet it as a heading with its text, then a list of examples, then the buttons. With `live`, the title
// and the description are also spoken once when it appears (after a search or a filter); the heading itself is not a
// live region, so it is not read twice.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/registry/manniche/badge/badge'

export type EmptyStateLabels = {
  /** The name of the list of examples, for screen readers. Default "Examples". */
  examples?: string
}

export type EmptyStateProps = {
  /** A decorative icon, such as a lucide icon element. Hidden from screen readers. */
  icon?: ReactNode
  /** What is empty, as a short line: "No segments yet". */
  title: ReactNode
  /** One line on what goes here and why it is worth starting. */
  description?: ReactNode
  /** The heading level of the title, to fit the page outline. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
  /** A few short example phrases, shown as demo labels. Not clickable. */
  examples?: string[]
  /** The main action, one button or link. */
  action?: ReactNode
  /** A quiet extra action, such as a link to the docs. */
  secondaryAction?: ReactNode
  /** "card" has the dashed frame, "plain" has none, for use inside a tile. Default "card". */
  variant?: 'card' | 'plain'
  /** "compact" tightens the padding and the icon. Default follows the tile. */
  density?: 'comfortable' | 'compact'
  /** Speak the title and description once when the empty state appears, such as after a search with no results. */
  live?: boolean
  /** Text overrides, with English defaults. */
  labels?: EmptyStateLabels
  /** Classes for the outer box. */
  className?: string
}

const DEFAULT_LABELS: Required<EmptyStateLabels> = { examples: 'Examples' }

// Sizes as variables, so a compact tile (or the prop) can swap them in one place.
const METRICS =
  '[--es-py:48px] [--es-px:24px] [--es-gap:10px] [--es-ic:44px] [--es-icr:12px] ' +
  'group-data-[density=compact]/tile:[--es-py:28px] group-data-[density=compact]/tile:[--es-px:16px] ' +
  'group-data-[density=compact]/tile:[--es-gap:8px] group-data-[density=compact]/tile:[--es-ic:36px] group-data-[density=compact]/tile:[--es-icr:10px]'
const DENSITY = {
  comfortable: '[--es-py:48px] [--es-px:24px] [--es-gap:10px] [--es-ic:44px] [--es-icr:12px]',
  compact: '[--es-py:28px] [--es-px:16px] [--es-gap:8px] [--es-ic:36px] [--es-icr:10px]',
}

// The raised key from Badge "new", at icon size.
const KEY =
  'bg-muted text-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_7%,transparent),inset_0_-1.5px_0_rgb(0_0_0/0.14),0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)] dark:shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_7%,transparent),inset_0_-1.5px_0_rgb(0_0_0/0.45),0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)]'

/** The text of the title and description, read from the page once React has drawn them. */
function useLiveText(on: boolean, title: RefObject<HTMLElement | null>, description: RefObject<HTMLElement | null>, deps: unknown[]) {
  const [text, setText] = useState('')
  const said = useRef('')
  const timer = useRef(0)
  useEffect(() => {
    if (!on) {
      window.clearTimeout(timer.current)
      said.current = ''
      timer.current = window.setTimeout(() => setText(''), 0)
      return
    }
    const next = [title.current?.textContent, description.current?.textContent].filter(Boolean).join('. ').trim()
    if (!next || next === said.current) return
    window.clearTimeout(timer.current)
    // Filled a moment after the region is in the page, so it exists empty first and the text is spoken. `said` is set
    // only when the text lands, so a re-render that cancels this timer schedules it again.
    timer.current = window.setTimeout(() => {
      said.current = next
      setText(next)
    }, 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, title, description, ...deps])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return text
}

/** Says that something is empty, what goes there and how to start. */
export function EmptyState({
  icon,
  title,
  description,
  headingLevel = 3,
  examples,
  action,
  secondaryAction,
  variant = 'card',
  density,
  live = false,
  labels: labelsProp,
  className,
}: EmptyStateProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const Heading = `h${headingLevel}` as const
  const titleRef = useRef<HTMLHeadingElement>(null)
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const spoken = useLiveText(live, titleRef, descriptionRef, [title, description])

  return (
    <div
      data-variant={variant}
      className={cn(
        'flex min-w-0 flex-col items-center gap-(--es-gap) px-(--es-px) py-(--es-py) text-center',
        density ? DENSITY[density] : METRICS,
        variant === 'card' && 'rounded-[calc(var(--radius)*2+2px)] border border-dashed border-foreground/25 bg-card text-card-foreground',
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={cn('mb-1 grid size-(--es-ic) flex-none place-items-center rounded-(--es-icr) [&_svg]:size-5', KEY)}
        >
          {icon}
        </span>
      )}
      <Heading ref={titleRef} className="text-[15px] leading-[1.2] font-medium tracking-[-0.01em] text-balance">
        {title}
      </Heading>
      {description && (
        <p ref={descriptionRef} className="max-w-[46ch] text-[13.5px] leading-normal text-pretty text-muted-foreground">
          {description}
        </p>
      )}
      {examples && examples.length > 0 && (
        <ul aria-label={labels.examples} className="mt-1 flex max-w-full flex-wrap justify-center gap-2">
          {examples.map((example, i) => (
            <li key={`${i}-${example}`} className="flex max-w-full min-w-0">
              <Badge variant="demo" className="h-auto min-h-[22px] max-w-full py-1 whitespace-normal">
                {example}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
      {live && (
        <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {spoken}
        </span>
      )}
    </div>
  )
}
