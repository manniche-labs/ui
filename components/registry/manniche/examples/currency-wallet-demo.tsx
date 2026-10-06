import { CurrencyWallet, type WalletCurrency } from '@/registry/manniche/currency-wallet/currency-wallet'

// Example data for the demo, not real accounts or rates.
const data: WalletCurrency[] = [
  {
    code: 'EUR',
    balance: 4210.5,
    change: 2.4,
    spending: [
      { label: 'Groceries', value: 310.2 },
      { label: 'Travel', value: 420 },
      { label: 'Eating out', value: 180.4 },
      { label: 'Bills', value: 255 },
    ],
    allocation: [
      { id: 'spend', label: 'Spending', share: 0.4 },
      { id: 'save', label: 'Savings', share: 0.45 },
      { id: 'trip', label: 'Trip pot', share: 0.15 },
    ],
    rewards: { points: 3820, next: 1180, tier: 'Silver', nextTier: 'Gold', perks: ['Free ATM withdrawals', 'Travel insurance'] },
  },
  {
    code: 'USD',
    balance: 1380,
    change: -0.8,
    spending: [
      { label: 'Travel', value: 540 },
      { label: 'Shopping', value: 210.5 },
      { label: 'Eating out', value: 96 },
    ],
    allocation: [
      { id: 'spend', label: 'Spending', share: 0.7 },
      { id: 'save', label: 'Savings', share: 0.3 },
    ],
    rewards: { points: 640, next: 360, tier: 'Silver', nextTier: 'Gold', perks: ['No fee on card payments abroad'] },
  },
  {
    code: 'DKK',
    balance: 18240,
    change: 1.1,
    spending: [
      { label: 'Groceries', value: 2410 },
      { label: 'Transport', value: 980 },
      { label: 'Bills', value: 3120 },
    ],
    allocation: [
      { id: 'spend', label: 'Spending', share: 0.55 },
      { id: 'save', label: 'Savings', share: 0.45 },
    ],
    rewards: { points: 1210, next: 790, tier: 'Silver', nextTier: 'Gold', perks: ['Free transfers between pots'] },
  },
]

export default function CurrencyWalletDemo() {
  return <CurrencyWallet data={data} />
}
