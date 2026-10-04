import { MorphingButton } from '@/registry/manniche/morphing-button/morphing-button'

export default function MorphingButtonDemo() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div>
        <p className="font-medium">Linen shirt, size M</p>
        <p className="text-sm text-muted-foreground">Back in stock next week.</p>
      </div>
      <MorphingButton onSubmit={(email) => console.log('notify', email)} />
    </div>
  )
}
