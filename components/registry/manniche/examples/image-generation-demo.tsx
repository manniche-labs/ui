import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ImageGeneration } from '@/registry/manniche/image-generation/image-generation'

export default function ImageGenerationDemo() {
  const [progress, setProgress] = useState(0)
  const [run, setRun] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setProgress((p) => Math.min(1, p + 0.04 + Math.random() * 0.05)), 260)
    return () => clearInterval(id)
  }, [run])

  return (
    <div className="flex flex-col items-center gap-4">
      <ImageGeneration progress={progress} size="1024 × 1024" prompt="A ceramic mug on a linen table in soft morning light">
        {/* Stand-in for a real <img>: a mug drawn with gradients. */}
        <div className="relative size-full bg-[radial-gradient(ellipse_at_50%_115%,#c9b79c_0_38%,transparent_39%),linear-gradient(#efe6d8,#e2d3bd)]">
          <div className="absolute top-[30%] left-[30%] h-[42%] w-[34%] rounded-t-md rounded-b-[28%] bg-[linear-gradient(90deg,#4c6b73,#7d9ea5_45%,#3d5960)]" />
          <div className="absolute top-[38%] left-[61%] h-[22%] w-[13%] rounded-r-full border-[7px] border-l-0 border-[#56767e]" />
        </div>
      </ImageGeneration>
      <button
        type="button"
        onClick={() => {
          setProgress(0)
          setRun((r) => r + 1)
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors duration-150 hover:bg-muted"
      >
        <RotateCcw className="size-4" aria-hidden />
        Generate again
      </button>
    </div>
  )
}
