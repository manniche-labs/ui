import { BusinessFinance } from '@/registry/manniche/business-finance/business-finance'

// Example data for the demo, not a real business. "Today" is Thursday 8 October 2026.
const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
const income = [18200, 19400, 21000, 20100, 22800, 24100, 25600]
const payments = [14100, 15200, 15900, 16800, 17100, 18400, 19000]

const data = {
  cashflow: months.map((label, i) => ({ label, value: income[i], previous: payments[i] })),
  income: 25600,
  incomeChange: 6.2,
  growth: 0.68,
  growthTarget: 'Yearly target',
  stockName: 'Example Holdings (fictional)',
  stock: [41, 43, 42, 46, 45, 49, 48, 52, 51, 55].map((value, i) => ({ value, label: `Week ${i + 1}` })),
  activity: [
    { id: 'a1', name: 'Invoice 1042, Birch & Co', category: 'Invoice', date: '2026-10-08T10:12', amount: 2400 },
    { id: 'a2', name: 'Office rent', category: 'Rent', date: '2026-10-07T07:00', amount: -1350 },
    { id: 'a3', name: 'Supplier, Harbour Print', category: 'Supplies', date: '2026-10-06T15:30', amount: -412.5, status: 'pending' as const },
    { id: 'a4', name: 'Invoice 1041, Lumen Studio', category: 'Invoice', date: '2026-10-05T09:02', amount: 1800 },
  ],
  verification: [
    { id: 'v1', label: 'Company details', done: true },
    { id: 'v2', label: 'Owner identity', done: true },
    { id: 'v3', label: 'Business address', done: true, hint: 'Confirmed by letter' },
    { id: 'v4', label: 'Bank statement', done: false, hint: 'Upload the last three months' },
  ],
}

export default function BusinessFinanceDemo() {
  return <BusinessFinance data={data} today="2026-10-08" />
}
