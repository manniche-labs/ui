// A multi-currency wallet in Tiles: a currency switch, a rewards panel, a spending donut and allocation bars.
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BigNumber, DeltaPill, Pills } from '@/registry/manniche/chart-kit/chart-kit'
import { DataTile, TileFact } from '@/registry/manniche/data-tile/data-tile'
import { Donut, type DonutDatum } from '@/registry/manniche/donut/donut'

export type WalletCurrency = {
  /** ISO code, also the switch label: "EUR". */
  code: string
  balance: number
  change: number
  spending: DonutDatum[]
  /** Share of the balance per holding, 0 to 1. */
  allocation: { id: string; label: string; share: number }[]
  rewards: { points: number; next: number; tier: string; perks: string[] }
}

export type CurrencyWalletProps = {
  data: WalletCurrency[]
  defaultCurrency?: string
  title?: string
  note?: string
  now?: Date
  labels?: { currency?: string; balance?: string; rewards?: string; spending?: string; allocation?: string; points?: string; toNext?: (n: number, tier: string) => string }
  className?: string
}

/** Currency wallet: switch the currency and every tile follows. */
export function CurrencyWallet({ data, defaultCurrency, title = 'Currency wallet', note = 'Example data.', labels, className }: CurrencyWalletProps) {
  const l = {
    currency: 'Currency',
    balance: 'Balance',
    rewards: 'Rewards',
    spending: 'Spending',
    allocation: 'Allocation',
    points: 'points',
    toNext: (n: number, tier: string) => `${n.toLocaleString('en-GB')} points to ${tier}`,
    ...labels,
  }
  const [code, setCode] = useState(defaultCurrency ?? data[0]?.code ?? '')
  const cur = data.find((c) => c.code === code) ?? data[0]
  if (!cur) return null
  const fmt = { currency: cur.code, decimals: 2 }
  const progress = Math.min(1, cur.rewards.points / (cur.rewards.points + cur.rewards.next))
  return (
    <div className={cn('@container w-full font-sans text-foreground', className)}>
      <div className="grid gap-4 @3xl:grid-cols-6 @6xl:grid-cols-12">
        <div className="flex flex-wrap items-center justify-between gap-3 @3xl:col-span-6 @6xl:col-span-12">
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight">{title}</h1>
          <Pills label={l.currency} options={data.map((c) => ({ id: c.code, label: c.code }))} value={cur.code} onChange={setCode} />
        </div>
        <DataTile title={l.balance} className="@3xl:col-span-3 @6xl:col-span-4" footer={<span>{note}</span>}>
          <BigNumber value={cur.balance} format={fmt} size="lg" />
          <div className="mt-3">
            <DeltaPill value={cur.change} format={{ decimals: 1, suffix: '%', sign: true }} />
          </div>
        </DataTile>
        <DataTile title={l.rewards} inverted className="@3xl:col-span-3 @6xl:col-span-4">
          <BigNumber value={cur.rewards.points} size="lg" />
          <p className="mt-1 text-sm opacity-80">{l.points} · {cur.rewards.tier}</p>
          {/* The sentence under the bar says the same, so the bar itself is hidden from screen readers. */}
          <div aria-hidden className="mt-4 h-1.5 overflow-hidden rounded-full bg-current/20">
            <div className="h-full origin-left rounded-full bg-current transition-transform duration-700 motion-reduce:transition-none" style={{ transform: `scaleX(${progress})` }} />
          </div>
          <p className="mt-2 text-xs opacity-80">{l.toNext(cur.rewards.next, cur.rewards.tier)}</p>
          <ul className="mt-4 space-y-1 text-sm">
            {cur.rewards.perks.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </DataTile>
        <DataTile title={l.spending} className="@3xl:col-span-6 @6xl:col-span-4">
          <Donut data={cur.spending} label={`${l.spending}, ${cur.code}`} format={fmt} />
        </DataTile>
        <DataTile title={l.allocation} className="@3xl:col-span-6 @6xl:col-span-12">
          <ul className="grid gap-4 @3xl:grid-cols-2">
            {cur.allocation.map((a) => (
              <li key={a.id}>
                <TileFact label={a.label} aside={<span className="tabular-nums">{Math.round(a.share * 100)}%</span>}>
                  <span aria-hidden className="mt-2 block h-2 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full origin-left rounded-full bg-chart-1 transition-transform duration-700 motion-reduce:transition-none" style={{ transform: `scaleX(${a.share})` }} />
                  </span>
                </TileFact>
              </li>
            ))}
          </ul>
        </DataTile>
      </div>
    </div>
  )
}

export default CurrencyWallet
