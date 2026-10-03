import { HoldToConfirm } from '@/registry/manniche/hold-to-confirm/hold-to-confirm'

export default function HoldToConfirmDemo() {
  return (
    <div className="flex justify-center">
      <HoldToConfirm onConfirm={() => console.log('store closed')} doneLabel="Store closed">
        Hold to close the store
      </HoldToConfirm>
    </div>
  )
}
