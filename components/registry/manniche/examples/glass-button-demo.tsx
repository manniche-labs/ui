import { useEffect, useRef, useState } from 'react'
import { GlassButton } from '@/registry/manniche/glass-button/glass-button'

// The ruler is plain SVG in currentColor: a tick every 6 px, longer every 5 and 10, a number every 10.
const STEP = 6
const BASE = 26

function Ruler() {
  const el = useRef<SVGSVGElement>(null)
  const [w, setW] = useState(0)

  useEffect(() => {
    const svg = el.current
    if (!svg) return
    const ro = new ResizeObserver(() => setW(svg.parentElement?.offsetWidth ?? 0))
    if (svg.parentElement) ro.observe(svg.parentElement)
    return () => ro.disconnect()
  }, [])

  const n = Math.max(0, Math.floor((w - 24) / STEP))
  const off = (w - n * STEP) / 2
  let d = `M${off} ${BASE + 0.5}H${off + n * STEP}`
  const labels: { x: number; v: number }[] = []
  for (let k = 0; k <= n; k++) {
    const x = Math.round(off + k * STEP) + 0.5
    d += `M${x} ${BASE}V${BASE - (k % 10 === 0 ? 15 : k % 5 === 0 ? 10 : 5)}`
    if (k % 10 === 0) labels.push({ x, v: k / 10 })
  }

  return (
    <svg ref={el} width={w} height={44} viewBox={`0 0 ${w} 44`} className="block overflow-visible">
      <path d={w ? d : ''} stroke="currentColor" strokeWidth={1} fill="none" shapeRendering="crispEdges" />
      {labels.map((l) => (
        <text key={l.x} x={l.x} y={BASE + 13} fill="currentColor" textAnchor="middle" className="font-mono text-[9px]">
          {l.v}
        </text>
      ))}
    </svg>
  )
}

export default function GlassButtonDemo() {
  return (
    <div className="grid min-h-[250px] w-full place-items-center">
      {/* The ruler's baseline sits 9 px above the bottom of the glass: 1 px border + 4 px bevel + 58 px face - 9 - 26. */}
      <GlassButton backdrop={<Ruler />} containerClassName="flex w-full justify-center" backdropClassName="inset-x-0 top-7 bottom-auto h-11">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
        Capture
      </GlassButton>
    </div>
  )
}
