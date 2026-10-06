// Contact channels: one tile per way to reach a team (email, phone, chat, in person), the recommended one inverted,
// and a short FAQ underneath. Signature: every channel says how fast it answers, in mono.
// Screen readers get a section named by its h2, a real list of channels with an h3 each, and a FAQ of native
// <details> elements. Under reduced motion the answer simply appears.
import { useId, type HTMLAttributes, type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ContactChannel = {
  /** Stable key for the channel. */
  id: string
  /** A small icon node, e.g. a lucide icon. Decorative. */
  icon?: ReactNode
  /** The channel name: "Email", "Phone". */
  title: ReactNode
  /** The address, number or opening line. */
  detail: ReactNode
  /** The one link or button of the tile. */
  action: { label: string; href: string; external?: boolean }
  /** How fast it answers, in mono: "Within 2 working days". */
  responseTime?: string
}

export type ContactFaq = { question: string; answer: ReactNode }

export type ContactChannelsProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  /** The section heading (h2). */
  heading: ReactNode
  /** One line under the heading. */
  intro?: ReactNode
  /** The channels, in reading order. */
  channels: ContactChannel[]
  /** The id of the recommended channel, shown as the inverted tile. */
  recommendedId?: string
  /** Short questions and answers below the channels. */
  faq?: ContactFaq[]
  /** Heading of the FAQ (h3). */
  faqHeading?: ReactNode
  /** UI strings, for translation. */
  labels?: { recommended?: string; responds?: string; newTab?: string }
}

export function ContactChannels({
  heading,
  intro,
  channels,
  recommendedId,
  faq = [],
  faqHeading = 'Quick answers',
  labels = {},
  className,
  ...rest
}: ContactChannelsProps) {
  const { recommended = 'Recommended', responds = 'Answers', newTab = '(opens in a new tab)' } = labels
  const hid = useId()
  return (
    <section aria-labelledby={hid} className={cn('@container mx-auto w-full max-w-6xl px-4 py-12 sm:px-6', className)} {...rest}>
      <header className="max-w-2xl">
        <h2 id={hid} className="font-[family-name:var(--font-display,inherit)] text-3xl font-semibold tracking-tight text-balance @min-[40rem]:text-4xl">
          {heading}
        </h2>
        {intro && <p className="mt-3 text-muted-foreground">{intro}</p>}
      </header>

      <ul className="mt-8 grid list-none gap-3 p-0 @min-[36rem]:grid-cols-2 @min-[64rem]:grid-cols-4">
        {channels.map((c) => {
          const inverted = c.id === recommendedId
          return (
            <li key={c.id} className="min-w-0">
              <article
                data-inverted={inverted || undefined}
                className={cn(
                  'flex h-full flex-col rounded-[26px] p-6',
                  inverted
                    ? 'bg-foreground text-background'
                    : 'bg-card text-card-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]',
                )}
                style={
                  inverted
                    ? ({
                        '--muted-foreground': 'color-mix(in oklab, var(--background) 64%, var(--foreground))',
                        '--ring': 'var(--background)',
                      } as React.CSSProperties)
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    aria-hidden
                    className={cn('grid size-10 place-items-center rounded-[14px] [&_svg]:size-5', inverted ? 'bg-background/12' : 'bg-muted')}
                  >
                    {c.icon}
                  </span>
                  {inverted && (
                    <span className="rounded-full bg-background/12 px-2.5 py-1 font-mono text-[11px] tracking-wide uppercase">{recommended}</span>
                  )}
                </div>
                <h3 className="mt-5 text-lg font-semibold">{c.title}</h3>
                <p className="mt-1 break-words text-sm text-muted-foreground">{c.detail}</p>
                {c.responseTime && (
                  <p className="mt-4 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {responds}: {c.responseTime}
                  </p>
                )}
                <a
                  href={c.action.href}
                  {...(c.action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={cn(
                    'mt-5 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full px-4 text-sm font-medium',
                    'transition-[opacity,transform] duration-200 ease-out-quint active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
                    'outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
                    inverted ? 'bg-background text-foreground' : 'bg-primary text-primary-foreground',
                  )}
                >
                  {c.action.label}
                  {c.action.external && <span className="sr-only">{newTab}</span>}
                  <ArrowUpRight className="size-4" aria-hidden />
                </a>
              </article>
            </li>
          )
        })}
      </ul>

      {faq.length > 0 && (
        <div className="mt-10 max-w-3xl">
          <h3 className="text-lg font-semibold">{faqHeading}</h3>
          <div className="mt-3 divide-y divide-border rounded-[26px] bg-card px-6 shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent)]">
            {faq.map((f) => (
              <details key={f.question} className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                  {f.question}
                  <span aria-hidden className="font-mono text-muted-foreground group-open:hidden">+</span>
                  <span aria-hidden className="hidden font-mono text-muted-foreground group-open:inline">-</span>
                </summary>
                <div className="pb-4 text-sm text-muted-foreground motion-safe:group-open:animate-[contact-faq-in_250ms_cubic-bezier(0.22,1,0.36,1)]">
                  {f.answer}
                </div>
              </details>
            ))}
          </div>
          <style>{`@keyframes contact-faq-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}`}</style>
        </div>
      )}
    </section>
  )
}
