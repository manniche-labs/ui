import { ToolApproval } from '@/registry/manniche/tool-approval/tool-approval'

export default function ToolApprovalDemo() {
  return (
    <ToolApproval
      tool="issue_refund"
      summary="Refund 349 kr to the customer's card."
      args={{ order: 4821, amount: 349, currency: 'DKK' }}
      risky
      onApprove={() => console.log('run the tool')}
      onDeny={() => console.log('tell the agent no')}
    />
  )
}
