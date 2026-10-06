import { FolderCard } from '@/registry/manniche/folder-card/folder-card'

// Knurling round the knob: 48 short ticks between radius 30 and 34.
const knurl = Array.from({ length: 48 }, (_, k) => {
  const a = (k / 48) * Math.PI * 2
  const c = Math.cos(a)
  const s = Math.sin(a)
  return `M${(58 + c * 30).toFixed(2)} ${(76 + s * 30).toFixed(2)}L${(58 + c * 34).toFixed(2)} ${(76 + s * 34).toFixed(2)}`
}).join('')

// A technical drawing of a rotary knob, front and side view, drawn from the theme tokens.
function Drawing() {
  const fine = 'fill-none stroke-foreground/30 [stroke-width:0.75]'
  const line = 'fill-none stroke-foreground [stroke-width:1] [vector-effect:non-scaling-stroke]'
  const text = 'fill-muted-foreground font-mono text-[6.5px] font-medium tracking-[0.05em]'
  return (
    <svg viewBox="0 0 208 150" className="block w-full overflow-visible">
      <path d="M.5 .5h193l14 14v135H.5z" className="fill-card stroke-foreground/30" />
      <path d="M193.5 .5v14h14" className={fine} />
      <text x="10" y="13" className={text}>
        DWG KN-1 · ROTARY KNOB
      </text>
      <path d="M8 19.5h192" className={fine} />
      <circle cx="58" cy="76" r="34" className={line} />
      <circle cx="58" cy="76" r="27" className={fine} />
      <circle cx="58" cy="76" r="6" className={line} />
      <path d="M58 34v84M16 76h84" strokeDasharray="6 3 1 3" className={fine} />
      <path d={knurl} className={fine} />
      <path d="M58 52v-12" className="fill-none stroke-primary [stroke-width:1.5]" strokeLinecap="round" />
      <path d="M126 50h44v52h-44zM134 102v10h28v-10" className={line} />
      <path d="M126 58h44M126 94h44" className={fine} />
      <path d="M182 50v52M178 50h8M178 102h8" className={fine} />
      <text x="188" y="79" className={text}>
        A
      </text>
      <path d="M126 124h44M126 120v8M170 120v8" className={fine} />
      <text x="146" y="136" className={text}>
        B
      </text>
    </svg>
  )
}

export default function FolderCardDemo() {
  return (
    <div className="grid place-items-center pt-24 pb-4">
      <FolderCard tab="Parts" code="KN-1" label="Parts" description="drawings, rev a · demo">
        <Drawing />
      </FolderCard>
    </div>
  )
}
