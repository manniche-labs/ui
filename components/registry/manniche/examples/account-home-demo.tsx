import { AccountHome } from '@/registry/manniche/account-home/account-home'

// Example data for the demo, not a real account. "Today" is Thursday 8 October 2026.
const data = {
  card: { id: 'everyday', name: 'Everyday', kind: 'Debit', ending: '4821', amount: 2091.2 },
  balance: 2091.2,
  change: 1.8,
  pace: 0.92,
  budget: 1800,
  categories: {
    Groceries: 'var(--chart-1)',
    Transport: 'var(--chart-2)',
    'Eating out': 'var(--chart-3)',
    Shopping: 'var(--chart-4)',
    Bills: 'var(--chart-5)',
  },
  transactions: [
    { id: 't1', name: 'Harbour Market', category: 'Groceries', date: '2026-10-08T12:58', amount: -48.2, status: 'pending' as const },
    { id: 't2', name: 'City Transit', category: 'Transport', date: '2026-10-08T08:31', amount: -3.1 },
    { id: 't3', name: 'Corner Bakery', category: 'Eating out', date: '2026-10-08T08:12', amount: -6.4 },
    { id: 't5', name: 'Northwind Books', category: 'Shopping', date: '2026-10-07T16:05', amount: -31.5 },
    { id: 't6', name: 'From Savings', category: 'Transfer', date: '2026-10-07T09:00', amount: 200 },
    { id: 't7', name: 'Lumen Energy', category: 'Bills', date: '2026-10-06T07:00', amount: -74 },
  ],
}

export default function AccountHomeDemo() {
  return <AccountHome data={data} today="2026-10-08" />
}
