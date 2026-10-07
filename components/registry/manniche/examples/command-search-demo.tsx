import { useState } from 'react'
import { CommandSearch, type CommandSearchItem } from '@/registry/manniche/command-search/command-search'

// Example data: real Manniche UI names with their one-line descriptions from the registries.
const free = (id: string, title: string, category: string, description: string): CommandSearchItem => ({
  id,
  title,
  category,
  description,
  group: 'Free',
  tier: 'free',
  install: `npx shadcn@latest add https://mikkelmanniche.dk/lab/r/${id}.json`,
})
const pro = (id: string, title: string, category: string, description: string): CommandSearchItem => ({
  id,
  title,
  category,
  description,
  group: 'Pro',
  tier: 'pro',
  install: `npx shadcn@latest add @manniche-pro/${id}`,
})
const template = (id: string, title: string, category: string, description: string): CommandSearchItem => ({
  ...free(id, title, category, description),
  group: 'Templates',
})

const SHORT: CommandSearchItem[] = [
  free(
    'donut',
    'Donut',
    'widgets',
    'A thick ring of rounded segments with gaps, a centre figure and a legend list; point at a segment or a row and it steps out while the centre reads its value and share. An optional target puts a mark on the ring and the progress in the centre.',
  ),
  free(
    'bar-chart',
    'Bar chart',
    'widgets',
    'A column chart with round-capped bars, a dot on today, an optional pale comparison bar, and day points grouped into weeks when the bars would get too thin; one Tab stop with arrow keys.',
  ),
  free(
    'number-ticker',
    'Number ticker',
    'motion',
    'Counts up to a number when it scrolls into view. Screen readers hear only the final number.',
  ),
  free(
    'command-palette',
    'Command palette',
    'overlays',
    'A searchable list of commands in a modal, opened with Cmd+K. Built on the native dialog.',
  ),
  pro(
    'flux-image',
    'Flux Image',
    'image',
    'A photo that flows like liquid under the pointer: a small WebGL2 fluid simulation with a prism split, sheen and warping edges. A click sends out a ring.',
  ),
  pro(
    'warp-type',
    'Warp Type',
    'text',
    'Display text on a WebGL mesh that the pointer drags and that springs back, with colour fringes that cycle through a palette while you drag.',
  ),
  pro(
    'dot-globe',
    'Dot globe',
    'widgets',
    'A plotted globe of dots from an embedded Natural Earth land mask, with drag momentum, a slow spin, arrow keys and an instrument readout. Canvas 2D, pauses off screen, still under reduced motion.',
  ),
]

