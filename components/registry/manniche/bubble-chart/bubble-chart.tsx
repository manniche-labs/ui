// Bubble chart: one circle per item, sized by its value. Give every item an `x` and a `y` and the bubbles sit on
// two axes (how often, how much each time) with dashed gridlines and values at the right; leave them out and the
// bubbles pack together, largest in the middle. Each bubble is named by a label beside it (on axes) or inside it
// (packed) wherever the label fits; the rest are named by the tooltip.
//
// How it works: the layout is worked out in pixels from the measured size, so labels, radii and ticks stay readable
// from 280 to 1200 px. Labels on axes try eight spots around their bubble and keep the one that hits nothing; packed
// bubbles are placed largest first, each in the free spot nearest the middle. The plot is one Tab stop: arrow keys,
// Home and End step through the bubbles (left to right on axes, largest first when packed), Escape lets go. Hover
// and a finger scrubbing across the plot pick the bubble under it and show the same tooltip, and the page still
// scrolls up and down under a finger.
//
// Screen readers: the plot is an image named by `label` with a short hint; each step is read once as one sentence
// ("Harbour Market: 6 visits, average €48.20, total €289.20"), and the whole data set is in a hidden table.
//
// Motion: on first view the bubbles grow from their centres one after another (all done in 600 ms). Bubbles only
// move by transform and fade by opacity, so new data glides them to their new places. Under reduced motion
// everything is drawn in place at once and nothing moves.
import { useCallback, useEffect, useId, useMemo, useState, type HTMLAttributes, type KeyboardEvent, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'
import { ChartTooltip, SrTable } from '@/registry/manniche/chart-kit/chart-kit'
import {
  BASE,
  EASE_CSS,
  GRID,
  formatTick,
  formatValue,
  niceScale,
  seriesColor,
  stepIndex,
  valueParts,
  type ValueFormat,
} from '@/registry/manniche/chart-kit/chart-utils'
import { useAnnounce, useChartFrame } from '@/registry/manniche/chart-kit/use-chart'

export type BubbleDatum = {
  /** The item's name, written beside or inside its bubble and read aloud. Also its key, so keep it unique. */
  label: string
  /** Sets the bubble's area. Negative values count as zero. */
  value: number
  /** Position along the bottom axis. Give every item an `x` and a `y` to draw axes; leave both out to pack. */
  x?: number
  /** Position up the side axis. */
  y?: number
  /** A group name, shown in the tooltip and the table, such as "Groceries". Items in one group share a colour. */
  group?: string
  /** Any CSS colour. Defaults to a series colour per group (or per item without groups). */
  color?: string
}

export type BubbleLabels = {
  /** The first column of the hidden table. Default "Item". */
  item?: string
  /** What `value` measures, in the table and the default sentence. Default "Value". */
  value?: string
  /** Muted words after the value in the tooltip, such as "this month". Default none. */
  valueNote?: string
  /** What `x` measures, in the tooltip, the table and the default sentence. Default "X". */
  x?: string
  /** What `y` measures. Default "Y". */
  y?: string
  /** A unit after the last bottom tick, such as "visits". Default none. */
  xUnit?: string
  /** The group column of the hidden table. Default "Group". */
  group?: string
  /** Read once when the plot gets focus. Default "Arrow keys step through the bubbles; Escape lets go." */
  hint?: string
  /** The sentence read for a bubble. Gets the item and its formatted figures. */
  describe?: (d: BubbleDatum, text: { value: string; x: string; y: string }) => string
}

export type BubbleChartProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** One entry per bubble: `{ label, value, x?, y?, group?, color? }`. */
  data: BubbleDatum[]
  /** What the chart shows, such as "Merchants by visits and average spend". Names the plot and the hidden table. */
  label: string
  /** How `value` is written. Default: a plain whole number in en-GB. */
  format?: ValueFormat
  /** How `x` is written. Default: a plain number. */
  xFormat?: ValueFormat
  /** How `y` is written, on the side axis too. Default: a plain number. */
  yFormat?: ValueFormat
  /** The plot's height in px. Default 280 below 560 px wide and 320 above (240/280 in compact density). */
  height?: number
  /** The largest bubble's radius in px. Default 40 (30 below 560 px wide, 22 below 400), and never more than an eighth of the height. */
  maxRadius?: number
  /** The bubble that is active (its tooltip shows), as an index into `data`, or null. Makes the selection controlled. */
  activeIndex?: number | null
  /** The bubble active on first render when uncontrolled. Default null. */
  defaultActiveIndex?: number | null
  /** Called with the new index (or null) when the pointer or the keyboard moves the selection. */
  onActiveIndexChange?: (index: number | null) => void
  /** Words for i18n. */
  labels?: BubbleLabels
  /** "compact" makes the plot shorter. Inside a DataTile it follows the tile's density on its own. */
  density?: 'comfortable' | 'compact'
}

