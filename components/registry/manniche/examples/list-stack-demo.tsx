import { PackageCheck, RotateCcw, Truck } from 'lucide-react'
import { ListStack } from '@/registry/manniche/list-stack/list-stack'

export default function ListStackDemo() {
  return (
    <ListStack
      showLabel="Show orders"
      items={[
        { id: 'a', title: 'Order #1042', detail: 'Out for delivery', meta: 'Today', icon: <Truck /> },
        { id: 'b', title: 'Order #1038', detail: 'Delivered to the front door', meta: '2 Aug', icon: <PackageCheck /> },
        { id: 'c', title: 'Order #1031', detail: 'Return received, refund sent', meta: '28 Jul', icon: <RotateCcw /> },
      ]}
    />
  )
}
