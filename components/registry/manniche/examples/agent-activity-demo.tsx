import { AgentActivity, type AgentStep } from '@/registry/manniche/agent-activity/agent-activity'

const steps: AgentStep[] = [
  { id: 'read', label: 'Reading the order', detail: 'Order 4821, two items', status: 'done', ms: 640 },
  { id: 'stock', label: 'Checking stock', status: 'done', ms: 980 },
  { id: 'ship', label: 'Booking the shipment', status: 'running' },
  { id: 'mail', label: 'Writing the confirmation', status: 'pending' },
]

export default function AgentActivityDemo() {
  return <AgentActivity title="Handling order 4821" steps={steps} />
}
