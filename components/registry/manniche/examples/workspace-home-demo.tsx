import { WorkspaceHome, type WorkspaceHomeData } from '@/registry/manniche/workspace-home/workspace-home'

// Example data only. All names and figures are invented.
const data: WorkspaceHomeData = {
  nav: [
    { id: 'home', label: 'Home' },
    { id: 'deals', label: 'Deals' },
    { id: 'people', label: 'People' },
    { id: 'files', label: 'Files' },
  ],
  offer: { title: 'Sample offer', text: 'Example tile: a short offer with one clear action.', action: 'See the offer' },
  schedule: {
    title: 'This week',
    weekStart: '2026-10-05',
    now: '2026-10-06T10:00',
    categories: [
      { id: 'call', label: 'Calls' },
      { id: 'focus', label: 'Focus' },
    ],
    events: [
      { id: 'e1', title: 'Sample kickoff', day: 0, start: '09:00', end: '10:00', category: 'call' },
      { id: 'e2', title: 'Demo review', day: 1, start: '11:00', end: '12:00', category: 'call' },
      { id: 'e3', title: 'Example focus block', day: 2, start: '13:00', end: '15:00', category: 'focus' },
      { id: 'e4', title: 'Test planning', day: 3, start: '10:00', end: '11:30', category: 'focus' },
    ],
  },
  deals: {
    title: 'Deals closed per week',
    total: 84500,
    points: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'].map((label, i) => ({ label, value: [9800, 14200, 12100, 17600, 15300, 15500][i] })),
  },
}

export default function WorkspaceHomeDemo() {
  return <WorkspaceHome data={data} />
}
