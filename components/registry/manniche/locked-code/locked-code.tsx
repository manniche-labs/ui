// LockedCode: the code view of a paid component before it is unlocked. A file header with a lock and the tier badge,
// a stub of code blurred behind a lock panel (heading, a line of text, the unlock link, a price note and a few facts),
// and under it a row for people who already have a key: the CLI and MCP commands, each with a copy button.
//
// The stub is decoration. It is hidden from screen readers and blurred with `filter`, but it still ships in the page's
// HTML, so pass placeholder lines that look like code, never the real source.
//
// The key slot above the heading lights up while the unlock link is hovered or has keyboard focus, so the panel
// answers before the click. Under reduced motion it lights at once instead of fading.
//
// Every part carries a `data-slot` (`locked-code`, `locked-code-unlock`, `locked-code-light`, …), the shadcn way to
// style a part from outside without new props.
import { Lock } from 'lucide-react'
import { Fragment, useId, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/registry/manniche/badge/badge'
import { CopyButton } from '@/registry/manniche/copy-button/copy-button'

export type LockedCodeCommand = {
  /** A short name shown before the command, such as "CLI" or "MCP". */
  label: string
  /** The whole command, exactly as it lands on the clipboard. */
  value: string
  /** The start of `value` to draw fainter, such as `npx shadcn@latest add`. It must be how `value` begins. */
  prefix?: string
}

export type LockedCodeLabels = {
  /** The tier badge in the header. Default "Pro". */
  pro?: string
  /** The panel's heading. Default "The code is locked". */
  heading?: string
  /** The line under the heading; `{name}` becomes `name`. Default "{name} is part of Pro. A key opens its source code." */
  body?: string
  /** The unlock link, before the price. Default "Unlock". */
  unlock?: string
  /** The lead of the key row, set in bold. Default "Have a key?". */
  haveKey?: string
  /** The rest of that line. Default "Get the code with the CLI or MCP.". */
  haveKeyText?: string
  /** Where the key is kept; `{env}` becomes `envVar` set as code. Default "The key lives in {env}, never in the code or the URL." */
  keyNote?: string
  /** The link to `setupHref`. Default "How to set it up". */
  setup?: string
  /** Names each command for screen readers; `{label}` becomes its label. Default "{label} command". */
  command?: string
  /** The copy buttons. Defaults "Copy", "Copied" and "Not copied". */
  copy?: string
  copied?: string
  copyFailed?: string
}

export type LockedCodeProps = {
  /** The component's name, such as "flux-image". Used in the text and, with ".tsx", as the file name. */
  name: string
  /** The file name in the header. Default `${name}.tsx`. */
  filename?: string
  /**
   * Placeholder lines drawn blurred behind the lock. They ship in the page's HTML, so never pass the real source:
   * a few generic lines (imports, a props type, an empty function) are enough to read as code.
   */
  stub: string
  /** Where the unlock link goes, such as the pricing section. */
  unlockHref: string
  /** Called when the unlock link is clicked, for opening a checkout in place. Call `preventDefault()` to stay. */
  onUnlock?: (event: MouseEvent<HTMLAnchorElement>) => void
  /** The price after the unlock label, such as "€49". Leave it out for a plain "Unlock". */
  price?: string
  /** One line under the link about the price, such as an introductory offer and when it ends. */
  priceNote?: ReactNode
  /** Short facts in a row under the price, such as "One-time payment". */
  facts?: string[]
  /** The commands that fetch the code with a key, each with a copy button. Leave it empty to drop the key row. */
  commands?: LockedCodeCommand[]
  /** The environment variable the key lives in, shown in the key row. */
  envVar?: string
  /** A page that explains how to set the key up, linked from the key row. */
  setupHref?: string
  /** Words for other languages. */
  labels?: LockedCodeLabels
  /** The heading level of "The code is locked", to fit the page outline. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
  /** Classes for the outer section. */
  className?: string
}

// Replaces {key} in a label with a value, keeping the rest of the text as it is.
function fill(template: string, values: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1]
    return <Fragment key={i}>{key && key in values ? values[key] : part}</Fragment>
  })
}
const fillText = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (m, key: string) => values[key] ?? m)

