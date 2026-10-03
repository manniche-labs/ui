import { useState } from 'react'
import { JellySlider } from '@/registry/manniche/jelly-slider/jelly-slider'

export default function JellySliderDemo() {
  const [max, setMax] = useState(80)
  const euro = (v: number) => `€${v}`

  return (
    <div className="mx-auto w-full max-w-sm space-y-2">
      <p className="flex justify-between text-sm">
        <span className="font-medium">Price up to</span>
        <span className="text-muted-foreground tabular-nums">{euro(max)}</span>
      </p>
      <JellySlider label="Price up to" value={max} onValueChange={setMax} min={0} max={200} step={5} format={euro} />
      <p className="text-sm text-muted-foreground">Drag it quickly and let go.</p>
    </div>
  )
}
