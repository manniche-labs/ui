// Bento product: a product showcase made of tiles. A large media tile (any `ReactNode`, so a Tiles-styled SVG, a
// photo or a render), a tile with the variant switch (`Pills`), a price tile with the price and the one primary
// action, and a row of three or four spec tiles with mono values.
//
// Signature: switching variant cross-fades the media (opacity only, 300 ms) and rolls the price (`BigNumber`). The
// media tile's mono caption names the chosen variant in words, so colour never carries the choice alone.
//
// Screen readers: one `h2` (the product), the variants as a radio group read as "<variantLabel>", and an `img` role on
// the media named by the variant's `mediaLabel`. The price is read once in full. Specs are a description list.
// Reduced motion: the media swaps at once and the price shows its new value without rolling.
import { useEffect, useId, useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { BigNumber, Pills } from '@/registry/manniche/chart-kit/chart-kit'
import type { ValueFormat } from '@/registry/manniche/chart-kit/chart-utils'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'

export type ProductVariant = {
  /** A stable key for the variant. */
  id: string
  /** The variant's name on the switch and in the caption: "Sage". */
  label: string
  /** The price of this variant. */
  price: number
  /** What the media shows, read aloud and shown in the caption: "Desk lamp in sage". Default the label. */
  mediaLabel?: string
}

export type ProductSpec = {
  /** What is measured: "Weight". */
  label: string
  /** The value, set in mono: "1.2 kg". */
  value: string
}

export type BentoProductProps = Omit<ComponentProps<'section'>, 'children' | 'title'> & {
  /** The product's name, shown as the section's `h2`. */
  name: ReactNode
  /** A short line under the name. */
  intro?: ReactNode
  /** A small mono label above the name, such as the maker. */
  eyebrow?: ReactNode
  /** The picture: a node, or a function that gets the chosen variant (so the picture can change with it). */
  media: ReactNode | ((variant: ProductVariant) => ReactNode)
  /** The variants, two to four. */
  variants: readonly ProductVariant[]
  /** The variant chosen first when `variantId` is not controlled. Default the first. */
  defaultVariantId?: string
  /** The chosen variant, when you control it. */
  variantId?: string
  /** Called when the visitor picks another variant. */
  onVariantChange?: (id: string) => void
  /** The group's name on the switch and its tile: "Colour". */
  variantLabel: string
  /** The name of the price tile. Default "Price". */
  priceLabel?: string
  /** The specs, three or four. */
  specs: readonly ProductSpec[]
  /** How the price is written. Default euros, no decimals. */
  priceFormat?: ValueFormat
  /** Fine print under the price: "Incl. VAT. Ships in 3 to 5 days." */
  priceNote?: ReactNode
  /** The one primary action. */
  action: { label: string; href: string }
}

export function BentoProduct({
  name,
  intro,
  eyebrow,
  media,
  variants,
  defaultVariantId,
  variantId,
  onVariantChange,
  variantLabel,
  specs,
  priceLabel = 'Price',
  priceFormat = { currency: 'EUR' },
  priceNote,
  action,
  className,
  ...rest
}: BentoProductProps) {
  const headingId = useId()
  const reduced = useReducedMotion()
  const [own, setOwn] = useState(defaultVariantId ?? variants[0]?.id)
  const id = variantId ?? own
  const variant = variants.find((v) => v.id === id) ?? variants[0]

  // The picture that was showing stays under the new one until the new one has faded in.
  const [layers, setLayers] = useState<{ cur: ProductVariant; prev: ProductVariant | null }>({ cur: variant, prev: null })
  const [out, setOut] = useState(false)
  if (layers.cur.id !== variant.id) {
    setLayers({ cur: variant, prev: reduced ? null : layers.cur })
    setOut(false)
  }
  useEffect(() => {
    if (!layers.prev) return
    const raf = requestAnimationFrame(() => setOut(true))
    const end = window.setTimeout(() => setLayers((l) => ({ ...l, prev: null })), 340)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(end)
    }
  }, [layers])

  const pick = (next: string) => {
    setOwn(next)
    onVariantChange?.(next)
  }
  const render = (v: ProductVariant) => (typeof media === 'function' ? media(v) : media)
  const spans = specs.length === 3 ? '@3xl:grid-cols-3' : '@3xl:grid-cols-4'

  return (
    <section aria-labelledby={headingId} className={cn('@container w-full py-12 @3xl:py-20', className)} {...rest}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mb-8 grid max-w-2xl gap-3 @3xl:mb-12">
          {eyebrow && <p className="font-mono text-xs tracking-[0.04em] text-muted-foreground tabular-nums">{eyebrow}</p>}
          <h2
            id={headingId}
            className="text-[clamp(30px,5.4cqw,52px)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance text-foreground"
            style={{ fontFamily: 'var(--font-display, inherit)', fontStretch: '86%' }}
          >
            {name}
          </h2>
          {intro && <p className="text-base leading-relaxed text-pretty text-muted-foreground">{intro}</p>}
        </header>

        <div className="grid grid-cols-1 gap-3 @2xl:gap-4 @3xl:grid-cols-3">
          <div className="relative min-h-72 overflow-hidden rounded-[calc(var(--radius)*2+2px)] bg-card shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)] @3xl:col-span-2 @3xl:row-span-2 @3xl:min-h-[28rem]">
            <div role="img" aria-label={variant.mediaLabel ?? variant.label} className="absolute inset-0">
              {layers.prev && (
                <div
                  aria-hidden
                  className="absolute inset-0 transition-opacity duration-300 ease-out-quint"
                  style={{ opacity: out ? 0 : 1 }}
                >
                  {render(layers.prev)}
                </div>
              )}
              <div
                key={layers.cur.id}
                className={cn('absolute inset-0', layers.prev && 'transition-opacity duration-300 ease-out-quint')}
                style={{ opacity: layers.prev && !out ? 0 : 1 }}
              >
                {render(layers.cur)}
              </div>
            </div>
            <span
              aria-hidden
              className="absolute bottom-4 left-4 rounded-full bg-card px-3 py-1.5 shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent)] font-mono text-[11.5px] leading-none text-muted-foreground tabular-nums"
            >
              {variantLabel}: {variant.label}
            </span>
          </div>

          <DataTile title={variantLabel}>
            <Pills
              label={variantLabel}
              options={variants.map((v) => ({ id: v.id, label: v.label }))}
              value={variant.id}
              onChange={pick}
              className="max-w-full"
            />
          </DataTile>

          <DataTile title={priceLabel}>
            <div className="grid gap-5">
              <div className="grid gap-1.5">
                <BigNumber value={variant.price} format={priceFormat} size="xl" />
                {priceNote && <p className="text-[13.5px] leading-normal text-pretty text-muted-foreground">{priceNote}</p>}
              </div>
              <a
                href={action.href}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-opacity duration-150 ease-out-quint hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {action.label}
              </a>
            </div>
          </DataTile>

          <dl className={cn('grid grid-cols-2 gap-3 @2xl:gap-4 @3xl:col-span-3', spans)}>
            {specs.map((s) => (
              <div
                key={s.label}
                className="grid content-between gap-6 rounded-[calc(var(--radius)*2+2px)] bg-card p-[18px] shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]"
              >
                <dt className="text-sm leading-[1.3] font-medium text-muted-foreground">{s.label}</dt>
                <dd className="font-mono text-[15px] tracking-[0.01em] break-words tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
