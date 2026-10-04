import { Package, Search, Settings, ShoppingBag, Store } from 'lucide-react'
import { useState } from 'react'
import { Dock } from '@/registry/manniche/dock/dock'

const items = [
  { id: 'shop', label: 'Shop', icon: <Store /> },
  { id: 'search', label: 'Search', icon: <Search /> },
  { id: 'bag', label: 'Bag', icon: <ShoppingBag /> },
  { id: 'orders', label: 'Orders', icon: <Package /> },
  { id: 'settings', label: 'Settings', icon: <Settings /> },
]

export default function DockDemo() {
  const [open, setOpen] = useState<string | null>('shop')

  return (
    <div className="flex justify-center pt-10">
      <Dock label="Shop apps" items={items} value={open} onValueChange={setOpen} />
    </div>
  )
}
