import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { LoadingRegion, type LoadingRegionStatus } from '@/registry/manniche/loading-region/loading-region'
import { Skeleton } from '@/registry/manniche/skeleton/skeleton'

// A fake request: `ms` later it answers with `outcome`. `go` starts it again, `pending` is true while it runs.
function useFakeLoad(ms: number, outcome: 'ready' | 'empty' | 'error' = 'ready') {
  const [status, setStatus] = useState<LoadingRegionStatus>('loading')
  const timer = useRef(0)
  const go = useCallback(
    (to: 'ready' | 'empty' | 'error' = outcome, wait = ms) => {
      window.clearTimeout(timer.current)
      setStatus('loading')
      timer.current = window.setTimeout(() => setStatus(to), wait)
    },
    [ms, outcome],
  )
  useEffect(() => {
    go()
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { status, go }
}

const button =
  'inline-flex min-h-11 items-center rounded-xl bg-muted px-3.5 text-sm font-medium text-foreground outline-offset-2 hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-ring'

function Card({ title, note, controls, children }: { title: string; note: string; controls?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-background p-4" aria-label={title}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
          <p className="text-[13.5px] text-muted-foreground">{note}</p>
        </div>
        <div className="flex flex-wrap gap-2">{controls}</div>
      </div>
      {children}
    </section>
  )
}

const PEOPLE = [
  ['Ada Lovelace', 'Analyst'],
  ['Grace Hopper', 'Engineer'],
  ['Alan Turing', 'Researcher'],
  ['Katherine Johnson', 'Mathematician'],
]
const ROW = 56

function Row({ name, role }: { name: string; role: string }) {
  return (
    <li className="flex items-center gap-3 border-b border-border/60 last:border-0" style={{ height: ROW }}>
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
        {name.split(' ').map((w) => w[0]).join('')}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">{name}</div>
        <div className="truncate text-[13px] text-muted-foreground">{role}</div>
      </div>
    </li>
  )
}
function RowSkeleton() {
  return (
    <div aria-hidden="true">
      {PEOPLE.map(([n]) => (
        <div key={n} className="flex items-center gap-3 border-b border-border/60 last:border-0" style={{ height: ROW }}>
          <Skeleton circle width={36} />
          <div className="grid flex-1 gap-1.5">
            <Skeleton width="42%" height={14} />
            <Skeleton width="26%" height={12} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** 1. The layout is known: a list of four rows. */
function KnownLayout() {
  // Fast and Slow start the region over (a new key), so each one is a first load; Empty and Error load again in place.
  const [run, setRun] = useState(0)
  const { status, go } = useFakeLoad(1200)
  return (
    <Card
      title="Known layout: skeleton"
      note="Every row has the same height as its skeleton, so nothing moves when the list arrives."
      controls={
        <>
          <button type="button" className={button} onClick={() => { setRun((r) => r + 1); go('ready', 120) }}>
            Fast (120 ms, no indicator)
          </button>
          <button type="button" className={button} onClick={() => { setRun((r) => r + 1); go('ready', 1200) }}>
            Slow (1.2 s)
          </button>
          <button type="button" className={button} onClick={() => go('empty', 1000)}>
            Empty
          </button>
          <button type="button" className={button} onClick={() => go('error', 1000)}>
            Error
          </button>
        </>
      }
    >
      <LoadingRegion key={run} status={status} skeleton={<RowSkeleton />} minHeight={ROW * PEOPLE.length} onRetry={() => go('ready', 1000)} labels={{ loading: 'Loading people', loaded: 'People loaded', empty: 'No people yet.' }}>
        <ul>
          {PEOPLE.map(([n, r]) => (
            <Row key={n} name={n} role={r} />
          ))}
        </ul>
      </LoadingRegion>
    </Card>
  )
}

/** 2. The layout is unknown: the screen is either a balance or an offer. */
function UnknownLayout() {
  const [kind, setKind] = useState<'balance' | 'offer'>('balance')
  const { status, go } = useFakeLoad(1400)
  return (
    <Card
      title="Unknown layout: spinner"
      note="The answer decides which screen this is, so a skeleton of either one would be wrong. A spinner and a line of text it is."
      controls={
        <button type="button" className={button} onClick={() => { setKind((k) => (k === 'balance' ? 'offer' : 'balance')); go('ready', 1400) }}>
          Load the other screen
        </button>
      }
    >
      <LoadingRegion key={kind} status={status} minHeight={168} labels={{ loading: 'Checking your account' }}>
        {kind === 'balance' ? (
          <div className="grid h-[168px] content-center gap-1 rounded-xl bg-muted/60 px-5">
            <div className="text-[13px] text-muted-foreground">Balance</div>
            <div className="text-3xl font-semibold tabular-nums text-foreground">4,280.50 EUR</div>
            <div className="text-[13px] text-muted-foreground">Updated just now</div>
          </div>
        ) : (
          <div className="grid h-[168px] content-center gap-2 rounded-xl border border-dashed border-foreground/25 px-5">
            <div className="text-base font-semibold text-foreground">Open your first account</div>
            <div className="text-[13.5px] text-muted-foreground">It takes two minutes and costs nothing.</div>
            <span className="inline-flex min-h-11 w-fit items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">Start</span>
          </div>
        )}
      </LoadingRegion>
    </Card>
  )
}

/** 3. Part of the layout is known: the frame is real, the list is a skeleton, the side note is a spinner. */
function PartlyKnown() {
  const list = useFakeLoad(1300)
  const side = useFakeLoad(2000)
  const [run, setRun] = useState(0)
  return (
    <Card
      title="Partly known layout"
      note="The title and the table head are drawn for real from the start. The rows are a skeleton (the shape is known); the summary is a spinner (what it will say is not)."
      controls={
        <button type="button" className={button} onClick={() => { setRun((r) => r + 1); list.go('ready', 1300); side.go('ready', 2000) }}>
          Load again
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <div>
          <div className="grid grid-cols-[1fr_auto] border-b border-border pb-2 text-[13px] font-medium text-muted-foreground">
            <span>Name</span>
            <span>Role</span>
          </div>
          <LoadingRegion key={`list${run}`} status={list.status} skeleton={<RowSkeleton />} minHeight={ROW * PEOPLE.length} labels={{ loading: 'Loading the table' }}>
            <ul>
              {PEOPLE.map(([n, r]) => (
                <Row key={n} name={n} role={r} />
              ))}
            </ul>
          </LoadingRegion>
        </div>
        <LoadingRegion key={`side${run}`} status={side.status} minHeight={120} className="rounded-xl bg-muted/50" labels={{ loading: 'Loading the summary' }}>
          <div className="grid min-h-[120px] content-center gap-1 px-4 text-sm">
            <div className="font-medium text-foreground">Next review</div>
            <div className="text-muted-foreground">Needs a decision before Friday.</div>
          </div>
        </LoadingRegion>
      </div>
    </Card>
  )
}

/** 4. Fetching again: the old data stays, a small spinner shows. */
function Reloading() {
  const { status, go } = useFakeLoad(1000)
  const [round, setRound] = useState(1)
  return (
    <Card
      title="Loading again"
      note="Data that is already there stays put. Only a small spinner shows, and the skeleton is never used again."
      controls={
        <button type="button" className={button} onClick={() => { setRound((r) => r + 1); go('ready', 1600) }}>
          Refresh
        </button>
      }
    >
      <LoadingRegion status={status} skeleton={<RowSkeleton />} minHeight={ROW * PEOPLE.length}>
        <ul>
          {PEOPLE.map(([n, r]) => (
            <Row key={n} name={n} role={`${r} · fetched ${round}`} />
          ))}
        </ul>
      </LoadingRegion>
    </Card>
  )
}

export default function LoadingRegionDemo() {
  return (
    <div className="grid w-full gap-4">
      <KnownLayout />
      <UnknownLayout />
      <PartlyKnown />
      <Reloading />
    </div>
  )
}
