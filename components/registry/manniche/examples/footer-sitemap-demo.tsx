import { useState } from 'react'
import { Pills } from '@/registry/manniche/chart-kit/chart-kit'
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
  // The fold follows the footer's own box, so a narrow wrapper shows it without resizing the window.
  const [box, setBox] = useState('wide')
  return (
    <div className="grid gap-8 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 sm:px-6">
        <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Box</span>
        <Pills
          label="Footer width"
          value={box}
          onChange={setBox}
          options={[
            { id: 'wide', label: 'Wide' },
            { id: 'narrow', label: 'Narrow' },
          ]}
        />
      </div>
      <div className={box === 'narrow' ? 'mx-auto w-full max-w-sm' : 'w-full'}>
        <FooterSitemap
          brand="Halden Studio"
          description="A small product studio in Munich and Aalborg."
          groups={groups}
          regions={regions}
          defaultOpen={['Studio']}
          legal={<span>© 2026 Halden Studio</span>}
        />
      </div>
    </div>
  )
}
