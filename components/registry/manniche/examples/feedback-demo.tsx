import { Feedback } from '@/registry/manniche/feedback/feedback'

export default function FeedbackDemo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm font-medium">Did this size guide help?</p>
      <Feedback
        onSubmit={async (data) => {
          await new Promise((r) => setTimeout(r, 700))
          console.log('feedback', data)
        }}
      />
    </div>
  )
}
