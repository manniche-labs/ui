import { DeliveryBoard, type DeliveryBoardData } from '@/registry/manniche/delivery-board/delivery-board'

// Example data only. All names are invented.
const data: DeliveryBoardData = {
  clients: {
    title: 'Client progress',
    items: [
      { id: 'a', name: 'Sample Studio', progress: 72 },
      { id: 'b', name: 'Demo Works', progress: 45 },
      { id: 'c', name: 'Example Labs', progress: 18 },
    ],
  },
  days: ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12'],
  roadmap: {
    title: 'Roadmap',
    lanes: [
      { id: 'next', title: 'Next', items: [{ id: 'i1', title: 'Sample brief', owners: ['Alex Example'] }, { id: 'i2', title: 'Demo kickoff', owners: ['Sam Sample', 'Robin Demo'] }] },
      { id: 'doing', title: 'In progress', items: [{ id: 'i3', title: 'Example prototype', owners: ['Robin Demo'] }] },
      { id: 'done', title: 'Delivered', items: [{ id: 'i4', title: 'Test handover', owners: ['Alex Example', 'Sam Sample'] }] },
    ],
  },
  assistant: { title: 'Assistant', text: 'Example tile: ask for a status summary.', action: 'Summarise' },
}

export default function DeliveryBoardDemo() {
  return <DeliveryBoard data={data} now={new Date('2026-10-06T10:00:00')} />
}
