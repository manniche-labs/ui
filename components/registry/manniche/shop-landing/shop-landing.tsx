// A full landing page for a small shop. Every interaction is plain HTML and CSS (details, :hover, :focus-within),
// so the same markup works as React and as a static page. Colours come from the theme tokens.
import { ArrowRight, Leaf, Menu, RotateCcw, Search, ShieldCheck, ShoppingBag, Star, Truck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProductArt, type ProductArtKind } from './product-art'

const nav = ['Shop', 'Collections', 'Journal', 'About']

const products: { name: string; price: string; kind: ProductArtKind; colours: [cls: string, name: string][]; badge?: string }[] = [
  { name: 'Morning mug', price: '€24', kind: 'mug', colours: [['bg-primary', 'Green'], ['bg-foreground/70', 'Charcoal'], ['bg-muted-foreground/40', 'Sand']], badge: 'New' },
  { name: 'Tall vase', price: '€58', kind: 'vase', colours: [['bg-primary', 'Green'], ['bg-foreground/70', 'Charcoal']] },
  { name: 'Serving bowl', price: '€42', kind: 'bowl', colours: [['bg-primary', 'Green'], ['bg-muted-foreground/40', 'Sand']] },
  { name: 'Water carafe', price: '€36', kind: 'carafe', colours: [['bg-primary/40', 'Pale green']], badge: 'Back in stock' },
]

const promises = [
  { icon: Truck, title: 'Free delivery', text: 'On orders over €60' },
  { icon: RotateCcw, title: '30-day returns', text: 'Free and no questions' },
  { icon: Leaf, title: 'Small batches', text: 'From 12 workshops' },
  { icon: ShieldCheck, title: '2-year guarantee', text: 'On every piece' },
]

const reviews = [
  { quote: 'The mugs keep coffee warm for ages and they look even better in person.', name: 'Ana R.', item: 'Morning mug, set of 4' },
  { quote: 'Arrived in two days, packed in paper and straw. Not a single chip.', name: 'Jonas P.', item: 'Serving bowl' },
  { quote: 'I bought one plate to try. I now own twelve. Send help.', name: 'Mei L.', item: 'Dinner plates' },
]

const faq = [
  ['Are the pieces dishwasher safe?', 'Yes. Everything is glazed and fired at 1,240 °C, so it goes in the dishwasher and the microwave.'],
  ['How long does delivery take?', 'We pack within 48 hours. Most orders arrive two to four working days later.'],
  ['Can I return something?', 'Within 30 days, for free. Print the label from your order page and drop it at any parcel shop.'],
  ['Why do the colours vary a little?', 'Every piece is glazed by hand, so no two are quite the same. That is the point.'],
]

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
        <circle cx="12" cy="12" r="11" className="fill-primary" />
        <path d="M12 5c4 3 4 11 0 14-4-3-4-11 0-14Z" className="fill-primary-foreground" />
      </svg>
      Linden
    </a>
  )
}

function Stars({ className }: { className?: string }) {
  return (
    <span className={cn('flex text-primary', className)} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className="size-4 fill-current" />
      ))}
    </span>
  )
}

export type ShopLandingLabels = {
  /** Text of the button on each product card. Default: "Add to bag". */
  addToBag?: string
  /** Screen reader and visible text for the number of colours of a product, from the count. Default: "{n} colours" ("1 colour" for one). */
  colours?: (count: number) => string
}

export type ShopLandingProps = {
  /** Called with the product name and price when a product's "Add to bag" button is pressed. Without it the button does nothing. */
  onAddToBag?: (product: { name: string; price: string }) => void
  /** Visible text and screen reader text, with English defaults. Keys: addToBag, colours. */
  labels?: ShopLandingLabels
}

