import { useState } from 'react'
import { Sheet } from '@/registry/manniche/sheet/sheet'

export default function SheetDemo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className="min-h-11 rounded-xl border bg-card px-4 text-sm font-medium" onClick={() => setOpen(true)}>
        Open delivery options
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Delivery options">
        <p>Standard delivery takes 3 to 5 days and is free.</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-4 min-h-11 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground"
        >
          Done
        </button>
      </Sheet>
    </>
  )
}
