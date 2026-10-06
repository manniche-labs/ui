// A call to action as one inverted Tiles band: a display headline, one sentence, a primary and a secondary action
// and a small fact line. The band swaps to the opposite theme (dark on a light page, light on a dark one) and every
// token inside follows, so the section is the single loud thing on its stretch of the page. Signature: on wide boxes
// the actions sit at the right, level with the bottom of the text; on narrow ones they stack full width.
// Screen readers get a labelled section with one h2, the sentence, two links and the fact line as a plain paragraph.
// Nothing animates except the press feedback on the buttons, which is a 150 ms transform and is dropped under
// reduced motion. The section adapts to its own box (container queries), not only to the viewport.
import { ArrowRight } from 'lucide-react'
import { useId, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type CtaAction = {
  /** The visible text of the link. */
  label: string
  /** Where the link goes. */
  href: string
  /** Open in a new tab. Adds `rel="noopener noreferrer"` and the hidden "(opens in a new tab)" text. */
  external?: boolean
  /** Called on click, for apps that handle the navigation themselves. */
  onClick?: ComponentProps<'a'>['onClick']
}

export type CtaBandLabels = {
  /** Hidden text added after links that open in a new tab. Default "(opens in a new tab)". */
  newTab?: string
}

export type CtaBandProps = Omit<ComponentProps<'section'>, 'children' | 'title'> & {
  /** The display line. Keep it short; it is set in the display face and balanced across lines. */
  headline: ReactNode
  /** One sentence under the headline that says what happens next. */
  description?: ReactNode
  /** The one primary action. */
  primary: CtaAction
  /** A quieter second action, such as "Talk to us". */
  secondary?: CtaAction
  /** A plain promise under the band's content, such as "No card needed. Cancel any time." Never a statistic. */
  fact?: ReactNode
  /** Text for the interface itself, for translation. */
  labels?: CtaBandLabels
}

// Snapshots of the page's tokens, taken on the outer element so the inner one can swap them without a cycle.
const INVERT_OUTER = {
  '--tile-bg': 'var(--foreground)',
  '--tile-fg': 'var(--background)',
  '--tile-primary': 'var(--primary)',
} as CSSProperties

const INVERT_INNER = {
  '--card': 'var(--tile-bg)',
  '--card-foreground': 'var(--tile-fg)',
  '--foreground': 'var(--tile-fg)',
  '--background': 'var(--tile-bg)',
  '--muted': 'color-mix(in oklab, var(--tile-fg) 10%, var(--tile-bg))',
  '--muted-foreground': 'color-mix(in oklab, var(--tile-fg) 64%, var(--tile-bg))',
  '--border': 'color-mix(in oklab, var(--tile-fg) 15%, var(--tile-bg))',
  '--primary': 'color-mix(in oklab, var(--tile-primary) 80%, var(--tile-fg))',
  '--ring': 'color-mix(in oklab, var(--tile-primary) 80%, var(--tile-fg))',
} as CSSProperties

const BUTTON =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium whitespace-nowrap transition-[transform,opacity] duration-150 ease-out-quint active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 @min-[40rem]:w-auto'

function ActionLink({ action, newTab, className, children }: { action: CtaAction; newTab: string; className: string; children?: ReactNode }) {
  return (
    <a
      href={action.href}
      onClick={action.onClick}
      target={action.external ? '_blank' : undefined}
      rel={action.external ? 'noopener noreferrer' : undefined}
      className={className}
    >
      {action.label}
      {action.external && <span className="sr-only"> {newTab}</span>}
      {children}
    </a>
  )
}

/** The inverted call-to-action band: headline, sentence, one primary and one secondary action, and a fact line. */
export function CtaBand({ headline, description, primary, secondary, fact, labels, className, ...rest }: CtaBandProps) {
  const headingId = useId()
  const newTab = labels?.newTab ?? '(opens in a new tab)'
  return (
    <section
      aria-labelledby={headingId}
      {...rest}
      className={cn('@container mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 @3xl:py-20', className)}
    >
      <div
        className="rounded-[calc(var(--radius)*2+2px)] bg-foreground text-background"
        style={INVERT_OUTER}
      >
        <div className="px-6 py-10 @min-[40rem]:px-10 @min-[40rem]:py-12 @min-[64rem]:px-14 @min-[64rem]:py-16" style={INVERT_INNER}>
          <div className="grid gap-8 @min-[48rem]:grid-cols-[minmax(0,1fr)_auto] @min-[48rem]:items-end @min-[48rem]:gap-x-12">
            <div className="min-w-0">
              <h2
                id={headingId}
                className="max-w-[18ch] text-[clamp(2rem,7.5cqi,3.75rem)] leading-[1.02] font-extrabold tracking-[-0.04em] text-balance"
                style={{ fontFamily: 'var(--font-display, inherit)', fontStretch: '86%' }}
              >
                {headline}
              </h2>
              {description && (
                <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-pretty text-muted-foreground @min-[40rem]:text-[17px]">
                  {description}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 @min-[40rem]:flex-row @min-[40rem]:flex-wrap @min-[48rem]:justify-end">
              <ActionLink action={primary} newTab={newTab} className={cn(BUTTON, 'bg-foreground text-background hover:opacity-90')}>
                <ArrowRight aria-hidden className="size-4" />
              </ActionLink>
              {secondary && (
                <ActionLink
                  action={secondary}
                  newTab={newTab}
                  className={cn(BUTTON, 'bg-transparent text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-muted')}
                />
              )}
            </div>
          </div>
          {fact && (
            <p className="mt-8 border-t border-border pt-5 font-mono text-[12px] leading-relaxed tracking-[0.01em] text-muted-foreground">
              {fact}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
