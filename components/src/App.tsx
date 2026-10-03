import { Moon, Package, RotateCcw, Search, Settings, Sun, Truck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AgentActivity, type AgentStep } from '@/registry/manniche/agent-activity/agent-activity'
import { BlurFade } from '@/registry/manniche/blur-fade/blur-fade'
import { CodeBlock } from '@/registry/manniche/code-block/code-block'
import { CommandPalette, type Command } from '@/registry/manniche/command-palette/command-palette'
import { DotPattern } from '@/registry/manniche/dot-pattern/dot-pattern'
import { FileDiff } from '@/registry/manniche/file-diff/file-diff'
import { Highlighter } from '@/registry/manniche/highlighter/highlighter'
import { Marquee } from '@/registry/manniche/marquee/marquee'
import { NumberTicker } from '@/registry/manniche/number-ticker/number-ticker'
import { PromptInput } from '@/registry/manniche/prompt-input/prompt-input'
import { Reasoning } from '@/registry/manniche/reasoning/reasoning'
import { Sheet } from '@/registry/manniche/sheet/sheet'
import { ShimmerButton } from '@/registry/manniche/shimmer-button/shimmer-button'
import { Citation, Sources, type Source } from '@/registry/manniche/sources/sources'
import { SpotlightCard } from '@/registry/manniche/spotlight-card/spotlight-card'
import { StreamingResponse } from '@/registry/manniche/streaming-response/streaming-response'
import { TextReveal } from '@/registry/manniche/text-reveal/text-reveal'
import { toast, Toaster } from '@/registry/manniche/toast/toast'
import { ToolApproval } from '@/registry/manniche/tool-approval/tool-approval'

const btn =
  'inline-flex min-h-11 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium transition-[background-color,transform] duration-150 ease-out-quint hover:bg-muted active:scale-[0.97]'

const REPLY =
  'Your order ships from the warehouse tomorrow morning. It should reach you on Thursday.\n\nI have added the tracking link to your account, and you will get an email when the parcel leaves.'

const STEPS: Omit<AgentStep, 'status'>[] = [
  { id: 'read', label: 'Reading the order', detail: 'Order 4821, two items' },
  { id: 'stock', label: 'Checking stock', detail: 'Both items are in the warehouse' },
  { id: 'ship', label: 'Booking the shipment' },
  { id: 'mail', label: 'Writing the confirmation' },
]

const CODE = `export function total(items: Item[]) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
}
`

const DIFF = `@@ -12,6 +12,7 @@ export function total
 type Item = { price: number; qty: number }
 
 export function total(items: Item[]) {
-  return items.reduce((sum, i) => sum + i.price, 0)
+  // Each line counts as many times as it was ordered.
+  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
 }
`

const SOURCES: Source[] = [
  { title: 'Delivery times and prices', href: 'https://example.com/help/delivery', quote: 'Standard delivery takes 3 to 5 working days.' },
  { title: 'Returns and refunds', href: 'https://example.com/help/returns' },
]

function useThinking() {
  const [thinking, setThinking] = useState(true)
  const [run, setRun] = useState(0)
  useEffect(() => {
    setThinking(true)
    const id = setTimeout(() => setThinking(false), 2400)
    return () => clearTimeout(id)
  }, [run])
  return { thinking, restart: () => setRun((r) => r + 1) }
}

