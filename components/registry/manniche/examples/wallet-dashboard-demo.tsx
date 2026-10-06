import { WalletDashboard } from '@/registry/manniche/wallet-dashboard/wallet-dashboard'

// Example data for the demo, not real accounts.
const data = {
  balance: 8318.06,
  change: 3.2,
  cards: [
    { id: 'everyday', name: 'Everyday', kind: 'Debit', ending: '4821', amount: 2091.2 },
    { id: 'travel', name: 'Travel', kind: 'Multi-currency', ending: '0937', amount: 612.08 },
    { id: 'savings', name: 'Savings', kind: 'Pot', ending: '1162', amount: 5614.78 },
  ],
  periods: [
    {
      id: 'week',
      label: 'Week',
      long: 'last 7 days',
      flow: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => ({ label, value: [120, 340, -80, 210, 560, -150, 90][i] })),
      spending: [
        { label: 'Groceries', value: 90.84 },
        { label: 'Transport', value: 47.1 },
        { label: 'Eating out', value: 74.02 },
        { label: 'Bills', value: 84.12 },
      ],
    },
    {
      id: 'month',
      label: 'Month',
      long: 'last 30 days',
      flow: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'].map((label, i) => ({ label, value: [820, 640, 1180, 910][i] })),
      spending: [
        { label: 'Groceries', value: 414.96 },
        { label: 'Transport', value: 179.82 },
        { label: 'Eating out', value: 235.14 },
        { label: 'Shopping', value: 152.15 },
        { label: 'Bills', value: 401.13 },
      ],
    },
  ],
  subscriptions: [
    { id: 'music', name: 'Northwind Music', amount: 10.99, renews: '12 Oct' },
    { id: 'cloud', name: 'Harbour Cloud', amount: 2.99, renews: '15 Oct' },
    { id: 'news', name: 'Green Leaf Daily', amount: 7.5, renews: '21 Oct' },
  ],
}

export default function WalletDashboardDemo() {
  return <WalletDashboard data={data} />
}
