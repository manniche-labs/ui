// An admin dashboard for a small online shop. The period switch, the chart tooltips and the mobile menu are plain HTML
// and CSS (radio buttons with :has(), :hover, :focus-within and details), so the markup also works as a static page.
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Box,
  ChevronDown,
  Home,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Tag,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: Home, label: 'Overview', current: true },
  { icon: ShoppingCart, label: 'Orders', count: 12 },
  { icon: Package, label: 'Products' },
  { icon: Users, label: 'Customers' },
  { icon: Tag, label: 'Discounts' },
  { icon: BarChart3, label: 'Reports' },
]

const kpis = [
  { label: 'Revenue', value: '€48,290', change: 12.4, points: [8, 10, 9, 12, 11, 14, 13, 16, 15, 18, 17, 21] },
  { label: 'Orders', value: '1,284', change: 8.1, points: [10, 11, 10, 12, 14, 13, 15, 14, 16, 15, 17, 18] },
  { label: 'Average order', value: '€37.60', change: 3.9, points: [12, 12, 13, 12, 13, 14, 13, 14, 14, 15, 14, 15] },
  { label: 'Returns', value: '2.1%', change: -0.6, points: [16, 15, 15, 14, 15, 13, 13, 12, 12, 11, 12, 10], lowerIsBetter: true },
]

const periods = [
  {
    id: 'week',
    label: '7 days',
    total: '€11,940',
    bars: [
      ['Mon', 1420],
      ['Tue', 1610],
      ['Wed', 1380],
      ['Thu', 1890],
      ['Fri', 2140],
      ['Sat', 2010],
      ['Sun', 1490],
    ],
  },
  {
    id: 'month',
    label: '30 days',
    total: '€48,290',
    bars: [
      ['Wk 1', 10200],
      ['Wk 2', 11800],
      ['Wk 3', 12650],
      ['Wk 4', 13640],
    ],
  },
  {
    id: 'year',
    label: '12 months',
    total: '€512,400',
    bars: [
      ['Jan', 31000],
      ['Feb', 29500],
      ['Mar', 36200],
      ['Apr', 38900],
      ['May', 41000],
      ['Jun', 39800],
      ['Jul', 37400],
      ['Aug', 40100],
      ['Sep', 44600],
      ['Oct', 47300],
      ['Nov', 58200],
      ['Dec', 68400],
    ],
  },
] as const

const topProducts = [
  { name: 'Morning mug', sold: 342, revenue: '€8,208', share: 0.92 },
  { name: 'Linen napkins, set of 4', sold: 251, revenue: '€7,028', share: 0.74 },
  { name: 'Serving bowl', sold: 168, revenue: '€7,056', share: 0.61 },
  { name: 'Water carafe', sold: 133, revenue: '€4,788', share: 0.42 },
  { name: 'Tall vase', sold: 71, revenue: '€4,118', share: 0.28 },
]

type Status = 'Paid' | 'Shipped' | 'Pending' | 'Refunded'
const orders: { id: string; customer: string; date: string; items: number; total: string; status: Status }[] = [
  { id: '#3021', customer: 'Ana Ruiz', date: 'Today, 09:41', items: 3, total: '€96.00', status: 'Paid' },
  { id: '#3020', customer: 'Jonas Petersen', date: 'Today, 08:12', items: 1, total: '€42.00', status: 'Pending' },
  { id: '#3019', customer: 'Mei Lin', date: 'Yesterday', items: 6, total: '€214.50', status: 'Shipped' },
  { id: '#3018', customer: 'Tomás Novak', date: 'Yesterday', items: 2, total: '€60.00', status: 'Shipped' },
  { id: '#3017', customer: 'Sara Holm', date: '2 Oct', items: 1, total: '€24.00', status: 'Refunded' },
]

const statusStyle: Record<Status, string> = {
  Paid: 'bg-primary/12 text-primary',
  Shipped: 'bg-success/12 text-success',
  Pending: 'bg-muted text-muted-foreground',
  Refunded: 'bg-destructive/12 text-destructive',
}

function Sparkline({ points, good }: { points: readonly number[]; good: boolean }) {
  const max = Math.max(...points)
  const min = Math.min(...points)
  const xy = points.map((p, i) => `${(i / (points.length - 1)) * 100},${28 - ((p - min) / (max - min || 1)) * 24}`)
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-10 w-full overflow-visible" aria-hidden>
      <path d={`M0,30 L${xy.join(' L')} L100,30 Z`} className={good ? 'fill-primary/10' : 'fill-destructive/10'} />
      <path
        d={`M${xy.join(' L')}`}
        fill="none"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        className={good ? 'stroke-primary' : 'stroke-destructive'}
      />
    </svg>
  )
}

