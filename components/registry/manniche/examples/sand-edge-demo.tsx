import { SandEdge } from '@/registry/manniche/sand-edge/sand-edge'
import { glPictures } from '@/registry/manniche/examples/gl-pictures'

export default function SandEdgeDemo() {
  return (
    // Wider than the preview's column on a large screen, so the sand has room to blow; centred on the page.
    <div className="relative left-1/2 w-[min(calc(100vw-3rem),72rem)] -translate-x-1/2">
      <SandEdge images={glPictures} label="Landscapes" defaultIndex={2} shimmer />
    </div>
  )
}
