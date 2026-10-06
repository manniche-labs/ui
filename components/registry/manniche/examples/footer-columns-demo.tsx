import { useState } from 'react'
import { FooterColumns } from '@/registry/manniche/footer-columns/footer-columns'

// Halden Studio is an invented company. Every link goes to example.com.
const COLUMNS = [
  {
    title: 'Studio',
    links: [
      { label: 'About', href: 'https://example.com/about' },
      { label: 'Work', href: 'https://example.com/work' },
      { label: 'Journal', href: 'https://example.com/journal' },
      { label: 'Careers', href: 'https://example.com/careers' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'Product design', href: 'https://example.com/design' },
      { label: 'Web development', href: 'https://example.com/web' },
      { label: 'Workshops', href: 'https://example.com/workshops' },
      { label: 'Retainers', href: 'https://example.com/retainers' },
    ],
  },
  {
    title: 'Offices',
    links: [
      { label: 'Munich', href: 'https://example.com/munich' },
      { label: 'Aalborg', href: 'https://example.com/aalborg' },
      { label: 'Visit us', href: 'https://example.com/visit' },
    ],
  },
  {
    title: 'Follow',
    links: [
      { label: 'LinkedIn', href: 'https://example.com/linkedin', external: true },
      { label: 'Mastodon', href: 'https://example.com/mastodon', external: true },
      { label: 'RSS feed', href: 'https://example.com/feed.xml' },
    ],
  },
]

export default function FooterColumnsDemo() {
  const [language, setLanguage] = useState('en')
  return (
    <FooterColumns
      brand="Halden Studio"
      description="A small product studio in Munich and Aalborg. We design and build software people keep using."
      columns={COLUMNS}
      newsletter={{
        title: 'The Halden letter',
        description: 'One short note a month on what we are making and learning. No tracking pixels.',
        onSubmit: () => new Promise<void>((resolve) => setTimeout(resolve, 900)),
        note: 'You can unsubscribe in one click. We keep your address only for this letter.',
      }}
      owner="Halden Studio"
      legalLinks={[
        { label: 'Privacy', href: 'https://example.com/privacy' },
        { label: 'Terms', href: 'https://example.com/terms' },
        { label: 'Imprint', href: 'https://example.com/imprint' },
      ]}
      region={{
        label: 'Language',
        value: language,
        onChange: setLanguage,
        options: [
          { value: 'en', label: 'English' },
          { value: 'de', label: 'Deutsch' },
          { value: 'da', label: 'Dansk' },
        ],
      }}
    />
  )
}
