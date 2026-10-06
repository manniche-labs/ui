import { useEffect, useId, useRef, useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type AccordionGalleryItem = {
  /** A stable key. Falls back to the position. */
  id?: string
  /** The module's name, on its narrow strip and in its caption. */
  title: ReactNode
  /** A short line in the caption card. */
  description?: ReactNode
  /** A small mono line above the title in the caption card. */
  eyebrow?: ReactNode
  /** What fills the open module: an img or an SVG fills it edge to edge. */
  content: ReactNode
}

export type AccordionGalleryProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  /** The modules, in order. */
  items: AccordionGalleryItem[]
  /** Controlled: the open module. */
  index?: number
  /** The module open at first, when uncontrolled. */
  defaultIndex?: number
  /** Called when a module opens. */
  onIndexChange?: (index: number) => void
  /** Open a module when a mouse rests on its strip. Touch and pen open on tap. */
  openOnHover?: boolean
  /** The heading level of each strip, so it fits the page's outline. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
  /** `auto` stacks the modules vertically when the gallery is narrower than 520 px. */
  orientation?: 'auto' | 'horizontal' | 'vertical'
}

const S = 56 // a closed module's strip
const SCREWS = [20, 75, 130, 45, 100] // each strip's screw sits at its own angle

/**
 * A rack of modules on one axis. One is open as a full card; the others close to 56 px strips with a vertical label.
 * Every module has the open module's size, and opening one only slides the modules after it along, so only transform
 * and opacity animate. Hover, tap, focus or the arrow keys open a module (an accordion with one panel always open).
 * Under reduced motion the modules and the caption switch without travel.
 */
