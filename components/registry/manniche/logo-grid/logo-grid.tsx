// Based on Watermelon UI's “Integrations 2” block (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten with any logos, a phone layout and theme tokens.
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type LogoGridItem = { name: string; logo: ReactNode }

export type LogoGridProps = {
  /** Twelve fill the grid around the centre; fewer leave empty cells. */
  items: LogoGridItem[]
  /** The heading in the centre cell. */
  title: ReactNode
  /** A short line under the heading. */
  description?: ReactNode
  /** E.g. a link to all integrations. */
  action?: ReactNode
  /** Classes for the outer section. */
  className?: string
}

/**
 * A grid of logos around a centre cell with a heading, for integrations or partners.
 * On a phone the heading comes first and the logos fall in two columns below.
 */
export function LogoGrid({ items, title, description, action, className }: LogoGridProps) {
  return (
    <section className={cn('grid grid-cols-2 border-t border-l sm:grid-cols-4', className)}>
      <div className="relative isolate col-span-2 flex flex-col items-center justify-center gap-3 overflow-hidden border-r border-b px-6 py-10 text-center sm:col-start-2 sm:row-span-2 sm:row-start-2">
        {/* Thin diagonal lines behind the text. */}
        <span aria-hidden className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(135deg,var(--color-border)_0_1px,transparent_1px_10px)] opacity-60" />
        <h2 className="text-2xl font-semibold tracking-tight text-balance">{title}</h2>
        {description && <p className="max-w-xs text-sm text-pretty text-muted-foreground">{description}</p>}
        {action}
      </div>
      <ul className="contents">
        {items.map((item) => (
          <li key={item.name} className="group flex aspect-square flex-col items-center justify-center gap-2 border-r border-b p-4 sm:aspect-auto sm:min-h-32">
            <span className="grid size-10 place-items-center text-muted-foreground transition-colors duration-200 group-hover:text-foreground [&_svg]:size-7">{item.logo}</span>
            <span className="text-xs text-muted-foreground">{item.name}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
