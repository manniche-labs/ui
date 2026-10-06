import { BentoFeatures, type BentoFeature } from '@/registry/manniche/bento-features/bento-features'

// Small Tiles-styled illustrations made of DOM and SVG. They only decorate the sentences next to them.
const bar = 'rounded-full bg-foreground/15'

function Board() {
  return (
    <div className="absolute inset-0 grid grid-cols-3 gap-2 p-3 @4xl:gap-3 @4xl:p-5">
      {[3, 2, 1].map((n, col) => (
        <div key={col} className="grid content-start gap-2 rounded-[10px] bg-card/60 p-2">
          <span className="h-2 w-8 rounded-full bg-foreground/30" />
          {Array.from({ length: n + 1 }).map((_, i) => (
            <span
              key={i}
              className={`block rounded-[8px] bg-card p-2 shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent)] ${col === 1 && i === 0 ? 'outline-2 outline-primary' : ''}`}
            >
              <span className={`${bar} block h-1.5 w-10/12`} />
              <span className={`${bar} mt-1.5 block h-1.5 w-1/2`} />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function Review() {
  return (
    <div className="absolute inset-0 grid content-center gap-2 p-4">
      {[70, 90, 55].map((w, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="size-5 flex-none rounded-full bg-foreground/20 font-mono text-[10px] leading-5 text-center">{i + 1}</span>
          <span className={`${bar} h-2`} style={{ width: `${w}%` }} />
        </span>
      ))}
    </div>
  )
}

function Handover() {
  return (
    <svg viewBox="0 0 160 72" className="absolute inset-0 size-full p-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="6" y="18" width="44" height="36" rx="8" className="text-foreground/40" />
      <rect x="110" y="18" width="44" height="36" rx="8" className="text-foreground/40" />
      <path d="M56 36h42M92 30l6 6-6 6" className="text-foreground" />
    </svg>
  )
}

function Roadmap() {
  return (
    <div className="absolute inset-0 grid content-center gap-2.5 p-4 font-mono text-[11px] text-muted-foreground tabular-nums">
      {[
        ['Mar', 40, 32],
        ['Apr', 24, 0],
        ['May', 16, 48],
      ].map(([m, w, x]) => (
        <span key={m} className="grid grid-cols-[2rem_1fr] items-center gap-2">
          {m}
          <span className="relative h-2 rounded-full bg-foreground/10">
            <span className="absolute inset-y-0 rounded-full bg-foreground/60" style={{ width: `${w}%`, left: `${x}%` }} />
          </span>
        </span>
      ))}
    </div>
  )
}

function Notes() {
  return (
    <div className="absolute inset-0 grid content-center gap-2 p-4">
      <span className={`${bar} h-2 w-full`} />
      <span className={`${bar} h-2 w-10/12`} />
      <span className="flex items-center gap-1.5">
        <span className={`${bar} h-2 w-5/12`} />
        <span className="h-4 w-px bg-primary" />
      </span>
    </div>
  )
}

function Archive() {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-2 p-4 font-mono text-[11px] text-muted-foreground tabular-nums">
      {['v1', 'v2', 'v3'].map((v, i) => (
        <span key={v} className={`rounded-full px-3 py-1 ${i === 2 ? 'bg-foreground text-background' : 'bg-card'}`}>
          {v}
        </span>
      ))}
    </div>
  )
}

const FEATURES: BentoFeature[] = [
  {
    id: 'board',
    title: 'One board for the whole project',
    description:
      'Briefs, drafts and decisions sit in the same place as the work, so nobody in Munich or Aalborg has to ask where the latest version lives.',
    visual: <Board />,
  },
  { id: 'review', title: 'Review in order', description: 'Comments land in the order they were made, one owner each.', visual: <Review /> },
  { id: 'handover', title: 'Clean handovers', description: 'Hand a task over with its context attached.', visual: <Handover /> },
  { id: 'roadmap', title: 'A plan you can read', description: 'Weeks on one line each, with nothing hidden in a sub-menu.', visual: <Roadmap /> },
  { id: 'notes', title: 'Notes beside the work', description: 'Write next to the thing you are writing about.', visual: <Notes /> },
  { id: 'archive', title: 'Every version kept', description: 'Go back to any earlier version without asking anyone.', visual: <Archive /> },
]

export default function BentoFeaturesDemo() {
  return (
    <BentoFeatures
      eyebrow="Halden Studio"
      heading="Everything a small studio needs to ship together."
      intro="Six tools that stay out of the way. Example copy for a demo company."
      features={FEATURES}
    />
  )
}
