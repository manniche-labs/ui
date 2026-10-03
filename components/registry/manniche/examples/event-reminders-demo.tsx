import { EventReminders } from '@/registry/manniche/event-reminders/event-reminders'

export default function EventRemindersDemo() {
  return (
    <div className="flex justify-center">
      <EventReminders
        title="Spring sale opens"
        when="Thursday 9 October, 10:00"
        defaultValue={[
          { id: 'a', channel: 'notification', amount: 30, unit: 'minutes' },
          { id: 'b', channel: 'email', amount: 1, unit: 'days' },
        ]}
      />
    </div>
  )
}
