import { useState } from 'react'
import { Pills } from '@/registry/manniche/chart-kit/chart-kit'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'
import { TransactionList, type Transaction } from '@/registry/manniche/transaction-list/transaction-list'

// Example payments for the demo, not a real account. "Today" is Thursday 8 October 2026.
const TODAY = '2026-10-08'
const TXS: Transaction[] = [
  { id: 't1', name: 'Harbour Market', category: 'Groceries', date: '2026-10-08T12:58', amount: -48.2, status: 'pending' },
  { id: 't2', name: 'City Transit', category: 'Transport', date: '2026-10-08T08:31', amount: -3.1 },
  { id: 't3', name: 'Corner Bakery', category: 'Eating out', date: '2026-10-08T08:12', amount: -6.4 },
  { id: 't4', name: 'Pixel & Plug', category: 'Shopping', date: '2026-10-07T19:40', amount: -129, status: 'failed', note: 'Card limit reached' },
  { id: 't5', name: 'Northwind Books', category: 'Shopping', date: '2026-10-07T16:05', amount: -31.5 },
  { id: 't6', name: 'From Savings', category: 'Transfer', date: '2026-10-07T09:00', amount: 200 },
  { id: 't7', name: 'Lumen Energy', category: 'Bills', date: '2026-10-06T07:00', amount: -74 },
  { id: 't8', name: 'Refund, Northwind Books', category: 'Shopping', date: '2026-10-06T11:20', amount: 12 },
  { id: 't9', name: 'Green Leaf Café', category: 'Eating out', date: '2026-10-06T12:41', amount: -9.8 },
]
const CATEGORIES = {
  Groceries: 'var(--chart-1)',
  Transport: 'var(--chart-2)',
  'Eating out': 'var(--chart-3)',
  Shopping: 'var(--chart-4)',
  Bills: 'var(--chart-5)',
}
const SHOW = [
  { id: 'all', label: 'All' },
  { id: 'in', label: 'In' },
  { id: 'out', label: 'Out' },
]
const EUR = { currency: 'EUR', decimals: 2 }

export default function TransactionListDemo() {
  const [show, setShow] = useState('all')
  const [open, setOpen] = useState<Transaction | null>(null)
  const rows = TXS.filter((t) => (show === 'in' ? t.amount > 0 : show === 'out' ? t.amount < 0 : true))
  return (
    <div className="grid w-full gap-4">
      <DataTile
        title="Transactions"
        action={<Pills label="Show" options={SHOW} value={show} onChange={setShow} />}
        footer={
          <span>
            {open ? `Opened ${open.name}. ` : 'Rows grouped by day, with chips for pending and failed payments. '}
            Example data.
          </span>
        }
      >
        <TransactionList
          data={rows}
          label="Recent transactions"
          today={TODAY}
          format={EUR}
          categories={CATEGORIES}
          onSelect={setOpen}
          selectedId={open?.id}
        />
      </DataTile>
      <div className="grid gap-4 sm:grid-cols-2">
        <DataTile title="Latest" density="compact" footer={<span>Four rows, the rest behind a button. Example data.</span>}>
          <TransactionList data={TXS} label="Latest transactions" today={TODAY} format={EUR} categories={CATEGORIES} limit={4} />
        </DataTile>
        <DataTile title="Money in" density="compact" inverted footer={<span>Example data.</span>}>
          <TransactionList data={TXS.filter((t) => t.amount > 0)} label="Money in" today={TODAY} format={EUR} />
        </DataTile>
      </div>
    </div>
  )
}
