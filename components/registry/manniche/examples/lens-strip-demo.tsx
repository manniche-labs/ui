import { glPictures } from '@/registry/manniche/examples/gl-pictures'
import { LensStrip } from '@/registry/manniche/lens-strip/lens-strip'

export default function LensStripDemo() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <LensStrip images={glPictures} label="Landscapes" />
    </div>
  )
}