// A long command breaks between words first, then after a slash. Each piece is kept whole (so flux-image or
// --header never splits at its hyphen) unless it is wider than the line on its own.
const breakable = (s: string) =>
  s.split(/( +)/).map((word, w) =>
    word.trim() ? (
      <Fragment key={w}>
        {word.split(/(?<=\/)(?!\/)/).map((part, i) => (
          <span key={i} className="inline-block max-w-full">
            {part}
          </span>
        ))}
      </Fragment>
    ) : (
      word
    ),
  )

// A recess in the surface: darker than the card, lit from above.
const WELL =
  'bg-background shadow-[inset_0_1px_2px_rgb(0_0_0/0.08),inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_7%,transparent)] dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.55),inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_6%,transparent)]'
const PIT =
  'bg-background shadow-[inset_0_2px_4px_rgb(0_0_0/0.14),inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent)] dark:shadow-[inset_0_2px_4px_rgb(0_0_0/0.7),inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)]'

/** The locked code view for a paid component: a blurred stub behind a lock panel, and the commands for key holders. */
export function LockedCode({
  name,
  filename,
  stub,
  unlockHref,
  onUnlock,
  price,
  priceNote,
  facts = [],
  commands = [],
  envVar,
  setupHref,
  labels = {},
  headingLevel = 3,
  className,
}: LockedCodeProps) {
  const {
    pro = 'Pro',
    heading = 'The code is locked',
    body = '{name} is part of Pro. A key opens its source code.',
    unlock = 'Unlock',
    haveKey = 'Have a key?',
    haveKeyText = 'Get the code with the CLI or MCP.',
    keyNote = 'The key lives in {env}, never in the code or the URL.',
    setup = 'How to set it up',
    command = '{label} command',
    copy = 'Copy',
    copied = 'Copied',
    copyFailed = 'Not copied',
  } = labels
  const headingId = useId()
  const fileId = useId()
  const Heading = `h${headingLevel}` as const
  const lines = stub.replace(/\n+$/, '').split('\n')

  return (
    <section
      data-slot="locked-code"
      aria-labelledby={`${fileId} ${headingId}`}
      className={cn(
        '@container min-w-0 overflow-hidden rounded-[calc(var(--radius)*2+2px)] bg-card text-card-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]',
        className,
      )}
    >
      <div
        data-slot="locked-code-header"
        className="flex min-h-12 items-center gap-2.5 border-b border-border py-1 pr-2 pl-4 font-mono text-[12.5px] leading-none font-medium text-muted-foreground"
      >
        <Lock className="size-3.5 flex-none" strokeWidth={1.75} aria-hidden />
        <span id={fileId} className="min-w-0 truncate text-foreground">
          {filename ?? `${name}.tsx`}
        </span>
        <Badge variant="pro" className="font-sans">
          {pro}
        </Badge>
      </div>

      <div className="relative">
        <pre
          data-slot="locked-code-stub"
          aria-hidden
          className="pointer-events-none absolute inset-0 m-0 overflow-hidden py-4 font-mono text-[13px] leading-6 text-foreground opacity-40 blur-[5px] select-none [mask-image:linear-gradient(#000_45%,transparent)]"
        >
          {lines.map((line, i) => (
            <span key={i} className="block min-h-6 pr-5 whitespace-pre">
              <span className="inline-block w-[52px] pr-[18px] text-right text-muted-foreground">{i + 1}</span>
              {line}
            </span>
          ))}
        </pre>

        <div
          data-slot="locked-code-panel"
          className="group/lock relative px-4 py-[22px] text-center @min-[560px]:px-6 @min-[560px]:pt-[26px] @min-[560px]:pb-6"
        >
          {/* The key slot: a groove that lights while the unlock link is pointed at or focused. */}
          <div aria-hidden className={cn('relative mx-auto mb-4 h-5 w-[132px] rounded-[10px]', PIT)}>
            <i className="absolute top-[9px] right-[18px] left-[18px] h-0.5 rounded-full bg-foreground/20 dark:bg-black" />
            <i
              data-slot="locked-code-light"
              className="absolute top-[9px] right-[18px] left-[18px] h-0.5 rounded-full bg-primary opacity-0 transition-opacity duration-150 ease-out-quint group-has-[a:focus-visible]/lock:opacity-100 motion-reduce:transition-none [@media(hover:hover)]:group-has-[a:hover]/lock:opacity-100"
            />
            <i className={cn('absolute top-[3px] -right-[26px] size-3.5 rounded-full', PIT)} />
          </div>

          <Heading
            id={headingId}
            className="font-serif text-[30px] leading-[1.1] font-normal tracking-[-0.02em] text-balance"
          >
            {heading}
          </Heading>
          <p className="mx-auto mt-2 max-w-[52ch] text-base leading-[1.55] text-pretty text-muted-foreground">
            {fill(body, { name })}
          </p>

          <a
            data-slot="locked-code-unlock"
            href={unlockHref}
            onClick={onUnlock}
            className="mt-[18px] inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground px-[18px] text-[14.5px] leading-none font-medium whitespace-nowrap text-background shadow-[inset_0_1px_0_color-mix(in_oklab,var(--background)_35%,transparent),inset_0_-2px_0_rgb(0_0_0/0.2)] transition-transform duration-150 ease-out-quint outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-[0.97] motion-reduce:transition-none @min-[560px]:w-auto @min-[560px]:min-w-[220px]"
          >
            {unlock}
            {price && (
              <>
                {' '}
                <span aria-hidden>·</span> {price}
              </>
            )}
          </a>
          {priceNote && <p className="mt-2.5 text-sm leading-normal text-pretty text-muted-foreground">{priceNote}</p>}
          {facts.length > 0 && (
            <ul className="mx-auto mt-3.5 flex flex-col items-center gap-1.5 text-sm leading-normal text-muted-foreground @min-[560px]:flex-row @min-[560px]:flex-wrap @min-[560px]:justify-center">
              {facts.map((fact) => (
                <li
                  key={fact}
                  className="@min-[560px]:border-l @min-[560px]:border-foreground/15 @min-[560px]:px-3 @min-[560px]:first:border-l-0"
                >
                  {fact}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {commands.length > 0 && (
        <div
          data-slot="locked-code-keys"
          className="grid gap-x-8 gap-y-3 border-t border-border bg-muted/40 px-4 py-3.5 @min-[680px]:grid-cols-[minmax(220px,300px)_minmax(0,1fr)] @min-[680px]:items-center @min-[680px]:px-5"
        >
          <div>
            <p className="text-[15px] leading-[1.45] text-pretty text-muted-foreground">
              <strong className="font-medium text-foreground">{haveKey}</strong> {haveKeyText}
            </p>
            {(envVar || setupHref) && (
              <p className="mt-1.5 text-[13px] leading-normal text-pretty text-muted-foreground">
                {envVar &&
                  fill(keyNote, {
                    env: <code className="font-mono text-[12px] text-foreground/80">{envVar}</code>,
                  })}
                {envVar && setupHref && ' '}
                {setupHref && (
                  <a
                    href={setupHref}
                    className="rounded-[4px] underline decoration-foreground/30 underline-offset-[3px] outline-none hover:text-foreground hover:decoration-foreground/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    {setup}
                  </a>
                )}
              </p>
            )}
          </div>
          <div className="grid min-w-0 gap-2">
            {commands.map((c) => {
              const lead = c.prefix && c.value.startsWith(c.prefix) ? c.prefix : ''
              return (
                <div
                  key={c.label + c.value}
                  role="group"
                  aria-label={fillText(command, { label: c.label })}
                  data-slot="locked-code-command"
                  className={cn('flex min-w-0 items-center gap-1.5 rounded-[14px] py-1 pr-1 pl-3.5', WELL)}
                >
                  <span
                    aria-hidden
                    className="min-w-7 flex-none font-mono text-[11px] leading-none font-medium text-muted-foreground"
                  >
                    {c.label}
                  </span>
                  <code className="min-w-0 flex-1 py-[5px] font-mono text-[12.5px] leading-[1.45] [overflow-wrap:anywhere] text-foreground">
                    {lead && <span className="text-muted-foreground">{lead}</span>}
                    {breakable(c.value.slice(lead.length))}
                  </code>
                  {/* The copy button's resting fill follows --primary; here it rests muted like a key cap, and
                      keeps its green "copied" and red "not copied" states. */}
                  <span className="inline-flex flex-none [--primary:var(--muted)] [--primary-foreground:var(--foreground)] hover:[--primary:color-mix(in_oklab,var(--foreground)_10%,var(--muted))]">
                    <CopyButton
                      value={c.value}
                      labels={{ copy, copied, failed: copyFailed }}
                      className="rounded-[10px] px-3 text-[13px] shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent),inset_0_-2px_0_rgb(0_0_0/0.12),0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent)]"
                    />
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
