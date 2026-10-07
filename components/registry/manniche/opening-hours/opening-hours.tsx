// Based on Watermelon UI's “Slot picker” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten with native time inputs and a real switch.
import { Plus, X } from 'lucide-react'
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react'
import { useId, useState } from 'react'
import { Switch } from '@/registry/manniche/switch/switch'
import { cn } from '@/lib/utils'

export type TimeRange = { id: string; from: string; to: string }
export type OpeningDay = { id: string; label: string; open: boolean; ranges: TimeRange[] }

export type OpeningHoursProps = {
  /** Controlled week. Times are "HH:MM", as a time input gives them. */
  value?: OpeningDay[]
  /** Starting week when the control is not controlled. */
  defaultValue?: OpeningDay[]
  /** Called with the whole updated week after any switch, time or range changes. */
  onChange?: (days: OpeningDay[]) => void
  /** Visible text and screen reader text for the time fields and the add and remove buttons; defaults to English. */
  labels?: { from?: string; to?: string; add?: string; remove?: string }
  /** Classes for the outer list of days. */
  className?: string
}

/** Opening hours or availability per weekday, with more than one range a day if needed. */
export function OpeningHours({ value, defaultValue = [], onChange, labels = {}, className }: OpeningHoursProps) {
  const [own, setOwn] = useState(defaultValue)
  const days = value ?? own
  const group = useId()
  const { from = 'From', to = 'To', add = 'Add hours', remove = 'Remove hours' } = labels

  const set = (next: OpeningDay[]) => {
    setOwn(next)
    onChange?.(next)
  }
  const patch = (id: string, f: (d: OpeningDay) => OpeningDay) => set(days.map((d) => (d.id === id ? f(d) : d)))
  const range = (from: string, to: string): TimeRange => ({ id: crypto.randomUUID(), from, to })

  const time = 'h-10 rounded-xl border bg-background px-2 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
      <LayoutGroup id={group}>
        <div className={cn('flex w-full max-w-sm flex-col gap-2', className)}>
          {days.map((day) => (
            <motion.section
              key={day.id}
              layout
              aria-label={day.label}
              style={{ borderRadius: 22 }}
              className={cn('overflow-hidden border transition-colors duration-300', day.open ? 'bg-card shadow-sm' : 'border-transparent bg-muted')}
            >
              <motion.div layout="position" className="flex h-14 items-center justify-between px-4">
                <span className="font-medium">{day.label}</span>
                <Switch
                  aria-label={day.label}
                  checked={day.open}
                  onChange={(open) => patch(day.id, (d) => ({ ...d, open, ranges: open && d.ranges.length === 0 ? [range('09:00', '17:00')] : d.ranges }))}
                />
              </motion.div>
              <AnimatePresence initial={false}>
                {day.open && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <ul className="space-y-2 px-4 pb-2">
                      <AnimatePresence initial={false}>
                        {day.ranges.map((r) => (
                          <motion.li key={r.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                            <input type="time" aria-label={`${day.label}, ${from}`} value={r.from} className={time}
                              onChange={(e) => patch(day.id, (d) => ({ ...d, ranges: d.ranges.map((x) => (x.id === r.id ? { ...x, from: e.target.value } : x)) }))} />
                            <span className="text-muted-foreground" aria-hidden>–</span>
                            <input type="time" aria-label={`${day.label}, ${to}`} value={r.to} className={time}
                              onChange={(e) => patch(day.id, (d) => ({ ...d, ranges: d.ranges.map((x) => (x.id === r.id ? { ...x, to: e.target.value } : x)) }))} />
                            <button
                              type="button"
                              aria-label={remove}
                              onClick={() => patch(day.id, (d) => {
                                const ranges = d.ranges.filter((x) => x.id !== r.id)
                                return { ...d, ranges, open: ranges.length > 0 }
                              })}
                              className="ml-auto grid size-10 relative after:-inset-0.5 after:absolute after:content-[''] place-items-center rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                            >
                              <X className="size-4" aria-hidden />
                            </button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                    <button
                      type="button"
                      onClick={() => patch(day.id, (d) => ({ ...d, ranges: [...d.ranges, range(d.ranges.at(-1)?.to ?? '09:00', '18:00')] }))}
                      className="mx-4 mb-3 inline-flex min-h-10 relative after:inset-x-0 after:-inset-y-0.5 after:absolute after:content-[''] items-center gap-1.5 rounded-xl px-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                    >
                      <Plus className="size-4" aria-hidden />
                      {add}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          ))}
        </div>
      </LayoutGroup>
    </MotionConfig>
  )
}
