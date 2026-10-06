import { BentoProduct, type ProductVariant } from '@/registry/manniche/bento-product/bento-product'

// An invented product for the demo. Colour is never the only signal: each variant is named in words.
const VARIANTS: ProductVariant[] = [
  { id: 'ink', label: 'Ink', price: 189, mediaLabel: 'Halden desk lamp in ink' },
  { id: 'sage', label: 'Sage', price: 189, mediaLabel: 'Halden desk lamp in sage' },
  { id: 'honey', label: 'Honey', price: 209, mediaLabel: 'Halden desk lamp in honey' },
]

const BODY: Record<string, string> = { ink: 'var(--foreground)', sage: 'var(--chart-4)', honey: 'var(--chart-2)' }

function Lamp({ variant }: { variant: ProductVariant }) {
  const fill = BODY[variant.id]
  return (
    <svg viewBox="0 0 400 300" className="size-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <rect x="0" y="244" width="400" height="56" className="fill-muted" />
      <ellipse cx="150" cy="248" rx="62" ry="9" className="fill-foreground/10" />
      <rect x="104" y="232" width="92" height="16" rx="8" style={{ fill }} />
      <path d="M150 232 V132 L236 66" fill="none" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: fill }} />
      <circle cx="150" cy="132" r="8" className="fill-card stroke-foreground/30" strokeWidth="2" />
      <path d="M208 52 l54 -16 l22 46 a40 40 0 0 1 -54 16 z" style={{ fill }} />
      <path d="M232 100 L300 252" stroke="var(--primary)" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 6" />
    </svg>
  )
}

export default function BentoProductDemo() {
  return (
    <BentoProduct
      eyebrow="Halden Studio, Munich"
      name="The Halden desk lamp."
      intro="A lamp that does one thing well. Example product for a demo company."
      variantLabel="Colour"
      variants={VARIANTS}
      media={(v) => <Lamp variant={v} />}
      specs={[
        { label: 'Weight', value: '1.2 kg' },
        { label: 'Height', value: '48 cm, arm folds' },
        { label: 'Light', value: '2700 K, dimmable' },
        { label: 'Cable', value: '1.8 m, textile' },
      ]}
      priceNote="Incl. VAT. Ships in 3 to 5 working days."
      action={{ label: 'Add to basket', href: 'https://example.com/basket' }}
    />
  )
}
