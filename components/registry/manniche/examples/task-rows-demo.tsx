import { TaskRows, type Task } from '@/registry/manniche/task-rows/task-rows'

const tasks: Task[] = [
  { id: 'import', title: 'Import 240 products', status: 'done', meta: '12 s' },
  { id: 'photos', title: 'Resize product photos', status: 'running', meta: '38 / 120' },
  {
    id: 'sync',
    title: 'Sync stock with the warehouse',
    status: 'failed',
    detail: 'The warehouse answered with a timeout after 30 seconds. Nothing was changed, so it is safe to try again.',
  },
  { id: 'copy', title: 'Write product descriptions', status: 'queued' },
  { id: 'publish', title: 'Publish the spring collection', status: 'queued' },
]

export default function TaskRowsDemo() {
  return (
    <div className="flex justify-center">
      <TaskRows tasks={tasks} className="w-full max-w-md" />
    </div>
  )
}
