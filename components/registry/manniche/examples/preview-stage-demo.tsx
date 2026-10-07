import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/registry/manniche/badge/badge'
import { PreviewStage, type StageStatus } from '@/registry/manniche/preview-stage/preview-stage'

// The stage showing other demos from this library in an iframe (the preview page sits next to this one, so the
// relative URL works wherever the demos are served). Below it, the edge states: loading (nothing ever arrives, so the
// bar stays; shortcuts are off here), an error with Try again (the first failure is simulated; Try again really loads
// the demo), and the narrowest width, where the shutters close in.

const DEMO = (name: string) => `preview.html?c=${name}&full=1`

function RetryStage() {
  // Starts failed on purpose. Try again hands the state back to the stage, which then loads the iframe for real.
  const [status, setStatus] = useState<StageStatus | undefined>('error')
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <PreviewStage
      title="Error state"
      src={DEMO('copy-button')}
      status={status}
      onReload={() => {
        setStatus('loading')
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setStatus(undefined), 600)
      }}
      defaultWidth={768}
      height={220}
    />
  )
}

export default function PreviewStageDemo() {
  return (
    <div className="grid w-full min-w-0 gap-10">
      <PreviewStage title="pricing-page demo" src={DEMO('pricing-page')} caption="pricing-page from this library, live in an iframe." />

      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-x-6 gap-y-8">
        <figure className="grid min-w-0 gap-3">
          <figcaption className="text-sm text-muted-foreground">Loading · the bar appears after 300 ms</figcaption>
          <PreviewStage title="Loading state" status="loading" defaultWidth={768} height={220} shortcuts={false} />
        </figure>
        <figure className="grid min-w-0 gap-3">
          <figcaption className="text-sm text-muted-foreground">Error · Try again loads it</figcaption>
          <RetryStage />
        </figure>
        <figure className="grid min-w-0 gap-3">
          <figcaption className="text-sm text-muted-foreground">320 px · the shutters close in</figcaption>
          <PreviewStage title="Narrow frame" src={DEMO('copy-button')} defaultWidth={320} defaultTheme="light" height={220} />
        </figure>
      </div>

      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="demo">Demo data</Badge>
        The first error is simulated; the frames show demos from this library.
      </p>
    </div>
  )
}
