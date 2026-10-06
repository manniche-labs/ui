import { useState } from 'react'
import { BentoSteps, type BentoStep } from '@/registry/manniche/bento-steps/bento-steps'
import { Pills } from '@/registry/manniche/chart-kit/chart-kit'

const STEPS: BentoStep[] = [
  { id: 'brief', title: 'Brief', description: 'We listen, read what you have and agree what done looks like.', duration: '2 days' },
  { id: 'sketch', title: 'Sketch', description: 'Three rough directions on one page, so choosing is quick.', duration: '1 week' },
  { id: 'build', title: 'Build', description: 'The chosen direction becomes a working page you can click through.', duration: '3 weeks' },
  { id: 'review', title: 'Review', description: 'One round of notes from everyone, gathered in one place.', duration: '1 week' },
  { id: 'launch', title: 'Launch', description: 'We publish, check it on real devices and hand over the files.', duration: '2 days' },
]

const OPTIONS = STEPS.map((_, i) => ({ id: String(i), label: String(i + 1) }))

export default function BentoStepsDemo() {
  const [current, setCurrent] = useState('2')
  return (
    <div className="w-full">
      <BentoSteps
        eyebrow="Halden Studio, how a project runs"
        heading="Five steps, one at a time."
        intro="Example process for a demo company."
        steps={STEPS}
        current={Number(current)}
      />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 pb-8 sm:px-6">
        <span className="font-mono text-xs text-muted-foreground">Current step</span>
        <Pills label="Current step" options={OPTIONS} value={current} onChange={setCurrent} />
      </div>
    </div>
  )
}
