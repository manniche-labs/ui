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
  deals: {
    title: 'Deals closed per week',
    total: 84500,
    points: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'].map((label, i) => ({ label, value: [9800, 14200, 12100, 17600, 15300, 15500][i] })),
  },
}

export default function WorkspaceHomeDemo() {
  return <WorkspaceHome data={data} />
}