function Brand() {
  return (
    <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Box className="size-4" aria-hidden />
      </span>
      Linden Admin
    </a>
  )
}

function Nav() {
  return (
    <ul className="space-y-1">
      {navItems.map(({ icon: Icon, label, current, count }) => (
        <li key={label}>
          <a
            href={`#${label.toLowerCase()}`}
            aria-current={current ? 'page' : undefined}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground"
          >
            <Icon className="size-4" aria-hidden />
            {label}
            {count && <span className="ml-auto rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground tabular-nums">{count}</span>}
          </a>
        </li>
      ))}
    </ul>
  )
}

/** Shop admin dashboard: sidebar, KPI cards with sparklines, a revenue chart with a period switch, top products and recent orders. */
export function StoreDashboard() {
  return (
    <div id="top" className="group/dash min-h-dvh bg-muted/40 font-sans text-foreground antialiased lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r bg-card lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex h-16 items-center px-5">
          <Brand />
        </div>
        <nav aria-label="Main" className="flex-1 px-3 py-4">
          <Nav />
        </nav>
        <div className="m-3 rounded-xl border bg-accent/50 p-4">
          <p className="text-sm font-medium">Black Friday in 52 days</p>
          <p className="mt-1 text-xs text-muted-foreground">Set up discounts early so you can test them.</p>
          <a href="#discounts" className="mt-3 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline">
            Plan a discount
          </a>
        </div>
        <a href="#settings" className="flex items-center gap-3 border-t px-6 py-4 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <Settings className="size-4" aria-hidden />
          Settings
        </a>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
          <details className="group/menu relative lg:hidden">
            <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-lg border [&::-webkit-details-marker]:hidden">
              <Menu className="size-4 group-open/menu:hidden" aria-hidden />
              <X className="hidden size-4 group-open/menu:block" aria-hidden />
              <span className="sr-only">Menu</span>
            </summary>
            <nav aria-label="Main" className="absolute top-12 left-0 w-60 rounded-xl border bg-card p-2 shadow-lg">
              <Nav />
            </nav>
          </details>
          <div className="lg:hidden">
            <Brand />
          </div>
          <label className="ml-auto hidden h-9 w-72 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground focus-within:ring-2 focus-within:ring-ring sm:flex lg:ml-0">
            <Search className="size-4" aria-hidden />
            <input
              type="search"
              placeholder="Search orders, products…"
              className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <div className="ml-auto flex items-center gap-2 sm:ml-0 lg:ml-auto">
            <button type="button" className="relative grid size-9 place-items-center rounded-lg border bg-card" aria-label="Notifications, 3 new">
              <Bell className="size-4" aria-hidden />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-card" />
            </button>
            <button type="button" className="flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 transition-colors hover:bg-muted">
              <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">MK</span>
              <span className="hidden text-sm font-medium sm:block">Maja K.</span>
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Good morning, Maja</p>
              <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
            </div>
            <fieldset className="flex rounded-lg border bg-card p-1 text-sm">
              <legend className="sr-only">Period</legend>
              {periods.map((p) => (
                <label
                  key={p.id}
                  className="cursor-pointer rounded-md px-3 py-1.5 text-muted-foreground transition-colors duration-150 has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-2 has-focus-visible:ring-ring"
                >
                  <input type="radio" name="period" value={p.id} defaultChecked={p.id === 'month'} className="sr-only" />
                  {p.label}
                </label>
              ))}
            </fieldset>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => {
              const good = k.lowerIsBetter ? k.change < 0 : k.change > 0
              const Arrow = k.change > 0 ? ArrowUpRight : ArrowDownRight
              return (
                <li key={k.label} className="rounded-2xl border bg-card p-5 transition-shadow duration-200 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{k.label}</p>
                    <span
                      className={cn(
                        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums',
                        good ? 'bg-success/12 text-success' : 'bg-destructive/12 text-destructive',
                      )}
                    >
                      <Arrow className="size-3" aria-hidden />
                      {Math.abs(k.change)}%
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{k.value}</p>
                  <div className="mt-3">
                    <Sparkline points={k.points} good={good} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">vs. the 30 days before</p>
                </li>
              )
            })}
          </ul>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section aria-labelledby="revenue" className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6">
              {periods.map((p) => {
                const max = Math.max(...p.bars.map(([, v]) => v))
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'hidden',
                      p.id === 'week' && 'group-has-[[value=week]:checked]/dash:block',
                      p.id === 'month' && 'group-has-[[value=month]:checked]/dash:block',
                      p.id === 'year' && 'group-has-[[value=year]:checked]/dash:block',
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <div>
                        <h2 id={p.id === 'month' ? 'revenue' : undefined} className="text-sm text-muted-foreground">
                          Revenue, {p.label}
                        </h2>
                        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{p.total}</p>
                      </div>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="size-2.5 rounded-sm bg-primary" aria-hidden />
                        Sales incl. VAT
                      </p>
                    </div>
                    <ol className="mt-8 flex h-56 items-end gap-2 border-b sm:gap-3" aria-label={`Revenue by period, ${p.label}`}>
                      {p.bars.map(([label, value], i) => (
                        <li key={label} className="group/bar relative flex h-full flex-1 flex-col justify-end" tabIndex={0}>
                          <span
                            className={cn(
                              'pointer-events-none absolute z-10 scale-95 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background opacity-0 shadow-lg transition-[opacity,scale] duration-150 group-hover/bar:scale-100 group-hover/bar:opacity-100 group-focus/bar:scale-100 group-focus/bar:opacity-100',
                              i === 0 ? 'left-0' : i === p.bars.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2',
                            )}
                            style={{ bottom: `calc(${(value / max) * 100}% + 6px)` }}
                          >
                            {label}: €{value.toLocaleString('en-GB')}
                          </span>
                          <span
                            className="block origin-bottom rounded-t-md bg-primary/75 transition-[background-color,scale] duration-500 ease-out-quint group-hover/bar:bg-primary group-focus/bar:bg-primary starting:scale-y-0"
                            style={{ height: `${(value / max) * 100}%`, transitionDelay: `${i * 30}ms` }}
                          />
                        </li>
                      ))}
                    </ol>
                    <ol className="mt-2 flex gap-2 text-center text-xs text-muted-foreground sm:gap-3" aria-hidden>
                      {p.bars.map(([label]) => (
                        <li key={label} className="flex-1 truncate">
                          {label}
                        </li>
                      ))}
                    </ol>
                  </div>
                )
              })}
            </section>

            <section aria-labelledby="top-products" className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 id="top-products" className="font-semibold">
                  Top products
                </h2>
                <a href="#products" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  See all
                </a>
              </div>
              <ol className="mt-5 space-y-4">
                {topProducts.map((p, i) => (
                  <li key={p.name}>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-xs font-medium text-muted-foreground tabular-nums">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                      <span className="text-muted-foreground tabular-nums">{p.sold} sold</span>
                      <span className="w-16 text-right font-medium tabular-nums">{p.revenue}</span>
                    </div>
                    <div className="mt-2 ml-10 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full origin-left rounded-full bg-primary transition-[scale] duration-700 ease-out-quint starting:scale-x-0"
                        style={{ width: `${p.share * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <section aria-labelledby="orders" className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-center justify-between p-5 sm:px-6">
              <h2 id="orders" className="font-semibold">
                Recent orders
              </h2>
              <a href="#orders" className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted">
                View all
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 text-left text-sm whitespace-nowrap">
                <thead className="border-y bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    {['Order', 'Customer', 'Date', 'Items', 'Status', 'Total'].map((h) => (
                      <th key={h} scope="col" className={cn('px-6 py-3 font-medium', h === 'Total' && 'text-right')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((o) => (
                    <tr key={o.id} className="transition-colors duration-150 hover:bg-muted/40">
                      <td className="px-6 py-4 font-medium tabular-nums">{o.id}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-3">
                          <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                            {o.customer
                              .split(' ')
                              .map((w) => w[0])
                              .join('')}
                          </span>
                          {o.customer}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{o.date}</td>
                      <td className="px-6 py-4 tabular-nums">{o.items}</td>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', statusStyle[o.status])}>
                          <span className="size-1.5 rounded-full bg-current" aria-hidden />
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium tabular-nums">{o.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="pb-2 text-center text-xs text-muted-foreground">Linden Admin is a template from Manniche UI. All figures are made up.</p>
        </main>
      </div>
    </div>
  )
}
