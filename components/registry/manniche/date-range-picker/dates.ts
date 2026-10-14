// Small helpers for local calendar days, used by DateRangePicker. Every helper works on year, month and day
// (new Date(y, m, d)), never on milliseconds, so a day never shifts across time zones or daylight saving.

/** A range of whole days, both ends included, as Dates at local midnight. */
export type DateRange = { start: Date; end: Date }

/** The quick ranges. "custom" is the one that is active after picking days by hand. */
export type DateRangePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom'

export const ymd = (y: number, m: number, d: number) => new Date(y, m, d)
export const dayOf = (d: Date) => ymd(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d: Date, n: number) => ymd(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const startOfMonth = (d: Date) => ymd(d.getFullYear(), d.getMonth(), 1)
export const endOfMonth = (d: Date) => ymd(d.getFullYear(), d.getMonth() + 1, 0)
/** Moves by whole months and keeps the day, cut to the month's length (31 Jan + 1 month = 28 or 29 Feb). */
export function addMonths(d: Date, n: number) {
  const first = ymd(d.getFullYear(), d.getMonth() + n, 1)
  return ymd(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), endOfMonth(first).getDate()))
}
/** A number that sorts like the day: 20261014. */
export const keyOf = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
export const sameDay = (a: Date | null | undefined, b: Date | null | undefined) => !!a && !!b && keyOf(a) === keyOf(b)
export const before = (a: Date, b: Date) => keyOf(a) < keyOf(b)
/** Whole days from a to b, counted on the calendar, so daylight saving never adds or loses one. */
export const daysBetween = (a: Date, b: Date) =>
  Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5)
export const startOfWeek = (d: Date, ws: number) => addDays(d, -((d.getDay() - ws + 7) % 7))
export const monthsBetween = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth()
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const ordered = (a: Date, b: Date): DateRange => (before(b, a) ? { start: b, end: a } : { start: a, end: b })

/** The period of equal length that ends the day before the range starts. */
export function previousPeriod(range: DateRange): DateRange {
  const length = daysBetween(range.start, range.end) + 1
  return { start: addDays(range.start, -length), end: addDays(range.start, -1) }
}

/** The range a quick range stands for, counted from `today`. "This month" runs to today; "custom" has none. */
export function presetRange(preset: DateRangePreset, today: Date = new Date()): DateRange | null {
  const t = dayOf(today)
  switch (preset) {
    case 'today':
      return { start: t, end: t }
    case 'yesterday': {
      const y = addDays(t, -1)
      return { start: y, end: y }
    }
    case 'last7':
      return { start: addDays(t, -6), end: t }
    case 'last30':
      return { start: addDays(t, -29), end: t }
    case 'thisMonth':
      return { start: startOfMonth(t), end: t }
    case 'lastMonth': {
      const s = addMonths(startOfMonth(t), -1)
      return { start: s, end: endOfMonth(s) }
    }
    default:
      return null
  }
}