function Demo({ name, title, children, wide }: { name: string; title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={wide ? 'min-w-0 md:col-span-2' : 'min-w-0'}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl">{title}</h2>
        <code className="text-sm text-muted-foreground">@manniche/{name}</code>
      </div>
      <div className="rounded-3xl bg-muted/40 p-4 sm:p-6">{children}</div>
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
  const thinking = useThinking()
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<string[]>([])
  const [orders, setOrders] = useState(1284)
  const [approvalKey, setApprovalKey] = useState(0)
  const [palette, setPalette] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [highlightKey, setHighlightKey] = useState(0)

  const commands = useMemo<Command[]>(
    () => [
      { id: 'find', label: 'Find an order', group: 'Orders', icon: <Search />, hint: 'F', onSelect: () => toast('Searching orders') },
      { id: 'track', label: 'Track a parcel', group: 'Orders', icon: <Truck />, keywords: ['shipping', 'delivery'], onSelect: () => toast('Opening tracking') },
      { id: 'stock', label: 'Check stock', group: 'Warehouse', icon: <Package />, onSelect: () => toast('Stock is up to date', { tone: 'success' }) },
      { id: 'settings', label: 'Open settings', group: 'General', icon: <Settings />, onSelect: () => setSheet(true) },
      { id: 'theme', label: 'Switch theme', group: 'General', icon: <Moon />, onSelect: () => setDark((d) => !d) },
    ],
    [],
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-12 flex items-start justify-between gap-6">
        <div className="min-w-0 wrap-break-word">
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

        <h2 className="mt-6 font-serif text-3xl tracking-tight md:col-span-2">Agent output</h2>

        <Demo name="reasoning" title="Reasoning">
          <div className="rounded-2xl border bg-card p-4">
            <Reasoning streaming={thinking.thinking} ms={2400}>
              The customer asks when order 4821 arrives. It left the warehouse this morning, and standard delivery takes two days, so
              Thursday is the honest answer.
            </Reasoning>
            {!thinking.thinking && <p className="mt-2">Your order should reach you on Thursday.</p>}
          </div>
          <Restart onClick={thinking.restart} />
        </Demo>

        <Demo name="sources" title="Sources">
          <div className="rounded-2xl border bg-card p-4">
            <p className="leading-7">
              Standard delivery is free and takes 3 to 5 days.
              <Citation n={1} source={SOURCES[0]} /> You can send items back within 30 days.
              <Citation n={2} source={SOURCES[1]} />
            </p>
            <Sources sources={SOURCES} className="mt-4 border-t pt-4" />
          </div>
        </Demo>

        <Demo name="code-block" title="Code block">
          <CodeBlock filename="lib/total.ts" code={CODE} lineNumbers />
        </Demo>

        <Demo name="file-diff" title="File diff">
          <FileDiff filename="lib/total.ts" diff={DIFF} />
        </Demo>

        <h2 className="mt-6 font-serif text-3xl tracking-tight md:col-span-2">Feedback and navigation</h2>

        <Demo name="toast" title="Toast">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => toast('Order saved', { tone: 'success', description: 'The customer gets an email in a moment.' })}>
              Save order
            </button>
            <button type="button" className={btn} onClick={() => toast('Payment failed', { tone: 'error', description: 'The card was declined. Ask for another card.' })}>
              Fail a payment
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => toast('Order archived', { action: { label: 'Undo', onClick: () => toast('Order restored') } })}
            >
              Archive with undo
            </button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Toasts pause while you point at them.</p>
        </Demo>

        <Demo name="command-palette" title="Command palette">
          <button type="button" className={btn} onClick={() => setPalette(true)}>
            <Search className="size-4" aria-hidden /> Search commands
            <kbd className="ml-2 rounded border bg-muted px-1.5 font-sans text-xs text-muted-foreground">Ctrl K</kbd>
          </button>
          <p className="mt-3 text-sm text-muted-foreground">Arrow keys move, Enter runs, Esc closes.</p>
          <CommandPalette commands={commands} open={palette} onOpenChange={setPalette} placeholder="Search orders and settings" />
        </Demo>

        <Demo name="sheet" title="Sheet">
          <button type="button" className={btn} onClick={() => setSheet(true)}>
            Open delivery options
          </button>
          <p className="mt-3 text-sm text-muted-foreground">Drag it down, press Esc or tap outside to close.</p>
          <Sheet open={sheet} onOpenChange={setSheet} title="Delivery options">
            <ul className="divide-y">
              {[
                ['Standard', '3 to 5 days', 'Free'],
                ['Express', 'Next working day', '79 kr'],
                ['Pick-up point', '2 to 3 days', '29 kr'],
              ].map(([name, time, price]) => (
                <li key={name} className="flex items-baseline justify-between gap-4 py-3">
                  <span>
                    <span className="font-medium">{name}</span>
                    <span className="block text-sm text-muted-foreground">{time}</span>
                  </span>
                  <span className="tabular-nums">{price}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setSheet(false)}
              className="mt-4 min-h-11 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-transform duration-150 ease-out-quint active:scale-[0.98]"
            >
              Done
            </button>
          </Sheet>
        </Demo>

        <Demo name="shimmer-button" title="Shimmer button">
          <ShimmerButton magnetic onClick={() => toast('Checkout started')}>
            Go to checkout
          </ShimmerButton>
          <p className="mt-3 text-sm text-muted-foreground">Use it once per page, for the main action. It leans towards the mouse.</p>
        </Demo>

        <h2 className="mt-6 font-serif text-3xl tracking-tight md:col-span-2">Text and surfaces</h2>

        <Demo name="highlighter" title="Highlighter">
          <p key={highlightKey} className="font-serif text-2xl leading-snug text-balance">
            Every parcel leaves the warehouse <Highlighter>within one working day</Highlighter>.
          </p>
          <Restart onClick={() => setHighlightKey((k) => k + 1)} />
        </Demo>

        <Demo name="spotlight-card" title="Spotlight card">
          <div className="grid gap-3 sm:grid-cols-2">
            <SpotlightCard>
              <p className="font-medium">Free returns</p>
              <p className="mt-1 text-sm text-muted-foreground">30 days, no questions.</p>
            </SpotlightCard>
            <SpotlightCard>
              <p className="font-medium">Fast delivery</p>
              <p className="mt-1 text-sm text-muted-foreground">Point the mouse at a card.</p>
            </SpotlightCard>
          </div>
        </Demo>

        <Demo name="marquee" title="Marquee" wide>
          <Marquee label="Product categories">
            {['Kitchen', 'Garden', 'Lighting', 'Textiles', 'Storage', 'Tools', 'Ceramics', 'Outdoor'].map((c) => (
              <span key={c} className="rounded-full border bg-card px-4 py-2 whitespace-nowrap">
                {c}
              </span>
            ))}
          </Marquee>
        </Demo>

        <Demo name="text-reveal" title="Text reveal" wide>
          <TextReveal className="font-serif text-2xl leading-snug sm:text-3xl">
            A good shop page answers three questions before the visitor asks them: what it costs, when it arrives, and how to send it back.
          </TextReveal>
          <p className="mt-3 text-sm text-muted-foreground">Scroll the page. The words light up as the paragraph passes.</p>
        </Demo>

        <Demo name="dot-pattern" title="Dot pattern" wide>
          <DotPattern className="px-6 py-14 text-center">
            <p className="font-serif text-2xl">Depth without images</p>
            <p className="mt-2 text-muted-foreground">Two CSS gradients: a dot grid and a soft edge.</p>
          </DotPattern>
        </Demo>
      </main>
      <Toaster />

      <footer className="mt-16 border-t pt-6 text-sm text-muted-foreground">
        Respects reduced motion. Only opacity, transform and filter animate.
      </footer>
    </div>
  )
}
