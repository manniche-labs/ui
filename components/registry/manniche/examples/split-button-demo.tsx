import { useState } from 'react'
import { SplitButton } from '@/registry/manniche/split-button/split-button'

const options = [
  { id: 'pickup', label: 'Pickup' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'locker', label: 'Parcel locker' },
]

export default function SplitButtonDemo() {
  const [chosen, setChosen] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-center gap-3">
      <SplitButton label="Choose shipping" options={options} onSelect={setChosen} />
      <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
        {chosen && `Shipping: ${options.find((o) => o.id === chosen)?.label}`}
      </p>
    </div>
  )
}
