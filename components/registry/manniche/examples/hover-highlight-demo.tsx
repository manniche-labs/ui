import { HoverHighlight } from '@/registry/manniche/hover-highlight/hover-highlight'

const items = [
  {
    title: 'Websites',
    text: 'Fast pages that are easy to find on Google.',
    href: '#websites',
  },
  {
    title: 'Shops',
    text: 'Sell online with payments and stock in one place.',
    href: '#shops',
  },
  {
    title: 'Bookings',
    text: 'Customers book a time without calling.',
    href: '#bookings',
  },
  {
    title: 'Hosting',
    text: 'Updates, backups and monitoring included.',
    href: '#hosting',
  },
  {
    title: 'SEO',
    text: 'Structured data, speed and local search.',
    href: '#seo',
  },
  {
    title: 'Support',
    text: 'A real person who answers the same day.',
    href: '#support',
  },
]

export default function HoverHighlightDemo() {
  return <HoverHighlight items={items} className="lg:grid-cols-2" />
}
