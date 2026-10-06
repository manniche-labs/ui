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

export default function FooterDeskDemo() {
  return (
    <div className="grid gap-16 py-8">
      <FooterDesk
        heading="Talk to a person, not a form."
        description="Halden Studio is a small product studio in Munich and Aalborg. Write to Mara and you get Mara."
        contact={{ name: 'Mara Lindqvist', role: 'Studio lead' }}
        email="hello@example.com"
        bookCall={{ label: 'Book a call', href: 'https://example.com/call' }}
        offices={[
          { city: 'Munich', timeZone: 'Europe/Berlin' },
          { city: 'Aalborg', timeZone: 'Europe/Copenhagen' },
        ]}
        legal={legal}
      />
      {/* A second desk with offices in different offsets, and a fixed moment so the layout is stable. */}
      <FooterDesk
        heading="Ask us anything."
        contact={{ name: 'Jonas Albrecht', role: 'Partnerships', initials: 'JA' }}
        email="partners@example.com"
        bookCall={{ label: 'Book a call', href: 'https://example.com/call', external: true }}
        offices={[
          { city: 'Munich', timeZone: 'Europe/Berlin' },
          { city: 'Lisbon', timeZone: 'Europe/Lisbon' },
          { city: 'New York', timeZone: 'America/New_York' },
        ]}
        now={new Date('2026-10-06T14:20:00Z')}
      />
    </div>
  )
}
