import { Check, LoaderCircle, RotateCcw } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export type ReceiptLine = { label: string; amount: number }

export type ReceiptPrinterProps = {
  /** The shop name, shown on the terminal and at the top of the receipt. */
  merchant: string
  /** The items on the receipt, each with a label and an amount; the total is their sum. */
  lines: ReceiptLine[]
  /** Called when the pay button is pressed. The receipt prints once it resolves; if it throws, the button comes back. */
  onPay: () => Promise<{ reference: string } | void>
  /** The ISO currency code used to format money. Default “EUR”. */
  currency?: string
  /** The language used to format money and the date. Default “en-IE”. */
  locale?: string
  /** Visible text and screen reader text with English defaults, for the pay button, the three statuses, the total, the new order button and the reference. */
  labels?: Partial<Record<'pay' | 'processing' | 'printing' | 'paid' | 'total' | 'again' | 'reference', string>>
  /** Classes for the outer wrapper around the terminal and the receipt. */
  className?: string
}

type Phase = 'idle' | 'processing' | 'printing' | 'paid'

const EN = { pay: 'Pay', processing: 'Processing payment', printing: 'Printing your receipt', paid: 'Paid', total: 'Total', again: 'New order', reference: 'Ref' }

/** A small checkout terminal: pay, wait for the card, then the receipt rolls out of the slot. */
export function ReceiptPrinter({ merchant, lines, onPay, currency = 'EUR', locale = 'en-IE', labels = {}, className }: ReceiptPrinterProps) {
  const t = { ...EN, ...labels }
  const [phase, setPhase] = useState<Phase>('idle')
  const [ref, setRef] = useState<string | null>(null)
  const [stamp, setStamp] = useState('')
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency })
  const total = lines.reduce((sum, l) => sum + l.amount, 0)

  const pay = async () => {
    setPhase('processing')
    try {
      const r = await onPay()
      setRef(r?.reference ?? null)
      setStamp(new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()))
      setPhase('printing')
    } catch {
      setPhase('idle')
    }
  }

  const status = { idle: null, processing: t.processing, printing: t.printing, paid: t.paid }[phase]

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn('flex w-full min-w-0 max-w-sm flex-col items-center', className)}>
        {/* The terminal */}
        <div className="relative z-10 w-full rounded-[28px] bg-neutral-800 p-3 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.6)] dark:bg-neutral-900 dark:ring-1 dark:ring-white/10">
          <div className="rounded-2xl bg-neutral-950 p-4 text-neutral-50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold tracking-wide uppercase">{merchant}</p>
                <p className="truncate text-sm text-neutral-400">{lines.map((l) => l.label).join(', ')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-400">{t.total}</p>
                <p className="font-mono text-xl font-semibold tabular-nums">{money.format(total)}</p>
              </div>
            </div>

            <p role="status" className="sr-only">
              {status}
            </p>
            <div className="mt-4 min-h-11">
              <AnimatePresence mode="popLayout" initial={false}>
                {phase === 'idle' ? (
                  <motion.button
                    key="pay"
                    type="button"
                    onClick={pay}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="min-h-11 w-full rounded-xl bg-neutral-50 font-semibold text-neutral-950 transition-transform duration-150 motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100"
                  >
                    {t.pay} {money.format(total)}
                  </motion.button>
                ) : (
                  <motion.div
                    key={phase}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="flex min-h-11 items-center gap-2 text-sm text-neutral-300"
                  >
                    {phase === 'paid' ? <Check className="size-4 text-emerald-400" aria-hidden /> : <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                    <span aria-hidden>{status}</span>
                    {phase === 'paid' && (
                      <button
                        type="button"
                        onClick={() => setPhase('idle')}
                        className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-neutral-300 transition-colors duration-150 hover:bg-white/10 hover:text-white"
                      >
                        <RotateCcw className="size-3.5" aria-hidden />
                        {t.again}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          {/* The slot */}
          <div className="mx-4 mt-3 h-2 rounded-full bg-black shadow-[inset_0_1px_2px_rgb(0_0_0/0.8)]" />
        </div>

        {/* The paper comes out of the slot: it starts hidden above the clip edge and slides down. */}
        <div className="-mt-3 w-[86%] overflow-hidden pt-1">
          <AnimatePresence>
            {(phase === 'printing' || phase === 'paid') && (
              <motion.div
                key="receipt"
                initial={{ y: '-100%' }}
                animate={{ y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 1.8, ease: [0.4, 0, 0.3, 1] }}
                onAnimationComplete={() => setPhase((p) => (p === 'printing' ? 'paid' : p))}
                className="bg-[#f3eee3] px-5 pt-6 pb-4 font-mono text-[13px] text-neutral-800 [mask:radial-gradient(6px_at_50%_100%,#0000_98%,#000)_50%_0/12px_100%_repeat-x]"
              >
                <p className="text-center text-base font-bold tracking-widest uppercase">{merchant}</p>
                <p className="mt-1 text-center text-xs text-neutral-500">{stamp}</p>
                <div className="my-3 border-t border-dashed border-neutral-400" />
                <ul className="space-y-1">
                  {lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span className="truncate">{l.label}</span>
                      <span className="tabular-nums">{money.format(l.amount)}</span>
                    </li>
                  ))}
                </ul>
                <div className="my-3 border-t border-dashed border-neutral-400" />
                <p className="flex justify-between font-bold">
                  <span>{t.total}</span>
                  <span className="tabular-nums">{money.format(total)}</span>
                </p>
                {ref && (
                  <p className="mt-2 text-xs text-neutral-500">
                    {t.reference} {ref}
                  </p>
                )}
                {/* A decorative barcode from the reference, so each receipt looks a little different. */}
                <div aria-hidden className="mt-4 flex h-10 items-stretch justify-center gap-0.5 pb-2">
                  {Array.from((ref ?? merchant).padEnd(14, '0').slice(0, 14)).flatMap((c, i) => {
                    const code = c.charCodeAt(0)
                    return [<span key={`${i}a`} className="bg-neutral-800" style={{ width: 1 + (code % 3) }} />, <span key={`${i}b`} className="bg-neutral-800" style={{ width: 1 + ((code >> 2) % 2) }} />]
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  )
}
