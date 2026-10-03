import { WaveLoader } from '@/registry/manniche/wave-loader/wave-loader'

export default function WaveLoaderDemo() {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <WaveLoader label="Loading your orders" />
      <p className="text-sm text-muted-foreground">Loading your orders</p>
    </div>
  )
}
