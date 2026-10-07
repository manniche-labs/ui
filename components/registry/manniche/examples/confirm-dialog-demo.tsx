import { useState } from 'react'
import { ConfirmDialog } from '@/registry/manniche/confirm-dialog/confirm-dialog'

export default function ConfirmDialogDemo() {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-xl border border-destructive/40 bg-card px-4 text-sm font-medium text-destructive hover:bg-destructive hover:text-background"
      >
        Delete collection
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        destructive
        title="Delete the Autumn linen collection?"
        description="The 24 products stay in the shop, but the collection page and its link go away."
        typeToConfirm="autumn-linen"
        confirmLabel="Delete collection"
        cancelLabel="Keep collection"
        onConfirm={() => console.log('collection deleted')}
      />
    </div>
  )
}
