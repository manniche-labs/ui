import { BarChart3, Bell, Calendar, Cloud, CreditCard, Database, FileText, Mail, MessageSquare, Package, ShoppingCart, Truck } from 'lucide-react'
import { LogoGrid } from '@/registry/manniche/logo-grid/logo-grid'

const ITEMS = [
  { name: 'Mail', logo: <Mail /> },
  { name: 'Calendar', logo: <Calendar /> },
  { name: 'Payments', logo: <CreditCard /> },
  { name: 'Shipping', logo: <Truck /> },
  { name: 'Inventory', logo: <Package /> },
  { name: 'Chat', logo: <MessageSquare /> },
  { name: 'Database', logo: <Database /> },
  { name: 'Storage', logo: <Cloud /> },
  { name: 'Analytics', logo: <BarChart3 /> },
  { name: 'Checkout', logo: <ShoppingCart /> },
  { name: 'Invoices', logo: <FileText /> },
  { name: 'Alerts', logo: <Bell /> },
]

export default function LogoGridDemo() {
  return (
    <LogoGrid
      items={ITEMS}
      title="Works with the tools you already use"
      description="Connect your shop to payments, shipping and stock in a few clicks."
      action={
        <a href="#integrations" className="inline-flex min-h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background">
          See all integrations
        </a>
      }
    />
  )
}
