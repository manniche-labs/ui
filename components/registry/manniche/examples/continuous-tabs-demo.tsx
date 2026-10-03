import { ContinuousTabs } from '@/registry/manniche/continuous-tabs/continuous-tabs'

export default function ContinuousTabsDemo() {
  return (
    <div className="flex justify-center">
      <ContinuousTabs
        label="Orders"
        tabs={[
          { id: 'all', label: 'All' },
          { id: 'open', label: 'Open' },
          { id: 'shipped', label: 'Shipped' },
          { id: 'returned', label: 'Returned' },
        ]}
      />
    </div>
  )
}
