import { Menu, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type GlassNavLink = { href: string; label: string }

export type GlassNavbarProps = {
  brand: ReactNode
  links: GlassNavLink[]
  /** The href of the page the visitor is on; that link gets aria-current. */
  current?: string
  /** A button or link at the end, e.g. "Book a call". */
  action?: ReactNode
  /**
   * frosted: a full-width bar, always glass.
   * floating: a pill that floats clear of the edges.
   * scroll: over the hero with white text on a soft shade, glass once the page has scrolled.
   *   Use it on a dark or photo hero; the shade keeps the text at 4.5:1 on mid-tone colours.
   */
  variant?: 'frosted' | 'floating' | 'scroll'
  className?: string
}

// The glass in one place. The tint is strong enough that text keeps at least 4.5:1 over pure black or
// pure white behind it, in both themes. Without backdrop-filter, with reduced transparency or with more
// contrast asked for, the bar turns solid.
const glass =
  'border-border/60 bg-background/75 backdrop-blur-2xl backdrop-saturate-150 ' +
  'supports-[not(backdrop-filter:blur(1px))]:bg-background ' +
  '[@media(prefers-reduced-transparency:reduce)]:bg-background [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none ' +
  'contrast-more:border-border contrast-more:bg-background contrast-more:backdrop-blur-none'

/** A sticky top navigation on frosted glass, with a menu button below the sm breakpoint. */
export function GlassNavbar({ brand, links, current, action, variant = 'frosted', className }: GlassNavbarProps) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)
  const menuId = useId()

  // A one-pixel marker above the bar: once it leaves the view, the page has scrolled.
  // Works inside any scroll container, not only the window.
  useEffect(() => {
    if (variant !== 'scroll' || !sentinel.current) return
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting))
    io.observe(sentinel.current)
    return () => io.disconnect()
  }, [variant])

  useEffect(() => {
    if (!open) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    addEventListener('keydown', close)
    return () => removeEventListener('keydown', close)
  }, [open])

  const solid = variant !== 'scroll' || scrolled || open
  const floating = variant === 'floating'

  return (
    <>
      {variant === 'scroll' && <div ref={sentinel} aria-hidden className="h-px -mb-px" />}
      <header data-hero={!solid} className={cn('group/glass sticky top-0 z-30', floating && 'px-3 pt-3', className)}>
        <div
          className={cn(
            'border transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out motion-reduce:transition-none',
            floating
              ? 'mx-auto max-w-3xl rounded-2xl shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),0_8px_24px_-12px_rgb(0_0_0/0.25)]'
              : 'border-x-0 border-t-0',
            solid ? glass : 'border-transparent bg-linear-to-b from-black/45 to-transparent',
          )}
        >
          <nav aria-label="Main" className={cn('flex min-h-14 items-center gap-4', floating ? 'px-3' : 'mx-auto max-w-5xl px-4')}>
            <div className="mr-auto flex items-center text-sm font-semibold group-data-[hero=true]/glass:text-white">{brand}</div>
            <ul className="hidden items-center gap-1 sm:flex">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    aria-current={l.href === current ? 'page' : undefined}
                    className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground group-data-[hero=true]/glass:text-white/90 group-data-[hero=true]/glass:hover:text-white group-data-[hero=true]/glass:aria-[current=page]:text-white"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            {action && <div className="hidden sm:block">{action}</div>}
            <button
              type="button"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((o) => !o)}
              className="grid size-11 place-items-center rounded-lg text-foreground sm:hidden group-data-[hero=true]/glass:text-white"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </nav>
          <div id={menuId} hidden={!open} className="border-t border-border/60 px-4 pb-3 sm:hidden">
            <ul className="grid pt-2">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    aria-current={l.href === current ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center text-base text-muted-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            {action && <div className="pt-2">{action}</div>}
          </div>
        </div>
      </header>
    </>
  )
}
