import { OpeningHours } from '@/registry/manniche/opening-hours/opening-hours'

export default function OpeningHoursDemo() {
  return (
    <div className="flex justify-center">
      <OpeningHours
        defaultValue={[
          { id: 'mon', label: 'Monday', open: true, ranges: [{ id: 'm1', from: '10:00', to: '18:00' }] },
          { id: 'tue', label: 'Tuesday', open: true, ranges: [{ id: 't1', from: '10:00', to: '13:00' }, { id: 't2', from: '14:00', to: '18:00' }] },
          { id: 'sat', label: 'Saturday', open: false, ranges: [] },
          { id: 'sun', label: 'Sunday', open: false, ranges: [] },
        ]}
      />
    </div>
  )
}
