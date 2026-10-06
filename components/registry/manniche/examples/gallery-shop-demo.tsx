import { GalleryShop, type GalleryShopData } from '@/registry/manniche/gallery-shop/gallery-shop'

// Example data only. All names, places and figures are invented.
const data: GalleryShopData = {
  menu: [
    { id: 'home', label: 'Home' },
    { id: 'works', label: 'Works' },
    { id: 'events', label: 'Events' },
    { id: 'shop', label: 'Shop' },
  ],
  headline: { strong: 'Sample gallery.', soft: 'Example art for everyone.' },
  counters: [
    { id: 'a', title: 'Works', value: 240 },
    { id: 'b', title: 'Artists', value: 36 },
    { id: 'c', title: 'Events a year', value: 12 },
  ],
  events: {
    title: 'Events',
    items: [
      { id: 'e1', date: '12 Oct', place: 'Example Hall', title: 'Sample opening night' },
      { id: 'e2', date: '24 Oct', place: 'Demo Room', title: 'Test artist talk' },
    ],
  },
  collections: {
    title: 'Collections',
    items: [
      { id: 'c1', name: 'Sample Blues', works: 18, color: 'oklch(0.7 0.08 250)' },
      { id: 'c2', name: 'Demo Earth', works: 24, color: 'oklch(0.7 0.08 60)' },
      { id: 'c3', name: 'Example Green', works: 9, color: 'oklch(0.7 0.08 150)' },
      { id: 'c4', name: 'Test Rose', works: 14, color: 'oklch(0.7 0.08 10)' },
    ],
  },
}

export default function GalleryShopDemo() {
  return <GalleryShop data={data} />
}
