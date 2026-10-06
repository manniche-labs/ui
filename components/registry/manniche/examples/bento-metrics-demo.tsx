import { BentoMetrics, type BentoMetric } from '@/registry/manniche/bento-metrics/bento-metrics'

// Example figures for the demo, not real data.
const METRICS: BentoMetric[] = [
  {
    id: 'shipped',
    label: 'Projects shipped',
    value: 42,
    delta: 12.5,
    trend: [3, 4, 3, 5, 6, 5, 7, 9],
    trendLabel: 'Projects shipped, last 8 months',
    note: 'Counted when the client signs off, per month.',
    inverted: true,
  },
  {
    id: 'turnaround',
    label: 'Days to first draft',
    value: 4.5,
    format: { decimals: 1 },
    delta: -8.2,
    goodWhen: 'down',
    trend: [7, 6.5, 6, 5.5, 5.2, 5, 4.8, 4.5],
    trendLabel: 'Days to first draft, last 8 months',
    note: 'From signed brief to the first draft.',
  },
  {
    id: 'revisions',
    label: 'Revision rounds',
    value: 1.8,
    format: { decimals: 1 },
    delta: 0,
    note: 'Average per project. Fewer is better.',
  },
  {
    id: 'hours',
    label: 'Hours saved per week',
    value: 126,
    format: { suffix: ' h' },
    delta: 6.4,
    trend: [90, 96, 101, 99, 108, 115, 121, 126],
    trendLabel: 'Hours saved per week, last 8 weeks',
    note: 'Handover and review time the team no longer spends.',
  },
  {
    id: 'budget',
    label: 'Average project budget',
    value: 18400,
    format: { currency: 'EUR' },
    delta: 3.1,
    note: 'Fixed price, before VAT.',
  },
  {
    id: 'ontime',
    label: 'Delivered on time',
    value: 94,
    format: { suffix: '%' },
    delta: 2,
    deltaFormat: { decimals: 0, suffix: ' pts' },
    trend: [88, 89, 91, 90, 92, 93, 93, 94],
    trendLabel: 'Delivered on time, last 8 months',
    note: 'Against the date in the brief.',
  },
]

export default function BentoMetricsDemo() {
  return (
    <BentoMetrics
      eyebrow="Halden Studio, Munich and Aalborg"
      heading="A year of work, in six figures."
      intro="What a small studio can count, and nothing it cannot."
      note="Example data."
      metrics={METRICS}
    />
  )
}