export function AccordionGallery({
  items,
  index,
  defaultIndex = 0,
  onIndexChange,
  openOnHover = true,
  headingLevel = 3,
  orientation = 'auto',
  className,
  style,
  ...rest
}: AccordionGalleryProps) {
  const n = items.length
  const [own, setOwn] = useState(defaultIndex)
  const cur = Math.min(Math.max(index ?? own, 0), Math.max(n - 1, 0))
  const id = useId()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const hover = useRef(0)

  useEffect(() => () => clearTimeout(hover.current), [])

  const select = (k: number) => {
    clearTimeout(hover.current)
    if (k === cur) return
    setOwn(k)
    onIndexChange?.(k)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, k: number) => {
    const to = { ArrowRight: k + 1, ArrowDown: k + 1, ArrowLeft: k - 1, ArrowUp: k - 1, Home: 0, End: n - 1 }[e.key]
    if (to === undefined) return
    e.preventDefault()
    // Moving focus opens the module, through its focus handler.
    tabs.current[(to + n) % n]?.focus()
  }

  return (
    <div
      data-orientation={orientation}
      style={{ '--ag-n': n, ...style } as CSSProperties}
      className={cn('group/ag w-full', orientation === 'auto' && '@container/ag', className)}
      {...rest}
    >
      <div
        className={cn(
          'relative h-[372px] w-full overflow-hidden rounded-[4px] bg-card shadow-[inset_0_0_0_1px_var(--border)]',
          '@max-[520px]/ag:h-[calc(300px+(var(--ag-n)-1)*56px)] group-data-[orientation=vertical]/ag:h-[calc(300px+(var(--ag-n)-1)*56px)]',
        )}
      >
        {items.map((item, k) => {
          const on = k === cur
          const tab = `${id}-t${k}`
          const panel = `${id}-p${k}`
          // Modules up to the open one stack from the start; the rest sit one open module further on.
          const after = k > cur
          const offset = `calc(${after ? '100% + ' : ''}${(after ? k - 1 : k) * S}px)`
          return (
            <div
              key={item.id ?? k}
              data-on={on ? '' : undefined}
              style={{ zIndex: k + 1, '--ag-p': offset } as CSSProperties}
              className={cn(
                'group/m absolute top-0 left-0 flex h-full w-[calc(100%-(var(--ag-n)-1)*56px)] bg-card',
                '[transform:translateX(var(--ag-p))] transition-transform duration-280 ease-out-quint will-change-transform motion-reduce:transition-none',
                k > 0 &&
                  'shadow-[-1px_0_0_var(--border),-14px_0_22px_-20px_color-mix(in_oklab,var(--foreground)_45%,transparent)] dark:shadow-[-1px_0_0_var(--border),-14px_0_22px_-20px_color-mix(in_oklab,var(--background)_90%,transparent)]',
                '@max-[520px]/ag:h-[300px] @max-[520px]/ag:w-full @max-[520px]/ag:flex-col @max-[520px]/ag:[transform:translateY(var(--ag-p))]',
                'group-data-[orientation=vertical]/ag:h-[300px] group-data-[orientation=vertical]/ag:w-full group-data-[orientation=vertical]/ag:flex-col group-data-[orientation=vertical]/ag:[transform:translateY(var(--ag-p))]',
                k > 0 &&
                  '@max-[520px]/ag:shadow-[0_-1px_0_var(--border),0_-14px_22px_-20px_color-mix(in_oklab,var(--foreground)_45%,transparent)] @max-[520px]/ag:dark:shadow-[0_-1px_0_var(--border),0_-14px_22px_-20px_color-mix(in_oklab,var(--background)_90%,transparent)]',
                k > 0 &&
                  'group-data-[orientation=vertical]/ag:shadow-[0_-1px_0_var(--border),0_-14px_22px_-20px_color-mix(in_oklab,var(--foreground)_45%,transparent)] group-data-[orientation=vertical]/ag:dark:shadow-[0_-1px_0_var(--border),0_-14px_22px_-20px_color-mix(in_oklab,var(--background)_90%,transparent)]',
              )}
            >
              <div
                role="heading"
                aria-level={headingLevel}
                className="h-full w-14 shrink-0 @max-[520px]/ag:h-14 @max-[520px]/ag:w-full group-data-[orientation=vertical]/ag:h-14 group-data-[orientation=vertical]/ag:w-full"
              >
                <button
                  ref={(el) => {
                    tabs.current[k] = el
                  }}
                  type="button"
                  id={tab}
                  aria-expanded={on}
                  aria-controls={panel}
                  // The open module cannot close: one is always open.
                  aria-disabled={on || undefined}
                  onClick={() => select(k)}
                  onFocus={() => select(k)}
                  onKeyDown={(e) => onKeyDown(e, k)}
                  onPointerEnter={(e) => {
                    if (!openOnHover || e.pointerType !== 'mouse') return
                    clearTimeout(hover.current)
                    hover.current = window.setTimeout(() => select(k), 70)
                  }}
                  onPointerLeave={() => clearTimeout(hover.current)}
                  className={cn(
                    'group/t flex size-full cursor-pointer flex-col items-center justify-between bg-card py-3.5 text-muted-foreground [-webkit-tap-highlight-color:transparent] aria-disabled:cursor-default',
                    'focus-visible:rounded-[4px] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring',
                    '@max-[520px]/ag:flex-row @max-[520px]/ag:px-3.5 @max-[520px]/ag:py-0 group-data-[orientation=vertical]/ag:flex-row group-data-[orientation=vertical]/ag:px-3.5 group-data-[orientation=vertical]/ag:py-0',
                  )}
                >
                  <span
                    aria-hidden
                    style={{ rotate: `${SCREWS[k % SCREWS.length]}deg` }}
                    className="relative size-2.5 shrink-0 rounded-full ring-1 ring-foreground/30 ring-inset before:absolute before:inset-x-0.5 before:top-1/2 before:h-px before:-translate-y-1/2 before:bg-foreground/30"
                  />
                  <span className="flex flex-1 flex-col items-center gap-3.5 pt-3 pb-4 @max-[520px]/ag:flex-row @max-[520px]/ag:gap-3 @max-[520px]/ag:py-0 @max-[520px]/ag:pl-3.5 group-data-[orientation=vertical]/ag:flex-row group-data-[orientation=vertical]/ag:gap-3 group-data-[orientation=vertical]/ag:py-0 group-data-[orientation=vertical]/ag:pl-3.5">
                    <span aria-hidden className="font-mono text-[10.5px] leading-none font-medium tabular-nums">
                      {String(k + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={cn(
                        'mt-auto mb-auto rotate-180 text-sm leading-none tracking-[-0.005em] whitespace-nowrap [writing-mode:vertical-rl] group-hover/t:text-foreground group-data-on/m:text-foreground',
                        '@max-[520px]/ag:mt-0 @max-[520px]/ag:mb-0 @max-[520px]/ag:rotate-0 @max-[520px]/ag:[writing-mode:horizontal-tb] group-data-[orientation=vertical]/ag:mt-0 group-data-[orientation=vertical]/ag:mb-0 group-data-[orientation=vertical]/ag:rotate-0 group-data-[orientation=vertical]/ag:[writing-mode:horizontal-tb]',
                      )}
                    >
                      {item.title}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="relative size-1.5 shrink-0 rounded-full ring-1 ring-foreground/30 ring-inset @max-[520px]/ag:mr-3.5 @max-[520px]/ag:ml-auto group-data-[orientation=vertical]/ag:mr-3.5 group-data-[orientation=vertical]/ag:ml-auto"
                  >
                    <span className="absolute inset-0 rounded-full bg-primary opacity-0 transition-opacity duration-120 ease-out-quint group-data-on/m:opacity-100 motion-reduce:transition-none" />
                  </span>
                </button>
              </div>
              <div
                id={panel}
                role="region"
                aria-labelledby={tab}
                inert={!on}
                className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-muted shadow-[inset_1px_0_0_var(--border)] @max-[520px]/ag:shadow-[inset_0_1px_0_var(--border)] group-data-[orientation=vertical]/ag:shadow-[inset_0_1px_0_var(--border)]"
              >
                <div className="absolute inset-0 [&>img]:size-full [&>img]:object-cover [&>svg]:size-full">{item.content}</div>
                {(item.description || item.eyebrow) && (
                  <div
                    className={cn(
                      'absolute right-4 bottom-4 left-4 grid max-w-[300px] translate-y-1.5 gap-1 rounded-md bg-card px-3.5 py-3 opacity-0 shadow-[inset_0_0_0_1px_var(--border)]',
                      'transition-[opacity,translate] ease-out-quint [transition-duration:180ms,220ms] motion-reduce:transition-none',
                      'group-data-on/m:translate-y-0 group-data-on/m:opacity-100 group-data-on/m:delay-90',
                    )}
                  >
                    {item.eyebrow && (
                      <span className="font-mono text-[11px] leading-none font-medium tracking-[0.04em] text-muted-foreground tabular-nums">{item.eyebrow}</span>
                    )}
                    <b className="text-sm leading-[1.3] font-medium">{item.title}</b>
                    {item.description && <span className="text-[12.5px] leading-[1.45] text-muted-foreground">{item.description}</span>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
