// The chart hooks: size and draw-in, a polite live region, and unique ids for SVG defs.
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'

/**
 * For a page that is rendered once to static HTML and never hydrated (the lab's template files). Charts measure
 * themselves in the browser, so without this they would draw at width 0, which is nothing. Inside this provider a
 * chart starts at `width` px (and its own default height), counts as drawn and sits at rest, and its SVG scales to
 * its box with the viewBox. In a live app, leave it out: the charts measure themselves as before.
 */
export const StaticChartFrame = createContext<{ width: number } | null>(null)

/**
 * Watches an element's size and whether it has come into view. `drawn` turns true once, the first time a fifth of
 * the chart is visible, and at once under reduced motion. The ref is a callback, so a chart that mounts its frame
 * later (after loading, or when data arrives) is still measured.
 */
export function useChartFrame<T extends Element = HTMLDivElement>(fallback?: { height?: number }) {
  const still = useContext(StaticChartFrame)
  const [node, setNode] = useState<T | null>(null)
  const [size, setSize] = useState({ width: still?.width ?? 0, height: still ? (fallback?.height ?? 0) : 0 })
  const [seen, setSeen] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!node) return
    const ro = new ResizeObserver(([e]) => {
      const width = Math.round(e.contentRect.width)
      const height = Math.round(e.contentRect.height)
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }))
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [node])

  useEffect(() => {
    if (!node || seen) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setSeen(true)
      },
      { threshold: 0.2 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [node, seen])

  return { ref: setNode, width: size.width, height: size.height, drawn: seen || reduced || !!still, reduced: reduced || !!still, fit: !!still }
}

/** A polite live region and a function that reads a sentence into it. Render `region` once inside the chart. */
export function useAnnounce() {
  const [text, setText] = useState('')
  const timer = useRef(0)
  const say = useCallback((t: string) => {
    // Clear first, so the same sentence twice is read twice.
    setText('')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setText(t), 30)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const region = (
    <span className="sr-only" aria-live="polite" aria-atomic="true">
      {text}
    </span>
  )
  return { say, region }
}

/** A stable id prefix for SVG defs (patterns, clip paths) that stays unique per chart. */
export function useSvgId(name: string) {
  return `${name}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
}
