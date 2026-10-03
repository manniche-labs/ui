import { useState } from 'react'
import { RollingNumber } from '@/registry/manniche/rolling-number/rolling-number'

export default function RollingNumberDemo() {
  const [n, setN] = useState(1284)
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="font-serif text-6xl tracking-tight">
        <RollingNumber value={n} locale="da-DK" />
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setN(n - 37)} className="min-h-11 rounded-xl border px-4 text-sm">−37</button>
        <button type="button" onClick={() => setN(n + 137)} className="min-h-11 rounded-xl border px-4 text-sm">+137</button>
      </div>
    </div>
  )
}
