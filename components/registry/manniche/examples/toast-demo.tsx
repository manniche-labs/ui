import { toast, Toaster } from '@/registry/manniche/toast/toast'

// Put <Toaster /> once near the root of the app. toast() works from anywhere after that.
export default function ToastDemo() {
  return (
    <>
      <button
        type="button"
        className="min-h-11 rounded-xl border bg-card px-4 text-sm font-medium"
        onClick={() => toast('Order archived', { action: { label: 'Undo', onClick: () => toast('Order restored') } })}
      >
        Archive order
      </button>
      <button
        type="button"
        className="ml-2 min-h-11 rounded-xl border bg-card px-4 text-sm font-medium"
        onClick={() => toast('Payment failed', { tone: 'error', description: 'Check the card number and try again.' })}
      >
        Show an error
      </button>
      <Toaster />
    </>
  )
}
