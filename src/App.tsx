import { Moon, RotateCcw, Sun } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AgentActivity, type AgentStep } from '@/registry/manniche/agent-activity/agent-activity'
import { BlurFade } from '@/registry/manniche/blur-fade/blur-fade'
import { NumberTicker } from '@/registry/manniche/number-ticker/number-ticker'
import { PromptInput } from '@/registry/manniche/prompt-input/prompt-input'
import { StreamingResponse } from '@/registry/manniche/streaming-response/streaming-response'
import { ToolApproval } from '@/registry/manniche/tool-approval/tool-approval'

const REPLY =
  'Your order ships from the warehouse tomorrow morning. It should reach you on Thursday.\n\nI have added the tracking link to your account, and you will get an email when the parcel leaves.'

const STEPS: Omit<AgentStep, 'status'>[] = [
  { id: 'read', label: 'Reading the order', detail: 'Order 4821, two items' },
  { id: 'stock', label: 'Checking stock', detail: 'Both items are in the warehouse' },
  { id: 'ship', label: 'Booking the shipment' },
  { id: 'mail', label: 'Writing the confirmation' },
]

function Demo({ name, title, children, wide }: { name: string; title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={wide ? 'min-w-0 md:col-span-2' : 'min-w-0'}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl">{title}</h2>
        <code className="text-sm text-muted-foreground">@manniche/{name}</code>
      </div>
      <div className="rounded-3xl border bg-muted/40 p-4 sm:p-6">{children}</div>
    </section>
  )
}

function useStream(text: string) {
  const [shown, setShown] = useState('')
  const [run, setRun] = useState(0)
  useEffect(() => {
    setShown('')
    const words = text.split(/(\s+)/)
    let i = 0
    const id = setInterval(() => {
      i += 2
      setShown(words.slice(0, i).join(''))
      if (i >= words.length) clearInterval(id)
    }, 70)
    return () => clearInterval(id)
  }, [text, run])
  return { shown, streaming: shown.length < text.length, restart: () => setRun((r) => r + 1) }
}

function useSteps() {
  const [at, setAt] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  const start = () => {
    clearInterval(timer.current)
    setAt(0)
    timer.current = setInterval(() => setAt((a) => (a >= STEPS.length ? (clearInterval(timer.current), a) : a + 1)), 1100)
  }
  useEffect(() => {
    start()
    return () => clearInterval(timer.current)
  }, [])
  const steps: AgentStep[] = STEPS.map((s, i) => ({
    ...s,
    status: i < at ? 'done' : i === at ? 'running' : 'pending',
    ms: i < at ? 600 + i * 340 : undefined,
  }))
  return { steps, restart: start }
}

function Restart({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
    >
      <RotateCcw className="size-4" aria-hidden /> Run again
    </button>
  )
}

export default function App() {
  const [dark, setDark] = useState(() => {
    const set = document.documentElement.dataset.theme
    return set ? set === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const stream = useStream(REPLY)
  const activity = useSteps()
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<string[]>([])
  const [orders, setOrders] = useState(1284)
  const [approvalKey, setApprovalKey] = useState(0)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-12 flex items-start justify-between gap-6">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">Manniche UI</p>
          <h1 className="font-serif text-4xl tracking-tight text-balance sm:text-5xl">Components for agents and calm interfaces</h1>
          <p className="mt-4 max-w-[60ch] text-lg text-muted-foreground text-pretty">
            Built on shadcn tokens, so they fit any shadcn project. Install one with{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[0.9em] text-foreground">npx shadcn add @manniche/prompt-input</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDark((d) => !d)}
          className="grid size-11 shrink-0 place-items-center rounded-xl border bg-card transition-[transform] duration-150 ease-out-quint active:scale-95"
          aria-label={dark ? 'Use light theme' : 'Use dark theme'}
        >
          {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
        </button>
      </header>

      <main className="grid gap-10 md:grid-cols-2">
        <Demo name="prompt-input" title="Prompt input" wide>
          {sent.length > 0 && (
            <ul className="mb-4 space-y-2" aria-label="Sent messages">
              {sent.map((m, i) => (
                <li key={i} className="ml-auto w-fit max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-primary-foreground">
                  {m}
                </li>
              ))}
            </ul>
          )}
          <PromptInput
            accept="image/*,.pdf"
            busy={busy}
            placeholder="Ask about an order"
            onSubmit={(text, files) => {
              setSent((s) => [...s, text || `${files.length} file(s)`])
              setBusy(true)
              setTimeout(() => setBusy(false), 2000)
            }}
            onStop={() => setBusy(false)}
            footer={<span className="truncate text-sm text-muted-foreground">Enter sends · Shift+Enter for a new line</span>}
          />
        </Demo>

        <Demo name="streaming-response" title="Streaming response">
          <div className="rounded-2xl border bg-card p-4">
            <StreamingResponse text={stream.shown} streaming={stream.streaming} />
          </div>
          <Restart onClick={stream.restart} />
        </Demo>

        <Demo name="agent-activity" title="Agent activity">
          <AgentActivity title="Handling order 4821" steps={activity.steps} />
          <Restart onClick={activity.restart} />
        </Demo>

        <Demo name="tool-approval" title="Tool approval" wide>
          <div className="grid gap-4 md:grid-cols-2">
            <ToolApproval
              key={`a${approvalKey}`}
              tool="lookup_order"
              summary="Look up order 4821 to see where it is."
              args={{ order: 4821 }}
            />
            <ToolApproval
              key={`b${approvalKey}`}
              tool="issue_refund"
              summary="Refund 349 kr to the customer's card."
              args={{ order: 4821, amount: 349, currency: 'DKK', reason: 'Item arrived damaged' }}
              risky
            />
          </div>
          <Restart onClick={() => setApprovalKey((k) => k + 1)} />
        </Demo>

        <Demo name="number-ticker" title="Number ticker">
          <p className="font-serif text-6xl tracking-tight">
            <NumberTicker value={orders} locale="da-DK" />
          </p>
          <p className="mt-1 text-muted-foreground">orders this month</p>
          <button
            type="button"
            onClick={() => setOrders((o) => o + Math.round(40 + Math.random() * 300))}
            className="mt-4 min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform duration-150 ease-out-quint active:scale-[0.97]"
          >
            Add orders
          </button>
        </Demo>

        <Demo name="blur-fade" title="Blur fade">
          <ul className="space-y-2">
            {['Packed', 'Shipped', 'Out for delivery', 'Delivered'].map((s, i) => (
              <BlurFade as="li" key={s} delay={i * 70} className="rounded-xl border bg-card px-4 py-3">
                {s}
              </BlurFade>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">Each item fades up the first time it scrolls into view.</p>
        </Demo>
      </main>

      <footer className="mt-16 border-t pt-6 text-sm text-muted-foreground">
        Respects reduced motion. Only opacity, transform and filter animate.
      </footer>
    </div>
  )
}
