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
          'relative h-[372px] w-full overflow-hidden rounded-[calc(var(--radius)*2+2px)] bg-card shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]',
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
                  'shadow-[-1px_0_0_color-mix(in_oklab,var(--foreground)_9%,transparent),-14px_0_22px_-20px_rgb(0_0_0/0.28)] dark:shadow-[-1px_0_0_color-mix(in_oklab,var(--foreground)_9%,transparent),-14px_0_22px_-20px_rgb(0_0_0/0.7)]',
                '@max-[520px]/ag:h-[300px] @max-[520px]/ag:w-full @max-[520px]/ag:flex-col @max-[520px]/ag:[transform:translateY(var(--ag-p))]',
                'group-data-[orientation=vertical]/ag:h-[300px] group-data-[orientation=vertical]/ag:w-full group-data-[orientation=vertical]/ag:flex-col group-data-[orientation=vertical]/ag:[transform:translateY(var(--ag-p))]',
                k > 0 &&
                  '@max-[520px]/ag:shadow-[0_-1px_0_var(--border),0_-14px_22px_-20px_rgb(0_0_0/0.28)] @max-[520px]/ag:dark:shadow-[0_-1px_0_var(--border),0_-14px_22px_-20px_rgb(0_0_0/0.7)]',
                k > 0 &&
                  'group-data-[orientation=vertical]/ag:shadow-[0_-1px_0_var(--border),0_-14px_22px_-20px_rgb(0_0_0/0.28)] group-data-[orientation=vertical]/ag:dark:shadow-[0_-1px_0_var(--border),0_-14px_22px_-20px_rgb(0_0_0/0.7)]',
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
                    'focus-visible:rounded-[calc(var(--radius)+2px)] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring',
                    '@max-[520px]/ag:flex-row @max-[520px]/ag:px-3.5 @max-[520px]/ag:py-0 group-data-[orientation=vertical]/ag:flex-row group-data-[orientation=vertical]/ag:px-3.5 group-data-[orientation=vertical]/ag:py-0',
                  )}
                >
                  <span
                    aria-hidden
                    className="grid h-7 min-w-7 shrink-0 place-items-center rounded-full bg-muted px-1.5 font-mono text-[11px] leading-none font-medium text-muted-foreground tabular-nums group-hover/t:text-foreground group-data-on/m:bg-foreground group-data-on/m:text-card"
                  >
                    {String(k + 1).padStart(2, '0')}
                  </span>
                  <span className="flex flex-1 flex-col items-center gap-3.5 pt-3 pb-3 @max-[520px]/ag:flex-row @max-[520px]/ag:gap-3 @max-[520px]/ag:py-0 @max-[520px]/ag:pl-3.5 group-data-[orientation=vertical]/ag:flex-row group-data-[orientation=vertical]/ag:gap-3 group-data-[orientation=vertical]/ag:py-0 group-data-[orientation=vertical]/ag:pl-3.5">
                    <span
                      className={cn(
                        'mt-auto mb-auto rotate-180 text-[15px] leading-none font-medium tracking-[-0.01em] whitespace-nowrap [writing-mode:vertical-rl] group-hover/t:text-foreground group-data-on/m:text-foreground',
                        '@max-[520px]/ag:mt-0 @max-[520px]/ag:mb-0 @max-[520px]/ag:rotate-0 @max-[520px]/ag:[writing-mode:horizontal-tb] group-data-[orientation=vertical]/ag:mt-0 group-data-[orientation=vertical]/ag:mb-0 group-data-[orientation=vertical]/ag:rotate-0 group-data-[orientation=vertical]/ag:[writing-mode:horizontal-tb]',
                      )}
                    >
                      {item.title}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="relative size-2 shrink-0 rounded-full bg-muted @max-[520px]/ag:mr-3.5 @max-[520px]/ag:ml-auto group-data-[orientation=vertical]/ag:mr-3.5 group-data-[orientation=vertical]/ag:ml-auto"
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
                className="relative my-1.5 mr-1.5 min-h-0 min-w-0 flex-1 overflow-hidden rounded-[calc(var(--radius)+2px)] bg-muted @max-[520px]/ag:mt-0 @max-[520px]/ag:ml-1.5 group-data-[orientation=vertical]/ag:mt-0 group-data-[orientation=vertical]/ag:ml-1.5"
              >
                <div className="absolute inset-0 [&>img]:size-full [&>img]:object-cover [&>svg]:size-full">{item.content}</div>
                {(item.description || item.eyebrow) && (
                  <div
                    className={cn(
                      'absolute right-3 bottom-3 left-3 grid max-w-[300px] translate-y-1.5 gap-1 rounded-[calc(var(--radius)+2px)] bg-card px-4 py-3.5 opacity-0 shadow-[0_1px_2px_rgba(0,0,0,0.14),0_10px_24px_-10px_rgba(0,0,0,0.4)]',
                      'transition-[opacity,translate] ease-out-quint [transition-duration:180ms,220ms] motion-reduce:transition-none',
                      'group-data-on/m:translate-y-0 group-data-on/m:opacity-100 group-data-on/m:delay-90',
                    )}
                  >
                    {item.eyebrow && (
                      <span className="font-mono text-[11px] leading-none font-medium tracking-[0.04em] text-muted-foreground tabular-nums">{item.eyebrow}</span>
                    )}
                    <b className="text-[15px] leading-[1.3] font-semibold tracking-[-0.01em]">{item.title}</b>
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
