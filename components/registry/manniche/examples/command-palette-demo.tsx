import { Package, Settings, Truck } from 'lucide-react'
import { useState } from 'react'
import { CommandPalette, type Command } from '@/registry/manniche/command-palette/command-palette'

const commands: Command[] = [
  { id: 'track', label: 'Track a parcel', group: 'Orders', icon: <Truck />, keywords: ['shipping'], onSelect: () => {} },
  { id: 'stock', label: 'Check stock', group: 'Warehouse', icon: <Package />, onSelect: () => {} },
  { id: 'settings', label: 'Open settings', group: 'General', icon: <Settings />, onSelect: () => {} },
]

// Cmd+K or Ctrl+K opens it too.
export default function CommandPaletteDemo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className="min-h-11 rounded-xl border bg-card px-4 text-sm font-medium" onClick={() => setOpen(true)}>
        Search commands
      </button>
      <CommandPalette commands={commands} open={open} onOpenChange={setOpen} placeholder="Search orders and settings" />
    </>
  )
}
