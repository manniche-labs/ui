import { CreditCard, Home, PieChart, Settings, Users, Wallet } from 'lucide-react'
import { SpendControl, type SpendControlData } from '@/registry/manniche/spend-control/spend-control'

const sampleRail: SpendControlData['rail'] = [
  { id: 'home', label: 'Home', icon: Home, current: true },
  { id: 'cards', label: 'Cards', icon: CreditCard },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'reports', label: 'Reports', icon: PieChart },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
]

// Example data only. Names and figures are invented.
const data: SpendControlData = {
  rail: sampleRail,
  cards: [
    { id: 'c1', name: 'Team lunches', last4: '4401', spent: 312, limit: 500 },
    { id: 'c2', name: 'Software', last4: '8120', spent: 689, limit: 800 },
    { id: 'c3', name: 'Travel', last4: '2257', spent: 40, limit: 1500, frozen: true },
  ],
  spending: [
    { label: 'Wed', title: 'Wednesday 30 Sep', value: 95 },
    { label: 'Thu', title: 'Thursday 1 Oct', value: 340 },
    { label: 'Fri', title: 'Friday 2 Oct', value: 180 },
    { label: 'Sat', title: 'Saturday 3 Oct', value: 60 },
    { label: 'Sun', title: 'Sunday 4 Oct', value: 36 },
    { label: 'Mon', title: 'Monday 5 Oct', value: 120 },
    { label: 'Tue', title: 'Tuesday 6 Oct', value: 210 },
  ],
  spendingTotal: 1041,
  spendingChange: -4.2,
  merchants: [
    { label: 'Example Cafe', value: 420, x: 12, y: 18, group: 'Food' },
    { label: 'Sample Cloud', value: 689, x: 2, y: 120, group: 'Software' },
    { label: 'Demo Rail', value: 240, x: 3, y: 64, group: 'Travel' },
    { label: 'Test Supplies', value: 150, x: 6, y: 35, group: 'Office' },
    { label: 'Mock Market', value: 310, x: 9, y: 28, group: 'Food' },
  ],
  upsell: { title: 'More cards', text: 'Example panel: add cards for every team.', action: 'Add a card' },
}

export default function SpendControlDemo() {
  return <SpendControl data={data} now={new Date('2026-10-06T10:00:00')} />
}
