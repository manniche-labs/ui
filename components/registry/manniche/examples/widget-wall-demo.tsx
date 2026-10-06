import { WidgetWall, type WidgetWallData } from '@/registry/manniche/widget-wall/widget-wall'

// Example data only. All names and figures are invented.
const data: WidgetWallData = {
  profile: {
    title: 'Profile completeness',
    items: [
      { label: 'Basics', value: 40 },
      { label: 'Billing', value: 25 },
      { label: 'Team', value: 15 },
    ],
    total: 100,
    format: { suffix: '%' },
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
  ],
  weekly: {
    title: 'Orders per day',
    points: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => ({ label, value: [42, 55, 48, 71, 66, 39, 28][i] })),
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
