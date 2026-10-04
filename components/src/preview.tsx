import { StrictMode, Suspense, lazy, useState, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import './preview.css'
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

function Preview() {
  const [run, setRun] = useState(0)

  if (!Demo) return <p className="p-6 text-sm text-muted-foreground">No demo called “{name}”.</p>

  const demo = (
    <Suspense fallback={null}>
      <Demo key={run} />
    </Suspense>
  )

  if (FULL) return demo

  return (
    <main className="relative min-h-dvh">
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
        <div className="grid min-h-dvh place-items-center px-6 py-14">
          <div className="w-full min-w-0 max-w-xl">{demo}</div>
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
