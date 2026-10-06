// Bento features: a section heading over a bento of feature tiles. The first feature is the lead tile: it spans two
// columns and two rows on wide boxes and is the inverted tile, so the one thing the page is about is lifted. Every
// tile has a title, one sentence and a visual slot you fill with whatever you like (DOM, SVG, a figure).
//
// How it reads: one `h2` for the section, a real list of features, and each tile is its own labelled region with an
// `h3`. The visual slot is decorative by default and hidden from screen readers; the sentence carries the meaning.
// Layout follows the box the section sits in (container queries): one column, then two, then a 3 x 3 bento.
// Motion: none of its own. Visuals you pass in decide that and should respect reduced motion.
import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DataTile } from '@/registry/manniche/data-tile/data-tile'

export type BentoFeature = {
  /** A stable key for the tile. */
  id: string
  /** The tile's name, shown as an `h3`. */
  title: ReactNode
  /** One sentence that says what the feature does for the reader. */
  description: ReactNode
  /** A small visual for the tile: DOM, SVG or a figure. Hidden from screen readers unless `visualLabel` is set. */
  visual?: ReactNode
  /** Names the visual for screen readers. Leave it out when the visual only decorates the sentence. */
  visualLabel?: string
}

export type BentoFeaturesProps = Omit<ComponentProps<'section'>, 'children' | 'title'> & {
  /** The section's `h2`. */
  heading: ReactNode
  /** A short line under the heading. */
  intro?: ReactNode
  /** A small mono label above the heading, such as "Features". */
  eyebrow?: ReactNode
  /** The features, lead first. Six fill the bento exactly; other counts reflow without holes at the ends. */
  features: readonly BentoFeature[]
}

export function BentoFeatures({ heading, intro, eyebrow, features, className, ...rest }: BentoFeaturesProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={cn('@container w-full py-12 @3xl:py-20', className)} {...rest}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mb-8 grid max-w-2xl gap-3 @3xl:mb-12">
          {eyebrow && <p className="font-mono text-xs tracking-[0.04em] text-muted-foreground tabular-nums">{eyebrow}</p>}
          <h2
            id={headingId}
            className="text-[clamp(30px,5.4cqw,52px)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance text-foreground"
            style={{ fontFamily: 'var(--font-display, inherit)', fontStretch: '86%' }}
          >
            {heading}
          </h2>
          {intro && <p className="text-base leading-relaxed text-pretty text-muted-foreground">{intro}</p>}
        </header>
        <ul className="grid list-none grid-cols-1 gap-3 p-0 @2xl:grid-cols-2 @2xl:gap-4 @4xl:grid-cols-3">
          {features.map((f, i) => {
            const lead = i === 0
            return (
              <li
                key={f.id}
                className={cn(
                  'flex min-w-0',
                  lead && '@2xl:col-span-2 @4xl:row-span-2',
                  // An odd tile at the end of the two-up layout takes the full row; the 3-up layout needs no help.
                  i === features.length - 1 && i % 2 === 1 && '@2xl:col-span-2 @4xl:col-span-1',
                )}
              >
                <DataTile title={f.title} inverted={lead} className="w-full">
                  <div className={cn('flex h-full flex-col gap-5', lead && '@4xl:gap-8')}>
                    {f.visual && (
                      <div
                        role={f.visualLabel ? 'img' : undefined}
                        aria-label={f.visualLabel}
                        aria-hidden={f.visualLabel ? undefined : true}
                        className={cn(
                          'relative min-h-32 flex-1 overflow-hidden rounded-[14px] bg-muted',
                          lead && 'min-h-48 @4xl:min-h-72',
                        )}
                      >
                        {f.visual}
                      </div>
                    )}
                    <p
                      className={cn(
                        'text-pretty text-muted-foreground',
                        lead ? 'max-w-prose text-base leading-relaxed' : 'text-[15px] leading-normal',
                      )}
                    >
                      {f.description}
                    </p>
                  </div>
                </DataTile>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
