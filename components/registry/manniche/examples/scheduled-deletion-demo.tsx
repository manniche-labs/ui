import { useState } from 'react'
import { ScheduledDeletion } from '@/registry/manniche/scheduled-deletion/scheduled-deletion'

export default function ScheduledDeletionDemo() {
  // Deleted three days ago, so eleven of the fourteen days are left.
  const [deletedAt] = useState(() => new Date(Date.now() - 3 * 86_400_000))
  const [restored, setRestored] = useState(false)
  return (
    <div className="mx-auto w-full max-w-xl">
      {restored ? (
        <p role="status" className="rounded-2xl border bg-card p-4 text-sm">
          The collection Autumn linen is back.
        </p>
      ) : (
        <ScheduledDeletion subject="The collection Autumn linen" deletedAt={deletedAt} onRestore={() => setRestored(true)} locale="en-GB" />
      )}
    </div>
  )
}
