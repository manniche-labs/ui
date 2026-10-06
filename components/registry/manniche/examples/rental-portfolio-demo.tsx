import { RentalPortfolio, type RentalPortfolioData } from '@/registry/manniche/rental-portfolio/rental-portfolio'

// Example data only. All names and figures are invented.
const money = { currency: 'EUR', decimals: 0 }

const data: RentalPortfolioData = {
  figures: [
    { id: 'v', title: 'Portfolio value', value: 1240000, format: money },
    { id: 'u', title: 'Units', value: 14 },
    { id: 'r', title: 'Monthly rent', value: 9800, format: money },
  ],
  income: {
    title: 'Income vs payout',
    format: money,
    points: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((label, i) => ({ label, value: [8800, 9100, 9300, 9500, 9700, 9800][i], previous: [7600, 7900, 8100, 8300, 8500, 8700][i] })),
  },
  collection: {
    title: 'Rent collected',
    value: 92,
    caption: 'of rent due this month',
    zones: [
      { label: 'Late', to: 70 },
      { label: 'Mostly in', to: 90 },
      { label: 'Collected', to: 100 },
    ],
  },
  transfers: {
    title: 'Recent transfers',
    today: '2026-10-06',
    format: money,
    items: [
      { id: 't1', name: 'Example tenant, unit 3', amount: 850, date: '2026-10-05', category: 'Rent' },
      { id: 't2', name: 'Sample Repairs', amount: -240, date: '2026-10-04', category: 'Repair' },
      { id: 't3', name: 'Owner payout', amount: -3000, date: '2026-10-01', category: 'Payout' },
    ],
  },
}

export default function RentalPortfolioDemo() {
  return <RentalPortfolio data={data} />
}
