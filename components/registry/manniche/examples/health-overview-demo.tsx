import { HealthOverview, type HealthOverviewData } from '@/registry/manniche/health-overview/health-overview'

// Example data only. The person and all figures are invented; this is not medical information.
const data: HealthOverviewData = {
  vitals: [
    { id: 'hr', title: 'Heart rate', value: 64, unit: 'bpm' },
    { id: 'sl', title: 'Sleep', value: 7, unit: 'hours' },
    { id: 'st', title: 'Steps', value: 8200, unit: 'today' },
  ],
  patient: {
    name: 'Sample Patient',
    details: [
      { label: 'Age', value: '41' },
      { label: 'Height', value: '178 cm' },
      { label: 'Last visit', value: '2 Oct 2026' },
      { label: 'Plan', value: 'Example plan' },
    ],
  },
  score: {
    title: 'Wellness score',
    value: 74,
    caption: 'example score',
    zones: [
      { label: 'Low', to: 40 },
      { label: 'Fair', to: 70 },
      { label: 'Good', to: 100 },
    ],
  },
  calories: {
    title: 'Calories',
    points: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => ({ label, value: [2100, 1950, 2250, 2000, 2300, 2600, 1900][i] })),
    macrosTitle: 'Macros today',
    macros: [
      { label: 'Carbs', value: 240 },
      { label: 'Protein', value: 110 },
      { label: 'Fat', value: 70 },
    ],
  },
}

export default function HealthOverviewDemo() {
  return <HealthOverview data={data} />
}
