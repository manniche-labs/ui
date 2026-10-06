import { useState } from 'react'
import { glPictures } from '@/registry/manniche/examples/gl-pictures'
import { WaveRibbon } from '@/registry/manniche/wave-ribbon/wave-ribbon'

export default function WaveRibbonDemo() {
  const [index, setIndex] = useState(2)
  const picture = glPictures[index]
  return (
    <div className="flex w-full flex-col gap-5">
      <WaveRibbon images={glPictures} label="Landscapes" loop animate index={index} onIndexChange={setIndex} />
      <div className="mx-auto -mt-1 flex max-w-sm flex-col items-center gap-1.5 px-4 text-center">
        <p className="font-mono text-[10.5px] leading-none font-medium tracking-[0.08em] text-muted-foreground uppercase">Print {String(index + 1).padStart(2, '0')}</p>
        <p className="text-[15px] leading-tight font-medium tracking-[-0.01em] text-foreground">{picture.title}</p>
      </div>
    </div>
  )
}
