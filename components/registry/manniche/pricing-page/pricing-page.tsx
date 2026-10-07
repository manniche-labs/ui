// A pricing page for a software product. The monthly/yearly switch is two radio buttons and a :has() selector,
// so it works without JavaScript and the same markup can ship as a static page. Colours come from the theme tokens.
import { ArrowRight, Check, Minus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type Plan = { name: string; blurb: string; monthly: number; yearly: number; cta: string; featured?: boolean; features: string[] }

const plans: Plan[] = [
  {
    name: 'Starter',
    blurb: 'For a first shop and the first hundred orders.',
    monthly: 19,
    yearly: 15,
    cta: 'Start free trial',
    features: ['1 shop', 'Up to 200 products', 'Card and wallet payments', 'Email receipts', 'Basic reports'],
  },
  {
    name: 'Growth',
    blurb: 'For shops that sell every day and ship every week.',
    monthly: 49,
    yearly: 39,
    cta: 'Start free trial',
    featured: true,
    features: ['Everything in Starter', 'Unlimited products', 'Discount codes and gift cards', 'Abandoned cart emails', 'Shipping labels', '3 staff accounts'],
  },
  {
    name: 'Scale',
    blurb: 'For several shops, warehouses and a team.',
    monthly: 129,
    yearly: 99,
    cta: 'Talk to us',
    features: ['Everything in Growth', 'Up to 5 shops', 'Stock across warehouses', 'Custom reports', 'Priority support', 'Unlimited staff'],
  },
]

type Cell = boolean | string
const compare: { group: string; rows: [string, Cell, Cell, Cell][] }[] = [
  {
    group: 'Selling',
    rows: [
      ['Products', '200', 'Unlimited', 'Unlimited'],
      ['Shops', '1', '1', '5'],
      ['Discount codes', false, true, true],
      ['Gift cards', false, true, true],
    ],
  },
  {
    group: 'Running the shop',
    rows: [
      ['Shipping labels', false, true, true],
      ['Stock across warehouses', false, false, true],
      ['Staff accounts', '1', '3', 'Unlimited'],
      ['Reports', 'Basic', 'Standard', 'Custom'],
    ],
  },
  {
    group: 'Support',
    rows: [
      ['Help centre and email', true, true, true],
      ['Chat', false, true, true],
      ['Named contact', false, false, true],
    ],
  },
]

const faq = [
  ['Is there a free trial?', 'Yes. Every plan starts with 14 days free and no card. You only pay when you decide to keep it.'],
  ['Can I change plan later?', 'Any time. Moving up takes effect at once, and moving down applies from the next billing period.'],
  ['Do you take a cut of my sales?', 'No. You pay the plan and the card fee from your payment provider. Nothing more.'],
  ['What happens to my shop if I cancel?', 'You can export products, orders and customers as CSV for 90 days after you cancel.'],
]

const logos = ['Northfield', 'Oak & Ore', 'Halden', 'Saltwork', 'Pebble Co.', 'Marlow']

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
        <rect width="24" height="24" rx="7" className="fill-primary" />
        <path d="M6 15c3-2 9-2 12 0M6 10.5c3-2 9-2 12 0" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-primary-foreground" />
      </svg>
      Quayside
    </a>
  )
}

