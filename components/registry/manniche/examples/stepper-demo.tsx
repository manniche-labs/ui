import { Stepper } from '@/registry/manniche/stepper/stepper'

export default function StepperDemo() {
  return (
    <div className="flex justify-center">
      <Stepper label="Quantity" defaultValue={2} min={1} max={20} />
    </div>
  )
}