type Placed = { i: number; cx: number; cy: number; r: number; color: string }
type Tag = { x: number; y: number; anchor: 'start' | 'middle' | 'end'; inside: boolean } | null

const GUT = 46 // right gutter for the side axis values
const PB = 30 // bottom room for the x ticks
const PT = 14
const LABEL_H = 14

/** A label's width in px at 12 px, guessed from its letters so layout is the same on the server and the client. */
function textWidth(s: string, px = 12) {
  let em = 0
  for (const ch of s) {
    if (/[il.,'|!:;ɪj]/.test(ch)) em += 0.27
    else if (ch === ' ') em += 0.27
    else if (/[mwMW@]/.test(ch)) em += 0.86
    else if (/[A-Z&]/.test(ch)) em += 0.66
    else if (/[ft r]/.test(ch)) em += 0.36
    else em += 0.56
  }
  return em * px
}

function useControllable(controlled: number | null | undefined, initial: number | null, onChange?: (v: number | null) => void) {
  const [inner, setInner] = useState(initial)
  const isControlled = controlled !== undefined
  const value = isControlled ? controlled : inner
  const set = useCallback(
    (v: number | null) => {
      if (v === value) return
      if (!isControlled) setInner(v)
      onChange?.(v)
    },
    [value, isControlled, onChange],
  )
  return [value, set] as const
}

/** Packs circles (radii in any unit) largest first, each in the free tangent spot nearest the middle. */
function pack(radii: number[], aspect: number) {
  const order = radii.map((_, i) => i).sort((a, b) => radii[b] - radii[a])
  const pos: { x: number; y: number; r: number }[] = new Array(radii.length)
  const done: number[] = []
  const pad = Math.max(...radii, 0) * 0.06
  const free = (x: number, y: number, r: number) =>
    done.every((j) => (pos[j].x - x) ** 2 + (pos[j].y - y) ** 2 >= (pos[j].r + r + pad - 1e-6) ** 2)
  // Wider plots spread sideways: distance counts less along x.
  const cost = (x: number, y: number) => (x / aspect) ** 2 + y ** 2
  for (const i of order) {
    const r = radii[i]
    if (!done.length) {
      pos[i] = { x: 0, y: 0, r }
      done.push(i)
      continue
    }
    let best: { x: number; y: number } | null = null
    let bc = Infinity
    const tryAt = (x: number, y: number) => {
      const c = cost(x, y)
      if (c < bc && free(x, y, r)) {
        bc = c
        best = { x, y }
      }
    }
    for (const a of done) {
      const A = pos[a]
      for (let k = 0; k < 12; k++) {
        const t = (k / 12) * Math.PI * 2
        tryAt(A.x + Math.cos(t) * (A.r + r + pad), A.y + Math.sin(t) * (A.r + r + pad))
      }
      for (const b of done) {
        if (b <= a) continue
        const B = pos[b]
        const ra = A.r + r + pad
        const rb = B.r + r + pad
        const dx = B.x - A.x
        const dy = B.y - A.y
        const d = Math.hypot(dx, dy)
        if (d > ra + rb || d < Math.abs(ra - rb) || d === 0) continue
        const l = (ra * ra - rb * rb + d * d) / (2 * d)
        const h = Math.sqrt(Math.max(0, ra * ra - l * l))
        const mx = A.x + (dx * l) / d
        const my = A.y + (dy * l) / d
        tryAt(mx + (h * dy) / d, my - (h * dx) / d)
        tryAt(mx - (h * dy) / d, my + (h * dx) / d)
      }
    }
    pos[i] = best ? { ...(best as { x: number; y: number }), r } : { x: 0, y: 0, r }
    done.push(i)
  }
  return pos
}

/**
 * A bubble chart: bubbles sized by value, on two axes when the data has `x` and `y`, packed together when it does
 * not. Direct labels where they fit, one tooltip for the rest, one Tab stop with arrow keys.
 */
export function BubbleChart({
  data,
  label,
  format,
  xFormat,
  yFormat,
  height,
  maxRadius,
  activeIndex,
  defaultActiveIndex = null,
  onActiveIndexChange,
  labels: labelsProp,
  density,
  className,
  style,
  ...rest
}: BubbleChartProps) {
  const labels = {
    item: 'Item',
    value: 'Value',
    x: 'X',
    y: 'Y',
    group: 'Group',
    hint: 'Arrow keys step through the bubbles; Escape lets go.',
    ...labelsProp,
  }
  const { ref: frameRef, width: frameW, height: frameH, drawn, reduced, fit } = useChartFrame<HTMLDivElement>({ height: height ?? 320 })
  const { say, region } = useAnnounce()
  const hintId = useId()
  const [active, setActive] = useControllable(activeIndex, defaultActiveIndex, onActiveIndexChange)
  const [keyboard, setKeyboard] = useState(false)

  const n = data.length
  const axes = n > 0 && data.every((d) => Number.isFinite(d.x) && Number.isFinite(d.y))
  const W = Math.max(280, frameW)
  const H = frameH
  const ready = frameW > 0 && H > 0

  // Colours: one per group, in the order groups first appear; otherwise one per item.
  const groups = useMemo(() => [...new Set(data.map((d) => d.group).filter((g): g is string => !!g))], [data])
  const colorOf = useCallback(
    (d: BubbleDatum, i: number) => d.color ?? (d.group ? seriesColor(groups.indexOf(d.group)) : seriesColor(i)),
    [groups],
  )

  const layout = useMemo(() => {
    if (!ready || !n) return null
    const maxV = Math.max(...data.map((d) => Math.max(0, d.value)), Number.EPSILON)
    if (axes) {
      const pw = W - GUT
      // The axes start at 0, or lower when a value is negative.
      const xv = data.map((d) => d.x as number)
      const yv = data.map((d) => d.y as number)
      const xs = niceScale(Math.max(...xv), 4, Math.min(0, ...xv))
      const ys = niceScale(Math.max(...yv), 4, Math.min(0, ...yv))
      const rmax = Math.min(maxRadius ?? (W < 400 ? 22 : W < 560 ? 30 : 40), H / 8)
      const rmin = Math.min(6, rmax / 2)
      const X = (v: number) => 16 + ((v - xs.min) / (xs.max - xs.min || 1)) * (pw - 32)
      const Y = (v: number) => PT + (1 - (v - ys.min) / (ys.max - ys.min || 1)) * (H - PT - PB)
      const dots: Placed[] = data.map((d, i) => ({
        i,
        cx: X(d.x as number),
        cy: Y(d.y as number),
        r: rmin + Math.sqrt(Math.max(0, d.value) / maxV) * (rmax - rmin),
        color: colorOf(d, i),
      }))
      // Direct labels: eight spots around each bubble, biggest bubbles first; the cheapest spot wins.
      type Box = { x: number; y: number; w: number; h: number }
      const placed: Box[] = []
      const hitsCircle = (b: Box, o: Placed) => {
        const nx = Math.max(b.x, Math.min(o.cx, b.x + b.w))
        const ny = Math.max(b.y, Math.min(o.cy, b.y + b.h))
        return (nx - o.cx) ** 2 + (ny - o.cy) ** 2 < (o.r + 2) ** 2
      }
      const hitsBox = (a: Box, b: Box) => a.x < b.x + b.w + 4 && b.x < a.x + a.w + 4 && a.y < b.y + b.h + 2 && b.y < a.y + a.h + 2
      const tags: Tag[] = new Array(n).fill(null)
      for (const o of [...dots].sort((p, q) => q.r - p.r)) {
        const w = textWidth(data[o.i].label)
        const h = LABEL_H
        const d = o.r * 0.7
        const spots: (Box & { a: 'start' | 'middle' | 'end' })[] = [
          { x: o.cx + o.r + 7, y: o.cy - h / 2, a: 'start', w, h },
          { x: o.cx - o.r - 7 - w, y: o.cy - h / 2, a: 'end', w, h },
          { x: o.cx - w / 2, y: o.cy - o.r - 6 - h, a: 'middle', w, h },
          { x: o.cx - w / 2, y: o.cy + o.r + 6, a: 'middle', w, h },
          { x: o.cx + d + 3, y: o.cy - d - h, a: 'start', w, h },
          { x: o.cx - d - 3 - w, y: o.cy - d - h, a: 'end', w, h },
          { x: o.cx + d + 3, y: o.cy + d, a: 'start', w, h },
          { x: o.cx - d - 3 - w, y: o.cy + d, a: 'end', w, h },
        ]
        const cost = (b: Box) =>
          (b.x < 0 || b.x + b.w > pw || b.y < 0 || b.y + b.h > H - PB ? 10 : 0) +
          dots.filter((q) => q !== o && hitsCircle(b, q)).length * 3 +
          placed.filter((q) => hitsBox(b, q)).length * 4
        let best = spots[0]
        let bc = Infinity
        for (const s of spots) {
          const c = cost(s)
          if (c < bc) {
            bc = c
            best = s
          }
          if (!c) break
        }
        // A label that would hit something is left to the tooltip.
        if (bc > 0) continue
        placed.push(best)
        const ax = best.a === 'start' ? best.x : best.a === 'end' ? best.x + w : best.x + w / 2
        tags[o.i] = { x: ax, y: best.y + 11, anchor: best.a, inside: false }
      }
      const xTicks = xs.ticks.map((v) => ({ v, at: X(v) }))
      const yTicks = ys.ticks.map((v) => ({ v, at: Y(v) }))
      // Left to right, then bottom to top: the order the eye reads the plot.
      const order = dots
        .map((o) => o.i)
        .sort((a, b) => (data[a].x as number) - (data[b].x as number) || (data[a].y as number) - (data[b].y as number))
      return { dots, tags, order, pw, xTicks, yTicks }
    }
    // Packed: unit radii by area, packed, then scaled to fit the plot with room for the focus ring.
    const radii = data.map((d) => Math.sqrt(Math.max(0, d.value) / maxV))
    const pos = pack(radii, Math.max(1, W / H))
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    for (const p of pos) {
      x0 = Math.min(x0, p.x - p.r)
      x1 = Math.max(x1, p.x + p.r)
      y0 = Math.min(y0, p.y - p.r)
      y1 = Math.max(y1, p.y + p.r)
    }
    const m = 8
    let s = Math.min((W - 2 * m) / (x1 - x0 || 1), (H - 2 * m) / (y1 - y0 || 1))
    if (maxRadius) s = Math.min(s, maxRadius)
    const ox = W / 2 - ((x0 + x1) / 2) * s
    const oy = H / 2 - ((y0 + y1) / 2) * s
    const dots: Placed[] = data.map((d, i) => ({ i, cx: ox + pos[i].x * s, cy: oy + pos[i].y * s, r: pos[i].r * s, color: colorOf(d, i) }))
    const tags: Tag[] = dots.map((o) => (textWidth(data[o.i].label) <= o.r * 1.7 - 8 && o.r >= 20 ? { x: o.cx, y: o.cy + 4, anchor: 'middle', inside: true } : null))
    const order = dots.map((o) => o.i).sort((a, b) => data[b].value - data[a].value || a - b)
    return { dots, tags, order, pw: W, xTicks: [], yTicks: [] }
  }, [ready, n, data, axes, W, H, maxRadius, colorOf])

  // First view: the bubbles grow in once; afterwards moves glide without a delay.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (!drawn || settled) return
    const t = window.setTimeout(() => setSettled(true), 650)
    return () => window.clearTimeout(t)
  }, [drawn, settled])
  const grown = drawn && ready

  // A bubble that no longer exists lets go.
  useEffect(() => {
    if (active !== null && (active < 0 || active >= n)) setActive(null)
  }, [active, n, setActive])

  const at = active !== null && active >= 0 && active < n ? active : -1

  // A tooltip opened by hover closes on Escape too, without moving the pointer (WCAG 1.4.13).
  useEffect(() => {
    if (at < 0 || keyboard) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [at, keyboard, setActive])

  const order = useMemo(() => layout?.order ?? [], [layout])

  const texts = (d: BubbleDatum) => ({
    value: formatValue(d.value, format),
    x: d.x === undefined ? '' : formatValue(d.x, xFormat),
    y: d.y === undefined ? '' : formatValue(d.y, yFormat),
  })
  const describe = (i: number) => {
    const d = data[i]
    const t = texts(d)
    if (labels.describe) return labels.describe(d, t)
    const parts = [`${labels.value} ${t.value}`]
    if (axes) parts.unshift(`${labels.x} ${t.x}`, `${labels.y} ${t.y}`)
    return `${d.label}${d.group ? `, ${d.group}` : ''}: ${parts.join(', ')}`
  }
  const pick = (i: number, announce: boolean) => {
    setActive(i)
    if (announce) say(describe(i))
  }

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!layout) return
    setKeyboard(false)
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    const py = e.clientY - r.top
    // The bubble under the pointer, smallest first so a small one in front of a big one can be reached; a finger
    // gets 10 px of slack.
    const slack = e.pointerType === 'touch' ? 10 : 2
    let hit = -1
    let hr = Infinity
    for (const o of layout.dots) {
      if ((o.cx - px) ** 2 + (o.cy - py) ** 2 <= (o.r + slack) ** 2 && o.r < hr) {
        hit = o.i
        hr = o.r
      }
    }
    if (hit >= 0) {
      if (hit !== at) pick(hit, false)
    } else if (e.pointerType === 'mouse' && !e.currentTarget.matches(':focus-visible')) setActive(null)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!n || !order.length) return
    if (e.key === 'Escape') {
      if (at < 0) return
      e.preventDefault()
      setActive(null)
      return
    }
    const p = order.indexOf(at)
    const to = p < 0 && /^Arrow/.test(e.key) ? 0 : stepIndex(e.key, p, order.length, { loop: false })
    if (to === null) return
    e.preventDefault()
    setKeyboard(true)
    pick(order[to], true)
  }

  const isCompact = density === 'compact'
  const heightClass = isCompact
    ? 'h-[240px] @[35rem]:h-[280px]'
    : 'h-[280px] @[35rem]:h-[320px] group-data-[density=compact]/tile:h-[240px] @[35rem]:group-data-[density=compact]/tile:h-[280px]'

  const stagger = Math.min(50, 300 / Math.max(1, n - 1))
  const motionFor = (k: number) =>
    reduced
      ? { transition: 'none' }
      : settled
        ? { transitionProperty: 'transform, opacity', transitionDuration: '300ms, 200ms', transitionTimingFunction: EASE_CSS }
        : {
            transitionProperty: 'transform, opacity',
            transitionDuration: '300ms, 200ms',
            transitionTimingFunction: EASE_CSS,
            transitionDelay: `${Math.round(k * stagger)}ms, 0ms`,
          }
  const rankOf = useMemo(() => {
    const m = new Map<number, number>()
    order.forEach((i, k) => m.set(i, k))
    return m
  }, [order])

  const tip = at >= 0 && layout ? layout.dots[at] : null
  const tipD = at >= 0 ? data[at] : null
  const tipRows = tipD && axes ? [
    { label: labels.x, value: texts(tipD).x },
    { label: labels.y, value: texts(tipD).y },
  ] : []

  return (
    <div className={cn('@container relative min-w-0', className)} style={style} {...rest}>
      <div
        ref={frameRef}
        tabIndex={n ? 0 : undefined}
        role="img"
        aria-label={label}
        aria-describedby={n ? hintId : undefined}
        onPointerDown={fromPointer}
        onPointerMove={fromPointer}
        onPointerLeave={(e) => {
          if (e.pointerType !== 'mouse') return
          if (!e.currentTarget.matches(':focus-visible')) setActive(null)
        }}
        onFocus={(e) => {
          // A press focuses the plot too; only keyboard focus picks the first bubble.
          if (!e.currentTarget.matches(':focus-visible')) return
          setKeyboard(true)
          if (at >= 0) say(describe(at))
          else if (order.length) pick(order[0], true)
        }}
        onBlur={() => {
          setKeyboard(false)
          setActive(null)
        }}
        onKeyDown={onKeyDown}
        className={cn('relative w-full rounded-xl outline-offset-4 select-none [touch-action:pan-y]', heightClass)}
        style={height ? { height } : undefined}
      >
        {layout && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={cn('absolute inset-0 block overflow-visible', fit && 'h-full w-full')} aria-hidden>
            {axes && (
              <g>
                {layout.yTicks.map((t, k) => (
                  <g key={`y${t.v}`}>
                    <line
                      x1={0}
                      x2={layout.pw}
                      y1={Math.round(t.at) + 0.5}
                      y2={Math.round(t.at) + 0.5}
                      stroke={k === 0 ? BASE : GRID}
                      strokeDasharray={k === 0 ? undefined : '2 4'}
                    />
                    <text x={layout.pw + 10} y={t.at + 4} className="fill-muted-foreground font-mono text-[11px] tabular-nums">
                      {formatTick(t.v, yFormat)}
                    </text>
                  </g>
                ))}
                {layout.xTicks.map((t, k) => (
                  <text
                    key={`x${t.v}`}
                    x={t.at}
                    y={H - 8}
                    textAnchor="middle"
                    className="fill-muted-foreground font-mono text-[11px] tabular-nums"
                  >
                    {formatTick(t.v, xFormat)}
                    {k === layout.xTicks.length - 1 && labels.xUnit ? ` ${labels.xUnit}` : ''}
                  </text>
                ))}
              </g>
            )}
            {layout.dots.map((o) => {
              const k = rankOf.get(o.i) ?? o.i
              const dim = at >= 0 && at !== o.i
              return (
                <circle
                  key={data[o.i].label}
                  cx={0}
                  cy={0}
                  r={o.r}
                  fill={axes ? o.color : `color-mix(in oklab, ${o.color} 30%, var(--card))`}
                  stroke={axes ? 'var(--card)' : o.color}
                  strokeWidth={axes ? 2.5 : 1.5}
                  style={{
                    transform: `translate(${o.cx}px, ${o.cy}px) scale(${grown ? 1 : 0})`,
                    opacity: dim ? 0.28 : 1,
                    ...motionFor(k),
                  }}
                />
              )
            })}
            {layout.dots.map((o) => {
              const t = layout.tags[o.i]
              if (!t) return null
              const k = rankOf.get(o.i) ?? o.i
              const dim = at >= 0 && at !== o.i
              return (
                <text
                  key={data[o.i].label}
                  x={0}
                  y={0}
                  textAnchor={t.anchor}
                  className="fill-foreground text-[12px] font-medium"
                  style={{
                    transform: `translate(${t.x}px, ${t.y}px)`,
                    opacity: grown ? (dim ? 0.35 : 1) : 0,
                    ...motionFor(k),
                  }}
                >
                  {data[o.i].label}
                </text>
              )
            })}
            {tip && (
              <circle
                cx={0}
                cy={0}
                r={tip.r + 4}
                fill="none"
                stroke="var(--ring)"
                strokeWidth={2}
                style={{ transform: `translate(${tip.cx}px, ${tip.cy}px)`, opacity: keyboard ? 1 : 0, transition: 'none' }}
              />
            )}
          </svg>
        )}
        <ChartTooltip
          open={!!tip}
          x={tip ? tip.cx : 0}
          y={tip ? (tip.cy - tip.r < 70 ? tip.cy + tip.r : tip.cy - tip.r) : 0}
          below={tip ? tip.cy - tip.r < 70 : false}
          bounds={W}
          title={tipD ? (tipD.group ? `${tipD.label} · ${tipD.group}` : tipD.label) : ''}
          value={tipD ? <TipValue value={tipD.value} format={format} note={labels.valueNote} /> : ''}
          rows={tipRows}
        />
      </div>
      <span id={hintId} hidden>
        {labels.hint}
      </span>
      <SrTable
        caption={label}
        head={[labels.item, ...(groups.length ? [labels.group] : []), ...(axes ? [labels.x, labels.y] : []), labels.value]}
        rows={data.map((d) => {
          const t = texts(d)
          return [d.label, ...(groups.length ? [d.group ?? ''] : []), ...(axes ? [t.x, t.y] : []), t.value]
        })}
      />
      {region}
    </div>
  )
}

/** The tooltip figure with its unit and note set muted. */
function TipValue({ value, format, note }: { value: number; format?: ValueFormat; note?: string }) {
  const p = valueParts(value, format)
  const muted = 'font-medium text-[color-mix(in_oklab,var(--card)_60%,var(--foreground))]'
  return (
    <>
      {p.sign}
      {!p.unitAfter && <span className={muted}>{p.unit}</span>}
      {p.whole}
      {p.fraction}
      {p.unitAfter && <span className={muted}> {p.unit}</span>}
      {p.suffix}
      {note && <span className={cn(muted, 'text-[13px] font-normal')}> {note}</span>}
    </>
  )
}

export default BubbleChart
