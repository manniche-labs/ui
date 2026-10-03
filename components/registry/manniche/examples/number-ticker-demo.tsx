import { NumberTicker } from '@/registry/manniche/number-ticker/number-ticker'

export default function NumberTickerDemo() {
  return (
    <p className="font-serif text-6xl tracking-tight">
      <NumberTicker value={1284} locale="da-DK" />
    </p>
  )
}