/** Landing page for a homeware shop: hero, promises, products, collections, story, reviews, FAQ and newsletter. */
export function ShopLanding({ onAddToBag, labels = {} }: ShopLandingProps) {
  const { addToBag = 'Add to bag', colours = (n: number) => (n === 1 ? '1 colour' : `${n} colours`) } = labels
  return (
    <div id="top" className="min-h-dvh bg-background font-sans text-foreground antialiased">
      <p className="bg-foreground px-4 py-2 text-center text-xs text-background sm:text-sm">Free delivery over €60 · Returns within 30 days</p>

      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex gap-6 text-sm text-muted-foreground">
              {nav.map((n) => (
                <li key={n}>
                  <a href={`#${n.toLowerCase()}`} className="transition-colors duration-150 hover:text-foreground">
                    {n}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <a href="#search" aria-label="Search" className="grid size-11 place-items-center rounded-full transition-colors hover:bg-muted">
              <Search className="size-5" aria-hidden />
            </a>
            <a href="#bag" aria-label="Bag, 2 items" className="relative grid size-11 place-items-center rounded-full transition-colors hover:bg-muted">
              <ShoppingBag className="size-5" aria-hidden />
              <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                2
              </span>
            </a>
            <details className="group relative md:hidden">
              <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-full hover:bg-muted [&::-webkit-details-marker]:hidden">
                <Menu className="size-5 group-open:hidden" aria-hidden />
                <X className="hidden size-5 group-open:block" aria-hidden />
                <span className="sr-only">Menu</span>
              </summary>
              <nav aria-label="Mobile" className="absolute top-12 right-0 w-56 rounded-2xl border bg-card p-2 shadow-lg">
                {nav.map((n) => (
                  <a key={n} href={`#${n.toLowerCase()}`} className="block rounded-xl px-3 py-3 text-sm hover:bg-muted">
                    {n}
                  </a>
                ))}
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 md:grid-cols-[1.05fr_1fr] md:pt-20">
          <div className="transition duration-700 ease-out starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none">
            <a href="#shop" className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm shadow-sm transition-colors hover:bg-muted">
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">New</span>
              The spring edit is here
              <ArrowRight className="size-3.5" aria-hidden />
            </a>
            <h1 className="mt-6 font-serif text-5xl leading-[1.05] tracking-tight text-balance sm:text-6xl">Things for slow mornings and long tables.</h1>
            <p className="mt-5 max-w-md text-lg text-pretty text-muted-foreground">
              Stoneware, glass and linen from small workshops. Made to be used every day and handed down after.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#shop"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none"
              >
                Shop the edit <ArrowRight className="size-4" aria-hidden />
              </a>
              <a
                href="#collections"
                className="inline-flex min-h-12 items-center rounded-full border bg-card px-6 font-medium transition-colors hover:bg-muted"
              >
                See collections
              </a>
            </div>
            <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
              <Stars />
              <span>
                <b className="font-semibold text-foreground">4.9</b> from 2,300 reviews
              </span>
            </div>
          </div>

          <div className="relative grid aspect-square grid-cols-6 grid-rows-6 gap-3 transition delay-150 duration-700 ease-out starting:scale-95 starting:opacity-0 motion-reduce:transition-none">
            <div className="col-span-4 row-span-4 rounded-[2rem] bg-accent p-8">
              <ProductArt kind="vase" />
            </div>
            <div className="col-span-2 row-span-3 rounded-[2rem] bg-muted p-4">
              <ProductArt kind="mug" />
            </div>
            <div className="col-span-2 row-span-3 rounded-[2rem] bg-primary/15 p-4">
              <ProductArt kind="carafe" />
            </div>
            <div className="col-span-4 row-span-2 flex items-center gap-4 rounded-[2rem] border bg-card p-4 shadow-sm">
              <div className="size-16 shrink-0 rounded-2xl bg-muted p-1">
                <ProductArt kind="bowl" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Bestseller</p>
                <p className="truncate font-medium">Serving bowl, sand</p>
              </div>
              <span className="ml-auto font-semibold">€42</span>
            </div>
          </div>
        </section>

        {/* Promises */}
        <section aria-label="Our promises" className="border-y bg-card">
          <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 sm:px-6 lg:grid-cols-4">
            {promises.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-center gap-3 py-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-sm text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Products */}
        <section id="shop" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary">Most loved</p>
              <h2 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl">This week’s favourites</h2>
            </div>
            <a href="#shop" className="hidden items-center gap-1 text-sm font-medium hover:underline sm:inline-flex">
              View all <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {products.map((p) => (
              <li key={p.name} className="group relative">
                <div className="pointer-events-none relative z-10 aspect-[4/5] overflow-hidden rounded-3xl bg-muted p-6 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lg motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                  <div className="h-full transition duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                    <ProductArt kind={p.kind} />
                  </div>
                  {p.badge && <span className="absolute top-3 left-3 rounded-full bg-card px-2.5 py-1 text-xs font-medium shadow-sm">{p.badge}</span>}
                  <button
                    type="button"
                    onClick={() => onAddToBag?.({ name: p.name, price: p.price })}
                    className="pointer-events-auto absolute inset-x-3 bottom-3 min-h-11 translate-y-2 rounded-full bg-foreground py-2.5 text-center text-sm font-medium text-background opacity-0 transition duration-200 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none"
                  >
                    {addToBag}
                    <span className="sr-only">: {p.name}</span>
                  </button>
                </div>
                <div className="mt-4 flex items-start justify-between gap-2">
                  <h3 className="font-medium">
                    <a href="#shop" className="after:absolute after:inset-0">
                      {p.name}
                    </a>
                  </h3>
                  <span className="font-medium">{p.price}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <ul className="flex gap-1.5">
                    {p.colours.map(([cls, name]) => (
                      <li key={cls} className={cn('size-3.5 rounded-full ring-1 ring-border', cls)}>
                        <span className="sr-only">{name}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">{colours(p.colours.length)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Collections */}
        <section id="collections" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6">
          <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">Shop by collection</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3 md:grid-rows-2">
            {[
              { title: 'Tableware', count: '48 pieces', kind: 'plate' as const, cls: 'md:col-span-2 md:row-span-2 bg-accent', art: 'md:h-80' },
              { title: 'Glass', count: '16 pieces', kind: 'carafe' as const, cls: 'bg-muted', art: '' },
              { title: 'Linen', count: '22 pieces', kind: 'linen' as const, cls: 'bg-primary/15', art: '' },
            ].map((c) => (
              <a
                key={c.title}
                href="#collections"
                className={cn('group flex flex-col justify-between overflow-hidden rounded-[2rem] p-6 transition hover:shadow-lg motion-reduce:transition-none', c.cls)}
              >
                <div className={cn('mx-auto h-40 w-full max-w-xs transition duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100', c.art)}>
                  <ProductArt kind={c.kind} />
                </div>
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{c.title}</h3>
                    <p className="text-sm text-muted-foreground">{c.count}</p>
                  </div>
                  <span className="grid size-11 place-items-center rounded-full bg-card shadow-sm transition group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
                    <ArrowRight className="size-4" aria-hidden />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Story */}
        <section id="about" className="scroll-mt-20 bg-foreground text-background">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium opacity-70">Our story</p>
              <h2 className="mt-2 font-serif text-3xl tracking-tight text-balance sm:text-4xl">Made slowly, by people who sign their work.</h2>
              <p className="mt-5 max-w-md opacity-75">
                We started with one potter and a kiln in a garage. Today we work with twelve workshops, and every piece still carries the maker’s mark on the
                base.
              </p>
              <a
                href="#journal"
                className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-background px-6 font-medium text-foreground transition hover:opacity-90"
              >
                Meet the makers <ArrowRight className="size-4" aria-hidden />
              </a>
            </div>
            <dl className="grid grid-cols-2 gap-px self-end overflow-hidden rounded-3xl bg-background/15">
              {[
                ['12', 'workshops'],
                ['48 h', 'to dispatch'],
                ['31,000', 'orders sent'],
                ['4.9 / 5', 'average rating'],
              ].map(([v, l]) => (
                <div key={l} className="bg-foreground p-6">
                  <dt className="text-sm opacity-70">{l}</dt>
                  <dd className="mt-1 font-serif text-3xl">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Reviews */}
        <section id="journal" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">Kind words</h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.name}>
                <figure className="flex h-full flex-col rounded-3xl border bg-card p-6 shadow-sm">
                  <Stars />
                  <blockquote className="mt-4 flex-1 text-lg text-pretty">“{r.quote}”</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 text-sm">
                    <span className="grid size-10 place-items-center rounded-full bg-accent font-semibold text-accent-foreground">{r.name[0]}</span>
                    <span>
                      <span className="block font-medium">{r.name}</span>
                      <span className="block text-muted-foreground">{r.item}</span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 sm:px-6 md:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">Questions</h2>
            <p className="mt-3 text-muted-foreground">
              Something else? Write to{' '}
              <a href="mailto:hello@example.com" className="font-medium text-foreground underline underline-offset-4">
                hello@example.com
              </a>
              .
            </p>
          </div>
          <div className="divide-y rounded-3xl border bg-card px-6">
            {faq.map(([q, a]) => (
              <details key={q} className="group py-2">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {q}
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-muted transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="pb-4 text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Newsletter */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
            <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary-foreground/10" aria-hidden />
            <div className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-primary-foreground/10" aria-hidden />
            <h2 className="relative font-serif text-3xl tracking-tight sm:text-4xl">10% off your first order</h2>
            <p className="relative mx-auto mt-3 max-w-md opacity-85">One letter a month with new pieces and the stories behind them. No spam.</p>
            <form className="relative mx-auto mt-8 flex max-w-md flex-col gap-2 sm:flex-row" action="#">
              <label htmlFor="nl-email" className="sr-only">
                Email
              </label>
              <input
                id="nl-email"
                type="email"
                required
                placeholder="you@example.com"
                className="min-h-12 flex-1 rounded-full border-0 bg-primary-foreground px-5 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
              />
              <button
                type="submit"
                className="min-h-12 rounded-full bg-foreground px-6 font-medium text-background transition hover:opacity-90 active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none"
              >
                Subscribe
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">Everyday things from small workshops, since 2016.</p>
          </div>
          {[
            ['Shop', ['Tableware', 'Glass', 'Linen', 'Gift cards']],
            ['Help', ['Delivery', 'Returns', 'Care guide', 'Contact']],
            ['Company', ['About', 'Makers', 'Journal', 'Wholesale']],
          ].map(([title, links]) => (
            <div key={title as string}>
              <h3 className="text-sm font-semibold">{title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {(links as string[]).map((l) => (
                  <li key={l}>
                    <a href="#top" className="transition-colors hover:text-foreground">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mx-auto max-w-6xl border-t px-4 py-6 text-xs text-muted-foreground sm:px-6">© 2026 Linden. A template from Manniche UI.</p>
      </footer>
    </div>
  )
}
