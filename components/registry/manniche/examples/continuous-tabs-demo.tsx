import { ContinuousTabs } from '@/registry/manniche/continuous-tabs/continuous-tabs'

const panels: Record<string, string> = {
  all: 'Every order, newest first.',
  open: 'Orders that are paid and waiting to be packed.',
  shipped: 'Orders that are on their way to the customer.',
  returned: 'Orders that came back and are waiting for a refund.',
}

export default function ContinuousTabsDemo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <ContinuousTabs
        label="Orders"
        tabs={[
          { id: 'all', label: 'All' },
          { id: 'open', label: 'Open' },
          { id: 'shipped', label: 'Shipped' },
          { id: 'returned', label: 'Returned' },
        ]}
      >
        {(active) => <p className="px-2 py-3 text-sm text-muted-foreground">{panels[active]}</p>}
      </ContinuousTabs>
    </div>
  )
}
