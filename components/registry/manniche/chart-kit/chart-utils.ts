// The pure half of the chart kit: colours, number formatting, nice axis ticks and the smooth line. No React here,
// so it can also run on a server or in a test.

export const EASE = [0.23, 1, 0.32, 1] as const
export const EASE_CSS = 'cubic-bezier(0.23, 1, 0.32, 1)'
/** A real minus sign, which lines up with the plus in tabular figures. */
export const MINUS = '−'

/** The five series colours in their fixed order. */
export const SERIES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']
export const seriesColor = (i: number) => SERIES[((i % SERIES.length) + SERIES.length) % SERIES.length]

// Surface colours, mixed where they are used so they follow an inverted tile. One series is drawn in INK; the signal
// (today, the latest point, the target) is the only thing in --primary.
/** The main mark: bars, the line, the needle. */
export const INK = 'color-mix(in oklab, var(--foreground) 86%, var(--card))'
/** The comparison period, behind the main mark. */
export const INK_GHOST = 'color-mix(in oklab, var(--foreground) 17%, var(--card))'
/** Dashed gridlines. */
export const GRID = 'color-mix(in oklab, var(--foreground) 11%, var(--card))'
/** The baseline and dashed comparison lines. */
export const BASE = 'color-mix(in oklab, var(--foreground) 30%, var(--card))'
/** A recessed well, such as an empty track. */
export const WELL = 'color-mix(in oklab, var(--foreground) 5%, var(--card))'

// Numbers -------------------------------------------------------------------------------------------------------

export type ValueFormat = {
  /** Passed to Intl.NumberFormat. Default "en-GB". */
  locale?: string
  /** ISO code such as "EUR" or "DKK". Leave it out for a plain number. */
  currency?: string
  /** Digits after the decimal mark. Default 0. */
  decimals?: number
  /** Show a plus on positive values, as for changes. */
  sign?: boolean
  /** A unit set after the number, such as "%" or " orders". */
  suffix?: string
}

export type ValueParts = {
  sign: '' | '+' | typeof MINUS
  /** The currency symbol, or an empty string. */
  unit: string
  /** True when the locale puts the symbol after the number, as "1.234 kr." does. */
  unitAfter: boolean
  /** The whole part with its group separators. */
  whole: string
  /** The decimal mark and the decimals, or an empty string. */
  fraction: string
  suffix: string
}

const formatters = new Map<string, Intl.NumberFormat>()
function formatter(locale: string, options: Intl.NumberFormatOptions) {
  const key = locale + JSON.stringify(options)
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(locale, options)
    formatters.set(key, f)
  }
  return f
}

/** Splits a value into the pieces the display number sets in different sizes and colours. */
export function valueParts(value: number, format: ValueFormat = {}): ValueParts {
  const { locale = 'en-GB', currency, decimals = 0, sign = false, suffix = '' } = format
  const rounded = Number(Math.abs(value).toFixed(decimals))
  const parts = formatter(locale, {
    style: currency ? 'currency' : 'decimal',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).formatToParts(rounded)
  let unit = ''
  let whole = ''
  let fraction = ''
  let seenNumber = false
  let unitAfter = false
  for (const p of parts) {
    if (p.type === 'currency') {
      unit = p.value
      unitAfter = seenNumber
    } else if (p.type === 'integer' || p.type === 'group') {
      whole += p.value
      seenNumber = true
    } else if (p.type === 'decimal' || p.type === 'fraction') fraction += p.value
  }
  const s = rounded === 0 ? '' : value < 0 ? MINUS : sign ? '+' : ''
  return { sign: s, unit, unitAfter, whole, fraction, suffix }
}

/** The value as one string, for tooltips, tables and screen readers. */
export function formatValue(value: number, format: ValueFormat = {}) {
  const p = valueParts(value, format)
  const space = p.unitAfter ? ' ' : ''
  return p.unitAfter
    ? `${p.sign}${p.whole}${p.fraction}${space}${p.unit}${p.suffix}`
    : `${p.sign}${p.unit}${p.whole}${p.fraction}${p.suffix}`
}

/** A short value for axis ticks: "€1.2k", "40". */
export function formatTick(value: number, format: ValueFormat = {}) {
  const { locale = 'en-GB', currency } = format
  return formatter(locale, {
    style: currency ? 'currency' : 'decimal',
    currency,
    currencyDisplay: 'narrowSymbol',
    notation: Math.abs(value) >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(value) >= 10000 ? 1 : 0,
  }).format(value)
}

// Scales --------------------------------------------------------------------------------------------------------

/** Round axis bounds and ticks that cover min…max in about `count` steps of 1, 2, 2.5 or 5 × 10ⁿ. */
export function niceScale(max: number, count = 4, min = 0) {
  const span = Math.max(max - min, Number.EPSILON)
  const raw = span / Math.max(1, count)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(10)))
  return { min: lo, max: hi, step, ticks }
}

/** A linear map from a domain to a range. */
export function linear(d0: number, d1: number, r0: number, r1: number) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0)
  return (v: number) => r0 + (v - d0) * k
}

/** A smooth line through points that never overshoots them (monotone cubic, Fritsch–Carlson). */
export function smoothPath(pts: [number, number][]) {
  const n = pts.length
  if (n === 0) return ''
  if (n < 3) return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r2(x)} ${r2(y)}`).join('')
  const dx: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0])
    m.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1))
  }
  const t = [m[0], ...m.slice(1).map((s, i) => (s * m[i] <= 0 ? 0 : (s + m[i]) / 2)), m[n - 2]]
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0
      t[i + 1] = 0
      continue
    }
    const a = t[i] / m[i]
    const b = t[i + 1] / m[i]
    const h = a * a + b * b
    if (h > 9) {
      const s = 3 / Math.sqrt(h)
      t[i] = s * a * m[i]
      t[i + 1] = s * b * m[i]
    }
  }
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    const h = dx[i] / 3
    d += `C${r2(x0 + h)} ${r2(y0 + t[i] * h)} ${r2(x1 - h)} ${r2(y1 - t[i + 1] * h)} ${r2(x1)} ${r2(y1)}`
  }
  return d
}

const r2 = (v: number) => Math.round(v * 100) / 100

/** The next index for an arrow, Home or End key, or null for any other key. */
export function stepIndex(key: string, index: number, count: number, { loop = false, vertical = false } = {}) {
  const next = vertical ? 'ArrowDown' : 'ArrowRight'
  const prev = vertical ? 'ArrowUp' : 'ArrowLeft'
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (key === next) return loop ? (index + 1) % count : Math.min(count - 1, index + 1)
  if (key === prev) return loop ? (index - 1 + count) % count : Math.max(0, index - 1)
  return null
}
