import { cn } from '@/lib/utils'

export type ProductArtKind = 'mug' | 'vase' | 'bowl' | 'carafe' | 'plate' | 'linen'

/** Flat drawings of tableware, coloured from the theme, so the template needs no photos. Swap them for your own images. */
export function ProductArt({ kind, className }: { kind: ProductArtKind; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={cn('h-full w-full', className)} aria-hidden>
      <ellipse cx="100" cy="176" rx="62" ry="7" className="fill-foreground/10" />
      {kind === 'mug' && (
        <g>
          <path d="M128 92h10a20 20 0 0 1 0 40h-10" fill="none" strokeWidth="10" className="stroke-primary/70" />
          <path d="M58 70h76v78a26 26 0 0 1-26 26H84a26 26 0 0 1-26-26Z" className="fill-primary" />
          <path d="M58 70h76v12H58Z" className="fill-primary-foreground/25" />
          <path d="M84 44c0 8 8 8 8 16M102 40c0 8 8 8 8 16" fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-foreground/25" />
        </g>
      )}
      {kind === 'vase' && (
        <g>
          <path d="M86 30h28v16c0 10 30 26 30 66 0 36-20 62-44 62s-44-26-44-62c0-40 30-56 30-66Z" className="fill-primary" />
          <path d="M66 110c10 8 58 8 68 0" fill="none" strokeWidth="5" className="stroke-primary-foreground/30" />
          <path d="M100 30c-6-14 4-22 10-26M100 30c8-10 22-8 28-2" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-success" />
        </g>
      )}
      {kind === 'bowl' && (
        <g>
          <path d="M34 100h132c0 40-30 68-66 68s-66-28-66-68Z" className="fill-primary" />
          <ellipse cx="100" cy="100" rx="66" ry="12" className="fill-primary-foreground/30" />
          <circle cx="82" cy="94" r="10" className="fill-foreground/20" />
          <circle cx="104" cy="90" r="12" className="fill-foreground/15" />
          <circle cx="124" cy="96" r="9" className="fill-foreground/25" />
        </g>
      )}
      {kind === 'carafe' && (
        <g>
          <path d="M88 24h24v34c0 8 34 24 34 70 0 28-20 46-46 46s-46-18-46-46c0-46 34-62 34-70Z" className="fill-primary/25 stroke-primary" strokeWidth="4" />
          <path d="M60 116c26 10 54 10 80 0v12c0 26-18 40-40 40s-40-14-40-40Z" className="fill-primary/60" />
          <rect x="84" y="18" width="32" height="10" rx="4" className="fill-primary" />
        </g>
      )}
      {kind === 'plate' && (
        <g>
          <ellipse cx="100" cy="128" rx="78" ry="34" className="fill-primary" />
          <ellipse cx="100" cy="124" rx="56" ry="22" className="fill-primary-foreground/25" />
          <ellipse cx="100" cy="96" rx="58" ry="24" className="fill-primary/60" />
          <ellipse cx="100" cy="93" rx="40" ry="15" className="fill-primary-foreground/30" />
        </g>
      )}
      {kind === 'linen' && (
        <g>
          <path d="M40 60h120l-8 106H48Z" className="fill-primary/80" />
          <path d="M40 60h120v18H40Z" className="fill-primary" />
          {[60, 80, 100, 120, 140].map((x) => (
            <path key={x} d={`M${x} 80v84`} strokeWidth="2" className="stroke-primary-foreground/20" />
          ))}
          <path d="M40 104h118M44 132h112" strokeWidth="2" className="stroke-primary-foreground/20" />
        </g>
      )}
    </svg>
  )
}
