import { CreditCard, MessageSquare, Package, Star, Truck } from 'lucide-react'
import { useState } from 'react'
import { NotificationStack, type StackedNotification } from '@/registry/manniche/notification-stack/notification-stack'

const START: StackedNotification[] = [
  { id: '1', icon: <Package />, title: 'New order #1042', body: 'Two linen shirts and a canvas tote, paid by card.', time: 'now' },
  { id: '2', icon: <MessageSquare />, title: 'Question from a customer', body: 'Does the wool scarf come in a darker grey?', time: '4 min' },
  { id: '3', icon: <Truck />, title: 'Parcel delivered', body: 'Order #1037 was handed over at the door.', time: '18 min' },
  { id: '4', icon: <Star />, title: 'New five-star review', body: '“Lovely quality and fast shipping.”', time: '1 h' },
  { id: '5', icon: <CreditCard />, title: 'Payout sent', body: '€1,284.50 is on its way to your bank.', time: '3 h' },
]

export default function NotificationStackDemo() {
  const [items, setItems] = useState(START)

  return (
    <div className="flex min-h-[420px] flex-col items-center gap-4">
      <NotificationStack items={items} onDismiss={(id) => setItems((list) => list.filter((n) => n.id !== id))} />
      {items.length < START.length && (
        <button type="button" onClick={() => setItems(START)} className="min-h-11 rounded-full border px-4 text-sm transition-colors duration-150 hover:bg-muted">
          Bring them back
        </button>
      )}
    </div>
  )
}
