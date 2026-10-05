import { useState } from 'react'
import { GlassNavbar } from '@/registry/manniche/glass-navbar/glass-navbar'

const links = [
  { href: '#work', label: 'Work' },
  { href: '#prices', label: 'Prices' },
  { href: '#guides', label: 'Guides' },
  { href: '#contact', label: 'Contact' },
]

const variants = ['frosted', 'floating', 'scroll'] as const

export default function GlassNavbarDemo() {
  const [variant, setVariant] = useState<(typeof variants)[number]>('frosted')

  return (
    <div className="grid gap-3">
      <div role="radiogroup" aria-label="Variant" className="flex gap-1 text-sm">
        {variants.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={v === variant}
            onClick={() => setVariant(v)}
            className="min-h-11 rounded-lg px-3 capitalize text-muted-foreground aria-checked:bg-muted aria-checked:text-foreground"
          >
            {v}
          </button>
        ))}
      </div>
      {/* The page scrolls inside this frame, so the glass has something to blur. In scroll mode the hero starts under the bar (56px + 1px border). */}
      <div className="h-[420px] overflow-y-auto rounded-2xl border bg-background">
        <GlassNavbar
          variant={variant}
          brand="Manniche"
          links={links}
          current="#prices"
          action={
            <a href="#contact" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">
              Book a call
            </a>
          }
        />
        <div className={variant === 'scroll' ? '-mt-[57px]' : ''}>
          <div className="grid h-64 place-items-end bg-[linear-gradient(135deg,#f97316,#db2777_45%,#4f46e5)] p-5 text-white">
            <p className="w-full font-serif text-2xl">Websites for small businesses</p>
          </div>
          <div className="grid gap-4 p-5">
            {['#0ea5e9', '#22c55e', '#eab308', '#111827', '#f8fafc'].map((c) => (
              <div key={c} className="grid gap-2">
                <div className="h-28 rounded-xl border" style={{ background: c }} />
                <p className="text-sm text-muted-foreground">Scroll so this block passes under the bar.</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
