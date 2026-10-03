import { Switch } from '@/registry/manniche/switch/switch'

export default function SwitchDemo() {
  return (
    <div className="flex flex-col items-start gap-4">
      <Switch label="Email me when an order comes in" defaultChecked />
      <Switch label="Show prices with VAT" />
    </div>
  )
}
