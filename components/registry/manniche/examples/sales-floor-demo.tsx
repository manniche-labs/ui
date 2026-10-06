import { SalesFloor, type SalesFloorData } from '@/registry/manniche/sales-floor/sales-floor'

// Example data only. All names and figures are invented.
const money = { currency: 'EUR', decimals: 0 }

const data: SalesFloorData = {
  call: { title: 'Live call', contact: 'Alex Example', company: 'Sample Co', status: 'Connected', duration: '04:12', action: 'End call' },
  target: {
    title: 'Monthly target',
    value: 62000,
    max: 100000,
    format: money,
    caption: 'of an example target',
    zones: [
      { label: 'Behind', to: 40000 },
      { label: 'On track', to: 80000 },
      { label: 'Ahead', to: 100000 },
    ],
  },
  performance: {
    title: 'Calls booked per rep',
    points: ['Ana', 'Ben', 'Cy', 'Di', 'Eli'].map((label, i) => ({ label, title: `${label} (example)`, value: [34, 28, 41, 22, 30][i] })),
  },
  sources: {
    title: 'Revenue by source',
    format: money,
    items: [
      { label: 'Outbound', value: 28000 },
      { label: 'Referral', value: 21000 },
      { label: 'Inbound', value: 13000 },
    ],
  },
}

export default function SalesFloorDemo() {
  return <SalesFloor data={data} />
}
