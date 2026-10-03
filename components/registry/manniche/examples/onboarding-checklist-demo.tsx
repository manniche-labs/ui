import { OnboardingChecklist } from '@/registry/manniche/onboarding-checklist/onboarding-checklist'

export default function OnboardingChecklistDemo() {
  return (
    <OnboardingChecklist
      title="Set up your shop"
      defaultOpen
      steps={[
        { id: 'account', title: 'Create your account', done: true },
        { id: 'product', title: 'Add your first product', done: true },
        { id: 'payments', title: 'Connect payments', onSelect: () => console.log('open payments') },
        { id: 'shipping', title: 'Choose shipping rates' },
        { id: 'domain', title: 'Add your own domain' },
      ]}
    />
  )
}
