import { useEffect, useLayoutEffect, useRef, type AnchorHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NotchCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  /** The picture at the top: an img or an SVG. It fills the frame and is shown in grey until it blooms. */
  image: ReactNode
  /** The card's title. With `href` it is the link, stretched over the whole card. */
  title: ReactNode
  /** A small mono line above the title. */
  eyebrow?: ReactNode
  /** A short caption under the title. */
  children?: ReactNode
  /** A row at the bottom, under a hairline, e.g. two small facts. */
  footer?: ReactNode
  /** Makes the whole card a link. */
  href?: string
  /** Extra attributes for the link, e.g. `target` or `onClick`. */
  linkProps?: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'>
  /** What sits in the notch. Pass your own button for a second action; with `href` the default is an arrow. */
  action?: ReactNode
  /** Which top corner the notch is cut from. */
  notch?: 'top-right' | 'top-left'
  /** Controlled: show the image in colour, e.g. for a selected card. */
  bloom?: boolean
}

const R = 26 // corner radius, the tile radius
const N = 56 // notch size
const r = 14 // radius where the notch turns, the inner radius

// The card's outline with the notch cut from a top corner, in pixels. The left one is the right one mirrored.
function outline(W: number, H: number, left: boolean) {
  if (left)
    return `M${W - R} 0H${N + r}A${r} ${r} 0 0 0 ${N} ${r}V${N - r}A${r} ${r} 0 0 1 ${N - r} ${N}H${R}A${R} ${R} 0 0 0 0 ${N + R}V${H - R}A${R} ${R} 0 0 0 ${R} ${H}H${W - R}A${R} ${R} 0 0 0 ${W} ${H - R}V${R}A${R} ${R} 0 0 0 ${W - R} 0Z`
  return `M${R} 0H${W - N - r}A${r} ${r} 0 0 1 ${W - N} ${r}V${N - r}A${r} ${r} 0 0 0 ${W - N + r} ${N}H${W - R}A${R} ${R} 0 0 1 ${W} ${N + R}V${H - R}A${R} ${R} 0 0 1 ${W - R} ${H}H${R}A${R} ${R} 0 0 1 0 ${H - R}V${R}A${R} ${R} 0 0 1 ${R} 0Z`
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * A card with a notch cut from one top corner, like a punched specimen card; the notch holds its action.
 * The image is grey at rest and blooms into colour on hover or keyboard focus. Only filter and transform animate.
 * The outline is measured once per resize and drawn as one path, so the hairline runs unbroken round the notch.
 * Under reduced motion the image switches to colour without a fade.
 */
export function NotchCard({
  image,
  title,
  eyebrow,
  children,
  footer,
  href,
  linkProps,
  action,
  notch = 'top-right',
  bloom,
  className,
  style,
  ...rest
}: NotchCardProps) {
  const root = useRef<HTMLDivElement>(null)
  const frame = useRef<SVGSVGElement>(null)
  const left = notch === 'top-left'

  // The clip and the hairline share one path, sized to the card. Nothing about it animates.
  useIsoLayoutEffect(() => {
    const el = root.current
    const svg = frame.current
    if (!el || !svg) return
    const layout = () => {
      const W = el.offsetWidth
      const H = el.offsetHeight
      if (!W || !H) return
      const d = outline(W, H, left)
      el.style.setProperty('--nc-clip', `path('${d}')`)
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
      svg.querySelectorAll('path').forEach((p) => p.setAttribute('d', d))
    }
    layout()
    const ro = new ResizeObserver(layout)
    ro.observe(el)
    return () => ro.disconnect()
  }, [left])

  const arrow = (
    <span aria-hidden className="grid size-11 place-items-center rounded-full bg-muted text-foreground">
      <ArrowUpRight
        strokeWidth={2}
        className={cn(
          'size-4 transition-transform duration-200 ease-out-quint motion-reduce:transition-none',
          'group-hover/nc:translate-x-0.5 group-hover/nc:-translate-y-0.5 group-has-focus-visible/nc:translate-x-0.5 group-has-focus-visible/nc:-translate-y-0.5',
          'group-data-bloom/nc:translate-x-0.5 group-data-bloom/nc:-translate-y-0.5',
        )}
      />
    </span>
  )
  const inNotch = action ?? (href ? arrow : null)

  return (
    <div
      ref={root}
      data-bloom={bloom ? '' : undefined}
      style={style}
      className={cn('group/nc relative isolate flex w-full max-w-[280px] flex-col text-card-foreground', className)}
      {...rest}
    >
      <div className="flex flex-1 flex-col bg-card [clip-path:var(--nc-clip)]">
        <div className="relative aspect-[280/214] shrink-0 overflow-hidden bg-muted">
          <div
            className={cn(
              'absolute inset-0 scale-[1.001] [filter:grayscale(1)_contrast(0.92)_brightness(1.02)] transition-[filter,scale] duration-280 ease-out-quint motion-reduce:transition-none',
              '[&>img]:size-full [&>img]:object-cover [&>svg]:size-full',
              'group-hover/nc:scale-[1.03] group-hover/nc:[filter:none] group-has-focus-visible/nc:scale-[1.03] group-has-focus-visible/nc:[filter:none]',
              'group-data-bloom/nc:scale-[1.03] group-data-bloom/nc:[filter:none]',
            )}
          >
            {image}
          </div>
        </div>
        <div className="grid gap-2 px-6 pt-5 pb-4">
          {eyebrow && <p className="font-mono text-[11px] leading-none font-medium tracking-[0.04em] text-muted-foreground tabular-nums">{eyebrow}</p>}
          <h3 className="text-[19px] leading-[1.2] font-semibold tracking-[-0.02em] text-pretty">
            {href ? (
              <a
                href={href}
                {...linkProps}
                className={cn(
                  'outline-none after:absolute after:inset-0 after:z-10 after:[clip-path:var(--nc-clip)] focus-visible:outline-none',
                  linkProps?.className,
                )}
              >
                {title}
              </a>
            ) : (
              title
            )}
          </h3>
          {children && <div className="text-[13.5px] leading-normal text-pretty text-muted-foreground">{children}</div>}
        </div>
        {footer && (
          <div className="mx-6 mt-auto mb-[18px] flex justify-between gap-3 border-t border-[color:color-mix(in_oklab,var(--foreground)_9%,transparent)] pt-3.5 font-mono text-[11.5px] leading-none text-muted-foreground tabular-nums">
            {footer}
          </div>
        )}
      </div>
      <svg ref={frame} aria-hidden className="pointer-events-none absolute inset-0 z-20 size-full overflow-visible">
        <path className="fill-none stroke-[color:color-mix(in_oklab,var(--foreground)_9%,transparent)] [stroke-width:1] [vector-effect:non-scaling-stroke]" />
        <path className="fill-none stroke-ring opacity-0 [stroke-width:2] [vector-effect:non-scaling-stroke] group-has-focus-visible/nc:opacity-100" />
      </svg>
      {inNotch && (
        <div className={cn('absolute top-0 z-30 grid size-14 place-items-center', left ? 'left-0' : 'right-0', !action && 'pointer-events-none')}>
          {inNotch}
        </div>
      )}
    </div>
  )
}
