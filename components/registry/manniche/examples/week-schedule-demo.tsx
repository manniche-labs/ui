import { useState } from 'react'
import { BigNumber } from '@/registry/manniche/chart-kit/chart-kit'
import { DataTile, TileFact } from '@/registry/manniche/data-tile/data-tile'
import { WeekSchedule, type ScheduleCategory, type ScheduleEvent } from '@/registry/manniche/week-schedule/week-schedule'

// An example week for the demo, not a real calendar. "Now" is Thursday 8 October 2026 at 14:20.
const WEEK = '2026-10-05'
const NOW = '2026-10-08T14:20'
const CATEGORIES: ScheduleCategory[] = [
  { id: 'work', label: 'Work', color: 'var(--chart-1)' },
  { id: 'health', label: 'Health', color: 'var(--chart-4)' },
  { id: 'social', label: 'Social', color: 'var(--chart-2)' },
  { id: 'money', label: 'Money', color: 'var(--chart-5)' },
]
const ev = (id: string, day: number, start: string, end: string, title: string, category: string): ScheduleEvent => ({
  id,
  day,
  start,
  end,
  title,
  category,
})
const EVENTS: ScheduleEvent[] = [
  ev('e1', 0, '09:00', '09:30', 'Standup', 'work'),
  ev('e2', 0, '13:00', '14:30', 'Design review', 'work'),
  ev('e3', 0, '18:00', '19:00', 'Climbing', 'health'),
  ev('e4', 1, '08:30', '09:30', 'Physio', 'health'),
  ev('e5', 1, '12:00', '13:00', 'Lunch with Sam', 'social'),
  ev('e6', 1, '15:00', '16:00', 'Card review', 'money'),
  ev('e7', 2, '10:00', '12:30', 'Workshop', 'work'),
  ev('e8', 2, '11:00', '11:45', 'Dentist', 'health'),
  ev('e9', 2, '17:30', '18:30', 'Market run', 'social'),
  ev('e10', 3, '08:00', '09:00', 'Yoga', 'health'),
  ev('e11', 3, '14:30', '15:30', 'Team sync', 'work'),
  ev('e12', 3, '14:30', '15:00', 'Rent transfer', 'money'),
  ev('e13', 3, '18:00', '19:00', 'Spin class', 'health'),
  ev('e14', 4, '09:00', '10:00', 'Standup', 'work'),
  ev('e15', 4, '16:00', '17:00', 'Budget check-in', 'money'),
  ev('e16', 4, '19:00', '21:00', 'Dinner, Harbour', 'social'),
  ev('e17', 5, '10:00', '11:00', 'Swim', 'health'),
  ev('e18', 5, '13:00', '15:00', 'Flea market', 'social'),
  ev('e19', 6, '09:00', '10:30', 'Long run', 'health'),
  ev('e20', 6, '17:00', '18:00', 'Plan the week', 'money'),
]
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
const BOOKED = EVENTS.reduce((sum, e) => sum + minutes(e.end) - minutes(e.start), 0) / 60
const TO_COME = EVENTS.filter((e) => e.day > 3 || (e.day === 3 && minutes(e.end) > 14 * 60 + 20)).length

export default function WeekScheduleDemo() {
  const [picked, setPicked] = useState<ScheduleEvent | null>(null)
  return (
    <div className="grid w-full gap-4">
      <DataTile
        title="This week"
        footer={<span>Seven days by the hour. Events that overlap sit side by side, and the signal line is now. Example data.</span>}
      >
        <TileFact
          label="Booked this week"
          aside={
            <span className="rounded-full bg-muted px-2.5 py-1 text-[12.5px] text-muted-foreground tabular-nums">
              {TO_COME} of {EVENTS.length} still to come
            </span>
          }
        >
          <BigNumber value={BOOKED} format={{ decimals: 2, suffix: ' h' }} />
        </TileFact>
        <WeekSchedule data={EVENTS} label="This week" weekStart={WEEK} now={NOW} categories={CATEGORIES} />
      </DataTile>
      <div className="grid gap-4 sm:grid-cols-2">
        <DataTile
          title="Day view"
          density="compact"
          footer={<span>{picked ? `Opened ${picked.title}. ` : 'One day at a time, with tabs for the week. '}Example data.</span>}
        >
          <WeekSchedule
            data={EVENTS}
            label="This week, by day"
            weekStart={WEEK}
            now={NOW}
            categories={CATEGORIES}
            layout="day"
            startHour={8}
            endHour={20}
            legend={false}
            onSelect={setPicked}
          />
        </DataTile>
        <DataTile title="Workdays" density="compact" inverted footer={<span>Five days, work only. Example data.</span>}>
          <WeekSchedule
            data={EVENTS.filter((e) => e.category === 'work' && e.day < 5)}
            label="Work this week"
            weekStart={WEEK}
            days={5}
            now={NOW}
            categories={CATEGORIES.slice(0, 1)}
            minDayWidth={44}
            startHour={8}
            endHour={16}
          />
        </DataTile>
      </div>
    </div>
  )
}
