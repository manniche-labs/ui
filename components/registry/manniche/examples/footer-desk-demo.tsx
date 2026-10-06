import { useState } from 'react'
import { Pills } from '@/registry/manniche/chart-kit/chart-kit'
import { FooterDesk } from '@/registry/manniche/footer-desk/footer-desk'

const legal = (
  <>
    <span>© 2026 Halden Studio</span>
    <a href="https://example.com/privacy" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
      Privacy
    </a>
    <a href="https://example.com/imprint" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
      Imprint
    </a>
  </>
)

const DESKS = {
  // Two offices in one offset: the "Same time" chip shows, and the clocks tick.
  same: {
    heading: 'Talk to a person, not a form.',
    description: 'Halden Studio is a small product studio in Munich and Aalborg. Write to Mara and you get Mara.',
    contact: { name: 'Mara Lindqvist', role: 'Studio lead' },
    email: 'hello@example.com',
    bookCall: { label: 'Book a call', href: 'https://example.com/call' },
    offices: [
      { city: 'Munich', timeZone: 'Europe/Berlin' },
      { city: 'Aalborg', timeZone: 'Europe/Copenhagen' },
    ],
  },
  // Three offsets and a fixed moment, so the layout is stable.
  spread: {
    heading: 'Ask us anything.',
    contact: { name: 'Jonas Albrecht', role: 'Partnerships', initials: 'JA' },
    email: 'partners@example.com',
    bookCall: { label: 'Book a call', href: 'https://example.com/call', external: true },
    offices: [
      { city: 'Munich', timeZone: 'Europe/Berlin' },
      { city: 'Lisbon', timeZone: 'Europe/Lisbon' },
      { city: 'New York', timeZone: 'America/New_York' },
    ],
    now: new Date('2026-10-06T14:20:00Z'),
  },
}

export default function FooterDeskDemo() {
  const [desk, setDesk] = useState<keyof typeof DESKS>('same')
  return (
    <div className="grid gap-8 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 sm:px-6">
        <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Offices</span>
        <Pills
          label="Offices"
          value={desk}
          onChange={(id) => setDesk(id as keyof typeof DESKS)}
          options={[
            { id: 'same', label: 'One zone' },
            { id: 'spread', label: 'Three' },
          ]}
        />
      </div>
      <FooterDesk key={desk} {...DESKS[desk]} legal={legal} />
    </div>
  )
}
