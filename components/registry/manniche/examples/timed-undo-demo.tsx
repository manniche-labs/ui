import { TimedUndo } from '@/registry/manniche/timed-undo/timed-undo'

export default function TimedUndoDemo() {
  return (
    <div className="flex justify-center">
      <TimedUndo label="Delete order" seconds={5} onConfirm={() => console.log('deleted')} />
    </div>
  )
}
