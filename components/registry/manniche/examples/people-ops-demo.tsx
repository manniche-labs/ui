import { PeopleOps, type PeopleOpsData } from '@/registry/manniche/people-ops/people-ops'

// Example data only. All names and figures are invented.
const data: PeopleOpsData = {
  funnel: {
    title: 'Hiring funnel',
    stages: [
      { label: 'Applied', value: 120 },
      { label: 'Screen', value: 48 },
      { label: 'Interview', value: 20 },
      { label: 'Offer', value: 5 },
    ],
  },
  today: {
    title: "Today's schedule",
    items: [
      { id: 's1', time: '09:30', title: 'Sample stand-up', who: 'Team' },
      { id: 's2', time: '11:00', title: 'Demo interview', who: 'Alex E.' },
      { id: 's3', time: '14:00', title: 'Example onboarding', who: 'Sam S.' },
    ],
  },
  payroll: {
    title: 'Payroll',
    today: '2026-10-06',
    format: { currency: 'EUR', decimals: 0 },
    items: [
      { id: 'p1', name: 'Alex Example', amount: -3200, date: '2026-09-30', category: 'Salary' },
      { id: 'p2', name: 'Sam Sample', amount: -2900, date: '2026-09-30', category: 'Salary' },
      { id: 'p3', name: 'Robin Demo', amount: -2600, date: '2026-09-30', category: 'Salary' },
    ],
  },
  attendance: {
    title: 'Attendance',
    rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    columns: ['W1', 'W2', 'W3', 'W4'],
    data: [[8, 7, 8, 6], [7, 8, 8, 7], [8, 6, 7, 8], [7, 7, 8, 8], [5, 6, 4, 6]],
  },
}

export default function PeopleOpsDemo() {
  return <PeopleOps data={data} />
}
