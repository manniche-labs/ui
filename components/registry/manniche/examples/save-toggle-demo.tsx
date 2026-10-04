import { useState } from 'react'
import { SaveToggle } from '@/registry/manniche/save-toggle/save-toggle'

export default function SaveToggleDemo() {
  const [saved, setSaved] = useState(false)

  return (
    <div className="mx-auto flex w-full max-w-sm items-center gap-4 rounded-3xl border bg-card p-4 shadow-sm">
      <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-muted text-2xl" aria-hidden>
        🧥
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">Waxed field jacket</p>
        <p className="text-sm text-muted-foreground">Olive · $189</p>
      </div>
      <SaveToggle
        saved={saved}
        onSave={async () => {
          await new Promise((r) => setTimeout(r, 900))
          setSaved(true)
        }}
        onUnsave={() => setSaved(false)}
      />
    </div>
  )
}
