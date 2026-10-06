import { WidgetWall, type WidgetWallData } from '@/registry/manniche/widget-wall/widget-wall'

// Example data only. All names and figures are invented.
const data: WidgetWallData = {
  highlight: { title: 'Sample profit', value: 12480, format: { currency: 'EUR', decimals: 0 }, text: 'Example figure, not a real result.' },
  trades: {
    title: 'Recent sample trades',
    today: '2026-10-06',
    format: { currency: 'EUR', decimals: 0 },
    items: [
      { id: 't1', name: 'Sample Corp', amount: -420, date: '2026-10-06T09:12', category: 'Buy' },
      { id: 't2', name: 'Demo Ltd', amount: 910, date: '2026-10-05T15:40', category: 'Sell' },
      { id: 't3', name: 'Test Inc', amount: 260, date: '2026-10-04T11:05', category: 'Sell' },
    ],
  },
  matrix: {
    title: 'Profit by weekday and week',
    rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    columns: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
    data: [[1, 3, 2, 5, 4, 6], [2, 2, 3, 4, 5, 5], [0, 1, 2, 3, 3, 4], [3, 4, 5, 6, 6, 7], [1, 2, 2, 3, 4, 4]],
  },
  profile: {
    title: 'Profile steps done',
    items: [
      { label: 'Basics', value: 4 },
      { label: 'Billing', value: 3 },
      { label: 'Team', value: 2 },
    ],
    total: 12,
  },
  team: {
    title: 'Sample team',
    people: [
      { id: 'p1', name: 'Alex Example', role: 'Lead' },
      { id: 'p2', name: 'Sam Sample', role: 'Design' },
      { id: 'p3', name: 'Robin Demo', role: 'Support' },
    ],
  },
  kpis: [
    { id: 'a', title: 'Sessions', value: 18240, change: 6.2, series: [10, 12, 11, 14, 13, 16, 18] },
    { id: 'b', title: 'Sign-ups', value: 412, change: 2.4, series: [8, 9, 12, 10, 11, 12, 13] },
    { id: 'c', title: 'Refund rate', value: 1.8, change: -0.4, lowerIsBetter: true, format: { decimals: 1, suffix: '%' }, series: [5, 4, 5, 4, 3, 3, 2] },
    { id: 'd', title: 'Conversion', value: 3.4, change: 0.3, format: { decimals: 1, suffix: '%' }, series: [3, 3, 4, 3, 4, 4, 5] },
    { id: 'e', title: 'Avg. basket', value: 37.6, change: 1.1, format: { currency: 'EUR', decimals: 2 }, series: [6, 7, 6, 7, 8, 7, 8] },
    { id: 'f', title: 'Open tickets', value: 23, change: -8, lowerIsBetter: true, series: [9, 8, 9, 7, 6, 6, 5] },
  ],
  weekly: {
    title: 'Orders, last 7 days',
    points: ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'].map((label, i) => ({ label, value: [48, 71, 66, 39, 28, 42, 55][i] })),
  },
  ranking: {
    title: 'Top sample products',
    items: [
      { label: 'Sample mug', value: 320 },
      { label: 'Demo bowl', value: 240 },
      { label: 'Test vase', value: 150 },
      { label: 'Mock carafe', value: 90 },
    ],
  },
}

export default function WidgetWallDemo() {
  return <WidgetWall data={data} />
}
