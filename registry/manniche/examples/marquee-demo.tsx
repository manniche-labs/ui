import { Marquee } from '@/registry/manniche/marquee/marquee'

export default function MarqueeDemo() {
  return (
    <Marquee label="Product categories">
      {['Kitchen', 'Garden', 'Lighting', 'Textiles', 'Storage', 'Tools'].map((c) => (
        <span key={c} className="rounded-full border bg-card px-4 py-2 whitespace-nowrap">
          {c}
        </span>
      ))}
    </Marquee>
  )
}
