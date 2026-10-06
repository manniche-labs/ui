import { useState, type CSSProperties, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type FolderCardProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  /** The name on the front, large. */
  label: ReactNode
  /** A short line under the name, in small mono type. */
  description?: ReactNode
  /** A small mono code in the front's top-left corner, e.g. a part or file number. */
  code?: ReactNode
  /** The word on the tab at the back, in small capitals. */
  tab?: string
  /** The object inside the folder, e.g. an SVG drawing. It is decorative and hidden from screen readers. */
  children?: ReactNode
  /** Makes the folder a link. Without it the folder is a button that holds itself open when pressed. */
  href?: string
  target?: string
  rel?: string
  /** Controlled: keep the folder open. */
  open?: boolean
  defaultOpen?: boolean
  /** Called when a press opens or closes the folder (button only). */
  onOpenChange?: (open: boolean) => void
  /** Width in pixels; the height stays 188. */
  width?: number
}

const H = 188 // folder height
const FRONT = 66 // where the front starts, from the top
const ABOVE = 90 // room above the folder that the object may rise into (it rises 64 px)

// Back with its tab on the left, and the front with a thumb cut in the middle of its top edge.
const back = (w: number) => `M.5 22.5V4.5a4 4 0 0 1 4-4h86l16 18H${w - 4.5}a4 4 0 0 1 4 4V${H - 0.5}H.5z`
const front = (w: number) => `M.5 .5H${w / 2 - 19.5}a19.5 19.5 0 0 0 39 0H${w - 0.5}V${H - FRONT - 0.5}H.5z`

/**
 * A folder. On hover or keyboard focus the front slides down and the object inside rises out of it.
 * The object moves behind a fixed clip at the folder's bottom edge, so only transforms animate.
 * As a button, a press holds it open (aria-pressed); with `href` it is a link.
 * Under reduced motion it switches between closed and open without travel.
 */
export function FolderCard({
  label,
  description,
  code,
  tab,
  children,
  href,
  target,
  rel,
  open,
  defaultOpen = false,
  onOpenChange,
  width = 252,
  className,
  style,
  onClick,
  ...rest
}: FolderCardProps) {
  const [own, setOwn] = useState(defaultOpen)
  const held = open ?? own
  const w = Math.max(200, width)

  const toggle = (e: MouseEvent<HTMLElement>) => {
    onClick?.(e)
    if (href || e.defaultPrevented) return
    setOwn(!held)
    onOpenChange?.(!held)
  }

  const body = (
    <>
      <svg aria-hidden viewBox={`0 0 ${w} ${H}`} className="absolute inset-0 overflow-visible">
        <path d={back(w)} className="fill-muted stroke-foreground/30" />
        {tab && (
          <text x="12" y="12.5" className="fill-muted-foreground font-mono text-[8.5px] font-medium tracking-[0.06em] uppercase">
            {tab}
          </text>
        )}
      </svg>
      {/* The clip never moves: the object travels behind it and is cut at the folder's bottom edge. */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden" style={{ top: -ABOVE }}>
        <span
          className={cn(
            'absolute right-4 left-[50px] block transition-transform duration-240 ease-out-quint motion-reduce:transition-none',
            // Open on hover, keyboard focus or while held.
            'group-hover/fc:-translate-y-16 group-focus-visible/fc:-translate-y-16 group-data-open/fc:-translate-y-16',
          )}
          style={{ top: ABOVE + FRONT - 32 }}
        >
          {children}
        </span>
      </span>
      <span
        className={cn(
          'absolute inset-x-0 bottom-0 block transition-transform duration-240 ease-out-quint motion-reduce:transition-none',
          'group-hover/fc:translate-y-3 group-focus-visible/fc:translate-y-3 group-data-open/fc:translate-y-3',
        )}
        style={{ top: FRONT }}
      >
        <svg aria-hidden viewBox={`0 0 ${w} ${H - FRONT}`} className="absolute inset-0 overflow-visible">
          <path d={front(w)} className="fill-card stroke-foreground/30" />
        </svg>
        <span aria-hidden className="absolute top-[17.5px] right-[14.5px] size-[7px] rounded-full ring-1 ring-foreground/30 ring-inset">
          <span
            className={cn(
              'absolute inset-0 rounded-full bg-primary opacity-0 transition-opacity duration-120 ease-out-quint motion-reduce:transition-none',
              'group-hover/fc:opacity-100 group-focus-visible/fc:opacity-100 group-data-open/fc:opacity-100',
            )}
          />
        </span>
        {code && (
          <span className="absolute top-[15px] left-3.5 font-mono text-[9.5px] leading-none font-medium tracking-[0.04em] text-muted-foreground">{code}</span>
        )}
        <span className="absolute inset-x-3.5 bottom-[13px] grid gap-[5px]">
          <span className="truncate text-[19px] leading-none tracking-[-0.02em] text-foreground">{label}</span>
          {description && <span className="truncate font-mono text-[9.5px] leading-[1.2] text-muted-foreground">{description}</span>}
        </span>
      </span>
    </>
  )

  const shared = {
    ...rest,
    onClick: toggle,
    'data-open': held ? '' : undefined,
    style: { width: w, height: H, ...style } as CSSProperties,
    className: cn(
      'group/fc relative block shrink-0 rounded-md text-left text-foreground [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-ring',
      className,
    ),
  }

  return href ? (
    <a href={href} target={target} rel={rel} {...shared}>
      {body}
    </a>
  ) : (
    <button type="button" aria-pressed={held} {...shared}>
      {body}
    </button>
  )
}
