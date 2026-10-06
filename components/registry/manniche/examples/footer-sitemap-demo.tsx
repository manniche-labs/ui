import { FooterSitemap, type SitemapGroup } from '@/registry/manniche/footer-sitemap/footer-sitemap'

const link = (label: string, external = false) => ({ label, href: `https://example.com/${label.toLowerCase().replace(/[^a-z]+/g, '-')}`, external })

const groups: SitemapGroup[] = [
  { title: 'Studio', links: ['About', 'Team', 'Careers', 'Press', 'Contact'].map((l) => link(l)) },
  { title: 'Work', links: ['Case studies', 'Product design', 'Prototyping', 'Research'].map((l) => link(l)) },
  { title: 'Services', links: ['Discovery sprint', 'Design systems', 'Front-end builds', 'Workshops', 'Retainers'].map((l) => link(l)) },
  { title: 'Journal', links: ['Latest', 'Essays', 'Field notes', 'Newsletter', 'RSS'].map((l) => link(l)) },
  { title: 'Resources', links: [link('Guides'), link('Templates'), link('Open source', true), link('Brand kit')] },
  { title: 'Offices', links: ['Munich', 'Aalborg', 'Visit us', 'Directions'].map((l) => link(l)) },
  { title: 'Legal', links: ['Privacy', 'Terms', 'Imprint', 'Cookies'].map((l) => link(l)) },
]

const regions = [
  { label: 'English', href: 'https://example.com/en', lang: 'en', current: true },
  { label: 'Deutsch', href: 'https://example.com/de', lang: 'de' },
  { label: 'Dansk', href: 'https://example.com/da', lang: 'da' },
]

export default function FooterSitemapDemo() {
  return (
    <div className="grid gap-12 py-8">
      <FooterSitemap
        brand="Halden Studio"
        description="A small product studio in Munich and Aalborg."
        groups={groups}
        regions={regions}
        legal={<span>© 2026 Halden Studio</span>}
      />
      {/* The same footer in a narrow box: the groups fold. */}
      <div className="mx-auto w-full max-w-sm">
        <FooterSitemap
          brand="Halden Studio"
          description="A small product studio in Munich and Aalborg."
          groups={groups.slice(0, 5)}
          regions={regions}
          defaultOpen={['Studio']}
          legal={<span>© 2026 Halden Studio</span>}
          className="px-0 sm:px-0"
        />
      </div>
    </div>
  )
}
