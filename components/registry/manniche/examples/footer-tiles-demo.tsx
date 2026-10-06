import { FooterTiles, type OpeningRange, type Weekday } from '@/registry/manniche/footer-tiles/footer-tiles'

// Halden Studio is an invented company. Every link goes to example.com; the address is made up.
const WEEK: Weekday[] = [1, 2, 3, 4, 5]
const SCHEDULE: OpeningRange[] = WEEK.flatMap((day) => [
  { day, open: '09:00', close: '12:30' },
  { day, open: '13:30', close: '18:00' },
])

const Glyph = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export default function FooterTilesDemo() {
  return (
    <FooterTiles
      address={{
        name: 'Halden Studio, Munich',
        lines: ['Example Strasse 12', '80331 Munich', 'Germany'],
        directionsHref: 'https://example.com/map/munich',
      }}
      hours={{ timeZone: 'Europe/Berlin', schedule: SCHEDULE }}
      links={[
        { label: 'Work', href: 'https://example.com/work' },
        { label: 'Studio', href: 'https://example.com/about' },
        { label: 'Journal', href: 'https://example.com/journal' },
        { label: 'Contact', href: 'https://example.com/contact' },
      ]}
      social={[
        { label: 'LinkedIn', href: 'https://example.com/linkedin', icon: <Glyph d="M4 9h4v11H4zM6 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM11 9h4v2c.7-1.3 2-2.2 4-2.2 3 0 4 2 4 5V20h-4v-5.5c0-1.5-.5-2.5-2-2.5s-2 1-2 2.5V20h-4z" /> },
        { label: 'Mastodon', href: 'https://example.com/mastodon', icon: <Glyph d="M4 12c0-5 1-8 8-8s8 3 8 8-3 7-8 7c-2 0-4-.3-5-1l-3 2 1-4c-1-1-1-2-1-4zM9 9v5M12 14V9l3 5V9" /> },
        { label: 'RSS feed', href: 'https://example.com/feed.xml', icon: <Glyph d="M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8M6 19h.01" /> },
      ]}
      owner="Halden Studio"
      legalLinks={[
        { label: 'Privacy', href: 'https://example.com/privacy' },
        { label: 'Imprint', href: 'https://example.com/imprint' },
      ]}
    />
  )
}
