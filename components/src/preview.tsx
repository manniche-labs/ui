import { StrictMode, Suspense, lazy, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './preview.css'
import { reportHeight } from './frame-height'
import { colourById, colourVars, type Mode } from './template-theme'

// One page that shows one demo, chosen by ?c=<name>. The lab pages on mikkelmanniche.dk load it in an iframe,
// so the demo gets its own viewport and its styles never touch the page around it.
const demos = import.meta.glob<{ default: ComponentType }>('../registry/manniche/examples/*-demo.tsx')

// These demos react to scrolling, so they get room to scroll inside the frame.
const SCROLL = new Set(['text-reveal'])

const params = new URLSearchParams(location.search)
const name = params.get('c') ?? ''
const load = demos[`../registry/manniche/examples/${name}-demo.tsx`]
const Demo = load ? lazy(load) : null
// Templates fill the whole frame, with no Replay button, and take a colour and a mode.
const FULL = params.get('full') === '1'
// A small live preview on the lab's cards: no Replay button and no room to scroll.
// The card has its own Replay button, which posts a message to the frame.
const MINI = params.get('mini') === '1'

function applyTheme(colour: string | null, mode: string | null) {
  const root = document.documentElement
  const m: Mode = mode === 'light' ? 'light' : 'dark'
  root.classList.toggle('dark', m === 'dark')
  root.style.colorScheme = m
  for (const [k, v] of Object.entries(colourVars(colourById(colour), m))) root.style.setProperty(k, v)
}

if (FULL) {
  applyTheme(params.get('colour'), params.get('mode'))
  // The lab page changes the colour without reloading the frame.
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.data?.type !== 'manniche-theme') return
    applyTheme(e.data.colour, e.data.mode)
  })
}

// The card's Replay and star buttons sit in the top-right corner of the frame: 38 px down and 74 px in
// from the right, in the card's own pixels. The demo keeps clear of them and of the edges.
const EDGE = 12
const BELOW_BUTTONS = 46
const LEFT_OF_BUTTONS = 82

// On a card, the demo is scaled down until it fits the frame, either below the buttons or, if it is narrow
// enough, centred between them and the left edge. Whichever needs less shrinking wins.
function Fit({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current!
    // Frame pixels per card pixel, since the card shows the frame scaled down.
    let k = 1
    let scale = Infinity

    const fit = () => {
      const w = Math.max(0, ...Array.from(el.children, (c) => (c as HTMLElement).offsetWidth))
      const h = el.offsetHeight
      if (!w || !h) return
      const W = innerWidth
      const H = innerHeight
      const below = Math.min(1, (H - (BELOW_BUTTONS + EDGE) * k) / h, (W - 2 * EDGE * k) / w)
      const beside = Math.min(1, (H - 2 * EDGE * k) / h, (W - 2 * LEFT_OF_BUTTONS * k) / w)
      const s = Math.max(below, beside, 0.1)
      // Only ever shrink while the demo plays, so a demo that grows and shrinks does not pump.
      if (s >= scale) return
      scale = s
      el.style.top = `${beside >= below ? H / 2 : (BELOW_BUTTONS * k + H - EDGE * k) / 2}px`
      el.style.transform = `translate(-50%, -50%) scale(${s})`
      el.style.visibility = 'visible'
    }

    const resize = () => {
      const frame = frameElement?.getBoundingClientRect().width
      k = frame ? innerWidth / frame : 1
      el.style.width = `${Math.min(576, innerWidth - 2 * EDGE * k)}px`
      scale = Infinity
      fit()
    }

    resize()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    addEventListener('resize', resize)
    return () => {
      observer.disconnect()
      removeEventListener('resize', resize)
    }
  }, [])

  // A demo narrower than the column sits in the middle. The .mini-fit rule in preview.css cuts a wider one to the column.
  return (
    <div ref={ref} className="mini-fit invisible absolute left-1/2 grid grid-cols-[minmax(0,1fr)] origin-center justify-items-center">
      {children}
    </div>
  )
}

function Preview() {
  const [run, setRun] = useState(0)

  // On a detail page the frame grows to fit the demo. Templates are whole pages and scroll like one.
  useEffect(() => (FULL || MINI || SCROLL.has(name) ? undefined : reportHeight()), [])

  useEffect(() => {
    if (!MINI) return
    const onMessage = (e: MessageEvent) => {
      if (e.origin === location.origin && e.data?.type === 'manniche-replay') setRun((n) => n + 1)
    }
    addEventListener('message', onMessage)
    return () => removeEventListener('message', onMessage)
  }, [])

  if (!Demo) return <p className="p-6 text-sm text-muted-foreground">No demo called “{name}”.</p>

  const demo = (
    <Suspense fallback={null}>
      <Demo key={run} />
    </Suspense>
  )

  if (FULL) return demo

  if (MINI)
    return (
      <main className="relative h-dvh overflow-hidden">
        <Fit key={run}>{demo}</Fit>
      </main>
    )

  return (
    <main data-fills-frame className="relative min-h-dvh">
      <button
        type="button"
        onClick={() => setRun((n) => n + 1)}
        className="absolute top-2 right-2 z-10 inline-flex min-h-11 items-center rounded-xl px-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
      >
        Replay
      </button>
      {SCROLL.has(name) ? (
        <div className="px-6">
          <p className="grid h-[70dvh] place-items-center text-sm text-muted-foreground">Scroll down</p>
          <div className="mx-auto max-w-xl">{demo}</div>
          <div className="h-[70dvh]" />
        </div>
      ) : (
        <div data-fills-frame className="grid min-h-dvh place-items-center px-6 py-14">
          {/* A demo narrower than the column sits in the middle, as on the cards. */}
          <div className="demo-col grid w-full min-w-0 max-w-xl grid-cols-[minmax(0,1fr)] justify-items-center">{demo}</div>
        </div>
      )}
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
