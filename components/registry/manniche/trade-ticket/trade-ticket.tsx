import { LayoutGroup, MotionConfig, motion } from 'motion/react'
import { useId, useState, type SubmitEvent } from 'react'
import { cn } from '@/lib/utils'

export type Outcome = { id: string; label: string; /** Price per share from 0 to 1. A share pays 1 if the outcome happens. */ price: number }

export type TradeOrder = { side: 'buy' | 'sell'; outcome: string; amount: number; shares: number }

export type TradeTicketProps = {
  /** Two outcomes, usually yes and no. */
  outcomes: [Outcome, Outcome]
  /** Most someone can spend; the Max chip uses it. */
  balance: number
  /** The ISO currency code used to format money. Default “USD”. */
  currency?: string
  /** The language used to format money. Default “en-US”. */
  locale?: string
  /** Called with the side, the chosen outcome id, the amount and the share count when the form is submitted with an amount above zero. */
  onTrade: (order: TradeOrder) => void
  /** Visible text and screen reader text with English defaults, such as buy, sell, amount, outcome and trade. */
  labels?: Partial<Record<'buy' | 'sell' | 'amount' | 'toWin' | 'toGet' | 'avg' | 'trade' | 'max' | 'outcome', string>>
  /** Classes for the form. */
  className?: string
}

const EN = { buy: 'Buy', sell: 'Sell', amount: 'Amount', toWin: 'To win', toGet: 'You get', avg: 'Avg. price', trade: 'Trade', max: 'Max', outcome: 'Outcome' }
const CHIPS = [1, 5, 10, 100]

/** A ticket for buying or selling one of two outcomes, with the payout worked out as you type. */
export function TradeTicket({ outcomes, balance, currency = 'USD', locale = 'en-US', onTrade, labels = {}, className }: TradeTicketProps) {
  const t = { ...EN, ...labels }
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [pick, setPick] = useState(outcomes[0].id)
  const [raw, setRaw] = useState('')
  const ids = useId()

  const money = new Intl.NumberFormat(locale, { style: 'currency', currency })
  const symbol = money.formatToParts(0).find((p) => p.type === 'currency')?.value ?? ''
  const cents = (n: number) => `${(n * 100).toFixed(1)}¢`
  const outcome = outcomes.find((o) => o.id === pick)!
  const amount = Math.min(balance, Math.max(0, Number(raw.replace(',', '.')) || 0))
  const shares = outcome.price > 0 ? amount / outcome.price : 0
  // Buying: each share pays out 1 if it happens. Selling: you get the price back now.
  const result = side === 'buy' ? shares : amount

  const add = (n: number) => setRaw(String(Math.min(balance, amount + n)))
  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (amount > 0) onTrade({ side, outcome: pick, amount, shares })
  }

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', bounce: 0, duration: 0.35 }}>
      <form onSubmit={submit} className={cn('w-full max-w-sm overflow-hidden rounded-3xl border bg-card text-card-foreground', className)}>
        <LayoutGroup id={`${ids}-side`}>
          <div role="group" aria-label={`${t.buy} / ${t.sell}`} className="flex gap-4 border-b px-4">
            {(['buy', 'sell'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={side === s}
                onClick={() => setSide(s)}
                className={cn('relative min-h-12 text-lg font-semibold transition-colors duration-150', side === s ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {t[s]}
                {side === s && <motion.span layoutId="underline" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-foreground" />}
              </button>
            ))}
          </div>
        </LayoutGroup>

        <div className="space-y-3 p-3">
          <LayoutGroup id={`${ids}-outcome`}>
            <div role="group" aria-label={t.outcome} className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
              {outcomes.map((o, i) => {
                const on = pick === o.id
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPick(o.id)}
                    className={cn(
                      'relative min-h-12 rounded-xl text-sm font-semibold transition-colors duration-150',
                      on ? (i === 0 ? 'text-success' : 'text-destructive') : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {on && (
                      <motion.span
                        layoutId="pill"
                        style={{ borderRadius: 12 }}
                        className={cn('absolute inset-0', i === 0 ? 'bg-success/15' : 'bg-destructive/15')}
                      />
                    )}
                    <span className="relative">
                      {o.label} {cents(o.price)}
                    </span>
                  </button>
                )
              })}
            </div>
          </LayoutGroup>

          <div className="rounded-2xl bg-muted/60 px-4 pt-4 pb-3 text-center">
            <label htmlFor={`${ids}-amount`} className="text-sm font-medium">
              {t.amount}
            </label>
            <div className="mt-1 flex items-baseline justify-center font-mono text-5xl font-semibold tabular-nums">
              <span className="text-muted-foreground">{symbol}</span>
              <input
                id={`${ids}-amount`}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={raw}
                onChange={(e) => setRaw(e.target.value.replace(/[^\d.,]/g, ''))}
                style={{ width: `${Math.max(1, raw.length || 1)}ch` }}
                className="min-w-[1ch] bg-transparent text-center outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {CHIPS.map((n) => (
                <button key={n} type="button" onClick={() => add(n)} className="min-h-10 rounded-xl bg-background px-3 text-sm font-semibold transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[0.96]">
                  +{symbol}
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => setRaw(String(balance))} className="min-h-10 rounded-xl bg-background px-3 text-sm font-semibold transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[0.96]">
                {t.max}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 border-t px-4 pt-3">
          <div>
            <p className="font-semibold">{side === 'buy' ? t.toWin : t.toGet}</p>
            <p className="text-sm text-muted-foreground">
              {t.avg} {cents(outcome.price)}
            </p>
          </div>
          <output className={cn('font-mono text-3xl font-semibold tabular-nums', result > 0 ? 'text-success' : 'text-muted-foreground')}>
            {money.format(result)}
          </output>
        </div>
        <div className="p-4 pt-3">
          <button
            type="submit"
            disabled={amount <= 0}
            className="min-h-12 w-full rounded-2xl bg-foreground font-semibold text-background transition-[opacity,transform] duration-150 active:scale-[0.98] disabled:opacity-40"
          >
            {t.trade}
          </button>
        </div>
      </form>
    </MotionConfig>
  )
}
