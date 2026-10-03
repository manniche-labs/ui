import { Citation, Sources, type Source } from '@/registry/manniche/sources/sources'

const sources: Source[] = [
  { title: 'Delivery times and prices', href: 'https://example.com/help/delivery', quote: 'Standard delivery takes 3 to 5 working days.' },
  { title: 'Returns policy', href: 'https://example.com/help/returns' },
]

export default function SourcesDemo() {
  return (
    <div className="space-y-4">
      <p>
        Standard delivery is free and takes 3 to 5 days.
        <Citation n={1} source={sources[0]} /> You can send items back within 30 days.
        <Citation n={2} source={sources[1]} />
      </p>
      <Sources sources={sources} />
    </div>
  )
}
