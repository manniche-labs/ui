import { CreditCard, Mail, Package, Receipt } from 'lucide-react'
import { IntegrationCard } from '@/registry/manniche/integration-card/integration-card'

const wait = () => new Promise<void>((r) => setTimeout(r, 700))

export default function IntegrationCardDemo() {
  return (
    <div className="flex justify-center">
      <IntegrationCard
        title="Shop integrations"
        onConnectChange={wait}
        items={[
          {
            id: 'payments',
            name: 'Payments',
            description: 'Take cards and wallets at checkout.',
            icon: <CreditCard />,
            tags: ['Checkout', 'Refunds'],
            triggers: ['A payment succeeds', 'A refund is issued'],
            actions: ['Mark the order as paid', 'Send a receipt'],
            connected: true,
          },
          {
            id: 'shipping',
            name: 'Shipping',
            description: 'Print labels and track parcels.',
            icon: <Package />,
            tags: ['Labels', 'Tracking'],
            triggers: ['An order is packed', 'A parcel is delivered'],
            actions: ['Create a label', 'Email the tracking link'],
          },
          {
            id: 'newsletter',
            name: 'Newsletter',
            description: 'Add buyers who opt in to your list.',
            icon: <Mail />,
            tags: ['Email'],
            triggers: ['A buyer ticks the box'],
            actions: ['Add to the list', 'Tag with the product'],
          },
          {
            id: 'accounting',
            name: 'Accounting',
            description: 'Send each sale to your books.',
            icon: <Receipt />,
            tags: ['VAT', 'Exports'],
            triggers: ['An order is paid'],
            actions: ['Create an invoice', 'Book the VAT'],
          },
        ]}
      />
    </div>
  )
}