function Price({ plan }: { plan: Plan }) {
  return (
    <p className="mt-6 flex items-baseline gap-1">
      <span className="text-4xl font-semibold tracking-tight tabular-nums">
        <span className="group-has-[[value=yearly]:checked]/pricing:hidden">€{plan.monthly}</span>
        <span className="hidden group-has-[[value=yearly]:checked]/pricing:inline">€{plan.yearly}</span>
      </span>
      <span className={cn('text-sm', plan.featured ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
        / month
        <span className="hidden group-has-[[value=yearly]:checked]/pricing:inline">, billed yearly</span>
      </span>
    </p>
  )
}

function Mark({ value, featured }: { value: Cell; featured?: boolean }) {
  if (value === true) return <Check className={cn('mx-auto size-4', featured ? 'text-primary' : 'text-foreground')} aria-label="Included" />
  if (value === false) return <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="Not included" />
  return <span className="text-sm">{value}</span>
}

export type PricingPageLabels = {
  /** Accessible name of the scrollable plan comparison table. Default: "Plan comparison table". */
  compareTable?: string
}

export type PricingPageProps = {
  /** Screen reader text with English defaults. Keys: compareTable. */
  labels?: PricingPageLabels
}

/** Pricing page: plans with a monthly/yearly switch, a comparison table, FAQ and a closing call to action. */
export function PricingPage({ labels = {} }: PricingPageProps) {
  const { compareTable = 'Plan comparison table' } = labels
  return (
    <div id="top" className="group/pricing min-h-dvh bg-background font-sans text-foreground antialiased">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Main" className="hidden sm:block">
            <ul className="flex gap-6 text-sm text-muted-foreground">
              {['Product', 'Pricing', 'Customers', 'Docs'].map((n) => (
                <li key={n}>
                  <a
                    href={`#${n.toLowerCase()}`}
                    aria-current={n === 'Pricing' ? 'page' : undefined}
                    className="transition-colors duration-150 hover:text-foreground aria-[current=page]:text-foreground"
                  >
                    {n}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a href="#signin" className="hidden rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
              Sign in
            </a>
            <a
              href="#trial"
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Try it free
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-80 max-w-3xl rounded-full bg-primary/15 blur-3xl" />
          <div className="relative mx-auto max-w-3xl px-4 pt-16 pb-10 text-center sm:px-6 sm:pt-24">
            <p className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              14 days free on every plan
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">Pricing that grows when your shop does</h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-pretty text-muted-foreground">
              One flat monthly price. No cut of your sales, no setup fee, and you can change plan whenever you like.
            </p>

            <fieldset className="mt-8 inline-flex rounded-full border bg-muted p-1 text-sm font-medium">
              <legend className="sr-only">Billing period</legend>
              {[
                ['monthly', 'Monthly'],
                ['yearly', 'Yearly'],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className="relative flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-muted-foreground transition-colors duration-200 has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-ring"
                >
                  <input type="radio" name="billing" value={value} defaultChecked={value === 'monthly'} className="sr-only" />
                  {label}
                  {value === 'yearly' && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">−20%</span>}
                </label>
              ))}
            </fieldset>
          </div>
        </section>

        <section aria-label="Plans" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <ul className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
            {plans.map((plan) => (
              <li
                key={plan.name}
                className={cn(
                  'relative flex flex-col rounded-3xl border p-7 transition-[translate,box-shadow] duration-300 ease-out-quint starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100',
                  plan.featured
                    ? 'border-transparent bg-primary text-primary-foreground shadow-xl shadow-primary/20 lg:-my-3 lg:py-10'
                    : 'bg-card hover:shadow-lg',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  {plan.featured && <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium">Most chosen</span>}
                </div>
                <p className={cn('mt-2 text-sm', plan.featured ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{plan.blurb}</p>
                <Price plan={plan} />
                <a
                  href="#trial"
                  className={cn(
                    'group/cta mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100',
                    plan.featured ? 'bg-primary-foreground text-primary' : 'bg-foreground text-background',
                  )}
                >
                  {plan.cta}
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover/cta:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover/cta:translate-x-0" aria-hidden />
                </a>
                <ul className={cn('mt-8 space-y-3 border-t pt-6 text-sm', plan.featured && 'border-primary-foreground/20')}>
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <Check className={cn('mt-0.5 size-4 shrink-0', plan.featured ? 'text-primary-foreground' : 'text-primary')} aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <div className="mt-14 text-center">
            <p className="text-sm text-muted-foreground">Trusted by 4,000 independent shops</p>
            <ul className="mt-5 flex flex-wrap justify-center gap-x-10 gap-y-3 text-lg font-semibold tracking-tight text-muted-foreground">
              {logos.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="compare" className="border-t bg-muted/40">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
            <h2 id="compare" className="text-center text-3xl font-semibold tracking-tight">
              Compare plans
            </h2>
            <div role="region" aria-label={compareTable} tabIndex={0} className="mt-10 overflow-x-auto rounded-2xl border bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <table className="w-full min-w-136 text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th scope="col" className="w-2/5 p-4 font-medium text-muted-foreground">
                      Feature
                    </th>
                    {plans.map((p) => (
                      <th key={p.name} scope="col" className={cn('p-4 text-center font-semibold', p.featured && 'bg-accent text-accent-foreground')}>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                {compare.map((g) => (
                  <tbody key={g.group}>
                    <tr>
                      <th colSpan={4} scope="colgroup" className="bg-muted/60 px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {g.group}
                      </th>
                    </tr>
                    {g.rows.map(([label, ...cells]) => (
                      <tr key={label} className="border-t transition-colors duration-150 hover:bg-muted/40">
                        <th scope="row" className="p-4 font-normal">
                          {label}
                        </th>
                        {cells.map((c, i) => (
                          <td key={i} className={cn('p-4 text-center', plans[i].featured && 'bg-accent/50')}>
                            <Mark value={c} featured={plans[i].featured} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </div>
        </section>

        <section aria-labelledby="faq" className="mx-auto grid max-w-5xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="faq" className="text-3xl font-semibold tracking-tight">
              Questions
            </h2>
            <p className="mt-3 text-muted-foreground">
              Can’t find it here?{' '}
              <a href="mailto:hello@example.com" className="font-medium text-foreground underline underline-offset-4">
                Write to us
              </a>
              .
            </p>
          </div>
          <div className="divide-y rounded-2xl border bg-card">
            {faq.map(([q, a]) => (
              <details key={q} className="group/faq px-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border text-muted-foreground transition-transform duration-200 group-open/faq:rotate-45 motion-reduce:transition-none"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="pb-5 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="trial" className="px-4 pb-20 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-foreground px-6 py-14 text-center text-background sm:py-20">
            <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-primary/40 blur-3xl" />
            <h2 className="relative text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Open your shop this afternoon</h2>
            <p className="relative mx-auto mt-3 max-w-md text-background/70">14 days free. No card, no setup fee, and your products stay yours.</p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#trial"
                className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Start free trial
              </a>
              <a
                href="#demo"
                className="rounded-full border border-background/25 px-6 py-3 text-sm font-medium transition-colors duration-150 hover:bg-background/10"
              >
                Book a demo
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <Logo />
          <p className="ml-auto">© 2026 Quayside. A template from Manniche UI.</p>
        </div>
      </footer>
    </div>
  )
}
