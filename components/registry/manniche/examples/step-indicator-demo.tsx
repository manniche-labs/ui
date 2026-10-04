import { CreditCard, PackageCheck, ShoppingBag, Truck } from 'lucide-react'
import { useState } from 'react'
import { StepIndicator } from '@/registry/manniche/step-indicator/step-indicator'

const steps = [
  { id: 'bag', label: 'Bag', icon: <ShoppingBag /> },
  { id: 'shipping', label: 'Shipping', icon: <Truck /> },
  { id: 'payment', label: 'Payment', icon: <CreditCard /> },
  { id: 'done', label: 'Confirmation', icon: <PackageCheck /> },
]

export default function StepIndicatorDemo() {
  const [current, setCurrent] = useState(1)

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-8 pt-12">
      <StepIndicator label="Checkout" steps={steps} current={current} onStepChange={setCurrent} />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Step {current + 1} of {steps.length}: <span className="text-foreground">{steps[current].label}</span>
        </span>
        <div className="flex gap-2">
          <button type="button" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)} className="min-h-11 rounded-xl px-3 hover:bg-muted disabled:opacity-40">
            Back
          </button>
          <button
            type="button"
            disabled={current === steps.length - 1}
            onClick={() => setCurrent((c) => c + 1)}
            className="min-h-11 rounded-xl bg-foreground px-4 text-background disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
