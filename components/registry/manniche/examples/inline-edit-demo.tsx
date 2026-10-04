import { CalendarDays, Clock, MapPin, NotebookText, Tag } from 'lucide-react'
import { useState } from 'react'
import { InlineEdit } from '@/registry/manniche/inline-edit/inline-edit'

export default function InlineEditDemo() {
  const [event, setEvent] = useState({
    name: 'Spring sample sale',
    date: 'Saturday 14 March',
    time: '10:00 – 16:00',
    place: 'Back room, Main Street store',
    notes: 'Members get in at 9.\nCards and cash.',
  })
  const set = (key: keyof typeof event) => (v: string) => setEvent((e) => ({ ...e, [key]: v }))

  return (
    <div className="mx-auto w-full max-w-md rounded-[28px] border bg-muted/50 p-1.5 shadow-sm">
      <div className="overflow-hidden rounded-[22px] border bg-card">
        <p className="border-b bg-muted/40 px-5 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Event details</p>
        <div className="space-y-2 p-3 sm:space-y-1">
          <InlineEdit label="Event" icon={<Tag />} value={event.name} onSave={set('name')} />
          <InlineEdit label="Date" icon={<CalendarDays />} value={event.date} onSave={set('date')} />
          <InlineEdit label="Time" icon={<Clock />} value={event.time} onSave={set('time')} />
          <InlineEdit label="Place" icon={<MapPin />} value={event.place} onSave={set('place')} />
          <InlineEdit label="Notes" icon={<NotebookText />} value={event.notes} onSave={set('notes')} multiline />
        </div>
      </div>
    </div>
  )
}