const LONG: CommandSearchItem[] = [
  ...SHORT,
  free(
    'area-chart',
    'Area chart',
    'widgets',
    'A smooth line over a soft tint for a value that moves day by day, with an optional dashed comparison line, a crosshair tooltip that reads the difference, and room under zero for a dip.',
  ),
  free(
    'sparkline',
    'Sparkline',
    'widgets',
    'A tiny trend line without axes for beside a figure or in a table cell, with a dot on the latest point, a tooltip and a 44 px keyboard and touch target however thin it is.',
  ),
  free(
    'dial',
    'Dial',
    'widgets',
    'A fat arc of rounded segments that light up to a value with a marker in the signal colour, or a three-zone gauge with a needle; read-only or a slider you can drag or key.',
  ),
  free(
    'bubble-chart',
    'Bubble chart',
    'widgets',
    'A bubble chart sized by value: on two axes when items have x and y, packed largest-first otherwise, with direct labels where they fit, one tooltip and one Tab stop with arrow keys.',
  ),
  free(
    'data-tile',
    'Data tile',
    'surfaces',
    'The tile a figure or chart sits in: name, a control on the right, the figure, the fine print under a line; inverted to lift the one that matters most, compact for dense dashboards.',
  ),
  free('blur-fade', 'Blur fade', 'motion', 'Fades an element up out of a soft blur the first time it enters the view.'),
  free(
    'highlighter',
    'Highlighter',
    'motion',
    'A marker stroke draws behind a phrase the first time it scrolls into view.',
  ),
  free(
    'text-reveal',
    'Text reveal',
    'motion',
    'Words go from faint to full as the reader scrolls through a paragraph.',
  ),
  free(
    'marquee',
    'Marquee',
    'motion',
    'Items scroll sideways in an endless loop and pause on hover or focus. Static under reduced motion.',
  ),
  free(
    'rolling-number',
    'Rolling number',
    'motion',
    'A number whose changed digits roll up or down, read once by screen readers.',
  ),
  free(
    'toast',
    'Toast',
    'overlays',
    'Short messages that stack in a corner and leave on their own. Call toast() from anywhere.',
  ),
  free('sheet', 'Sheet', 'overlays', 'A panel that slides up from the bottom and can be dragged down to close.'),
  free(
    'dialog-stack',
    'Dialog stack',
    'overlays',
    'A modal with steps that stack behind each other, built on the native dialog element.',
  ),
  free('switch', 'Switch', 'controls', 'An on and off switch whose knob stretches when pressed and springs across.'),
  free(
    'copy-button',
    'Copy button',
    'controls',
    'Copies a value, and the icon and label roll over to say it worked, or that the browser said no.',
  ),
  free(
    'stepper',
    'Stepper',
    'controls',
    'A plus and minus counter with rolling digits that also works with the arrow keys.',
  ),
  free(
    'tag-picker',
    'Tag picker',
    'controls',
    'Pick tags from a pool, and each one flies into the box and back out when removed.',
  ),
  free(
    'hold-to-confirm',
    'Hold to confirm',
    'controls',
    'A button for actions that must not happen by accident: it fills while held and fires when full.',
  ),
  free(
    'continuous-tabs',
    'Continuous tabs',
    'navigation',
    'Tabs where a pill slides to the one you pick, with arrow keys like a proper tab list.',
  ),
  free(
    'dock',
    'Dock',
    'navigation',
    'A toolbar of app icons that bounce when picked, with labels on hover and arrow-key navigation.',
  ),
  free(
    'code-block',
    'Code block',
    'agent',
    'Code with a file name and a copy button. Bring your own highlighting, or none.',
  ),
  free('file-diff', 'File diff', 'agent', 'A change to one file as a coding agent proposes it, from a unified diff.'),
  template(
    'pricing-page',
    'Pricing page',
    'templates',
    'Three plans with a monthly and yearly switch, a comparison table, FAQ and a closing call to action.',
  ),
  template(
    'sign-in-page',
    'Sign-in page',
    'templates',
    'Split-screen sign-in and sign-up with passkey, inline validation and a brand panel with a customer quote.',
  ),
  template(
    'changelog-page',
    'Changelog page',
    'templates',
    'A timeline of releases with a filter for new, improved and fixed, a version index and a subscribe form.',
  ),
  template(
    'store-dashboard',
    'Store dashboard',
    'templates',
    'Shop admin with a sidebar, KPI cards, a revenue chart with a period switch, top products and recent orders.',
  ),
  template(
    'footer-slim',
    'Footer Slim',
    'templates',
    'A one-row footer for apps and docs: wordmark, links, a light, dark and system switch and the copyright line.',
  ),
  template(
    'contact-form',
    'Contact Form',
    'templates',
    'A two-tile contact form with a topic picker, a character count, optional consent, and an info tile with the response time.',
  ),
]

const BUTTON =
  'inline-flex h-11 items-center rounded-full bg-muted px-4 text-sm font-medium text-foreground transition-transform duration-100 ease-out-quint outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] motion-reduce:transition-none'

export default function CommandSearchDemo() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState('')

  const openWith = (q: string) => {
    setQuery(q)
    setOpen(true)
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-12 px-4 py-6 sm:px-6 sm:py-10">
      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Seven components. Cmd/Ctrl+K or / opens it, and so does typing in the field
        </h2>
        <CommandSearch
          items={SHORT}
          open={open}
          onOpenChange={setOpen}
          query={query}
          onQueryChange={setQuery}
          onSelect={(item) => setChosen(item.title)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={BUTTON} onClick={() => openWith('zebra')}>
            Open with no results
          </button>
          <button type="button" className={BUTTON} onClick={() => openWith('globe')}>
            Open with one result
          </button>
          <p role="status" className="ml-1 text-sm text-muted-foreground">
            {chosen && `Opened: ${chosen}`}
          </p>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          A long list, every result shown. A second search on the page, so its shortcuts are off
        </h2>
        <CommandSearch
          items={LONG}
          hotkeys={false}
          shortcuts={false}
          initialLimit={LONG.length}
          limit={LONG.length}
          labels={{
            placeholder: 'Search {count} components and templates',
            searchLabel: 'Search components and templates',
          }}
          onSelect={(item) => setChosen(item.title)}
        />
      </section>
    </div>
  )
}
