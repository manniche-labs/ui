import { useState } from 'react'
import { ConfirmDialog } from '@/registry/manniche/confirm-dialog/confirm-dialog'
import { DangerZone, dangerButton } from '@/registry/manniche/danger-zone/danger-zone'
import { HoldToConfirm } from '@/registry/manniche/hold-to-confirm/hold-to-confirm'

export default function DangerZoneDemo() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mx-auto w-full max-w-xl">
      <DangerZone
        actions={[
          {
            id: 'pause',
            title: 'Pause the shop',
            description: 'Visitors see a closed sign. Orders already placed still ship.',
            action: (
              <HoldToConfirm onConfirm={() => console.log('paused')} doneLabel="Paused" className="rounded-xl text-sm">
                Hold to pause
              </HoldToConfirm>
            ),
          },
          {
            id: 'delete',
            title: 'Delete the shop',
            description: 'Products, orders and customers are kept for 14 days, then removed for good.',
            action: (
              <button type="button" onClick={() => setOpen(true)} className={dangerButton}>
                Delete shop
              </button>
            ),
          },
        ]}
      />
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        destructive
        title="Delete Nordlys Home?"
        description="You can restore the shop for 14 days. After that it is gone."
        typeToConfirm="Nordlys Home"
        confirmLabel="Delete shop"
        cancelLabel="Keep shop"
        onConfirm={() => console.log('shop deleted')}
      />
    </div>
  )
}
