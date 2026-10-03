import { Highlighter } from '@/registry/manniche/highlighter/highlighter'

export default function HighlighterDemo() {
  return (
    <p className="font-serif text-2xl leading-snug">
      Every parcel leaves the warehouse <Highlighter>within one working day</Highlighter>.
    </p>
  )
}
