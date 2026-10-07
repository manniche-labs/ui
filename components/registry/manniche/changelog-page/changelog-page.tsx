// A changelog page with a timeline. The filter is a row of radio buttons; :has() hides the changes that do not match,
// so it works without JavaScript and the markup can ship as a static page. Colours come from the theme tokens.
import { ArrowRight, Rss, Sparkles, Wrench, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "new" | "improved" | "fixed";

const kinds: Record<
  Kind,
  { label: string; icon: typeof Sparkles; style: string }
> = {
  new: { label: "New", icon: Sparkles, style: "bg-primary/12 text-primary" },
  improved: {
    label: "Improved",
    icon: Zap,
    style: "bg-success/12 text-success",
  },
  fixed: {
    label: "Fixed",
    icon: Wrench,
    style: "bg-muted text-muted-foreground",
  },
};

// Written out in full so Tailwind can find the classes. A change is hidden when another filter is chosen.
const hideUnless: Record<Kind, string> = {
  new: "group-has-[[value=improved]:checked]/log:hidden group-has-[[value=fixed]:checked]/log:hidden",
  improved:
    "group-has-[[value=new]:checked]/log:hidden group-has-[[value=fixed]:checked]/log:hidden",
  fixed:
    "group-has-[[value=new]:checked]/log:hidden group-has-[[value=improved]:checked]/log:hidden",
};
const hideIfNone: Record<Kind, string> = {
  new: "group-has-[[value=new]:checked]/log:hidden",
  improved: "group-has-[[value=improved]:checked]/log:hidden",
  fixed: "group-has-[[value=fixed]:checked]/log:hidden",
};

type Release = {
  version: string;
  date: string;
  iso: string;
  title: string;
  summary: string;
  highlight?: string[];
  changes: [Kind, string][];
};

const releases: Release[] = [
  {
    version: "4.2",
    date: "1 October 2026",
    iso: "2026-10-01",
    title: "Gift cards and a faster checkout",
    summary:
      "Sell gift cards in any amount, and checkout now loads in half the time on phones.",
    highlight: ["Gift card", "€50", "For Ana, with love"],
    changes: [
      [
        "new",
        "Gift cards in fixed or custom amounts, with an optional message.",
      ],
      ["new", "Customers can check a gift card balance from the order page."],
      ["improved", "Checkout loads 48% faster on mobile networks."],
      [
        "fixed",
        "Discount codes with lowercase letters were sometimes rejected.",
      ],
    ],
  },
  {
    version: "4.1",
    date: "12 September 2026",
    iso: "2026-09-12",
    title: "Stock across warehouses",
    summary:
      "Keep stock in more than one place and let Quayside pick the nearest warehouse for each order.",
    changes: [
      ["new", "Warehouses with their own stock levels and opening hours."],
      ["improved", "Low stock alerts now say which warehouse is running out."],
      ["improved", "The product list remembers your filters between visits."],
      [
        "fixed",
        "CSV exports used the wrong decimal separator for some languages.",
      ],
    ],
  },
  {
    version: "4.0",
    date: "20 August 2026",
    iso: "2026-08-20",
    title: "A calmer admin",
    summary:
      "A new navigation, a dark mode and keyboard shortcuts for everything you do every day.",
    changes: [
      ["new", "Dark mode that follows your system setting."],
      ["new", "Keyboard shortcuts. Press ? anywhere to see them."],
      ["improved", "The sidebar is grouped by task instead of by feature."],
    ],
  },
  {
    version: "3.9",
    date: "29 July 2026",
    iso: "2026-07-29",
    title: "Small fixes before the summer sale",
    summary: "A round of fixes reported by shops getting ready for August.",
    changes: [
      ["fixed", "Shipping labels for parcels over 20 kg printed on two pages."],
      ["fixed", "Order emails showed the wrong time zone for some shops."],
      [
        "improved",
        "Search finds orders by the last four digits of a phone number.",
      ],
    ],
  },
];

function Logo() {
  return (
    <a
      href="#top"
      className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
    >
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
        <rect width="24" height="24" rx="7" className="fill-primary" />
        <path
          d="M6 15c3-2 9-2 12 0M6 10.5c3-2 9-2 12 0"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-primary-foreground"
        />
      </svg>
      Quayside
    </a>
  );
}

function KindBadge({ kind }: { kind: Kind }) {
  const { label, icon: Icon, style } = kinds[kind];
  return (
    <span
      className={cn(
        "inline-flex w-24 shrink-0 items-center gap-1.5 self-start rounded-full px-2 py-0.5 text-xs font-medium",
        style,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}

/** Changelog page: a filterable timeline of releases with a highlight card, a version index and a subscribe form. */
export function ChangelogPage() {
  return (
    <div
      id="top"
      className="group/log min-h-dvh bg-background font-sans text-foreground antialiased"
    >
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Logo />
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            / Changelog
          </span>
          <a
            href="#subscribe"
            className="ml-auto inline-flex size-11 shrink-0 items-center justify-center gap-2 rounded-full border text-sm transition-colors sm:size-auto sm:px-3 sm:py-1.5 duration-150 hover:bg-muted"
          >
            <Rss className="size-4 text-primary" aria-hidden />
            <span className="sr-only sm:not-sr-only">Subscribe</span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="py-14 sm:py-20">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            What’s new in Quayside
          </h1>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">
            New features, improvements and fixes. We ship small changes every
            week and bigger ones about once a month.
          </p>

          <fieldset className="mt-8 flex flex-wrap gap-2 text-sm">
            <legend className="sr-only">Show</legend>
            {(
              [
                ["all", "Everything"],
                ["new", "New"],
                ["improved", "Improved"],
                ["fixed", "Fixed"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="cursor-pointer rounded-full border px-3.5 py-1.5 text-muted-foreground transition-[background-color,color,border-color] duration-150 hover:text-foreground has-checked:border-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-background"
              >
                <input
                  type="radio"
                  name="changelog-filter"
                  value={value}
                  defaultChecked={value === "all"}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </fieldset>
        </div>

        <div className="grid gap-12 pb-20 lg:grid-cols-[1fr_12rem]">
          <ol className="relative">
            {releases.map((r, i) => {
              const present = new Set(r.changes.map(([k]) => k));
              const missing = (Object.keys(kinds) as Kind[]).filter(
                (k) => !present.has(k),
              );
              return (
                <li
                  key={r.version}
                  id={`v${r.version}`}
                  className={cn(
                    "relative grid scroll-mt-6 gap-4 pb-14 pl-8 sm:grid-cols-[9rem_1fr] sm:gap-12 sm:pl-0",
                    missing.map((k) => hideIfNone[k]),
                  )}
                >
                  <span
                    aria-hidden
                    className="absolute top-2 bottom-0 left-[5px] w-px bg-border sm:left-[10.5rem]"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-1.5 left-0 size-[11px] rounded-full border-2 border-background ring-1 sm:left-[calc(10.5rem-5px)]",
                      i === 0
                        ? "bg-primary ring-primary"
                        : "bg-muted-foreground/40 ring-border",
                    )}
                  />
                  <div className="sm:pt-0.5">
                    <p className="font-semibold tabular-nums">v{r.version}</p>
                    <time
                      dateTime={r.iso}
                      className="text-sm text-muted-foreground"
                    >
                      {r.date}
                    </time>
                  </div>
                  <article className="min-w-0">
                    {i === 0 && (
                      <span className="mb-3 inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                        Latest
                      </span>
                    )}
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {r.title}
                    </h2>
                    <p className="mt-2 text-muted-foreground">{r.summary}</p>

                    {r.highlight && (
                      <div className="mt-6 overflow-hidden rounded-2xl border bg-muted/50 p-6 sm:p-8">
                        <div className="mx-auto max-w-xs -rotate-2 rounded-2xl bg-primary p-5 text-primary-foreground shadow-xl shadow-primary/25 transition-transform duration-500 ease-out-quint hover:rotate-0 starting:rotate-6 starting:opacity-0 motion-reduce:transition-none motion-reduce:hover:-rotate-2 motion-reduce:starting:-rotate-2 motion-reduce:starting:opacity-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                              {r.highlight[0]}
                            </span>
                            <span className="opacity-75">Quayside</span>
                          </div>
                          <p className="mt-8 text-4xl font-semibold tracking-tight">
                            {r.highlight[1]}
                          </p>
                          <p className="mt-1 text-sm opacity-80">
                            {r.highlight[2]}
                          </p>
                        </div>
                      </div>
                    )}

                    <ul className="mt-6 space-y-3">
                      {r.changes.map(([kind, text]) => (
                        <li
                          key={text}
                          className={cn("flex gap-3 text-sm", hideUnless[kind])}
                        >
                          <KindBadge kind={kind} />
                          <span className="pt-px">{text}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </li>
              );
            })}
          </ol>

          <aside className="hidden lg:block">
            <nav aria-label="Versions" className="sticky top-6">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Versions
              </p>
              <ul className="mt-3 space-y-1 border-l text-sm">
                {releases.map((r) => (
                  <li key={r.version}>
                    <a
                      href={`#v${r.version}`}
                      className="-ml-px block border-l border-transparent py-1 pl-4 text-muted-foreground transition-colors duration-150 hover:border-foreground hover:text-foreground"
                    >
                      v{r.version}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>

        <section
          id="subscribe"
          className="mb-20 rounded-3xl border bg-card p-6 sm:p-10"
        >
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Get the changelog by email
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                One short email when we ship something worth knowing.
                Unsubscribe in one click.
              </p>
            </div>
            <form action="#" className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="changelog-email" className="sr-only">
                Email
              </label>
              <input
                id="changelog-email"
                type="email"
                required
                placeholder="you@shop.com"
                className="h-11 rounded-full border bg-background px-4 text-sm outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-4 focus:ring-ring/15 sm:w-64"
              />
              <button
                type="submit"
                className="group/sub inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Subscribe
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover/sub:translate-x-0.5"
                  aria-hidden
                />
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <p className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
          © 2026 Quayside. A template from Manniche UI.
        </p>
      </footer>
    </div>
  );
}
